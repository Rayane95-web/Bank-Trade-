const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { infoEmbed, errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription("Check your or another user's balance")
    .addUserOption(o => o.setName('user').setDescription('User to check').setRequired(false)),

  async execute(interaction) {
    try {
      const target = interaction.options.getUser('user') || interaction.user;
      const user   = db.getUser(target.id, interaction.guildId, target.username);
      if (user.banned) return interaction.reply({ embeds: [errorEmbed('This user is banned from the economy.')], ephemeral: true });

      const embed = infoEmbed(`💼 ${target.username}'s Balance`, `Financial breakdown for <@${target.id}>`, [
        { name: '👛 Wallet',      value: `\`${formatNumber(user.wallet)}\` coins`,                              inline: true },
        { name: '🏦 Bank',        value: `\`${formatNumber(user.bank)}\` / \`${formatNumber(user.bankLimit)}\` coins`, inline: true },
        { name: '💎 Net Worth',   value: `\`${formatNumber(user.wallet + user.bank)}\` coins`,                  inline: true },
        { name: '📈 Total Earned',value: `\`${formatNumber(user.totalEarned)}\` coins`,                         inline: true },
      ]).setThumbnail(target.displayAvatarURL());

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
