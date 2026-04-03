const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { isDeveloper, formatNumber } = require('../../utils/helpers');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-stats')
    .setDescription('[DEV] View all server economy stats'),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id))
      return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });

    try {
      const users = db.getAllUsers(interaction.guildId);
      if (!users.length)
        return interaction.reply({ embeds: [errorEmbed('No users found in this server.')], ephemeral: true });

      const totalWallet    = users.reduce((s, u) => s + (u.wallet || 0), 0);
      const totalBank      = users.reduce((s, u) => s + (u.bank || 0), 0);
      const totalEarned    = users.reduce((s, u) => s + (u.totalEarned || 0), 0);
      const totalSpent     = users.reduce((s, u) => s + (u.totalSpent || 0), 0);
      const totalGames     = users.reduce((s, u) => s + (u.stats?.gamesPlayed || 0), 0);
      const totalWins      = users.reduce((s, u) => s + (u.stats?.gamesWon || 0), 0);
      const totalGambled   = users.reduce((s, u) => s + (u.stats?.totalGambled || 0), 0);
      const banned         = users.filter(u => u.banned).length;
      const richest        = users.sort((a, b) => (b.wallet + b.bank) - (a.wallet + a.bank))[0];
      const highestLevel   = users.sort((a, b) => b.level - a.level)[0];

      const embed = new EmbedBuilder()
        .setColor(config.colors.purple)
        .setTitle('📊 Server Economy Stats')
        .setDescription(`**${interaction.guild.name}** — ${users.length} registered users`)
        .addFields(
          { name: '💰 Total Wallet Coins',  value: formatNumber(totalWallet),  inline: true },
          { name: '🏦 Total Bank Coins',    value: formatNumber(totalBank),    inline: true },
          { name: '💎 Total Wealth',        value: formatNumber(totalWallet + totalBank), inline: true },
          { name: '📈 Total Ever Earned',   value: formatNumber(totalEarned),  inline: true },
          { name: '💸 Total Ever Spent',    value: formatNumber(totalSpent),   inline: true },
          { name: '🎰 Total Gambled',       value: formatNumber(totalGambled), inline: true },
          { name: '🎮 Total Games Played',  value: `${totalGames}`,            inline: true },
          { name: '🏆 Total Games Won',     value: `${totalWins}`,             inline: true },
          { name: '📊 Server Win Rate',     value: totalGames > 0 ? `${((totalWins / totalGames) * 100).toFixed(1)}%` : '0%', inline: true },
          { name: '🚫 Banned Users',        value: `${banned}`,                inline: true },
          { name: '👑 Richest User',        value: richest ? `<@${richest.userId}> — ${formatNumber((richest.wallet || 0) + (richest.bank || 0))}` : 'N/A', inline: true },
          { name: '⭐ Highest Level',       value: highestLevel ? `<@${highestLevel.userId}> — Level ${highestLevel.level}` : 'N/A', inline: true },
        )
        .setFooter({ text: `Requested by ${interaction.user.username}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
