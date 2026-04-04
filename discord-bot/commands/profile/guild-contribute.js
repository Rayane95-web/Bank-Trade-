const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');
const config = require('../../config/config');
const path = require('path');
const fs   = require('fs');

const GUILDS_FILE = path.join(__dirname, '../../data/guilds.json');
function loadGuilds() {
  if (!fs.existsSync(GUILDS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(GUILDS_FILE, 'utf8')); } catch { return {}; }
}
function saveGuilds(data) {
  fs.mkdirSync(path.dirname(GUILDS_FILE), { recursive: true });
  fs.writeFileSync(GUILDS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guild-contribute')
    .setDescription('Contribute coins to your guild\'s shared treasury')
    .addIntegerOption(o => o.setName('amount').setDescription('Amount to contribute').setRequired(true).setMinValue(1)),

  async execute(interaction) {
    try {
      const user   = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      const guilds = loadGuilds();

      if (user.banned)
        return interaction.reply({ embeds: [errorEmbed('You are banned from the economy.')], ephemeral: true });

      if (!user.guildId_economy || !guilds[user.guildId_economy])
        return interaction.reply({ embeds: [errorEmbed('You are not in a guild.')], ephemeral: true });

      const amount = interaction.options.getInteger('amount');
      if ((user.wallet || 0) < amount)
        return interaction.reply({ embeds: [errorEmbed(`You only have **${formatNumber(user.wallet)}** coins in your wallet.`)], ephemeral: true });

      const tax        = Math.floor(amount * config.guilds.treasuryTaxRate);
      const netAmount  = amount - tax;
      const guild      = guilds[user.guildId_economy];

      user.wallet    -= amount;
      user.totalSpent = (user.totalSpent || 0) + amount;
      guild.treasury  = (guild.treasury || 0) + netAmount;

      db.saveUser(user);
      saveGuilds(guilds);

      // Track weekly deposit for guild leaderboard
      db.recordGuildDeposit(user.guildId_economy, netAmount);

      return interaction.reply({
        embeds: [successEmbed('Contribution Made! 🏦',
          `You contributed **${formatNumber(amount)}** coins to **${guild.name}**.\nTax (${(config.guilds.treasuryTaxRate * 100).toFixed(0)}%): **-${formatNumber(tax)}** coins\nNet added to treasury: **+${formatNumber(netAmount)}** coins\nNew treasury: **${formatNumber(guild.treasury)}** coins`)],
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
