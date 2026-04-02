const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { formatNumber, random, addXp } = require('../../utils/helpers');
const { rollMutation, MUTATIONS, TIER_COLORS } = require('../../utils/mutations');
const config = require('../../config/config');

// Roll one item from the cart loot table
function rollCart() {
  const total = config.cartLoot.reduce((a, l) => a + l.weight, 0);
  let r = Math.random() * total;
  for (const loot of config.cartLoot) { r -= loot.weight; if (r <= 0) return loot; }
  return config.cartLoot[0];
}

// 30% chance to get a bonus random mutation on a cart open
function shouldMutate() { return Math.random() < 0.30; }

// Process a single cart roll and apply rewards to the user; returns reward lines
function openOneCart(user) {
  const loot     = rollCart();
  const mutation = shouldMutate() ? rollMutation() : null;
  const lines    = [];

  if (loot.coinReward) {
    const coins       = random(loot.coinReward[0], loot.coinReward[1]);
    user.wallet      += coins;
    user.totalEarned += coins;
    lines.push(`💰 **${formatNumber(coins)}** coins`);
  }

  if (loot.itemReward) {
    const itemDef = config.shop.find(i => i.id === loot.itemReward);
    if (itemDef) {
      const expiresAt = itemDef.duration ? new Date(Date.now() + itemDef.duration).toISOString() : null;
      const existing  = user.inventory.find(i => i.itemId === loot.itemReward);
      if (existing) existing.quantity++;
      else user.inventory.push({ itemId: loot.itemReward, name: itemDef.name, quantity: 1, expiresAt });
      lines.push(`${itemDef.name}`);
    }
  }

  // Guaranteed mutation drop from loot table entry
  if (loot.mutationReward) {
    const mutDef = MUTATIONS.find(m => m.id === loot.mutationReward);
    if (mutDef) {
      user.inventory.push({
        itemId:       `mutation_${mutDef.id}_${Date.now()}_${Math.random()}`,
        name:         `${mutDef.name} Mutation`,
        quantity:     1,
        expiresAt:    null,
        mutationId:   mutDef.id,
        mutationTier: mutDef.tier,
      });
      lines.push(`${TIER_COLORS[mutDef.tier]} **${mutDef.name}** *[${mutDef.tier}]*\n  ↳ ${mutDef.desc}`);
    }
  }

  // Bonus random mutation (30% chance)
  if (mutation) {
    user.inventory.push({
      itemId:       `mutation_${mutation.id}_${Date.now()}_${Math.random()}`,
      name:         `${mutation.name} Mutation`,
      quantity:     1,
      expiresAt:    null,
      mutationId:   mutation.id,
      mutationTier: mutation.tier,
    });
    lines.push(`${TIER_COLORS[mutation.tier]} **${mutation.name}** *[${mutation.tier}]* ✨\n  ↳ ${mutation.desc}`);
  }

  return { lines, topMutation: loot.mutationReward ? MUTATIONS.find(m => m.id === loot.mutationReward) : mutation };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('opencart').setDescription('Open Mystery Carts from your inventory')
    .addIntegerOption(o => o.setName('quantity').setDescription('How many carts to open (default: 1, max: 100)').setMinValue(1).setMaxValue(100)),

  async execute(interaction) {
    await interaction.deferReply();
    try {
      const quantity = interaction.options.getInteger('quantity') ?? 1;
      const user     = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      const cartItem = user.inventory.find(i => i.itemId === 'cart' && i.quantity > 0);
      if (!cartItem) return interaction.editReply({ embeds: [errorEmbed('You have no Mystery Carts! Buy one with `/buy cart`.')] });

      const available = cartItem.quantity;
      const toOpen    = Math.min(quantity, available);

      if (quantity > available)
        await interaction.followUp({ embeds: [{ color: config.colors.warning, description: `⚠️ You only have **${available}** cart${available !== 1 ? 's' : ''} — opening ${toOpen}.` }], ephemeral: true }).catch(() => {});

      // Consume carts
      cartItem.quantity -= toOpen;
      if (cartItem.quantity <= 0) user.inventory.splice(user.inventory.indexOf(cartItem), 1);

      // Open all carts and collect results
      const allLines    = [];
      let   bestMut     = null;

      for (let i = 0; i < toOpen; i++) {
        const { lines, topMutation } = openOneCart(user);
        if (toOpen > 1) allLines.push(`**Cart ${i + 1}:**`);
        allLines.push(...lines);
        if (topMutation && (!bestMut || topMutation.weight < bestMut.weight)) bestMut = topMutation;
      }

      db.saveUser(user);

      // ── Dramatic reveal animation ─────────────────────────────────────────
      const embed = new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle(toOpen > 1 ? `🛒 Opening ${toOpen} Mystery Carts…` : '🛒 Mystery Cart')
        .setDescription('*You reach into the cart…*\n\n🎲 **Rolling…**')
        .setTimestamp();

      const revealBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cart_reveal').setLabel('🎁 Reveal!').setStyle(ButtonStyle.Success)
      );

      const msg = await interaction.editReply({ embeds: [embed], components: [revealBtn] });

      const col = msg.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, time: 30000, max: 1 });
      col.on('collect', async btn => {
        await btn.deferUpdate();

        const embedColor = bestMut?.tier === 'SECRET' ? 0xFFD700
                         : bestMut?.tier === 'Mythic'  ? 0xFF00FF
                         : config.colors.gold;

        // Discord embed descriptions cap at 4096 chars — truncate gracefully
        let desc = allLines.join('\n');
        if (desc.length > 3900) desc = desc.slice(0, 3900) + '\n…*(truncated)*';

        const resultEmbed = new EmbedBuilder()
          .setColor(embedColor)
          .setTitle(bestMut?.tier === 'SECRET' ? '🔱 SECRET MUTATION FROM CART!?' : `🛒 ${toOpen > 1 ? `${toOpen} Carts` : 'Cart'} Opened!`)
          .setDescription(desc)
          .addFields({ name: '👛 New Wallet', value: `\`${formatNumber(user.wallet)}\``, inline: true })
          .setFooter({ text: bestMut ? `✨ Best mutation: ${bestMut.tier}` : 'No mutations this time' })
          .setTimestamp();

        await btn.editReply({ embeds: [resultEmbed], components: [] });
      });

      col.on('end', (_, reason) => {
        if (reason === 'time') {
          let desc = allLines.join('\n');
          if (desc.length > 3900) desc = desc.slice(0, 3900) + '\n…*(truncated)*';
          msg.edit({ embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle(`🛒 ${toOpen > 1 ? `${toOpen} Carts` : 'Cart'} Auto-Opened`).setDescription(desc).setTimestamp()], components: [] }).catch(() => {});
        }
      });

    } catch (err) { console.error(err); return interaction.editReply({ embeds: [errorEmbed('Something went wrong.')] }); }
  },
};
