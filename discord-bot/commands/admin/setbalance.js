const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { formatNumber, isDeveloper, logAdminAction } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder().setName('setbalance').setDescription("[DEV] Set a user's wallet balance")
    .addUserOption(o => o.setName('user').setDescription('Target').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('New amount').setRequired(true).setMinValue(0)),
  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });
    try {
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const user   = db.getUser(target.id, interaction.guildId, target.username);
      user.wallet  = amount;
      db.saveUser(user);
      logAdminAction(interaction.user, 'SET_BALANCE', target, { amount });
      return interaction.reply({ embeds: [successEmbed('Balance Set', `Set <@${target.id}>'s wallet to **${formatNumber(amount)}** coins.`)] });
    } catch (err) { return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
