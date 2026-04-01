const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { formatNumber, randomFloat } = require('../../utils/helpers');
const { trackQuest } = require('../../utils/questTracker');
const config = require('../../config/config');

const activeSessions = new Set();

function crashPoint() {
  const r = Math.random();
  if (r < 0.04) return 1.00;
  return Math.max(1.00, 0.96 / (1 - r));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('crash').setDescription('Bet on a rising multiplier — cash out before it crashes!')
    .addIntegerOption(o => o.setName('bet').setDescription('Bet amount').setRequired(true).setMinValue(10)),
  async execute(interaction) {
    try {
      const bet  = interaction.options.getInteger('bet');
      if (activeSessions.has(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('You already have an active Crash game!')], ephemeral: true });
      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      if (user.banned)       return interaction.reply({ embeds: [errorEmbed('You are banned.')], ephemeral: true });
      if (user.wallet < bet) return interaction.reply({ embeds: [errorEmbed(`You only have **${formatNumber(user.wallet)}** coins.`)], ephemeral: true });

      activeSessions.add(interaction.user.id);
      user.wallet -= bet; user.stats.gamesPlayed++; user.stats.totalGambled += bet;
      db.saveUser(user);

      const cp = crashPoint();
      let multi = 1.00, cashedOut = false, crashed = false;

      const mkEmbed = (m, status) => new EmbedBuilder()
        .setColor(status === 'active' ? config.colors.warning : status === 'won' ? config.colors.success : config.colors.error)
        .setTitle('🚀 CRASH')
        .setDescription(
          status === 'active'
            ? `**Multiplier: ${m.toFixed(2)}x** 📈\nBet: **${formatNumber(bet)}** | Potential: **${formatNumber(Math.floor(bet * m))}**\n\n⚠️ Cash out before it crashes!`
            : status === 'won'
            ? `✅ **Cashed out at ${m.toFixed(2)}x!**\nWon **${formatNumber(Math.floor(bet * m))}** coins! *(crashed at ${cp.toFixed(2)}x)*`
            : `💥 **CRASHED at ${cp.toFixed(2)}x!**\nYou lost **${formatNumber(bet)}** coins.`
        ).setTimestamp();

      const row   = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('crash_cashout').setLabel('💰 Cash Out').setStyle(ButtonStyle.Success));
      const reply = await interaction.reply({ embeds: [mkEmbed(multi, 'active')], components: [row], fetchReply: true });

      const collector = reply.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id && i.customId === 'crash_cashout', time: 30000, max: 1 });

      const tick = setInterval(async () => {
        if (cashedOut || crashed) return clearInterval(tick);
        multi = parseFloat((multi + randomFloat(0.05, 0.25)).toFixed(2));
        if (multi >= cp) {
          crashed = true; clearInterval(tick); collector.stop('crashed');
          activeSessions.delete(interaction.user.id);
          trackQuest(user, 'gamble'); db.saveUser(user);
          await reply.edit({ embeds: [mkEmbed(cp, 'crashed')], components: [] }).catch(() => {});
        } else {
          await reply.edit({ embeds: [mkEmbed(multi, 'active')], components: [row] }).catch(() => {});
        }
      }, 1500);

      collector.on('collect', async btn => {
        if (cashedOut || crashed) return;
        cashedOut = true; clearInterval(tick); activeSessions.delete(interaction.user.id);
        const win = Math.floor(bet * multi);
        user.wallet += win; user.totalEarned += win;
        if (win > bet) { user.stats.gamesWon++; user.stats.totalWon += win; }
        trackQuest(user, 'gamble'); db.saveUser(user);
        await btn.update({ embeds: [mkEmbed(multi, 'won')], components: [] });
      });

      collector.on('end', (_, reason) => {
        clearInterval(tick); activeSessions.delete(interaction.user.id);
        if (!cashedOut && !crashed) { crashed = true; reply.edit({ embeds: [mkEmbed(cp, 'crashed')], components: [] }).catch(() => {}); }
      });
    } catch (err) { console.error(err); activeSessions.delete(interaction.user.id); return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
