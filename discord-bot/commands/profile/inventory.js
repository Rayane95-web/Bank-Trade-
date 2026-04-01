const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { TIER_COLORS } = require('../../utils/mutations');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory').setDescription('View your inventory'),
  async execute(interaction) {
    try {
      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      const embed = new EmbedBuilder().setColor(config.colors.purple).setTitle(`🎒 ${interaction.user.username}'s Inventory`).setTimestamp();

      if (!user.inventory.length) {
        embed.setDescription('Your inventory is empty!\nVisit `/shop` to buy items or try `/buy lucky_block` for a surprise!');
        return interaction.reply({ embeds: [embed] });
      }

      const now = new Date();

      // Group: regular items
      const regular   = user.inventory.filter(i => !i.mutationId);
      // Group: mutations
      const mutations = user.inventory.filter(i => i.mutationId);

      if (regular.length) {
        embed.addFields({
          name: '📦 Items',
          value: regular.map(item => {
            const expired = item.expiresAt && new Date(item.expiresAt) < now;
            const exp     = !item.expiresAt ? '♾️ Permanent'
                          : expired         ? '**[EXPIRED]**'
                          : `Expires <t:${Math.floor(new Date(item.expiresAt).getTime()/1000)}:R>`;
            const special = item.isAdminSK ? ' 🔱' : '';
            return `**${item.name}${special}** ×${item.quantity}\n${exp}`;
          }).join('\n\n'),
          inline: false,
        });
      }

      if (mutations.length) {
        embed.addFields({
          name: '✨ Mutations',
          value: mutations.map(m => {
            const tier  = m.mutationTier || 'Common';
            const color = TIER_COLORS[tier] || '⬜';
            const def   = require('../../utils/mutations').MUTATIONS.find(x => x.id === m.mutationId);
            return `${color} **${m.name}** *[${tier}]*${def ? `\n  ↳ ${def.desc}` : ''}`;
          }).join('\n\n'),
          inline: false,
        });
      }

      return interaction.reply({ embeds: [embed] });
    } catch (err) { console.error(err); return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
