const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { progressBar } = require('../../utils/helpers');
const { resetDailyQuests } = require('../../utils/questTracker');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder().setName('quests').setDescription('View your daily quests'),
  async execute(interaction) {
    try {
      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      resetDailyQuests(user);
      db.saveUser(user);

      const embed = new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle('🎯 Your Daily Quests')
        .setDescription('Complete quests to earn bonus coins and XP!')
        .setFooter({ text: 'Use /claim to collect completed quests • Resets daily' })
        .setTimestamp();

      for (const questDef of config.quests) {
        const progress = user.quests.find(q => q.questId === questDef.id);
        const current  = progress?.progress || 0;
        const bar      = progressBar(current, questDef.goal, 10);
        const status   = progress?.claimed
          ? '✅ Claimed'
          : progress?.completed
          ? '🎁 Ready to claim! Use `/claim`'
          : `${bar} ${current}/${questDef.goal}`;

        embed.addFields({
          name:  `${questDef.name} ${progress?.claimed ? '✅' : progress?.completed ? '🎁' : ''}`,
          value: `${questDef.description}\n**Reward:** ${questDef.reward} coins + ${questDef.xpReward} XP\n${status}`,
          inline: false,
        });
      }

      return interaction.reply({ embeds: [embed] });
    } catch (err) { console.error(err); return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
