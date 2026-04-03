const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed, warningEmbed } = require('../../utils/embeds');
const { isDeveloper, logAdminAction } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-import-data')
    .setDescription('[DEV] Import user data from a JSON export (attach the file)')
    .addAttachmentOption(o => o.setName('file').setDescription('JSON export file').setRequired(true))
    .addBooleanOption(o => o.setName('merge').setDescription('Merge with existing data (default: true)').setRequired(false)),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id))
      return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });

    try {
      await interaction.deferReply({ ephemeral: true });

      const attachment = interaction.options.getAttachment('file');
      const merge      = interaction.options.getBoolean('merge') ?? true;

      if (!attachment.name.endsWith('.json'))
        return interaction.editReply({ embeds: [errorEmbed('File must be a .json export.')] });

      // Fetch the file content
      const res  = await fetch(attachment.url);
      const text = await res.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch {
        return interaction.editReply({ embeds: [errorEmbed('Invalid JSON file.')] });
      }

      const importUsers = parsed.users || (Array.isArray(parsed) ? parsed : null);
      if (!importUsers)
        return interaction.editReply({ embeds: [errorEmbed('Could not find user array in file.')] });

      const store = db.getRawStore();
      let imported = 0;
      for (const u of importUsers) {
        if (!u.userId || !u.guildId) continue;
        const k = `${u.guildId}:${u.userId}`;
        if (merge && store[k]) {
          // Merge: only update fields that are missing
          store[k] = { ...u, ...store[k] };
        } else {
          store[k] = u;
        }
        imported++;
      }
      db.save();
      logAdminAction(interaction.user, 'IMPORT_DATA', null, { imported, merge });

      return interaction.editReply({
        embeds: [successEmbed('Import Complete', `Imported **${imported}** user records (mode: ${merge ? 'merge' : 'overwrite'}).`)],
      });
    } catch (err) {
      console.error(err);
      return interaction.editReply({ embeds: [errorEmbed('Import failed.')] });
    }
  },
};
