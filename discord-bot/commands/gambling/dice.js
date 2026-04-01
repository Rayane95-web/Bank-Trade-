const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { formatNumber, random } = require('../../utils/helpers');
const { trackQuest } = require('../../utils/questTracker');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice').setDescription('Roll a die vs the bot — higher wins')
    .addIntegerOption(o => o.setName('bet').setDescription('Bet amount').setRequired(true).setMinValue(10)),
  async execute(interaction) {
    try {
      const bet  = interaction.options.getInteger('bet');
      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      if (user.banned)       return interaction.reply({ embeds: [errorEmbed('You are banned.')], ephemeral: true });
      if (user.wallet < bet) return interaction.reply({ embeds: [errorEmbed(`You only have **${formatNumber(user.wallet)}** coins.`)], ephemeral: true });

      const p = random(1, 6), b = random(1, 6);
      const won = p > b, tie = p === b;
      user.stats.gamesPlayed++; user.stats.totalGambled += bet;
      trackQuest(user, 'gamble');
      if (won)      { user.wallet += bet; user.totalEarned += bet; user.stats.gamesWon++; user.stats.totalWon += bet; }
      else if (!tie){ user.wallet -= bet; }
      db.saveUser(user);

      const faces = ['','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣'];
      const embed = new EmbedBuilder()
        .setColor(won ? config.colors.success : tie ? config.colors.warning : config.colors.error)
        .setTitle('🎲 Dice Roll')
        .addFields(
          { name: '🧑 You', value: faces[p], inline: true },
          { name: '🤖 Bot', value: faces[b], inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: 'Result', value: tie ? "🤝 Tie — bet returned!" : won ? `✅ You win **${formatNumber(bet)}** coins!` : `❌ You lose **${formatNumber(bet)}** coins.`, inline: false },
          { name: '👛 Wallet', value: `\`${formatNumber(user.wallet)}\``, inline: true },
        ).setTimestamp();
      return interaction.reply({ embeds: [embed] });
    } catch (err) { console.error(err); return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
