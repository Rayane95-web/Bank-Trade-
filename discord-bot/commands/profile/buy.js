const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy').setDescription('Buy an item from the shop')
    .addStringOption(o => o.setName('item').setDescription('Item ID (see /shop)').setRequired(true)),

  async execute(interaction) {
    try {
      const itemId  = interaction.options.getString('item').toLowerCase().trim();
      const itemDef = config.shop.find(i => i.id === itemId);
      if (!itemDef) return interaction.reply({ embeds: [errorEmbed(`Item \`${itemId}\` not found. Use \`/shop\` to browse.`)], ephemeral: true });

      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      if (user.banned)             return interaction.reply({ embeds: [errorEmbed('You are banned from the economy.')], ephemeral: true });
      if (user.wallet < itemDef.price) return interaction.reply({ embeds: [errorEmbed(`Need **${formatNumber(itemDef.price)}** coins — you have **${formatNumber(user.wallet)}**.`)], ephemeral: true });

      // Permanent & flex items: can only own 1 (except bank_upgrade)
      if (['permanent', 'flex'].includes(itemDef.type) && itemId !== 'bank_upgrade') {
        if (user.inventory.find(i => i.itemId === itemId))
          return interaction.reply({ embeds: [errorEmbed(`You already own **${itemDef.name}**. Flex harder.`)], ephemeral: true });
      }

      user.wallet -= itemDef.price;

      // Side effects
      if (itemId === 'bank_upgrade') user.bankLimit += 10000;

      // Gacha items go straight into inventory as "unopened"
      const expiresAt = itemDef.duration && !['gacha'].includes(itemDef.type)
        ? new Date(Date.now() + itemDef.duration).toISOString()
        : null;

      const existing = user.inventory.find(i => i.itemId === itemId);
      if (existing) { existing.quantity++; if (expiresAt) existing.expiresAt = expiresAt; }
      else user.inventory.push({ itemId, name: itemDef.name, quantity: 1, expiresAt });

      db.saveUser(user);

      const note = itemId === 'cart'       ? '\n> Use `/opencart` to open it!'
                 : itemId === 'lucky_block'? '\n> Use `/openblock` to smash it!'
                 : '';

      return interaction.reply({ embeds: [successEmbed('Purchase Successful! 🛒', `You bought **${itemDef.name}**!${note}`, [
        { name: '💰 Paid',      value: `\`${formatNumber(itemDef.price)}\``, inline: true },
        { name: '👛 Remaining', value: `\`${formatNumber(user.wallet)}\``,   inline: true },
        { name: '⏳ Duration',  value: expiresAt ? `<t:${Math.floor(new Date(expiresAt).getTime()/1000)}:R>` : '♾️ Permanent', inline: true },
      ])] });
    } catch (err) { console.error(err); return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
