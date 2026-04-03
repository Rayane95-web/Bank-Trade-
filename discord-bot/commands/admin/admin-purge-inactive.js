const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed, warningEmbed } = require('../../utils/embeds');
const { isDeveloper, logAdminAction } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-purge-inactive')
    .setDescription('[DEV] Delete users who have been inactive for X days')
    .addIntegerOption(o => o.setName('days').setDescription('Inactivity threshold in days').setRequired(true).setMinValue(7).setMaxValue(365))
    .addBooleanOption(o => o.setName('dry_run').setDescription('Preview without deleting (default: true)').setRequired(false)),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id))
      return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });

    try {
      const days   = interaction.options.getInteger('days');
      const dryRun = interaction.options.getBoolean('dry_run') ?? true;
      const cutoff = new Date(Date.now() - days * 86400000);

      const store = db.getRawStore();
      const toDelete = [];

      for (const [k, u] of Object.entries(store)) {
        if (u.guildId !== interaction.guildId) continue;
        const lastActive = new Date(u.updatedAt || u.createdAt);
        if (lastActive < cutoff) toDelete.push(k);
      }

      if (!dryRun) {
        for (const k of toDelete) delete store[k];
        db.save();
        logAdminAction(interaction.user, 'PURGE_INACTIVE', null, { days, deleted: toDelete.length });
      }

      const action = dryRun ? '🔍 Dry Run Preview' : '🗑️ Purge Complete';
      const desc   = dryRun
        ? `Would delete **${toDelete.length}** users inactive for **${days}+ days**.\nRun with \`dry_run: false\` to actually delete.`
        : `Deleted **${toDelete.length}** users inactive for **${days}+ days**.`;

      return interaction.reply({ embeds: [successEmbed(action, desc)], ephemeral: true });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
