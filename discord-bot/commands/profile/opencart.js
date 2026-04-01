const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { formatNumber, random, addXp } = require('../../utils/helpers');
const { rollMutation, TIER_COLORS } = require('../../utils/mutations');
const config = require('../../config/config');

// Roll one item from the cart loot table
function rollCart() {
  const total = config.cartLoot.reduce((a, l) => a + l.weight, 0);
  let r = Math.random() * total;
  for (const loot of config.cartLoot) { r -= loot.weight; if (r <= 0) return loot; }
  return config.cartLoot[0];
}

// 30% chance to get a mutation on a cart open
function shouldMutate() { return Math.random() < 0.30; }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('opencart').setDescription('Open a Mystery Cart from your inventory'),

  async execute(interaction) {
    await interaction.deferReply();
    try {
      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      const cartItem = user.inventory.find(i => i.itemId === 'cart' && i.quantity > 0);
      if (!cartItem) return interaction.editReply({ embeds: [errorEmbed('You have no Mystery Carts! Buy one with `/buy cart`.')] });

      // Consume one cart
      cartItem.quantity--;
      if (cartItem.quantity <= 0) user.inventory.splice(user.inventory.indexOf(cartItem), 1);

      // Roll loot
      const loot     = rollCart();
      const mutation = shouldMutate() ? rollMutation() : null;

      let rewardLines = [];
      let coinsGained = 0;

      if (loot.coinReward) {
        coinsGained      = random(loot.coinReward[0], loot.coinReward[1]);
        user.wallet      += coinsGained;
        user.totalEarned += coinsGained;
        rewardLines.push(`💰 **${formatNumber(coinsGained)}** coins`);
      }

      if (loot.itemReward) {
        const itemDef = config.shop.find(i => i.id === loot.itemReward);
        if (itemDef) {
          const expiresAt = itemDef.duration ? new Date(Date.now() + itemDef.duration).toISOString() : null;
          const existing  = user.inventory.find(i => i.itemId === loot.itemReward);
          if (existing) existing.quantity++;
          else user.inventory.push({ itemId: loot.itemReward, name: itemDef.name, quantity: 1, expiresAt });
          rewardLines.push(`${itemDef.name}`);
        }
      }

      // Apply mutation to the loot item or as a standalone buff
      if (mutation) {
        const mutEntry = {
          itemId:    `mutation_${mutation.id}_${Date.now()}`,
          name:      `${mutation.name} Mutation`,
          quantity:  1,
          expiresAt: null,
          mutationId: mutation.id,
          mutationTier: mutation.tier,
        };
        user.inventory.push(mutEntry);
        rewardLines.push(`${TIER_COLORS[mutation.tier]} **${mutation.name}** *[${mutation.tier}]*\n  ↳ ${mutation.desc}`);
      }

      db.saveUser(user);

      // Dramatic reveal animation using button collector
      const embed = new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle('🛒 Mystery Cart')
        .setDescription('*You reach into the cart…*\n\n🎲 **Rolling…**')
        .setTimestamp();

      const revealBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cart_reveal').setLabel('🎁 Reveal!').setStyle(ButtonStyle.Success)
      );

      const msg = await interaction.editReply({ embeds: [embed], components: [revealBtn] });

      const col = msg.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, time: 30000, max: 1 });
      col.on('collect', async btn => {
        await btn.deferUpdate();
        const resultEmbed = new EmbedBuilder()
          .setColor(mutation ? (mutation.tier === 'SECRET' ? 0xFFD700 : mutation.tier === 'Mythic' ? 0xFF00FF : config.colors.gold) : config.colors.success)
          .setTitle('🛒 Mystery Cart Opened!')
          .setDescription(rewardLines.join('\n'))
          .addFields({ name: '👛 New Wallet', value: `\`${formatNumber(user.wallet)}\``, inline: true })
          .setFooter({ text: mutation ? `✨ Mutation: ${mutation.tier}` : 'No mutation this time' })
          .setTimestamp();

        if (mutation?.tier === 'SECRET') {
          resultEmbed.setTitle('🔱 HOLY... SECRET ITEM FROM CART!?');
        }

        await btn.editReply({ embeds: [resultEmbed], components: [] });
      });

      col.on('end', (_, reason) => {
        if (reason === 'time') {
          const resultEmbed = new EmbedBuilder().setColor(config.colors.success).setTitle('🛒 Cart Auto-Opened').setDescription(rewardLines.join('\n')).setTimestamp();
          msg.edit({ embeds: [resultEmbed], components: [] }).catch(() => {});
        }
      });

    } catch (err) { console.error(err); return interaction.editReply({ embeds: [errorEmbed('Something went wrong.')] }); }
  },
};
