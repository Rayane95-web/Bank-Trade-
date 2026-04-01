const { Events } = require('discord.js');
const { errorEmbed } = require('../utils/embeds');
const { trackQuest } = require('../utils/questTracker');
const db = require('../utils/db');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      // Track command usage for quests
      try {
        const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
        user.stats.commandsUsed++;
        trackQuest(user, 'command');
        db.saveUser(user);
      } catch (_) {}

      await command.execute(interaction);
    } catch (err) {
      console.error(`❌ Error in /${interaction.commandName}:`, err);
      const errEmbed = errorEmbed('An unexpected error occurred. Please try again.');
      try {
        if (interaction.replied || interaction.deferred) await interaction.followUp({ embeds: [errEmbed], ephemeral: true });
        else await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      } catch (_) {}
    }
  },
};
