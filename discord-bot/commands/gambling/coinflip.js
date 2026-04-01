const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { formatNumber, chance } = require('../../utils/helpers');
const { trackQuest } = require('../../utils/questTracker');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip').setDescription('Flip a coin and bet on the result')
    .addIntegerOption(o => o.setName('bet').setDescription('Bet amount').setRequired(true).setMinValue(10))
    .addStringOption(o => o.setName('choice').setDescription('Heads or tails').setRequired(true)
      .addChoices({ name: '🪙 Heads', value: 'heads' }, { name: '🪙 Tails', value: 'tails' })),
  async execute(interaction) {
    try {
      const bet    = interaction.options.getInteger('bet');
      const choice = interaction.options.getString('choice');
      const user   = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      if (user.banned)       return interaction.reply({ embeds: [errorEmbed('You are banned.')], ephemeral: true });
      if (user.wallet < bet) return interaction.reply({ embeds: [errorEmbed(`You only have **${formatNumber(user.wallet)}** coins.`)], ephemeral: true });

      const winChance = db.hasActiveItem(user, 'lucky_charm') ? 55 : 50;
      const result    = chance(winChance) ? 'heads' : 'tails';
      const won       = result === choice;

      user.stats.gamesPlayed++;
      user.stats.totalGambled += bet;
      trackQuest(user, 'gamble');

      if (won) { user.wallet += bet; user.totalEarned += bet; user.stats.gamesWon++; user.stats.totalWon += bet; }
      else     { user.wallet -= bet; }
      db.saveUser(user);

      const embed = new EmbedBuilder()
        .setColor(won ? config.colors.success : config.colors.error)
        .setTitle(`${result === 'heads' ? '🟡' : '⚪'} Coin Flip — ${result.toUpperCase()}`)
        .setDescription(won ? `✅ Picked **${choice}** — won **${formatNumber(bet)}** coins!` : `❌ Picked **${choice}** — lost **${formatNumber(bet)}** coins.`)
        .addFields({ name: '👛 Wallet', value: `\`${formatNumber(user.wallet)}\``, inline: true })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    } catch (err) { console.error(err); return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
