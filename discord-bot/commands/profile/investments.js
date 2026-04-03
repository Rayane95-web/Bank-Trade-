const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('investments')
    .setDescription('View your active investments and claim matured returns'),

  async execute(interaction) {
    try {
      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);

      if (!user.investments) user.investments = [];

      const now     = Date.now();
      const active  = user.investments.filter(i => !i.claimed && new Date(i.matureAt).getTime() > now);
      const matured = user.investments.filter(i => !i.claimed && new Date(i.matureAt).getTime() <= now);

      // Auto-claim matured investments
      let totalClaimed = 0;
      for (const inv of matured) {
        const total = inv.amount + inv.returnAmt;
        user.wallet    += total;
        user.totalEarned += inv.returnAmt;
        inv.claimed    = true;
        totalClaimed   += total;
      }
      if (matured.length > 0) db.saveUser(user);

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('📈 Your Investment Portfolio')
        .setTimestamp();

      if (matured.length > 0) {
        embed.setDescription(`✅ **${matured.length}** investment(s) matured and were auto-claimed!\nTotal received: **${formatNumber(totalClaimed)}** coins`);
      }

      if (active.length === 0 && matured.length === 0) {
        embed.setDescription('You have no investments. Use `/invest` to start earning passive income!');
      } else if (active.length > 0) {
        const lines = active.map(inv => {
          const matureTs = Math.floor(new Date(inv.matureAt).getTime() / 1000);
          return `**${inv.name}**\n  💰 Invested: ${formatNumber(inv.amount)} | 📈 Return: +${formatNumber(inv.returnAmt)}\n  ⏱ Matures: <t:${matureTs}:R>`;
        });
        embed.addFields({ name: `📊 Active Investments (${active.length})`, value: lines.join('\n\n').slice(0, 1024), inline: false });
      }

      const totalInvested = active.reduce((s, i) => s + i.amount, 0);
      const totalReturn   = active.reduce((s, i) => s + i.returnAmt, 0);
      if (active.length > 0) {
        embed.addFields(
          { name: '💰 Total Invested', value: formatNumber(totalInvested), inline: true },
          { name: '📈 Expected Return', value: `+${formatNumber(totalReturn)}`, inline: true },
          { name: '💎 Total Value',    value: formatNumber(totalInvested + totalReturn), inline: true },
        );
      }

      embed.setFooter({ text: 'Matured investments are auto-claimed when you run /investments' });
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
