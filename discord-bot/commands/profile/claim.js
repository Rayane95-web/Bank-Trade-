const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { formatNumber, addXp } = require('../../utils/helpers');
const { resetDailyQuests } = require('../../utils/questTracker');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder().setName('claim').setDescription('Claim rewards for completed quests'),
  async execute(interaction) {
    try {
      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      resetDailyQuests(user);

      const claimable = [];
      for (const questDef of config.quests) {
        const progress = user.quests.find(q => q.questId === questDef.id);
        if (progress?.completed && !progress?.claimed) {
          claimable.push(questDef);
          progress.claimed = true;
          user.wallet      += questDef.reward;
          user.totalEarned += questDef.reward;
          addXp(user, questDef.xpReward);
        }
      }

      if (!claimable.length) return interaction.reply({ embeds: [errorEmbed('No completed quests to claim! Use `/quests` to check progress.')], ephemeral: true });

      db.saveUser(user);
      const totalCoins = claimable.reduce((a, q) => a + q.reward, 0);
      const totalXp    = claimable.reduce((a, q) => a + q.xpReward, 0);

      return interaction.reply({ embeds: [successEmbed('Quests Claimed! 🎯', `You claimed **${claimable.length}** quest${claimable.length > 1 ? 's' : ''}!`, [
        { name: '📋 Quests', value: claimable.map(q => `• ${q.name}`).join('\n'), inline: false },
        { name: '💰 Coins',  value: `\`+${formatNumber(totalCoins)}\``,           inline: true  },
        { name: '⭐ XP',     value: `\`+${totalXp}\``,                            inline: true  },
        { name: '👛 Wallet', value: `\`${formatNumber(user.wallet)}\``,            inline: true  },
      ])] });
    } catch (err) { console.error(err); return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
