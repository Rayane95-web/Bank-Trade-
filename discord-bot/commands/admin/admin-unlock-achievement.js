const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isDeveloper, logAdminAction } = require('../../utils/helpers');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-unlock-achievement')
    .setDescription('[DEV] Unlock a specific achievement for a user')
    .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
    .addStringOption(o => {
      const opt = o.setName('achievement').setDescription('Achievement to unlock').setRequired(true);
      config.achievements.forEach(a => opt.addChoices({ name: `${a.name} — ${a.description}`, value: a.id }));
      return opt;
    }),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id))
      return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });

    try {
      const target = interaction.options.getUser('user');
      const achId  = interaction.options.getString('achievement');
      const user   = db.getUser(target.id, interaction.guildId, target.username);
      const achDef = config.achievements.find(a => a.id === achId);

      if (!achDef)
        return interaction.reply({ embeds: [errorEmbed('Unknown achievement.')], ephemeral: true });

      if (!user.achievements) user.achievements = [];
      if (user.achievements.some(a => (a.id || a) === achId))
        return interaction.reply({ embeds: [errorEmbed(`<@${target.id}> already has **${achDef.name}**.`)], ephemeral: true });

      user.achievements.push({ id: achDef.id, name: achDef.name, description: achDef.description, unlockedAt: new Date().toISOString() });
      db.saveUser(user);
      logAdminAction(interaction.user, 'UNLOCK_ACHIEVEMENT', target, { achId });

      return interaction.reply({
        embeds: [successEmbed('Achievement Unlocked', `🏅 Unlocked **${achDef.name}** for <@${target.id}>.\n*${achDef.description}*`)],
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
