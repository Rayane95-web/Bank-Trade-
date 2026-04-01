const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isDeveloper, logAdminAction } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder().setName('banfromeconomy').setDescription('[DEV] Ban/unban a user from the economy')
    .addUserOption(o => o.setName('user').setDescription('Target').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),
  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });
    try {
      const target = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const user   = db.getUser(target.id, interaction.guildId, target.username);
      user.banned    = !user.banned;
      user.banReason = user.banned ? reason : null;
      db.saveUser(user);
      logAdminAction(interaction.user, user.banned ? 'BAN_ECONOMY' : 'UNBAN_ECONOMY', target, { reason });
      return interaction.reply({ embeds: [successEmbed(user.banned ? 'User Banned' : 'User Unbanned',
        `<@${target.id}> has been **${user.banned ? 'banned from' : 'unbanned from'}** the economy.${user.banned ? `\nReason: ${reason}` : ''}`)] });
    } catch (err) { return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
