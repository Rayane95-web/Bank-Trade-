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
        const { MUTATIONS } = require('../../utils/mutations');
        const MAX_FIELD     = 1024;
        const MAX_SHOWN     = 10;

        const shown   = mutations.slice(0, MAX_SHOWN);
        const overflow = mutations.length - shown.length;

        // Build one line per mutation, truncating the description if needed
        const lines = shown.map(m => {
          const tier  = m.mutationTier || 'Common';
          const color = TIER_COLORS[tier] || '⬜';
          const def   = MUTATIONS.find(x => x.id === m.mutationId);
          let line    = `${color} **${m.name}** *[${tier}]*`;
          if (def) {
            const suffix = `\n  ↳ ${def.desc}`;
            // Truncate description if the full line would be unreasonably long
            if ((line + suffix).length <= 120) {
              line += suffix;
            } else {
              const maxDesc = 120 - line.length - 6; // 6 = '\n  ↳ ' + '…'
              line += `\n  ↳ ${def.desc.slice(0, Math.max(0, maxDesc))}…`;
            }
          }
          return line;
        });

        if (overflow > 0) lines.push(`*…and ${overflow} more mutation${overflow === 1 ? '' : 's'}*`);

        // Split into ≤1024-char fields in case the list is still long
        const fields = [];
        let current  = '';
        for (const line of lines) {
          const chunk = current ? `${current}\n\n${line}` : line;
          if (chunk.length > MAX_FIELD) {
            if (current) fields.push(current);
            current = line;
          } else {
            current = chunk;
          }
        }
        if (current) fields.push(current);

        fields.forEach((value, idx) => {
          embed.addFields({
            name: idx === 0 ? '✨ Mutations' : '✨ Mutations (cont.)',
            value,
            inline: false,
          });
        });
      }

      return interaction.reply({ embeds: [embed] });
    } catch (err) { console.error(err); return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
