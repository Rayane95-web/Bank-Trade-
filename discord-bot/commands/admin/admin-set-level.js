const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isDeveloper, logAdminAction } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-set-level')
    .setDescription("[DEV] Set a user's level directly")
    .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
    .addIntegerOption(o => o.setName('level').setDescription('New level (1–1000)').setRequired(true).setMinValue(1).setMaxValue(1000)),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id))
      return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });

    try {
      const target   = interaction.options.getUser('user');
      const newLevel = interaction.options.getInteger('level');
      const user     = db.getUser(target.id, interaction.guildId, target.username);

      const oldLevel = user.level;
      user.level  = newLevel;
      user.xp     = 0;
      user.totalXp = newLevel * 100; // approximate
      db.saveUser(user);
      logAdminAction(interaction.user, 'SET_LEVEL', target, { oldLevel, newLevel });

      return interaction.reply({
        embeds: [successEmbed('Level Set', `<@${target.id}>'s level changed from **${oldLevel}** → **${newLevel}**.`)],
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
