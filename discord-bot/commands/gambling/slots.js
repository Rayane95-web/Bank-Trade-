const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { formatNumber, random } = require('../../utils/helpers');
const { trackQuest } = require('../../utils/questTracker');
const config = require('../../config/config');

const SYMBOLS = [
  { emoji: '🍒', weight: 30, multiplier: 2   },
  { emoji: '🍋', weight: 25, multiplier: 2.5 },
  { emoji: '🍊', weight: 20, multiplier: 3   },
  { emoji: '🍇', weight: 15, multiplier: 4   },
  { emoji: '💎', weight: 7,  multiplier: 8   },
  { emoji: '7️⃣', weight: 3,  multiplier: 15  },
];

function spin() {
  const total = SYMBOLS.reduce((a, s) => a + s.weight, 0);
  let r = Math.random() * total;
  for (const s of SYMBOLS) { r -= s.weight; if (r <= 0) return s; }
  return SYMBOLS[0];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slots').setDescription('Spin the slot machine')
    .addIntegerOption(o => o.setName('bet').setDescription('Bet amount').setRequired(true).setMinValue(10)),
  async execute(interaction) {
    try {
      const bet  = interaction.options.getInteger('bet');
      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      if (user.banned)       return interaction.reply({ embeds: [errorEmbed('You are banned.')], ephemeral: true });
      if (user.wallet < bet) return interaction.reply({ embeds: [errorEmbed(`You only have **${formatNumber(user.wallet)}** coins.`)], ephemeral: true });
      await interaction.deferReply();

      const reels = [spin(), spin(), spin()];
      let result = { win: false, multiplier: 0, type: '❌ No match' };
      if (reels[0].emoji === reels[1].emoji && reels[1].emoji === reels[2].emoji)
        result = { win: true, multiplier: reels[0].multiplier, type: '🎰 JACKPOT! Three of a kind!' };
      else if (reels[0].emoji === reels[1].emoji || reels[1].emoji === reels[2].emoji || reels[0].emoji === reels[2].emoji)
        result = { win: true, multiplier: 1.5, type: '✨ Two of a kind!' };

      user.stats.gamesPlayed++; user.stats.totalGambled += bet;
      trackQuest(user, 'gamble');
      let net = -bet;
      if (result.win) {
        const w = Math.floor(bet * result.multiplier);
        net = w; user.wallet += w; user.totalEarned += w;
        user.stats.gamesWon++; user.stats.totalWon += w;
      } else { user.wallet -= bet; }
      db.saveUser(user);

      const embed = new EmbedBuilder()
        .setColor(result.win ? config.colors.success : config.colors.error)
        .setTitle('🎰 Slot Machine')
        .setDescription(`┌──────────────────┐\n│  ${reels.map(r => r.emoji).join('  |  ')}  │\n└──────────────────┘\n\n${result.type}`)
        .addFields(
          { name: '💸 Bet',  value: `\`${formatNumber(bet)}\``,             inline: true },
          { name: result.win ? '🏆 Won' : '💀 Lost', value: `\`${formatNumber(Math.abs(net))}\``, inline: true },
          { name: '👛 Wallet', value: `\`${formatNumber(user.wallet)}\``,    inline: true },
        ).setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    } catch (err) { console.error(err); return interaction.editReply({ embeds: [errorEmbed('Something went wrong.')] }); }
  },
};
