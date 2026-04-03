const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper, logAdminAction } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-export-data')
    .setDescription('[DEV] Export all user data for this server as a JSON file'),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id))
      return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });

    try {
      await interaction.deferReply({ ephemeral: true });

      const users = db.getAllUsers(interaction.guildId);
      const exportObj = {
        exportedAt: new Date().toISOString(),
        guildId:    interaction.guildId,
        guildName:  interaction.guild.name,
        userCount:  users.length,
        users,
      };

      const json   = JSON.stringify(exportObj, null, 2);
      const buffer = Buffer.from(json, 'utf8');
      const file   = new AttachmentBuilder(buffer, { name: `economy-export-${interaction.guildId}-${Date.now()}.json` });

      logAdminAction(interaction.user, 'EXPORT_DATA', null, { userCount: users.length });

      return interaction.editReply({
        content: `✅ Exported **${users.length}** user records.`,
        files: [file],
      });
    } catch (err) {
      console.error(err);
      return interaction.editReply({ embeds: [errorEmbed('Export failed.')] });
    }
  },
};
