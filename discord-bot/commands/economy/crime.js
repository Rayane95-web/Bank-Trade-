const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed, cooldownEmbed } = require('../../utils/embeds');
const { formatNumber, checkCooldown, setCooldown, chance, random } = require('../../utils/helpers');
const config = require('../../config/config');

const CRIMES = [
  { name: 'Bank Heist',     win: 'You pulled off a daring bank heist',        lose: 'The alarm triggered — you barely escaped' },
  { name: 'Casino Scam',    win: 'You rigged the slot machines',               lose: 'Security caught you cheating' },
  { name: 'Counterfeiting', win: 'You passed fake bills at the market',        lose: 'A cashier spotted your fake notes' },
  { name: 'Art Forgery',    win: 'You sold a fake painting for big bucks',     lose: 'The auction house authenticated it — fake!' },
  { name: 'Hacking',        win: 'You breached a corporate server',            lose: 'You got traced — firewall counter-attacked' },
];

module.exports = {
  data: new SlashCommandBuilder().setName('crime').setDescription('Commit a high-risk, high-reward crime'),
  async execute(interaction) {
    try {
      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      if (user.banned) return interaction.reply({ embeds: [errorEmbed('You are banned from the economy.')], ephemeral: true });
      const remaining = checkCooldown(user, 'crime');
      if (remaining > 0) return interaction.reply({ embeds: [cooldownEmbed(remaining)], ephemeral: true });

      const crime      = CRIMES[random(0, CRIMES.length - 1)];
      const hasPass    = db.hasActiveItem(user, 'crime_pass');
      const crimeChance = config.economy.crimeSuccessChance + (hasPass ? 0.20 : 0);
      const success    = chance(crimeChance * 100);
      setCooldown(user, 'crime');

      if (success) {
        const earned = random(400, 1200);
        user.wallet      += earned;
        user.totalEarned += earned;
        db.saveUser(user);
        return interaction.reply({ embeds: [successEmbed('Crime Successful! 🦹‍♂️', `**${crime.name}** — ${crime.win} and got away with **${formatNumber(earned)}** coins!${hasPass ? ' *(Crime Pass active)*' : ''}`, [
          { name: '👛 Wallet', value: `\`${formatNumber(user.wallet)}\``, inline: true },
        ])] });
      } else {
        const fine = random(200, 600);
        user.wallet = Math.max(0, user.wallet - fine);
        db.saveUser(user);
        return interaction.reply({ embeds: [errorEmbed(`**${crime.name}** — ${crime.lose}. You were fined **${formatNumber(fine)}** coins. 🚔`)] });
      }
    } catch (err) { console.error(err); return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
