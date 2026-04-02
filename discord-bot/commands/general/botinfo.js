const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config/config');

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}d ${h}h ${m}m ${sec}s`;
}

module.exports = {
  data: new SlashCommandBuilder().setName('botinfo').setDescription('View information about the bot'),

  async execute(interaction) {
    const client = interaction.client;
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🤖 Bot Information')
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { name: '🏷️ Name', value: client.user.username, inline: true },
        { name: '🔢 Version', value: config.version, inline: true },
        { name: '👨‍💻 Developer', value: config.developer.name, inline: true },
        { name: '⏱️ Uptime', value: formatUptime(client.uptime), inline: true },
        { name: '🌐 Servers', value: `${client.guilds.cache.size}`, inline: true },
        { name: '👥 Users', value: `${client.users.cache.size}`, inline: true },
        { name: '📡 Ping', value: `${client.ws.ping}ms`, inline: true },
        { name: '📦 discord.js', value: 'v14', inline: true },
        { name: '🟢 Node.js', value: process.version, inline: true },
      )
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  },
};
