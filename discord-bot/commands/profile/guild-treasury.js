const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');
const config = require('../../config/config');
const path = require('path');
const fs   = require('fs');

const GUILDS_FILE = path.join(__dirname, '../../data/guilds.json');
function loadGuilds() {
  if (!fs.existsSync(GUILDS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(GUILDS_FILE, 'utf8')); } catch { return {}; }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guild-treasury')
    .setDescription('View your guild\'s shared treasury balance and contribution info'),

  async execute(interaction) {
    try {
      const user   = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      const guilds = loadGuilds();

      if (!user.guildId_economy || !guilds[user.guildId_economy])
        return interaction.reply({ embeds: [errorEmbed('You are not in a guild.')], ephemeral: true });

      const guild = guilds[user.guildId_economy];

      const embed = new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle(`🏦 ${guild.name} — Treasury`)
        .addFields(
          { name: '💰 Treasury Balance', value: `**${formatNumber(guild.treasury || 0)}** coins`, inline: true },
          { name: '👥 Members',          value: `${guild.members.length}`,                        inline: true },
          { name: '📊 Per-Member Share', value: guild.members.length > 0 ? `${formatNumber(Math.floor((guild.treasury || 0) / guild.members.length))} coins` : '0', inline: true },
          { name: '💸 Tax Rate',         value: `${(config.guilds.treasuryTaxRate * 100).toFixed(0)}% on contributions`, inline: true },
          { name: '🎁 Weekly Bonus',     value: `${formatNumber(config.guilds.weeklyBonus)} coins distributed to all members`, inline: true },
        )
        .setDescription('Use `/guild-contribute` to add coins to the shared treasury.')
        .setFooter({ text: 'Treasury funds are shared among all guild members' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
