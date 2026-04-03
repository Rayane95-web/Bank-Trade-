const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isDeveloper, logAdminAction } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-remove-badge')
    .setDescription("[DEV] Remove a badge/achievement from a user")
    .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
    .addStringOption(o => o.setName('badge_id').setDescription('Badge ID to remove').setRequired(true)),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id))
      return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });

    try {
      const target  = interaction.options.getUser('user');
      const badgeId = interaction.options.getString('badge_id');
      const user    = db.getUser(target.id, interaction.guildId, target.username);

      if (!user.achievements) user.achievements = [];
      const before = user.achievements.length;
      user.achievements = user.achievements.filter(a => (a.id || a) !== badgeId);

      if (user.achievements.length === before)
        return interaction.reply({ embeds: [errorEmbed(`<@${target.id}> does not have badge \`${badgeId}\`.`)], ephemeral: true });

      db.saveUser(user);
      logAdminAction(interaction.user, 'REMOVE_BADGE', target, { badgeId });

      return interaction.reply({
        embeds: [successEmbed('Badge Removed', `Removed badge \`${badgeId}\` from <@${target.id}>.`)],
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
