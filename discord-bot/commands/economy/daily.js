const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed, cooldownEmbed } = require('../../utils/embeds');
const { formatNumber, checkCooldown, setCooldown, addXp } = require('../../utils/helpers');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder().setName('daily').setDescription('Claim your daily reward'),
  async execute(interaction) {
    try {
      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      if (user.banned) return interaction.reply({ embeds: [errorEmbed('You are banned from the economy.')], ephemeral: true });
      const remaining = checkCooldown(user, 'daily');
      if (remaining > 0) return interaction.reply({ embeds: [cooldownEmbed(remaining)], ephemeral: true });

      let streak = user.stats.dailyStreak || 0;
      if (user.cooldowns.daily) {
        const hours = (Date.now() - new Date(user.cooldowns.daily).getTime()) / 3600000;
        streak = hours < 48 ? streak + 1 : 1;
      } else { streak = 1; }
      user.stats.dailyStreak = streak;

      const hasDailyBoost = db.hasActiveItem(user, 'daily_boost');
      if (hasDailyBoost) {
        const idx = user.inventory.findIndex(i => i.itemId === 'daily_boost');
        if (idx !== -1) { user.inventory[idx].quantity--; if (user.inventory[idx].quantity <= 0) user.inventory.splice(idx, 1); }
      }

      const bonus = Math.min(streak * 50, 500);
      const total = Math.floor((config.economy.dailyAmount + bonus) * (hasDailyBoost ? 2 : 1));
      user.wallet      += total;
      user.totalEarned += total;
      setCooldown(user, 'daily');
      const { leveledUp, newLevel } = addXp(user, 50);
      db.saveUser(user);

      const fields = [
        { name: '💰 Base',         value: `\`${formatNumber(config.economy.dailyAmount)}\``, inline: true },
        { name: '🔥 Streak Bonus', value: `\`+${formatNumber(bonus)}\``,                    inline: true },
        { name: '📅 Streak',       value: `\`${streak} day${streak !== 1 ? 's' : ''}\``,    inline: true },
        { name: '🎁 Total',        value: `\`${formatNumber(total)}\` coins${hasDailyBoost ? ' **(2× boosted!)**' : ''}`, inline: true },
        { name: '👛 New Wallet',   value: `\`${formatNumber(user.wallet)}\``,                inline: true },
      ];
      if (leveledUp) fields.push({ name: '⬆️ Level Up!', value: `You reached Level **${newLevel}**! 🎉`, inline: false });

      return interaction.reply({ embeds: [successEmbed('Daily Reward Claimed! 🎁', `You received **${formatNumber(total)}** coins!`, fields)] });
    } catch (err) { console.error(err); return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
