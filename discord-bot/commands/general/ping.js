const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: '📡 Roundtrip', value: `\`${roundtrip}ms\``, inline: true },
        { name: '💓 WebSocket', value: `\`${interaction.client.ws.ping}ms\``, inline: true },
      )
      .setTimestamp();
    return interaction.editReply({ content: null, embeds: [embed] });
  },
};
