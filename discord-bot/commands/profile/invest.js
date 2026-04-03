const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invest')
    .setDescription('Invest coins for passive income returns')
    .addStringOption(o => {
      const opt = o.setName('type').setDescription('Investment type').setRequired(true);
      config.investments.forEach(inv => opt.addChoices({ name: `${inv.name} — ${inv.description}`, value: inv.id }));
      return opt;
    })
    .addIntegerOption(o => o.setName('amount').setDescription('Amount to invest').setRequired(true).setMinValue(1)),

  async execute(interaction) {
    try {
      const user   = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);

      if (user.banned)
        return interaction.reply({ embeds: [errorEmbed('You are banned from the economy.')], ephemeral: true });

      const typeId = interaction.options.getString('type');
      const amount = interaction.options.getInteger('amount');
      const invDef = config.investments.find(i => i.id === typeId);

      if (!invDef)
        return interaction.reply({ embeds: [errorEmbed('Unknown investment type.')], ephemeral: true });

      if (amount < invDef.minAmount)
        return interaction.reply({ embeds: [errorEmbed(`Minimum investment for **${invDef.name}** is **${formatNumber(invDef.minAmount)}** coins.`)], ephemeral: true });

      if (amount > invDef.maxAmount)
        return interaction.reply({ embeds: [errorEmbed(`Maximum investment for **${invDef.name}** is **${formatNumber(invDef.maxAmount)}** coins.`)], ephemeral: true });

      if ((user.wallet || 0) < amount)
        return interaction.reply({ embeds: [errorEmbed(`You only have **${formatNumber(user.wallet)}** coins in your wallet.`)], ephemeral: true });

      const matureAt  = new Date(Date.now() + invDef.duration).toISOString();
      const returnAmt = Math.floor(amount * invDef.returnRate);

      if (!user.investments) user.investments = [];
      user.investments.push({
        id:        `${typeId}-${Date.now()}`,
        type:      typeId,
        name:      invDef.name,
        amount,
        returnAmt,
        startedAt: new Date().toISOString(),
        matureAt,
        claimed:   false,
      });

      user.wallet    -= amount;
      user.totalSpent = (user.totalSpent || 0) + amount;
      db.saveUser(user);

      const matureTs = Math.floor(new Date(matureAt).getTime() / 1000);

      return interaction.reply({
        embeds: [successEmbed('Investment Made! 📈',
          `Invested **${formatNumber(amount)}** coins in **${invDef.name}**.\nExpected return: **+${formatNumber(returnAmt)}** coins (${(invDef.returnRate * 100).toFixed(0)}%)\nMatures: <t:${matureTs}:R> (<t:${matureTs}:f>)\n\nUse \`/investments\` to track your portfolio.`)],
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
