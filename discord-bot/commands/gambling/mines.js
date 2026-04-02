const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { formatNumber, random } = require('../../utils/helpers');
const { trackQuest } = require('../../utils/questTracker');
const config = require('../../config/config');

const activeSessions = new Set();

function genGrid(mines) {
  const g = Array(25).fill(false);
  let p = 0;
  while (p < mines) { const i = random(0, 24); if (!g[i]) { g[i] = true; p++; } }
  return g;
}

function calcMulti(revealed, mines) {
  const safe = 25 - mines;
  let m = 1.0;
  for (let i = 0; i < revealed; i++) m *= (safe - i) / (25 - i);
  return Math.max(1.0, (1 / m) * 0.97);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mines').setDescription('Click tiles to reveal gems — avoid the mines!')
    .addIntegerOption(o => o.setName('bet').setDescription('Bet amount').setRequired(true).setMinValue(10))
    .addIntegerOption(o => o.setName('mines').setDescription('Number of mines (1–24)').setRequired(true).setMinValue(1).setMaxValue(24)),
  async execute(interaction) {
    try {
      const bet   = interaction.options.getInteger('bet');
      const mineN = interaction.options.getInteger('mines');
      if (activeSessions.has(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('You already have an active Mines game!')], ephemeral: true });
      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      if (user.banned)       return interaction.reply({ embeds: [errorEmbed('You are banned.')], ephemeral: true });
      if (user.wallet < bet) return interaction.reply({ embeds: [errorEmbed(`You only have **${formatNumber(user.wallet)}** coins.`)], ephemeral: true });

      activeSessions.add(interaction.user.id);
      user.wallet -= bet; user.stats.gamesPlayed++; user.stats.totalGambled += bet;
      db.saveUser(user);

      const grid     = genGrid(mineN);
      const revealed = Array(25).fill(false);
      let revCount   = 0, over = false;

      const mkComponents = (disabled = false, showAll = false) => {
        const rows = [];
        for (let r = 0; r < 5; r++) {
          const row = new ActionRowBuilder();
          const cols = r === 4 ? 4 : 5;
          for (let c = 0; c < cols; c++) {
            const idx = r * 5 + c;
            let label = '⬜', style = ButtonStyle.Secondary, dis = disabled;
            if (revealed[idx] || showAll) {
              label = grid[idx] ? '💣' : '💎';
              style = grid[idx] ? ButtonStyle.Danger : ButtonStyle.Success;
              dis   = true;
            }
            row.addComponents(new ButtonBuilder().setCustomId(`mine_${idx}`).setLabel(label).setStyle(style).setDisabled(dis));
          }
          if (r === 4) {
            row.addComponents(
              new ButtonBuilder().setCustomId('mine_cashout').setLabel(`💰 Cash Out (${calcMulti(revCount, mineN).toFixed(2)}x)`).setStyle(ButtonStyle.Primary).setDisabled(disabled || revCount === 0)
            );
          }
          rows.push(row);
        }
        return rows;
      };

      const mkEmbed = (status = 'active') => {
        const m = calcMulti(revCount, mineN);
        return new EmbedBuilder()
          .setColor(status === 'active' ? config.colors.warning : status === 'won' ? config.colors.success : config.colors.error)
          .setTitle('💣 Mines')
          .setDescription(
            status === 'active'
              ? `Bet: **${formatNumber(bet)}** | Mines: **${mineN}** | Revealed: **${revCount}**\nMultiplier: **${m.toFixed(2)}x** | Potential: **${formatNumber(Math.floor(bet * m))}**`
              : status === 'won'
              ? `✅ Cashed out at **${m.toFixed(2)}x** — Won **${formatNumber(Math.floor(bet * m))}** coins!`
              : `💥 Hit a mine! Lost **${formatNumber(bet)}** coins.`
          ).setTimestamp();
      };

      const reply = await interaction.reply({ embeds: [mkEmbed()], components: mkComponents(), fetchReply: true });

      const collector = reply.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, time: 120000 });

      collector.on('collect', async btn => {
        await btn.deferUpdate();
        if (over) return;

        if (btn.customId === 'mine_cashout') {
          over = true; collector.stop();
          const win = Math.floor(bet * calcMulti(revCount, mineN));
          user.wallet += win; user.totalEarned += win;
          if (win > bet) { user.stats.gamesWon++; user.stats.totalWon += win; }
          activeSessions.delete(interaction.user.id);
          trackQuest(user, 'gamble'); db.saveUser(user);
          await btn.editReply({ embeds: [mkEmbed('won')], components: mkComponents(true) });
          return;
        }

        const idx = parseInt(btn.customId.replace('mine_', ''));
        revealed[idx] = true;

        if (grid[idx]) {
          over = true; collector.stop(); activeSessions.delete(interaction.user.id);
          trackQuest(user, 'gamble'); db.saveUser(user);
          await btn.editReply({ embeds: [mkEmbed('lost')], components: mkComponents(true, true) });
        } else {
          revCount++;
          if (25 - mineN - revCount === 0) {
            over = true; collector.stop(); activeSessions.delete(interaction.user.id);
            const win = Math.floor(bet * calcMulti(revCount, mineN));
            user.wallet += win; user.totalEarned += win; user.stats.gamesWon++;
            trackQuest(user, 'gamble'); db.saveUser(user);
            await btn.editReply({ embeds: [mkEmbed('won')], components: mkComponents(true, true) });
          } else {
            await btn.editReply({ embeds: [mkEmbed()], components: mkComponents() });
          }
        }
      });

      collector.on('end', (_, reason) => {
        activeSessions.delete(interaction.user.id);
        if (!over) {
          over = true;
          if (revCount > 0) {
            const win = Math.floor(bet * calcMulti(revCount, mineN));
            user.wallet += win; db.saveUser(user);
            reply.edit({ embeds: [mkEmbed('won')], components: mkComponents(true) }).catch(() => {});
          } else {
            reply.edit({ embeds: [mkEmbed('lost')], components: mkComponents(true) }).catch(() => {});
          }
        }
      });
    } catch (err) { console.error(err); activeSessions.delete(interaction.user.id); return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
