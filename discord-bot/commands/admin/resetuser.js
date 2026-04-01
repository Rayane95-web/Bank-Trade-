const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isDeveloper, logAdminAction } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder().setName('resetuser').setDescription("[DEV] Reset a user's economy data")
    .addUserOption(o => o.setName('user').setDescription('Target').setRequired(true)),
  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });
    try {
      const target = interaction.options.getUser('user');
      db.deleteUser(target.id, interaction.guildId);
      logAdminAction(interaction.user, 'RESET_USER', target, {});
      return interaction.reply({ embeds: [successEmbed('User Reset', `<@${target.id}>'s economy data has been wiped.`)] });
    } catch (err) { return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
