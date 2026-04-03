const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');
const config = require('../../config/config');

// Streak milestone rewards
const MILESTONES = [
  { days: 7,   bonus: 500,   label: '🔥 Week Warrior' },
  { days: 14,  bonus: 1000,  label: '💪 Fortnight Fighter' },
  { days: 30,  bonus: 3000,  label: '📅 Monthly Grinder' },
  { days: 60,  bonus: 7500,  label: '⚡ Two-Month Titan' },
  { days: 100, bonus: 15000, label: '💯 Century Streak' },
  { days: 365, bonus: 75000, label: '🌟 Year Legend' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily-streak')
    .setDescription('View your current daily login streak and upcoming milestone rewards'),

  async execute(interaction) {
    try {
      const user   = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      const streak = user.streak || user.stats?.dailyStreak || 0;

      // Find next milestone
      const nextMilestone = MILESTONES.find(m => m.days > streak);
      const lastMilestone = [...MILESTONES].reverse().find(m => m.days <= streak);

      const embed = new EmbedBuilder()
        .setColor(streak >= 30 ? config.colors.gold : streak >= 7 ? config.colors.warning : config.colors.primary)
        .setTitle('🔥 Daily Streak')
        .setDescription(
          streak === 0
            ? 'You have no active streak. Use `/daily` to start one!'
            : `Your current streak is **${streak} day${streak !== 1 ? 's' : ''}**! Keep it up!`
        )
        .addFields(
          { name: '🔥 Current Streak',  value: `**${streak}** days`,                                                    inline: true },
          { name: '📅 Last Claimed',    value: user.cooldowns?.daily ? `<t:${Math.floor(new Date(user.cooldowns.daily).getTime() / 1000)}:R>` : 'Never', inline: true },
          { name: '⏱ Days Active',      value: `${user.playtime || 0} total days`,                                      inline: true },
        )
        .setTimestamp();

      if (lastMilestone) {
        embed.addFields({ name: `✅ Last Milestone — ${lastMilestone.label}`, value: `Reached at **${lastMilestone.days}** days (+${formatNumber(lastMilestone.bonus)} coins)`, inline: false });
      }

      if (nextMilestone) {
        const daysLeft = nextMilestone.days - streak;
        embed.addFields({ name: `🎯 Next Milestone — ${nextMilestone.label}`, value: `**${daysLeft}** more day${daysLeft !== 1 ? 's' : ''} to reach **${nextMilestone.days}** days\nReward: **+${formatNumber(nextMilestone.bonus)}** coins`, inline: false });
      } else {
        embed.addFields({ name: '👑 Max Milestone Reached!', value: 'You have reached all streak milestones. Legendary!', inline: false });
      }

      // Streak progress bar
      if (nextMilestone) {
        const prev  = lastMilestone?.days || 0;
        const range = nextMilestone.days - prev;
        const prog  = streak - prev;
        const pct   = Math.min(prog / range, 1);
        const filled = Math.round(pct * 20);
        const bar   = '█'.repeat(filled) + '░'.repeat(20 - filled);
        embed.addFields({ name: '📊 Progress to Next Milestone', value: `\`${bar}\` ${Math.round(pct * 100)}%`, inline: false });
      }

      embed.setFooter({ text: 'Use /daily to claim your daily reward and maintain your streak' });
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
