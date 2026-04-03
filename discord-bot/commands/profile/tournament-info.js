const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');
const config = require('../../config/config');
const path = require('path');
const fs   = require('fs');

const TOURNAMENT_FILE = path.join(__dirname, '../../data/tournaments.json');
function loadTournaments() {
  if (!fs.existsSync(TOURNAMENT_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(TOURNAMENT_FILE, 'utf8')); } catch { return {}; }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tournament-info')
    .setDescription('View the current tournament bracket, participants, and prize pool'),

  async execute(interaction) {
    try {
      const tournaments = loadTournaments();
      const tournament  = Object.values(tournaments).find(t => t.discordGuildId === interaction.guildId && !t.ended);

      if (!tournament) {
        const embed = new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle('🏆 Tournament')
          .setDescription('No active tournament right now.\nUse `/tournament-join` to start registering for the next one!')
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      const participants = tournament.participants;
      const spotsLeft    = config.tournaments.maxParticipants - participants.length;
      const prizes       = config.tournaments.prizePool;

      const embed = new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle('🏆 Current Tournament')
        .addFields(
          { name: '👥 Participants',   value: `${participants.length} / ${config.tournaments.maxParticipants}`, inline: true },
          { name: '💰 Prize Pool',     value: formatNumber(tournament.prizePool) + ' coins',                    inline: true },
          { name: '🎯 Status',         value: tournament.started ? '⚔️ In Progress' : `⏳ Registering (${spotsLeft} spots left)`, inline: true },
          { name: '🥇 1st Place',      value: formatNumber(Math.floor(tournament.prizePool * prizes[1])) + ' coins', inline: true },
          { name: '🥈 2nd Place',      value: formatNumber(Math.floor(tournament.prizePool * prizes[2])) + ' coins', inline: true },
          { name: '🥉 3rd Place',      value: formatNumber(Math.floor(tournament.prizePool * prizes[3])) + ' coins', inline: true },
          { name: '🎮 Games',          value: config.tournaments.games.join(', '),                              inline: true },
          { name: '📅 Created',        value: new Date(tournament.createdAt).toDateString(),                    inline: true },
        )
        .setTimestamp();

      if (participants.length > 0) {
        const list = participants.slice(0, 16).map((id, i) => `${i + 1}. <@${id}>`).join('\n');
        embed.addFields({ name: '📋 Registered Players', value: list, inline: false });
      }

      embed.setFooter({ text: `Tournament ID: ${tournament.id}` });
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
