const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isDeveloper, logAdminAction } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder().setName('removeitem').setDescription("[DEV] Remove an item from a user's inventory")
    .addUserOption(o => o.setName('user').setDescription('Target').setRequired(true))
    .addStringOption(o => o.setName('itemid').setDescription('Item ID').setRequired(true)),
  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });
    try {
      const target = interaction.options.getUser('user');
      const itemId = interaction.options.getString('itemid');
      const user   = db.getUser(target.id, interaction.guildId, target.username);
      const idx    = user.inventory.findIndex(i => i.itemId === itemId);
      if (idx === -1) return interaction.reply({ embeds: [errorEmbed(`Item \`${itemId}\` not in inventory.`)], ephemeral: true });
      const removed = user.inventory.splice(idx, 1)[0];
      db.saveUser(user);
      logAdminAction(interaction.user, 'REMOVE_ITEM', target, { itemId });
      return interaction.reply({ embeds: [successEmbed('Item Removed', `Removed **${removed.name}** from <@${target.id}>'s inventory.`)] });
    } catch (err) { return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
