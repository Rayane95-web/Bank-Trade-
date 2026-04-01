const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isDeveloper, logAdminAction, addXp } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder().setName('givexp').setDescription('[DEV] Give XP to a user')
    .addUserOption(o => o.setName('user').setDescription('Target').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('XP amount').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });
    try {
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const user   = db.getUser(target.id, interaction.guildId, target.username);
      const { leveledUp, newLevel } = addXp(user, amount);
      db.saveUser(user);
      logAdminAction(interaction.user, 'GIVE_XP', target, { amount });
      return interaction.reply({ embeds: [successEmbed('XP Granted', `Gave **${amount} XP** to <@${target.id}>.${leveledUp ? `\n🎉 They leveled up to **Level ${newLevel}**!` : ''}`)] });
    } catch (err) { return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
