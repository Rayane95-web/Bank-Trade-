const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { isDeveloper, formatNumber } = require('../../utils/helpers');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-view-user')
    .setDescription('[DEV] View a detailed admin profile of any user')
    .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true)),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id))
      return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });

    try {
      const target = interaction.options.getUser('user');
      const user   = db.getUser(target.id, interaction.guildId, target.username);

      const netWorth   = (user.wallet || 0) + (user.bank || 0);
      const gamesPlayed = user.stats?.gamesPlayed || 0;
      const gamesWon    = user.stats?.gamesWon    || 0;
      const winRate     = gamesPlayed > 0 ? `${((gamesWon / gamesPlayed) * 100).toFixed(1)}%` : '0%';
      const itemCount   = (user.inventory || []).filter(i => !i.mutationId).length;
      const mutCount    = (user.inventory || []).filter(i => i.mutationId).length;
      const achCount    = (user.achievements || []).length;

      const embed = new EmbedBuilder()
        .setColor(user.banned ? config.colors.error : config.colors.purple)
        .setTitle(`🔍 Admin View — ${target.username}`)
        .setThumbnail(target.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: '🆔 User ID',          value: `\`${user.userId}\``,                    inline: true },
          { name: '📅 Registered',        value: new Date(user.createdAt).toDateString(), inline: true },
          { name: '🔄 Last Updated',      value: new Date(user.updatedAt).toDateString(), inline: true },
          { name: '👛 Wallet',            value: formatNumber(user.wallet || 0),          inline: true },
          { name: '🏦 Bank',              value: formatNumber(user.bank || 0),            inline: true },
          { name: '💎 Net Worth',         value: formatNumber(netWorth),                  inline: true },
          { name: '📈 Total Earned',      value: formatNumber(user.totalEarned || 0),     inline: true },
          { name: '💸 Total Spent',       value: formatNumber(user.totalSpent || 0),      inline: true },
          { name: '🏦 Bank Limit',        value: formatNumber(user.bankLimit || 10000),   inline: true },
          { name: '⭐ Level',             value: `${user.level}`,                         inline: true },
          { name: '✨ XP',               value: `${user.xp} / ${user.level * 100}`,      inline: true },
          { name: '📊 Total XP',         value: formatNumber(user.totalXp || 0),          inline: true },
          { name: '🎮 Games Played',      value: `${gamesPlayed}`,                        inline: true },
          { name: '🏆 Games Won',         value: `${gamesWon}`,                           inline: true },
          { name: '📊 Win Rate',          value: winRate,                                 inline: true },
          { name: '🔥 Streak',            value: `${user.streak || user.stats?.dailyStreak || 0} days`, inline: true },
          { name: '⏱ Days Active',        value: `${user.playtime || 0}`,                 inline: true },
          { name: '🎯 Fav Game',          value: user.favoriteGame || 'None',             inline: true },
          { name: '🎒 Items',             value: `${itemCount}`,                          inline: true },
          { name: '🧬 Mutations',         value: `${mutCount}`,                           inline: true },
          { name: '🏅 Achievements',      value: `${achCount}`,                           inline: true },
          { name: '🤝 Referrals',         value: `${(user.referrals || []).length}`,      inline: true },
          { name: '📦 Investments',       value: `${(user.investments || []).length}`,    inline: true },
          { name: '🚫 Banned',            value: user.banned ? `Yes — ${user.banReason || 'No reason'}` : 'No', inline: true },
        )
        .setFooter({ text: `Admin view • ${interaction.user.username}` })
        .setTimestamp();

      if (achCount > 0) {
        const achList = (user.achievements || []).map(a => a.name || a).join(', ');
        embed.addFields({ name: '🏅 Achievement List', value: achList.length > 1024 ? achList.slice(0, 1021) + '…' : achList, inline: false });
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
