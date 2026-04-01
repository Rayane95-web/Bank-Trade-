const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isDeveloper, logAdminAction } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder().setName('additem').setDescription("[DEV] Add an item to a user's inventory")
    .addUserOption(o => o.setName('user').setDescription('Target').setRequired(true))
    .addStringOption(o => o.setName('itemid').setDescription('Item ID').setRequired(true))
    .addStringOption(o => o.setName('name').setDescription('Item name').setRequired(true))
    .addIntegerOption(o => o.setName('quantity').setDescription('Quantity').setRequired(false).setMinValue(1)),
  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });
    try {
      const target   = interaction.options.getUser('user');
      const itemId   = interaction.options.getString('itemid');
      const name     = interaction.options.getString('name');
      const quantity = interaction.options.getInteger('quantity') || 1;
      const user     = db.getUser(target.id, interaction.guildId, target.username);
      const existing = user.inventory.find(i => i.itemId === itemId);
      if (existing) existing.quantity += quantity;
      else user.inventory.push({ itemId, name, quantity, expiresAt: null });
      db.saveUser(user);
      logAdminAction(interaction.user, 'ADD_ITEM', target, { itemId, name, quantity });
      return interaction.reply({ embeds: [successEmbed('Item Added', `Added **${quantity}x ${name}** to <@${target.id}>'s inventory.`)] });
    } catch (err) { return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
