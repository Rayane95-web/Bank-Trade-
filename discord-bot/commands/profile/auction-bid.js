const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');
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
    .setName('auction-bid')
    .setDescription('Place a bid on an active auction')
    .addStringOption(o => o.setName('auction_id').setDescription('Auction ID (from /auction-list)').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Your bid amount').setRequired(true).setMinValue(1)),

  async execute(interaction) {
    try {
      const user      = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);

      if (user.banned)
        return interaction.reply({ embeds: [errorEmbed('You are banned from the economy.')], ephemeral: true });

      const auctionId = interaction.options.getString('auction_id').trim();
      const bidAmount = interaction.options.getInteger('amount');
      const auctions  = loadAuctions();
      const auction   = auctions[auctionId];

      if (!auction || auction.discordGuildId !== interaction.guildId)
        return interaction.reply({ embeds: [errorEmbed('Auction not found.')], ephemeral: true });

      if (auction.ended || new Date(auction.endsAt) < new Date())
        return interaction.reply({ embeds: [errorEmbed('This auction has ended.')], ephemeral: true });

      if (auction.sellerId === interaction.user.id)
        return interaction.reply({ embeds: [errorEmbed('You cannot bid on your own auction.')], ephemeral: true });

      if (bidAmount <= auction.currentBid)
        return interaction.reply({ embeds: [errorEmbed(`Your bid must be higher than the current bid of **${formatNumber(auction.currentBid)}** coins.`)], ephemeral: true });

      if ((user.wallet || 0) < bidAmount)
        return interaction.reply({ embeds: [errorEmbed(`You only have **${formatNumber(user.wallet)}** coins.`)], ephemeral: true });

      // Refund previous bidder
      if (auction.currentBidder && auction.currentBidder !== interaction.user.id) {
        const prevBidder = db.getUser(auction.currentBidder, interaction.guildId);
        if (prevBidder?.userId) {
          prevBidder.wallet += auction.currentBid;
          db.saveUser(prevBidder);
        }
      }

      // Deduct bid from wallet (held in escrow)
      user.wallet -= bidAmount;
      db.saveUser(user);

      auction.currentBid    = bidAmount;
      auction.currentBidder = interaction.user.id;
      auction.bids.push({ bidderId: interaction.user.id, amount: bidAmount, at: new Date().toISOString() });
      saveAuctions(auctions);

      const endsTs = Math.floor(new Date(auction.endsAt).getTime() / 1000);
      return interaction.reply({
        embeds: [successEmbed('Bid Placed! 🔨',
          `You bid **${formatNumber(bidAmount)}** coins on **${auction.item.name}**!\nAuction ends: <t:${endsTs}:R>\nYour coins are held in escrow until the auction ends.`)],
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
