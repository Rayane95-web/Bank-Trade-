const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View your personal stats — games, earnings, win rate, and more')
    .addUserOption(o => o.setName('user').setDescription('User to view (default: yourself)').setRequired(false)),

  async execute(interaction) {
    try {
      const target = interaction.options.getUser('user') || interaction.user;
      const user   = db.getUser(target.id, interaction.guildId, target.username);

      const gamesPlayed = user.stats?.gamesPlayed || 0;
      const gamesWon    = user.stats?.gamesWon    || 0;
      const winRate     = gamesPlayed > 0 ? `${((gamesWon / gamesPlayed) * 100).toFixed(1)}%` : '0%';
      const netWorth    = (user.wallet || 0) + (user.bank || 0);
      const streak      = user.streak || user.stats?.dailyStreak || 0;
      const favGame     = user.favoriteGame
        ? user.favoriteGame.charAt(0).toUpperCase() + user.favoriteGame.slice(1)
        : 'None';

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`📊 ${target.username}'s Stats`)
        .setThumbnail(target.displayAvatarURL({ size: 128 }))
        .addFields(
          // Economy
          { name: '👛 Wallet',          value: formatNumber(user.wallet || 0),          inline: true },
          { name: '🏦 Bank',            value: formatNumber(user.bank || 0),            inline: true },
          { name: '💎 Net Worth',       value: formatNumber(netWorth),                  inline: true },
          { name: '📈 Total Earned',    value: formatNumber(user.totalEarned || 0),     inline: true },
          { name: '💸 Total Spent',     value: formatNumber(user.totalSpent || 0),      inline: true },
          { name: '🏅 Server Rank',     value: user.rank ? `#${user.rank}` : 'Unranked', inline: true },
          // Levels
          { name: '⭐ Level',           value: `${user.level}`,                         inline: true },
          { name: '✨ XP',             value: `${user.xp} / ${user.level * 100}`,      inline: true },
          { name: '📊 Total XP',       value: formatNumber(user.totalXp || 0),          inline: true },
          // Games
          { name: '🎮 Games Played',    value: `${gamesPlayed}`,                        inline: true },
          { name: '🏆 Games Won',       value: `${gamesWon}`,                           inline: true },
          { name: '📊 Win Rate',        value: winRate,                                 inline: true },
          { name: '🎰 Total Gambled',   value: formatNumber(user.stats?.totalGambled || 0), inline: true },
          { name: '💰 Total Won',       value: formatNumber(user.stats?.totalWon || 0),     inline: true },
          { name: '🎯 Fav Game',        value: favGame,                                 inline: true },
          // Engagement
          { name: '🔥 Daily Streak',    value: `${streak} days`,                        inline: true },
          { name: '⏱ Days Active',      value: `${user.playtime || 0}`,                 inline: true },
          { name: '📅 Joined',          value: new Date(user.createdAt).toDateString(), inline: true },
          // Social
          { name: '🧬 Mutations',       value: `${(user.inventory || []).filter(i => i.mutationId).length}`, inline: true },
          { name: '🎒 Items',           value: `${(user.inventory || []).filter(i => !i.mutationId).length}`, inline: true },
          { name: '🏅 Achievements',    value: `${(user.achievements || []).length}`,   inline: true },
        )
        .setFooter({ text: 'Use /achievements to see your badges • /profile for card' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
