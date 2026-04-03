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
    .setName('guild-info')
    .setDescription('View info about your guild or another guild')
    .addStringOption(o => o.setName('name').setDescription('Guild name (default: your guild)').setRequired(false)),

  async execute(interaction) {
    try {
      const user   = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      const guilds = loadGuilds();
      const name   = interaction.options.getString('name');

      let guild;
      if (name) {
        guild = Object.values(guilds).find(g => g.discordGuildId === interaction.guildId && g.name.toLowerCase() === name.toLowerCase());
      } else {
        guild = user.guildId_economy ? guilds[user.guildId_economy] : null;
      }

      if (!guild)
        return interaction.reply({ embeds: [errorEmbed(name ? `No guild named **${name}** found.` : 'You are not in a guild. Use `/guild-create` or `/guild-join`.')], ephemeral: true });

      const memberMentions = guild.members.slice(0, 20).map(id => `<@${id}>`).join(', ');
      const overflow       = guild.members.length > 20 ? ` +${guild.members.length - 20} more` : '';

      const embed = new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle(`🏰 ${guild.name}`)
        .setDescription(guild.description || 'No description.')
        .addFields(
          { name: '👑 Owner',       value: `<@${guild.ownerId}>`,                                    inline: true },
          { name: '👥 Members',     value: `${guild.members.length} / ${config.guilds.maxMembers}`,  inline: true },
          { name: '🏦 Treasury',    value: formatNumber(guild.treasury || 0) + ' coins',             inline: true },
          { name: '📅 Founded',     value: new Date(guild.createdAt).toDateString(),                 inline: true },
          { name: '🆔 Guild ID',    value: `\`${guild.id}\``,                                        inline: true },
          { name: `👥 Member List`, value: memberMentions + overflow || 'None',                      inline: false },
        )
        .setFooter({ text: 'Use /guild-contribute to add coins to the treasury' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
