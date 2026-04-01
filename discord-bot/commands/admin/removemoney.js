const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { formatNumber, isDeveloper, logAdminAction } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder().setName('removemoney').setDescription('[DEV] Remove money from a user')
    .addUserOption(o => o.setName('user').setDescription('Target').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });
    try {
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const user   = db.getUser(target.id, interaction.guildId, target.username);
      user.wallet  = Math.max(0, user.wallet - amount);
      db.saveUser(user);
      logAdminAction(interaction.user, 'REMOVE_MONEY', target, { amount });
      return interaction.reply({ embeds: [successEmbed('Money Removed', `Removed **${formatNumber(amount)}** coins from <@${target.id}>.\nNew wallet: **${formatNumber(user.wallet)}**`)] });
    } catch (err) { return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
