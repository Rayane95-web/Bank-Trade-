const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');
const config = require('../../config/config');
const path = require('path');
const fs   = require('fs');

const AUCTION_FILE = path.join(__dirname, '../../data/auctions.json');
function loadAuctions() {
  if (!fs.existsSync(AUCTION_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(AUCTION_FILE, 'utf8')); } catch { return {}; }
}
function saveAuctions(data) {
  fs.mkdirSync(path.dirname(AUCTION_FILE), { recursive: true });
  fs.writeFileSync(AUCTION_FILE, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auction-create')
    .setDescription('List an item from your inventory for auction')
    .addStringOption(o => o.setName('item_id').setDescription('Item ID to auction (from /inventory)').setRequired(true))
    .addIntegerOption(o => o.setName('starting_bid').setDescription('Starting bid amount').setRequired(true).setMinValue(1))
    .addIntegerOption(o => o.setName('duration_hours').setDescription('Auction duration in hours (1–72)').setRequired(false).setMinValue(1).setMaxValue(72)),

  async execute(interaction) {
    try {
      const user      = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);

      if (user.banned)
        return interaction.reply({ embeds: [errorEmbed('You are banned from the economy.')], ephemeral: true });

      const itemId      = interaction.options.getString('item_id').trim();
      const startingBid = interaction.options.getInteger('starting_bid');
      const hours       = interaction.options.getInteger('duration_hours') || 24;

      const itemIdx = (user.inventory || []).findIndex(i => i.itemId === itemId && !i.mutationId);
      if (itemIdx === -1)
        return interaction.reply({ embeds: [errorEmbed(`You don't have item \`${itemId}\` in your inventory.`)], ephemeral: true });

      const item = user.inventory[itemIdx];

      // Remove one from inventory
      item.quantity = (item.quantity || 1) - 1;
      if (item.quantity <= 0) user.inventory.splice(itemIdx, 1);

      const auctions  = loadAuctions();
      const auctionId = `${interaction.guildId}-${Date.now()}`;
      const endsAt    = new Date(Date.now() + hours * 3600000).toISOString();

      auctions[auctionId] = {
        id:           auctionId,
        discordGuildId: interaction.guildId,
        sellerId:     interaction.user.id,
        sellerName:   interaction.user.username,
        item:         { itemId: item.itemId, name: item.name, type: item.type },
        startingBid,
        currentBid:   startingBid,
        currentBidder: null,
        bids:         [],
        endsAt,
        createdAt:    new Date().toISOString(),
        ended:        false,
      };
      saveAuctions(auctions);
      db.saveUser(user);

      const endsTs = Math.floor(new Date(endsAt).getTime() / 1000);
      return interaction.reply({
        embeds: [successEmbed('Auction Created! 🔨',
          `**${item.name}** is now listed for auction!\nStarting bid: **${formatNumber(startingBid)}** coins\nEnds: <t:${endsTs}:R>\nAuction ID: \`${auctionId}\`\n\nUse \`/auction-list\` to see all active auctions.`)],
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
