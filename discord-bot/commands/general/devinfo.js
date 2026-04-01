const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('devinfo')
    .setDescription('Information about the bot developer'),

  async execute(interaction) {
    const dev = config.developer;

    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle(`👨‍💻 Developer — ${dev.name}`)
      .setDescription(dev.bio)
      .addFields(
        { name: '🏷️ Discord',  value: dev.discord,                         inline: true  },
        { name: '🤖 Bot',      value: interaction.client.user.username,     inline: true  },
        { name: '🔢 Version',  value: config.version,                      inline: true  },
        { name: '⏱️ Uptime',   value: formatUptime(interaction.client.uptime), inline: true },
        { name: '🌐 Servers',  value: `${interaction.client.guilds.cache.size}`, inline: true },
        { name: '👥 Users',    value: `${interaction.client.users.cache.size}`,  inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'Thanks for using this bot! ❤️' });

    if (dev.avatarUrl) embed.setThumbnail(dev.avatarUrl);

    // Build link buttons only if values are set
    const buttons = [];
    if (dev.github)  buttons.push(new ButtonBuilder().setLabel('GitHub').setEmoji('🐙').setStyle(ButtonStyle.Link).setURL(dev.github));
    if (dev.website) buttons.push(new ButtonBuilder().setLabel('Website').setEmoji('🌐').setStyle(ButtonStyle.Link).setURL(dev.website));

    const payload = { embeds: [embed] };
    if (buttons.length) payload.components = [new ActionRowBuilder().addComponents(...buttons)];

    return interaction.reply(payload);
  },
};

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}d ${h}h ${m}m ${sec}s`;
}
