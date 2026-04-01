const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pay').setDescription('Send coins to another user')
    .addUserOption(o => o.setName('user').setDescription('User to pay').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    try {
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      if (target.id === interaction.user.id) return interaction.reply({ embeds: [errorEmbed("You can't pay yourself.")], ephemeral: true });
      if (target.bot) return interaction.reply({ embeds: [errorEmbed("You can't pay a bot.")], ephemeral: true });
      const sender   = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      const receiver = db.getUser(target.id, interaction.guildId, target.username);
      if (sender.banned)   return interaction.reply({ embeds: [errorEmbed('You are banned from the economy.')], ephemeral: true });
      if (receiver.banned) return interaction.reply({ embeds: [errorEmbed('That user is banned from the economy.')], ephemeral: true });
      if (sender.wallet < amount) return interaction.reply({ embeds: [errorEmbed(`You only have **${formatNumber(sender.wallet)}** coins.`)], ephemeral: true });
      sender.wallet   -= amount;
      receiver.wallet += amount;
      receiver.totalEarned += amount;
      db.saveUser(sender);
      db.saveUser(receiver);
      return interaction.reply({ embeds: [successEmbed('Payment Sent! 💸', `<@${interaction.user.id}> paid <@${target.id}> **${formatNumber(amount)}** coins!`, [
        { name: `${interaction.user.username}'s Wallet`, value: `\`${formatNumber(sender.wallet)}\``,   inline: true },
        { name: `${target.username}'s Wallet`,           value: `\`${formatNumber(receiver.wallet)}\``, inline: true },
      ])] });
    } catch (err) { console.error(err); return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
