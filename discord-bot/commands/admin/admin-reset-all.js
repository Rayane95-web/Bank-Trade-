const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed, warningEmbed } = require('../../utils/embeds');
const { isDeveloper, logAdminAction } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-reset-all')
    .setDescription('[DEV] Reset the ENTIRE server economy — requires confirmation'),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id))
      return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm_reset_all').setLabel('⚠️ Yes, wipe everything').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel_reset_all').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );

    const msg = await interaction.reply({
      embeds: [warningEmbed('**This will delete ALL user data for this server.** This cannot be undone. Are you sure?')],
      components: [row],
      ephemeral: true,
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({ time: 30000 });
    collector.on('collect', async btn => {
      await btn.deferUpdate();
      if (btn.customId === 'confirm_reset_all') {
        const store = db.getRawStore();
        let count = 0;
        for (const k of Object.keys(store)) {
          if (store[k].guildId === interaction.guildId) { delete store[k]; count++; }
        }
        db.save();
        logAdminAction(interaction.user, 'RESET_ALL_ECONOMY', null, { usersDeleted: count });
        await btn.editReply({ embeds: [successEmbed('Economy Reset', `Wiped **${count}** user records from this server.`)], components: [] });
      } else {
        await btn.editReply({ embeds: [errorEmbed('Reset cancelled.')], components: [] });
      }
      collector.stop();
    });
    collector.on('end', (_, reason) => {
      if (reason === 'time') msg.edit({ components: [] }).catch(() => {});
    });
  },
};
