const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');
const config = require('../../config/config');

const REFERRAL_BONUS    = 1000;  // coins awarded to referrer per new user
const REFERRED_BONUS    = 500;   // coins awarded to the new user on first claim

module.exports = {
  data: new SlashCommandBuilder()
    .setName('referral')
    .setDescription('View your referral link and see who you have referred'),

  async execute(interaction) {
    try {
      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);

      const referralCode = `${interaction.guildId}-${interaction.user.id}`;
      const referrals    = user.referrals || [];

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('🤝 Referral Program')
        .setDescription(
          `Share your referral code with friends!\nWhen they join and use \`/referral-claim ${referralCode}\`, **you both earn coins**!`
        )
        .addFields(
          { name: '🔑 Your Referral Code', value: `\`${referralCode}\``,                                  inline: false },
          { name: '💰 Your Reward',        value: `**${formatNumber(REFERRAL_BONUS)}** coins per referral`, inline: true  },
          { name: '🎁 Their Reward',       value: `**${formatNumber(REFERRED_BONUS)}** coins on claim`,     inline: true  },
          { name: '👥 Total Referrals',    value: `**${referrals.length}**`,                               inline: true  },
        )
        .setTimestamp();

      if (user.referrerId) {
        embed.addFields({ name: '🤝 Referred By', value: `<@${user.referrerId}>`, inline: true });
      }

      if (referrals.length > 0) {
        const list = referrals.slice(0, 10).map((id, i) => `${i + 1}. <@${id}>`).join('\n');
        embed.addFields({ name: `👥 Your Referrals (${referrals.length})`, value: list, inline: false });
      }

      embed.setFooter({ text: 'Use /referral-claim <code> to claim a referral bonus' });
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
