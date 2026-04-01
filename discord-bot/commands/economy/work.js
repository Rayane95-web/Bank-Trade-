const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed, cooldownEmbed } = require('../../utils/embeds');
const { formatNumber, checkCooldown, setCooldown, random, addXp } = require('../../utils/helpers');
const { trackQuest } = require('../../utils/questTracker');
const config = require('../../config/config');

const JOBS = [
  'Programmer','Chef','Driver','Teacher','Streamer',
  'Artist','Mechanic','Miner','Lawyer','Trader',
];

module.exports = {
  data: new SlashCommandBuilder().setName('work').setDescription('Work to earn coins'),
  async execute(interaction) {
    try {
      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      if (user.banned) return interaction.reply({ embeds: [errorEmbed('You are banned from the economy.')], ephemeral: true });
      const remaining = checkCooldown(user, 'work');
      if (remaining > 0) return interaction.reply({ embeds: [cooldownEmbed(remaining)], ephemeral: true });

      const hasMulti = db.hasActiveItem(user, 'multiplier');
      let earned = random(config.economy.workMin, config.economy.workMax);
      if (hasMulti) earned = Math.floor(earned * 1.5);

      user.wallet      += earned;
      user.totalEarned += earned;
      user.stats.commandsUsed++;
      setCooldown(user, 'work');
      trackQuest(user, 'work');
      const { leveledUp, newLevel } = addXp(user, random(10, 25));
      db.saveUser(user);

      const job    = JOBS[random(0, JOBS.length - 1)];
      const fields = [
        { name: '💼 Job',    value: job,                                                         inline: true },
        { name: '💰 Earned', value: `\`${formatNumber(earned)}\`${hasMulti ? ' *(1.5×)*' : ''}`, inline: true },
        { name: '👛 Wallet', value: `\`${formatNumber(user.wallet)}\``,                           inline: true },
      ];
      if (leveledUp) fields.push({ name: '⬆️ Level Up!', value: `Level **${newLevel}**! 🎉`, inline: false });

      return interaction.reply({ embeds: [successEmbed('Work Complete! 💼', `You worked as a **${job}** and earned **${formatNumber(earned)}** coins.`, fields)] });
    } catch (err) { console.error(err); return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
