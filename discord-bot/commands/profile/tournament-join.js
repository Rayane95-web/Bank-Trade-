const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');
const config = require('../../config/config');
const path = require('path');
const fs   = require('fs');

const TOURNAMENT_FILE = path.join(__dirname, '../../data/tournaments.json');
function loadTournaments() {
  if (!fs.existsSync(TOURNAMENT_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(TOURNAMENT_FILE, 'utf8')); } catch { return {}; }
}
function saveTournaments(data) {
  fs.mkdirSync(path.dirname(TOURNAMENT_FILE), { recursive: true });
  fs.writeFileSync(TOURNAMENT_FILE, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tournament-join')
    .setDescription(`Join the current gambling tournament (entry fee: ${config.tournaments.entryFee.toLocaleString()} coins)`),

  async execute(interaction) {
    try {
      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);

      if (user.banned)
        return interaction.reply({ embeds: [errorEmbed('You are banned from the economy.')], ephemeral: true });

      if ((user.wallet || 0) < config.tournaments.entryFee)
        return interaction.reply({ embeds: [errorEmbed(`You need **${formatNumber(config.tournaments.entryFee)}** coins to enter. You have **${formatNumber(user.wallet)}**.`)], ephemeral: true });

      const tournaments = loadTournaments();
      const guildKey    = interaction.guildId;

      // Find or create open tournament
      let tournament = Object.values(tournaments).find(t => t.discordGuildId === guildKey && !t.started && !t.ended);
      if (!tournament) {
        const id = `${guildKey}-${Date.now()}`;
        tournament = {
          id,
          discordGuildId: guildKey,
          participants:   [],
          prizePool:      0,
          started:        false,
          ended:          false,
          createdAt:      new Date().toISOString(),
        };
        tournaments[id] = tournament;
      }

      if (tournament.participants.includes(interaction.user.id))
        return interaction.reply({ embeds: [errorEmbed('You are already registered in the current tournament.')], ephemeral: true });

      if (tournament.participants.length >= config.tournaments.maxParticipants)
        return interaction.reply({ embeds: [errorEmbed(`The tournament is full (${config.tournaments.maxParticipants} players max).`)], ephemeral: true });

      // Deduct entry fee
      user.wallet    -= config.tournaments.entryFee;
      user.totalSpent = (user.totalSpent || 0) + config.tournaments.entryFee;
      tournament.participants.push(interaction.user.id);
      tournament.prizePool += config.tournaments.entryFee;

      db.saveUser(user);
      saveTournaments(tournaments);

      const spotsLeft = config.tournaments.maxParticipants - tournament.participants.length;
      return interaction.reply({
        embeds: [successEmbed('Tournament Registered! 🏆',
          `You joined the tournament!\nEntry fee: **${formatNumber(config.tournaments.entryFee)}** coins\nPrize pool: **${formatNumber(tournament.prizePool)}** coins\nParticipants: **${tournament.participants.length}** / **${config.tournaments.maxParticipants}**\nSpots remaining: **${spotsLeft}**\n\nUse \`/tournament-info\` to view the bracket.`)],
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
