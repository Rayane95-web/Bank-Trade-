const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('withdraw').setDescription('Withdraw coins from bank to wallet')
    .addStringOption(o => o.setName('amount').setDescription('Amount or "all"').setRequired(true)),
  async execute(interaction) {
    try {
      const user  = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      if (user.banned) return interaction.reply({ embeds: [errorEmbed('You are banned from the economy.')], ephemeral: true });
      const input  = interaction.options.getString('amount');
      let   amount = input.toLowerCase() === 'all' ? user.bank : parseInt(input);
      if (isNaN(amount) || amount <= 0) return interaction.reply({ embeds: [errorEmbed('Enter a valid positive amount.')], ephemeral: true });
      if (amount > user.bank) return interaction.reply({ embeds: [errorEmbed(`You only have **${formatNumber(user.bank)}** coins in your bank.`)], ephemeral: true });
      user.bank   -= amount;
      user.wallet += amount;
      db.saveUser(user);
      return interaction.reply({ embeds: [successEmbed('Withdrawal Successful', `Withdrew **${formatNumber(amount)}** coins from your bank.`, [
        { name: '👛 Wallet', value: `\`${formatNumber(user.wallet)}\``, inline: true },
        { name: '🏦 Bank',   value: `\`${formatNumber(user.bank)}\``,   inline: true },
      ])] });
    } catch (err) { console.error(err); return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
