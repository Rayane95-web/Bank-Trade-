const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');
const config = require('../../config/config');

const MEDALS = ['🥇', '🥈', '🥉'];

function buildLines(users, type) {
  return users.map((u, i) => {
    const medal = MEDALS[i] || `**${i + 1}.**`;
    return type === 'level'
      ? `${medal} <@${u.userId}> — Level **${u.level}** | **${formatNumber(u.totalXp)}** XP`
      : `${medal} <@${u.userId}> — **${formatNumber(u.wallet + u.bank)}** coins`;
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard').setDescription('View the server leaderboard')
    .addStringOption(o => o.setName('type').setDescription('Category').setRequired(false)
      .addChoices({ name: '💰 Richest', value: 'wealth' }, { name: '⭐ Level', value: 'level' })),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      let type = interaction.options.getString('type') || 'wealth';

      const fetch = t => db.getLeaderboard(
        interaction.guildId,
        t === 'level'
          ? (a, b) => b.level - a.level || b.totalXp - a.totalXp
          : (a, b) => (b.wallet + b.bank) - (a.wallet + a.bank)
      );

      const mkEmbed = (t, users) => new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle(t === 'level' ? '⭐ Level Leaderboard' : '💰 Wealth Leaderboard')
        .setDescription(buildLines(users, t).join('\n') || 'No users yet.')
        .setFooter({ text: `Top 10 • ${interaction.guild.name}` })
        .setTimestamp();

      const mkRow = t => new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lb_wealth').setLabel('💰 Wealth').setStyle(t === 'wealth' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('lb_level').setLabel('⭐ Level').setStyle(t === 'level'  ? ButtonStyle.Primary : ButtonStyle.Secondary),
      );

      const msg = await interaction.editReply({ embeds: [mkEmbed(type, fetch(type))], components: [mkRow(type)] });

      const collector = msg.createMessageComponentCollector({ time: 60000 });
      collector.on('collect', async btn => {
        await btn.deferUpdate();
        type = btn.customId === 'lb_wealth' ? 'wealth' : 'level';
        await btn.editReply({ embeds: [mkEmbed(type, fetch(type))], components: [mkRow(type)] });
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
    } catch (err) { console.error(err); return interaction.editReply({ embeds: [errorEmbed('Something went wrong.')] }); }
  },
};
