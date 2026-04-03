const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
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
    .setName('auction-list')
    .setDescription('View all active auctions in this server'),

  async execute(interaction) {
    try {
      const auctions = loadAuctions();
      const now      = new Date();

      // Settle ended auctions
      let settled = 0;
      for (const [id, auction] of Object.entries(auctions)) {
        if (auction.discordGuildId !== interaction.guildId) continue;
        if (!auction.ended && new Date(auction.endsAt) < now) {
          auction.ended = true;
          // Award item to winner
          if (auction.currentBidder) {
            const winner = db.getUser(auction.currentBidder, interaction.guildId);
            if (winner?.userId) {
              const existing = winner.inventory.find(i => i.itemId === auction.item.itemId && !i.mutationId);
              if (existing) { existing.quantity = (existing.quantity || 1) + 1; }
              else { winner.inventory.push({ ...auction.item, quantity: 1, obtainedAt: new Date().toISOString() }); }
              db.saveUser(winner);
            }
            // Pay seller
            const seller = db.getUser(auction.sellerId, interaction.guildId);
            if (seller?.userId) {
              seller.wallet    += auction.currentBid;
              seller.totalEarned += auction.currentBid;
              db.saveUser(seller);
            }
          } else {
            // No bids — return item to seller
            const seller = db.getUser(auction.sellerId, interaction.guildId);
            if (seller?.userId) {
              const existing = seller.inventory.find(i => i.itemId === auction.item.itemId && !i.mutationId);
              if (existing) { existing.quantity = (existing.quantity || 1) + 1; }
              else { seller.inventory.push({ ...auction.item, quantity: 1, obtainedAt: new Date().toISOString() }); }
              db.saveUser(seller);
            }
          }
          settled++;
        }
      }
      if (settled > 0) saveAuctions(auctions);

      const active = Object.values(auctions).filter(a => a.discordGuildId === interaction.guildId && !a.ended);

      const embed = new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle('🔨 Active Auctions')
        .setTimestamp();

      if (active.length === 0) {
        embed.setDescription('No active auctions right now.\nUse `/auction-create` to list an item!');
      } else {
        const lines = active.map(a => {
          const endsTs = Math.floor(new Date(a.endsAt).getTime() / 1000);
          const bidder = a.currentBidder ? `<@${a.currentBidder}>` : 'No bids yet';
          return `**${a.item.name}** — by <@${a.sellerId}>\n  💰 Current bid: **${formatNumber(a.currentBid)}** (${bidder})\n  ⏱ Ends: <t:${endsTs}:R>\n  🆔 \`${a.id}\``;
        });
        embed.setDescription(lines.join('\n\n').slice(0, 4000));
      }

      if (settled > 0) embed.setFooter({ text: `${settled} auction(s) settled` });
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
