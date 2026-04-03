const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed, warningEmbed } = require('../../utils/embeds');
const { isDeveloper, logAdminAction } = require('../../utils/helpers');

const DEFAULT_WALLET   = 100;
const DEFAULT_BANK     = 0;
const DEFAULT_BANKLIMIT = 10000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-economy-reset')
    .setDescription('[DEV] Reset all wallet/bank balances to default values (keeps levels & XP)')
    .addBooleanOption(o => o.setName('keep_items').setDescription('Keep inventories? (default: true)').setRequired(false)),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id))
      return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });

    const keepItems = interaction.options.getBoolean('keep_items') ?? true;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm_eco_reset').setLabel('⚠️ Reset Economy').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel_eco_reset').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );

    const msg = await interaction.reply({
      embeds: [warningEmbed(`This will reset **all wallets to ${DEFAULT_WALLET}** and **banks to ${DEFAULT_BANK}** for every user in this server.\nLevels, XP, and ${keepItems ? 'inventories' : '**inventories (will be wiped)**'} are ${keepItems ? 'preserved' : 'NOT preserved'}.\n\nAre you sure?`)],
      components: [row],
      ephemeral: true,
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({ time: 30000 });
    collector.on('collect', async btn => {
      await btn.deferUpdate();
      if (btn.customId === 'confirm_eco_reset') {
        const store = db.getRawStore();
        let count = 0;
        for (const u of Object.values(store)) {
          if (u.guildId !== interaction.guildId) continue;
          u.wallet    = DEFAULT_WALLET;
          u.bank      = DEFAULT_BANK;
          u.bankLimit = DEFAULT_BANKLIMIT;
          u.totalEarned = 0;
          u.totalSpent  = 0;
          if (!keepItems) u.inventory = [];
          count++;
        }
        db.save();
        logAdminAction(interaction.user, 'ECONOMY_RESET', null, { count, keepItems });
        await btn.editReply({ embeds: [successEmbed('Economy Reset', `Reset economy for **${count}** users.`)], components: [] });
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
