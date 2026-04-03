const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isDeveloper, logAdminAction } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-set-streak')
    .setDescription("[DEV] Set a user's daily login streak")
    .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
    .addIntegerOption(o => o.setName('streak').setDescription('New streak value').setRequired(true).setMinValue(0)),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id))
      return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });

    try {
      const target    = interaction.options.getUser('user');
      const newStreak = interaction.options.getInteger('streak');
      const user      = db.getUser(target.id, interaction.guildId, target.username);

      const oldStreak = user.streak || user.stats?.dailyStreak || 0;
      user.streak = newStreak;
      if (user.stats) user.stats.dailyStreak = newStreak;
      db.saveUser(user);
      logAdminAction(interaction.user, 'SET_STREAK', target, { oldStreak, newStreak });

      return interaction.reply({
        embeds: [successEmbed('Streak Set', `<@${target.id}>'s streak changed from **${oldStreak}** → **${newStreak}** days.`)],
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
