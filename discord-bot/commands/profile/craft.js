const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { formatNumber } = require('../../utils/helpers');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('craft')
    .setDescription('Combine items to craft new ones')
    .addStringOption(o => {
      const opt = o.setName('recipe').setDescription('Recipe to craft').setRequired(true);
      config.crafting.forEach(r => opt.addChoices({ name: `${r.name} — ${r.description}`, value: r.id }));
      return opt;
    }),

  async execute(interaction) {
    try {
      const user     = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);

      if (user.banned)
        return interaction.reply({ embeds: [errorEmbed('You are banned from the economy.')], ephemeral: true });

      const recipeId = interaction.options.getString('recipe');
      const recipe   = config.crafting.find(r => r.id === recipeId);

      if (!recipe)
        return interaction.reply({ embeds: [errorEmbed('Unknown recipe.')], ephemeral: true });

      // Check ingredients
      for (const ing of recipe.ingredients) {
        const owned = (user.inventory || []).filter(i => i.itemId === ing.itemId && !i.mutationId);
        const qty   = owned.reduce((s, i) => s + (i.quantity || 1), 0);
        if (qty < ing.qty) {
          const shopItem = config.shop.find(s => s.id === ing.itemId);
          return interaction.reply({ embeds: [errorEmbed(`You need **${ing.qty}x ${shopItem?.name || ing.itemId}** but only have **${qty}**.`)], ephemeral: true });
        }
      }

      // Consume ingredients
      for (const ing of recipe.ingredients) {
        let remaining = ing.qty;
        for (const item of (user.inventory || [])) {
          if (item.itemId !== ing.itemId || item.mutationId) continue;
          const take = Math.min(item.quantity || 1, remaining);
          item.quantity = (item.quantity || 1) - take;
          remaining -= take;
          if (remaining <= 0) break;
        }
        user.inventory = user.inventory.filter(i => (i.quantity || 1) > 0);
      }

      // Add crafted item
      const result = recipe.result;
      const existing = user.inventory.find(i => i.itemId === result.itemId && !i.mutationId);
      if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
      } else {
        const newItem = {
          itemId:    result.itemId,
          name:      result.name,
          quantity:  1,
          type:      result.type,
          obtainedAt: new Date().toISOString(),
        };
        if (result.duration) {
          newItem.expiresAt = new Date(Date.now() + result.duration).toISOString();
        }
        user.inventory.push(newItem);
      }

      db.saveUser(user);

      return interaction.reply({
        embeds: [successEmbed('Item Crafted! ⚒️',
          `You crafted **${result.name}**!\n\nIngredients consumed:\n${recipe.ingredients.map(i => {
            const s = config.shop.find(x => x.id === i.itemId);
            return `• ${i.qty}x ${s?.name || i.itemId}`;
          }).join('\n')}`)],
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
