const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isDeveloper, logAdminAction } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-wipe-inventory')
    .setDescription("[DEV] Clear a user's entire inventory")
    .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
    .addStringOption(o => o.setName('type').setDescription('What to wipe').setRequired(false)
      .addChoices(
        { name: 'Everything', value: 'all' },
        { name: 'Items only', value: 'items' },
        { name: 'Mutations only', value: 'mutations' },
      )),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id))
      return interaction.reply({ embeds: [errorEmbed('No permission.')], ephemeral: true });

    try {
      const target = interaction.options.getUser('user');
      const type   = interaction.options.getString('type') || 'all';
      const user   = db.getUser(target.id, interaction.guildId, target.username);

      const before = user.inventory.length;
      if (type === 'all')       user.inventory = [];
      else if (type === 'items')     user.inventory = user.inventory.filter(i => i.mutationId);
      else if (type === 'mutations') user.inventory = user.inventory.filter(i => !i.mutationId);

      const removed = before - user.inventory.length;
      db.saveUser(user);
      logAdminAction(interaction.user, 'WIPE_INVENTORY', target, { type, removed });

      return interaction.reply({
        embeds: [successEmbed('Inventory Wiped', `Removed **${removed}** ${type === 'all' ? 'item(s)' : type} from <@${target.id}>'s inventory.`)],
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
