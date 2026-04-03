const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { formatNumber, addXp } = require('../../utils/helpers');
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
    .setName('bounty-claim')
    .setDescription('Claim the reward for a completed bounty')
    .addStringOption(o => {
      const opt = o.setName('bounty').setDescription('Bounty to claim').setRequired(true);
      config.bounties.forEach(b => opt.addChoices({ name: b.name, value: b.id }));
      return opt;
    }),

  async execute(interaction) {
    try {
      const user     = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);

      if (user.banned)
        return interaction.reply({ embeds: [errorEmbed('You are banned from the economy.')], ephemeral: true });

      const bountyId = interaction.options.getString('bounty');
      const bounty   = config.bounties.find(b => b.id === bountyId);

      if (!bounty)
        return interaction.reply({ embeds: [errorEmbed('Unknown bounty.')], ephemeral: true });

      if (!user.completedBounties) user.completedBounties = [];
      if (user.completedBounties.includes(bountyId))
        return interaction.reply({ embeds: [errorEmbed(`You have already claimed the **${bounty.name}** bounty.`)], ephemeral: true });

      // Check completion
      if (bounty.type !== 'manual') {
        const progress = checkBountyProgress(user, bounty);
        if (progress < bounty.goal)
          return interaction.reply({ embeds: [errorEmbed(`Not completed yet! Progress: **${progress}/${bounty.goal}**`)], ephemeral: true });
      }

      // Award
      user.wallet    += bounty.reward;
      user.totalEarned += bounty.reward;
      user.completedBounties.push(bountyId);
      const { leveledUp, newLevel } = addXp(user, bounty.xpReward);
      db.saveUser(user);

      const fields = [
        { name: '💰 Coins',  value: `+${formatNumber(bounty.reward)}`, inline: true },
        { name: '✨ XP',    value: `+${bounty.xpReward}`,              inline: true },
      ];
      if (leveledUp) fields.push({ name: '⬆️ Level Up!', value: `You reached Level **${newLevel}**! 🎉`, inline: false });

      return interaction.reply({
        embeds: [successEmbed(`Bounty Claimed! 🎯 — ${bounty.name}`, bounty.description, fields)],
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
