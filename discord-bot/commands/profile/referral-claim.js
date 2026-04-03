const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');

const REFERRAL_BONUS  = 1000;  // coins to referrer
const REFERRED_BONUS  = 500;   // coins to new user

module.exports = {
  data: new SlashCommandBuilder()
    .setName('referral-claim')
    .setDescription('Claim a referral bonus using a friend\'s referral code')
    .addStringOption(o => o.setName('code').setDescription('Referral code from your friend').setRequired(true)),

  async execute(interaction) {
    try {
      const code   = interaction.options.getString('code').trim();
      const user   = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);

      // Already used a referral
      if (user.referrerId)
        return interaction.reply({ embeds: [errorEmbed('You have already claimed a referral bonus.')], ephemeral: true });

      // Parse code: guildId-userId
      const parts      = code.split('-');
      const referrerId = parts[parts.length - 1];

      if (referrerId === interaction.user.id)
        return interaction.reply({ embeds: [errorEmbed('You cannot refer yourself.')], ephemeral: true });

      const referrer = db.getUser(referrerId, interaction.guildId);
      if (!referrer || !referrer.userId)
        return interaction.reply({ embeds: [errorEmbed('Invalid referral code. Make sure you copied it correctly.')], ephemeral: true });

      // Apply bonuses
      user.referrerId = referrerId;
      user.wallet    += REFERRED_BONUS;
      user.totalEarned += REFERRED_BONUS;

      if (!referrer.referrals) referrer.referrals = [];
      referrer.referrals.push(interaction.user.id);
      referrer.wallet    += REFERRAL_BONUS;
      referrer.totalEarned += REFERRAL_BONUS;

      db.saveUser(user);
      db.saveUser(referrer);

      return interaction.reply({
        embeds: [successEmbed('Referral Claimed! 🤝',
          `You received **${formatNumber(REFERRED_BONUS)}** coins!\n<@${referrerId}> received **${formatNumber(REFERRAL_BONUS)}** coins for referring you.`)],
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
