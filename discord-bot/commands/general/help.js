const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config/config');

const categories = {
  economy: {
    emoji: '💰', name: 'Economy',
    commands: [
      { name: '/balance [user]',    desc: 'Check wallet, bank & net worth' },
      { name: '/deposit <amount>',  desc: 'Move coins from wallet → bank' },
      { name: '/withdraw <amount>', desc: 'Move coins from bank → wallet' },
      { name: '/pay <user> <amt>',  desc: 'Send coins to another user' },
      { name: '/daily',             desc: 'Claim daily reward (24 h cooldown, streak bonus)' },
      { name: '/work',              desc: 'Work a job for coins (1 h cooldown)' },
      { name: '/rob <user>',        desc: '40% chance to steal from a user\'s wallet' },
      { name: '/crime',             desc: 'High-risk crime for bigger payouts (2 h cooldown)' },
    ],
  },
  gambling: {
    emoji: '🎮', name: 'Gambling',
    commands: [
      { name: '/crash <bet>',            desc: 'Bet on a rising multiplier — cash out before crash!' },
      { name: '/mines <bet> <mines>',    desc: 'Click safe tiles on a 5×5 grid, avoid the bombs' },
      { name: '/coinflip <bet> <side>',  desc: 'Heads or tails — 50/50 bet' },
      { name: '/slots <bet>',            desc: '3-reel slot machine with weighted symbols' },
      { name: '/dice <bet>',             desc: 'Roll a die vs the bot — higher roll wins' },
    ],
  },
  profile: {
    emoji: '👤', name: 'Profile & Social',
    commands: [
      { name: '/profile [user]',    desc: 'View a full profile card image (canvas)' },
      { name: '/leaderboard',       desc: 'Server wealth & level rankings (toggle with buttons)' },
      { name: '/inventory',         desc: 'View your active and owned items' },
      { name: '/shop',              desc: 'Browse all purchasable items' },
      { name: '/buy <item_id>',     desc: 'Purchase an item from the shop' },
      { name: '/quests',            desc: 'View your daily quest progress' },
      { name: '/claim',             desc: 'Claim coins & XP for completed quests' },
    ],
  },
  general: {
    emoji: '⚙️', name: 'General',
    commands: [
      { name: '/ping',    desc: 'Bot roundtrip & WebSocket latency' },
      { name: '/botinfo', desc: 'Bot stats — servers, users, uptime, version' },
      { name: '/devinfo', desc: 'Info about the developer — links & bio' },
      { name: '/help',    desc: 'This help menu' },
    ],
  },
  admin: {
    emoji: '🔒', name: 'Admin (Dev only)',
    commands: [
      { name: '/addmoney <user> <amt>',    desc: 'Add coins to a user\'s wallet' },
      { name: '/removemoney <user> <amt>', desc: 'Remove coins from a user\'s wallet' },
      { name: '/setbalance <user> <amt>',  desc: 'Set a user\'s wallet to an exact amount' },
      { name: '/resetuser <user>',         desc: 'Wipe all economy data for a user' },
      { name: '/banfromeconomy <user>',    desc: 'Ban / unban a user from all economy commands' },
      { name: '/additem <user> …',         desc: 'Manually add an item to a user\'s inventory' },
      { name: '/removeitem <user> …',      desc: 'Remove an item from a user\'s inventory' },
      { name: '/givexp <user> <amt>',      desc: 'Grant XP to a user' },
    ],
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Browse all bot commands by category'),

  async execute(interaction) {
    const mainEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('📖 Help Menu')
      .setDescription('Select a category from the dropdown to view its commands.')
      .addFields(Object.values(categories).map(cat => ({
        name: `${cat.emoji} ${cat.name}`,
        value: `${cat.commands.length} commands`,
        inline: true,
      })))
      .setFooter({ text: 'Use the dropdown below to explore' })
      .setTimestamp();

    const menu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('📂 Select a category…')
      .addOptions(Object.entries(categories).map(([key, cat]) => ({
        label: cat.name,
        value: key,
        emoji: cat.emoji,
      })));

    const row   = new ActionRowBuilder().addComponents(menu);
    const reply = await interaction.reply({ embeds: [mainEmbed], components: [row], fetchReply: true });

    const collector = reply.createMessageComponentCollector({ time: 90000 });

    collector.on('collect', async sel => {
      await sel.deferUpdate();
      const cat   = categories[sel.values[0]];
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`${cat.emoji} ${cat.name} Commands`)
        .setDescription(cat.commands.map(c => `\`${c.name}\`\n↳ ${c.desc}`).join('\n\n'))
        .setTimestamp();
      await sel.editReply({ embeds: [embed], components: [row] });
    });

    collector.on('end', () => reply.edit({ components: [] }).catch(() => {}));
  },
};
