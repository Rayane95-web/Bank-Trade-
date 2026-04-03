const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');
const config = require('../../config/config');

function checkBountyProgress(user, bounty) {
  switch (bounty.type) {
    case 'stat':     return user.stats?.[bounty.stat] || 0;
    case 'streak':   return user.streak || user.stats?.dailyStreak || 0;
    case 'level':    return user.level || 1;
    case 'referrals':return (user.referrals || []).length;
    default:         return 0;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bounty-list')
    .setDescription('View available bounties and your progress on each'),

  async execute(interaction) {
    try {
      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      if (!user.completedBounties) user.completedBounties = [];

      const embed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('🎯 Bounty Board')
        .setDescription('Complete bounties to earn bonus coins and XP!\nUse `/bounty-claim <id>` to claim a completed bounty.')
        .setTimestamp();

      for (const bounty of config.bounties) {
        const completed = user.completedBounties.includes(bounty.id);
        const progress  = bounty.type === 'manual' ? '?' : checkBountyProgress(user, bounty);
        const pct       = bounty.type === 'manual' ? 0 : Math.min(progress / bounty.goal, 1);
        const filled    = Math.round(pct * 10);
        const bar       = '█'.repeat(filled) + '░'.repeat(10 - filled);

        const status = completed
          ? '✅ Completed'
          : bounty.type === 'manual'
          ? '📋 Use /bounty-claim to check'
          : `\`${bar}\` ${progress}/${bounty.goal}`;

        embed.addFields({
          name:  `${completed ? '✅' : '🎯'} ${bounty.name}`,
          value: `${bounty.description}\n**Reward:** ${formatNumber(bounty.reward)} coins + ${bounty.xpReward} XP\n${status}`,
          inline: true,
        });
      }

      embed.setFooter({ text: `${user.completedBounties.length}/${config.bounties.length} bounties completed` });
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
