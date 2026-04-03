const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { formatNumber, random } = require('../../utils/helpers');
const config = require('../../config/config');

function weightedRoll(loot) {
  const total = loot.reduce((s, l) => s + l.weight, 0);
  let roll    = Math.random() * total;
  for (const entry of loot) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return loot[loot.length - 1];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loot-box')
    .setDescription('Open a loot box from your inventory')
    .addStringOption(o => o.setName('tier').setDescription('Loot box tier').setRequired(true)
      .addChoices(
        { name: '📦 Basic Loot Box',    value: 'basic'     },
        { name: '💜 Premium Loot Box',  value: 'premium'   },
        { name: '🌟 Legendary Loot Box',value: 'legendary' },
      )),

  async execute(interaction) {
    try {
      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);

      if (user.banned)
        return interaction.reply({ embeds: [errorEmbed('You are banned from the economy.')], ephemeral: true });

      const tier    = interaction.options.getString('tier');
      const boxDef  = config.lootBoxes[tier];
      const boxId   = `loot_box_${tier}`;
      const boxName = boxDef.name;

      // Check inventory for the box
      const boxIdx = (user.inventory || []).findIndex(i => i.itemId === boxId && !i.mutationId);
      if (boxIdx === -1)
        return interaction.reply({ embeds: [errorEmbed(`You don't have a **${boxName}** in your inventory.\nCraft one with \`/craft\` or buy from the shop.`)], ephemeral: true });

      // Consume one box
      user.inventory[boxIdx].quantity = (user.inventory[boxIdx].quantity || 1) - 1;
      if (user.inventory[boxIdx].quantity <= 0) user.inventory.splice(boxIdx, 1);

      // Roll loot
      const result = weightedRoll(boxDef.loot);
      let rewardText = '';

      if (result.coinReward) {
        const coins = random(result.coinReward[0], result.coinReward[1]);
        user.wallet    += coins;
        user.totalEarned += coins;
        rewardText = `💰 **${formatNumber(coins)}** coins!`;
      } else if (result.itemReward) {
        const shopItem = config.shop.find(s => s.id === result.itemReward);
        const existing = user.inventory.find(i => i.itemId === result.itemReward && !i.mutationId);
        if (existing) {
          existing.quantity = (existing.quantity || 1) + 1;
        } else {
          user.inventory.push({
            itemId:    result.itemReward,
            name:      shopItem?.name || result.itemReward,
            quantity:  1,
            type:      shopItem?.type || 'item',
            expiresAt: shopItem?.duration ? new Date(Date.now() + shopItem.duration).toISOString() : null,
            obtainedAt: new Date().toISOString(),
          });
        }
        rewardText = `🎁 **${shopItem?.name || result.itemReward}**!`;
      } else if (result.mutationReward) {
        const { MUTATIONS } = require('../../utils/mutations');
        const mutDef = MUTATIONS.find(m => m.id === result.mutationReward);
        if (mutDef) {
          user.inventory.push({
            itemId:      `mut_${mutDef.id}`,
            mutationId:  mutDef.id,
            name:        mutDef.name,
            mutationTier: mutDef.tier,
            quantity:    1,
            obtainedAt:  new Date().toISOString(),
          });
          rewardText = `✨ **${mutDef.name}** mutation!`;
        }
      }

      db.saveUser(user);

      const embed = new EmbedBuilder()
        .setColor(tier === 'legendary' ? config.colors.gold : tier === 'premium' ? config.colors.purple : config.colors.primary)
        .setTitle(`${boxName} Opened!`)
        .setDescription(`🎉 You got: ${rewardText}`)
        .setFooter({ text: `Remaining ${boxName}s: ${(user.inventory.find(i => i.itemId === boxId)?.quantity || 0)}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
