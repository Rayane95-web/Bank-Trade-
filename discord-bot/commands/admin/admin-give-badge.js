const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isDeveloper, logAdminAction } = require('../../utils/helpers');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-give-badge')
    .setDescription('[DEV] Award an achievement/badge to a user')
    .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
    .addStringOption(o => {
      const opt = o.setName('badge').setDescription('Badge to award').setRequired(true);
      config.achievements.forEach(a => opt.addChoices({ name: a.name, value: a.id }));
      return opt;
    }),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id))
      return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });

    try {
      const target  = interaction.options.getUser('user');
      const badgeId = interaction.options.getString('badge');
      const user    = db.getUser(target.id, interaction.guildId, target.username);
      const achDef  = config.achievements.find(a => a.id === badgeId);

      if (!achDef)
        return interaction.reply({ embeds: [errorEmbed('Unknown badge.')], ephemeral: true });

      if (!user.achievements) user.achievements = [];
      if (user.achievements.some(a => (a.id || a) === badgeId))
        return interaction.reply({ embeds: [errorEmbed(`<@${target.id}> already has the **${achDef.name}** badge.`)], ephemeral: true });

      user.achievements.push({ id: achDef.id, name: achDef.name, awardedAt: new Date().toISOString() });
      db.saveUser(user);
      logAdminAction(interaction.user, 'GIVE_BADGE', target, { badgeId });

      return interaction.reply({
        embeds: [successEmbed('Badge Awarded', `Awarded **${achDef.name}** to <@${target.id}>.`)],
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
