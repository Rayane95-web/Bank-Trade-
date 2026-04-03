const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
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
    .setName('guild-join')
    .setDescription('Join an existing guild by name')
    .addStringOption(o => o.setName('name').setDescription('Guild name to join').setRequired(true)),

  async execute(interaction) {
    try {
      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);

      if (user.banned)
        return interaction.reply({ embeds: [errorEmbed('You are banned from the economy.')], ephemeral: true });

      if (user.guildId_economy)
        return interaction.reply({ embeds: [errorEmbed('You are already in a guild. Leave it first.')], ephemeral: true });

      const name   = interaction.options.getString('name').trim();
      const guilds = loadGuilds();
      const guild  = Object.values(guilds).find(g => g.discordGuildId === interaction.guildId && g.name.toLowerCase() === name.toLowerCase());

      if (!guild)
        return interaction.reply({ embeds: [errorEmbed(`No guild named **${name}** found.`)], ephemeral: true });

      if (guild.members.length >= config.guilds.maxMembers)
        return interaction.reply({ embeds: [errorEmbed(`**${guild.name}** is full (${config.guilds.maxMembers} members max).`)], ephemeral: true });

      guild.members.push(interaction.user.id);
      saveGuilds(guilds);

      user.guildId_economy = guild.id;
      db.saveUser(user);

      return interaction.reply({
        embeds: [successEmbed('Guild Joined! 🏰', `You joined **${guild.name}**!\nMembers: **${guild.members.length}** / **${config.guilds.maxMembers}**`)],
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
