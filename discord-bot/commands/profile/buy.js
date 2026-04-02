const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy').setDescription('Buy an item from the shop')
    .addStringOption(o => o.setName('item').setDescription('Item ID (see /shop)').setRequired(true))
    .addIntegerOption(o => o.setName('quantity').setDescription('How many to buy (default: 1, max: 100)').setMinValue(1).setMaxValue(100)),

  async execute(interaction) {
    try {
      const itemId   = interaction.options.getString('item').toLowerCase().trim();
      const quantity = interaction.options.getInteger('quantity') ?? 1;
      const itemDef  = config.shop.find(i => i.id === itemId);
      if (!itemDef) return interaction.reply({ embeds: [errorEmbed(`Item \`${itemId}\` not found. Use \`/shop\` to browse.`)], ephemeral: true });

      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      if (user.banned) return interaction.reply({ embeds: [errorEmbed('You are banned from the economy.')], ephemeral: true });

      // Permanent & flex items: can only own 1 (except bank_upgrade) — quantity forced to 1
      if (['permanent', 'flex'].includes(itemDef.type) && itemId !== 'bank_upgrade') {
        if (user.inventory.find(i => i.itemId === itemId))
          return interaction.reply({ embeds: [errorEmbed(`You already own **${itemDef.name}**. Flex harder.`)], ephemeral: true });
        // Can only buy 1 of these at a time
        if (quantity > 1)
          return interaction.reply({ embeds: [errorEmbed(`**${itemDef.name}** is a one-of-a-kind item — you can only buy 1.`)], ephemeral: true });
      }

      const totalCost = itemDef.price * quantity;
      if (user.wallet < totalCost)
        return interaction.reply({ embeds: [errorEmbed(`Need **${formatNumber(totalCost)}** coins for ×${quantity} — you have **${formatNumber(user.wallet)}**.`)], ephemeral: true });

      user.wallet -= totalCost;

      // Side effects (applied per unit)
      if (itemId === 'bank_upgrade') user.bankLimit += 10000 * quantity;

      // Gacha items go straight into inventory as "unopened"
      const expiresAt = itemDef.duration && !['gacha'].includes(itemDef.type)
        ? new Date(Date.now() + itemDef.duration).toISOString()
        : null;

      const existing = user.inventory.find(i => i.itemId === itemId);
      if (existing) { existing.quantity += quantity; if (expiresAt) existing.expiresAt = expiresAt; }
      else user.inventory.push({ itemId, name: itemDef.name, quantity, expiresAt });

      db.saveUser(user);

      const qtyLabel = quantity > 1 ? ` ×${quantity}` : '';
      const note = itemId === 'cart'        ? '\n> Use `/opencart` to open them!'
                 : itemId === 'lucky_block' ? '\n> Use `/openblock` to smash them!'
                 : '';

      return interaction.reply({ embeds: [successEmbed('Purchase Successful! 🛒', `You bought **${itemDef.name}**${qtyLabel}!${note}`, [
        { name: '💰 Total Paid',  value: `\`${formatNumber(totalCost)}\``,   inline: true },
        { name: '👛 Remaining',   value: `\`${formatNumber(user.wallet)}\``, inline: true },
        { name: '⏳ Duration',    value: expiresAt ? `<t:${Math.floor(new Date(expiresAt).getTime()/1000)}:R>` : '♾️ Permanent', inline: true },
      ])] });
    } catch (err) { console.error(err); return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
