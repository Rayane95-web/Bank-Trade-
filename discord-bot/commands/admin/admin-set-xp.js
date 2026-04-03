const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isDeveloper, logAdminAction } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-set-xp')
    .setDescription("[DEV] Set a user's current XP (within their level)")
    .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
    .addIntegerOption(o => o.setName('xp').setDescription('XP amount').setRequired(true).setMinValue(0)),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id))
      return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });

    try {
      const target = interaction.options.getUser('user');
      const xp     = interaction.options.getInteger('xp');
      const user   = db.getUser(target.id, interaction.guildId, target.username);

      const oldXp = user.xp;
      user.xp = xp;
      db.saveUser(user);
      logAdminAction(interaction.user, 'SET_XP', target, { oldXp, xp });

      return interaction.reply({
        embeds: [successEmbed('XP Set', `<@${target.id}>'s XP changed from **${oldXp}** → **${xp}** (Level ${user.level}).`)],
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
