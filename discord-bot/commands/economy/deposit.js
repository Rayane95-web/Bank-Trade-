const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deposit').setDescription('Deposit coins from wallet to bank')
    .addStringOption(o => o.setName('amount').setDescription('Amount or "all"').setRequired(true)),
  async execute(interaction) {
    try {
      const user  = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      if (user.banned) return interaction.reply({ embeds: [errorEmbed('You are banned from the economy.')], ephemeral: true });
      const input  = interaction.options.getString('amount');
      let   amount = input.toLowerCase() === 'all' ? user.wallet : parseInt(input);
      if (isNaN(amount) || amount <= 0) return interaction.reply({ embeds: [errorEmbed('Enter a valid positive amount.')], ephemeral: true });
      if (amount > user.wallet)         return interaction.reply({ embeds: [errorEmbed(`You only have **${formatNumber(user.wallet)}** coins in your wallet.`)], ephemeral: true });
      const space = user.bankLimit - user.bank;
      if (space <= 0) return interaction.reply({ embeds: [errorEmbed('Your bank is full! Buy a Bank Upgrade from `/shop`.')], ephemeral: true });
      amount = Math.min(amount, space);
      user.wallet -= amount;
      user.bank   += amount;
      db.saveUser(user);
      return interaction.reply({ embeds: [successEmbed('Deposit Successful', `Deposited **${formatNumber(amount)}** coins into your bank.`, [
        { name: '👛 Wallet', value: `\`${formatNumber(user.wallet)}\``, inline: true },
        { name: '🏦 Bank',   value: `\`${formatNumber(user.bank)}\``,   inline: true },
      ])] });
    } catch (err) { console.error(err); return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
