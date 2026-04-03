const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { isDeveloper, formatNumber } = require('../../utils/helpers');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-list-users')
    .setDescription('[DEV] List all registered users with key stats')
    .addStringOption(o => o.setName('sort').setDescription('Sort by').setRequired(false)
      .addChoices(
        { name: '💰 Wealth',      value: 'wealth' },
        { name: '⭐ Level',       value: 'level'  },
        { name: '📅 Newest',      value: 'newest' },
        { name: '📅 Oldest',      value: 'oldest' },
      ))
    .addIntegerOption(o => o.setName('page').setDescription('Page number').setRequired(false).setMinValue(1)),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id))
      return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });

    try {
      const sort  = interaction.options.getString('sort') || 'wealth';
      const page  = (interaction.options.getInteger('page') || 1) - 1;
      const PER   = 15;

      let users = db.getAllUsers(interaction.guildId);
      if (sort === 'wealth') users.sort((a, b) => (b.wallet + b.bank) - (a.wallet + a.bank));
      else if (sort === 'level')  users.sort((a, b) => b.level - a.level);
      else if (sort === 'newest') users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      else if (sort === 'oldest') users.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      const totalPages = Math.max(1, Math.ceil(users.length / PER));
      const slice = users.slice(page * PER, page * PER + PER);

      const lines = slice.map((u, i) => {
        const rank  = page * PER + i + 1;
        const worth = formatNumber((u.wallet || 0) + (u.bank || 0));
        const ban   = u.banned ? ' 🚫' : '';
        return `**${rank}.** \`${u.username}\` — Lv.**${u.level}** | 💰 ${worth}${ban}`;
      });

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`👥 User List — ${interaction.guild.name}`)
        .setDescription(lines.join('\n') || 'No users on this page.')
        .setFooter({ text: `${users.length} total users • Page ${page + 1}/${totalPages} • Sort: ${sort}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
