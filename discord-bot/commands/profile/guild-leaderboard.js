const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');
const config = require('../../config/config');
const path = require('path');
const fs   = require('fs');

const GUILDS_FILE = path.join(__dirname, '../../data/guilds.json');

function loadGuilds() {
  if (!fs.existsSync(GUILDS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(GUILDS_FILE, 'utf8')); } catch { return {}; }
}

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guild-leaderboard')
    .setDescription('View the top guilds ranked by treasury balance and weekly contributions')
    .addStringOption(o =>
      o.setName('sort')
        .setDescription('Sort guilds by (default: treasury)')
        .setRequired(false)
        .addChoices(
          { name: '🏦 Treasury Balance', value: 'treasury'        },
          { name: '📅 Weekly Deposits',  value: 'weekly_deposits' },
          { name: '👥 Member Count',     value: 'members'         },
        )
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const sortBy = interaction.options.getString('sort') || 'treasury';
      const guilds = loadGuilds();

      // Filter to guilds in this Discord server
      let guildList = Object.values(guilds).filter(g => g.discordGuildId === interaction.guildId);

      if (guildList.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.warning)
              .setTitle('🏰 Guild Leaderboard')
              .setDescription('No guilds have been created yet! Use `/guild-create` to start one.')
              .setTimestamp(),
          ],
        });
      }

      // Sort
      if (sortBy === 'weekly_deposits') {
        guildList.sort((a, b) => (b.weeklyDeposits || 0) - (a.weeklyDeposits || 0));
      } else if (sortBy === 'members') {
        guildList.sort((a, b) => b.members.length - a.members.length);
      } else {
        guildList.sort((a, b) => (b.treasury || 0) - (a.treasury || 0));
      }

      const top10 = guildList.slice(0, 10);

      // Build leaderboard lines
      const lines = top10.map((g, i) => {
        const medal      = MEDALS[i] || `**${i + 1}.**`;
        const treasury   = formatNumber(g.treasury || 0);
        const weekly     = formatNumber(g.weeklyDeposits || 0);
        const memberCount = g.members.length;
        const owner      = `<@${g.ownerId}>`;

        return (
          `${medal} **${g.name}**\n` +
          `    👑 Owner: ${owner}  •  👥 Members: **${memberCount}**\n` +
          `    🏦 Treasury: **${treasury}** coins  •  📅 Weekly: **${weekly}** coins`
        );
      });

      // Sort label for title
      const sortLabels = {
        treasury:        '🏦 Treasury Balance',
        weekly_deposits: '📅 Weekly Deposits',
        members:         '👥 Member Count',
      };

      // Find the user's guild rank
      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      let userRankLine = '';
      if (user.guildId_economy && guilds[user.guildId_economy]) {
        const userGuild = guilds[user.guildId_economy];
        const rank = guildList.findIndex(g => g.id === userGuild.id) + 1;
        if (rank > 0) {
          userRankLine = `\n\n📍 **Your guild:** ${userGuild.name} — Rank **#${rank}** of ${guildList.length}`;
        }
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle(`🏰 Guild Leaderboard — ${sortLabels[sortBy]}`)
        .setDescription(lines.join('\n\n') + userRankLine)
        .addFields(
          {
            name:   '📊 Server Stats',
            value:  `Total Guilds: **${guildList.length}**  •  Top Treasury: **${formatNumber(top10[0]?.treasury || 0)}** coins`,
            inline: false,
          },
        )
        .setFooter({ text: `Top 10 guilds • ${interaction.guild.name} • Use /guild-contribute to climb the ranks!` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.editReply({ embeds: [errorEmbed('Something went wrong.')] });
    }
  },
};
