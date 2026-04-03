const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');
const config = require('../../config/config');

const GUILDS_FILE = require('path').join(__dirname, '../../data/guilds.json');
const fs = require('fs');

function loadGuilds() {
  if (!fs.existsSync(GUILDS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(GUILDS_FILE, 'utf8')); } catch { return {}; }
}
function saveGuilds(data) {
  fs.mkdirSync(require('path').dirname(GUILDS_FILE), { recursive: true });
  fs.writeFileSync(GUILDS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guild-create')
    .setDescription(`Create a new guild/clan (costs ${config.guilds.createCost.toLocaleString()} coins)`)
    .addStringOption(o => o.setName('name').setDescription('Guild name').setRequired(true).setMaxLength(config.guilds.maxNameLength))
    .addStringOption(o => o.setName('description').setDescription('Short guild description').setRequired(false).setMaxLength(100)),

  async execute(interaction) {
    try {
      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);

      if (user.banned)
        return interaction.reply({ embeds: [errorEmbed('You are banned from the economy.')], ephemeral: true });

      if (user.guildId_economy)
        return interaction.reply({ embeds: [errorEmbed('You are already in a guild. Leave it first with `/guild-leave`.')], ephemeral: true });

      if ((user.wallet || 0) < config.guilds.createCost)
        return interaction.reply({ embeds: [errorEmbed(`You need **${formatNumber(config.guilds.createCost)}** coins to create a guild. You have **${formatNumber(user.wallet)}**.`)], ephemeral: true });

      const name = interaction.options.getString('name').trim();
      const desc = interaction.options.getString('description') || 'No description set.';

      const guilds = loadGuilds();

      // Check name uniqueness within Discord guild
      const existing = Object.values(guilds).find(g => g.discordGuildId === interaction.guildId && g.name.toLowerCase() === name.toLowerCase());
      if (existing)
        return interaction.reply({ embeds: [errorEmbed(`A guild named **${name}** already exists.`)], ephemeral: true });

      const guildId = `${interaction.guildId}-${Date.now()}`;
      guilds[guildId] = {
        id:             guildId,
        discordGuildId: interaction.guildId,
        name,
        description:    desc,
        ownerId:        interaction.user.id,
        members:        [interaction.user.id],
        treasury:       0,
        createdAt:      new Date().toISOString(),
      };
      saveGuilds(guilds);

      user.wallet -= config.guilds.createCost;
      user.totalSpent = (user.totalSpent || 0) + config.guilds.createCost;
      user.guildId_economy = guildId;

      // Award guild founder achievement
      if (!user.achievements) user.achievements = [];
      if (!user.achievements.some(a => (a.id || a) === 'guild_founder')) {
        user.achievements.push({ id: 'guild_founder', name: '🏰 Guild Founder', unlockedAt: new Date().toISOString() });
      }

      db.saveUser(user);

      return interaction.reply({
        embeds: [successEmbed('Guild Created! 🏰', `**${name}** has been founded!\nCost: **${formatNumber(config.guilds.createCost)}** coins\nUse \`/guild-info\` to view your guild.`)],
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
