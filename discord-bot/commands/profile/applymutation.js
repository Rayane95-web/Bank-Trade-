const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { MUTATIONS, TIER_COLORS } = require('../../utils/mutations');
const config = require('../../config/config');

// Tier colour hex values for embed accents
const TIER_HEX = {
  Common:    0xAAAAAA,
  Uncommon:  0x57F287,
  Rare:      0x3498DB,
  Epic:      0x9B59B6,
  Legendary: 0xF1C40F,
  Mythic:    0xFF00FF,
  SECRET:    0xFFD700,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('applymutation')
    .setDescription('Apply a mutation from your inventory to one of your items')
    .addStringOption(o =>
      o.setName('mutation_id')
        .setDescription('The inventory item ID of the mutation (e.g. mutation_candy_1234567890)')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('item_id')
        .setDescription('The item ID to apply the mutation to (e.g. xp_boost, multiplier, shield)')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const mutationInvId = interaction.options.getString('mutation_id').trim();
      const targetItemId  = interaction.options.getString('item_id').toLowerCase().trim();

      const user = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      if (user.banned) return interaction.reply({ embeds: [errorEmbed('You are banned from the economy.')], ephemeral: true });

      // ── Validate mutation ────────────────────────────────────────────────
      const mutInvEntry = user.inventory.find(i => i.itemId === mutationInvId && i.mutationId);
      if (!mutInvEntry)
        return interaction.reply({ embeds: [errorEmbed(`Mutation \`${mutationInvId}\` not found in your inventory.\nUse \`/inventory\` to see your mutations.`)], ephemeral: true });

      const mutDef = MUTATIONS.find(m => m.id === mutInvEntry.mutationId);
      if (!mutDef)
        return interaction.reply({ embeds: [errorEmbed('Unknown mutation type. This mutation may be corrupted.')], ephemeral: true });

      // ── Validate target item ─────────────────────────────────────────────
      const targetItem = user.inventory.find(i => i.itemId === targetItemId && !i.mutationId);
      if (!targetItem)
        return interaction.reply({ embeds: [errorEmbed(`Item \`${targetItemId}\` not found in your inventory, or it is itself a mutation.\nUse \`/inventory\` to see your items.`)], ephemeral: true });

      // Prevent applying a mutation to an item that already has one
      if (targetItem.appliedMutation)
        return interaction.reply({ embeds: [errorEmbed(`**${targetItem.name}** already has the **${targetItem.appliedMutation.name}** mutation applied.\nYou cannot stack mutations on the same item.`)], ephemeral: true });

      // ── Compute the active-until timestamp ──────────────────────────────
      // If the mutation has a duration, it starts counting from now.
      // Permanent mutations (duration: null) never expire.
      const activeUntil = mutDef.duration
        ? new Date(Date.now() + mutDef.duration).toISOString()
        : null;

      // ── Apply mutation to the target item ────────────────────────────────
      targetItem.appliedMutation = {
        id:          mutDef.id,
        name:        mutDef.name,
        tier:        mutDef.tier,
        desc:        mutDef.desc,
        ability:     mutDef.ability  || null,
        color:       mutDef.color    || null,
        activeUntil,
      };

      // ── Remove the mutation from inventory ───────────────────────────────
      const mutIdx = user.inventory.indexOf(mutInvEntry);
      user.inventory.splice(mutIdx, 1);

      db.saveUser(user);

      // ── Build result embed ───────────────────────────────────────────────
      const tierColor  = TIER_HEX[mutDef.tier] ?? config.colors.primary;
      const tierBadge  = TIER_COLORS[mutDef.tier] ?? '⬜';
      const expiryText = activeUntil
        ? `<t:${Math.floor(new Date(activeUntil).getTime() / 1000)}:R>`
        : '♾️ Permanent';

      const embed = new EmbedBuilder()
        .setColor(tierColor)
        .setTitle(`✨ Mutation Applied!`)
        .setDescription(
          `${tierBadge} **${mutDef.name}** *[${mutDef.tier}]* has been fused into **${targetItem.name}**!\n\n` +
          `> ${mutDef.desc}`
        )
        .addFields(
          { name: '🎯 Item',      value: `\`${targetItem.name}\``,  inline: true },
          { name: '🧬 Mutation',  value: `\`${mutDef.name}\``,      inline: true },
          { name: '⏳ Active For', value: expiryText,               inline: true },
        )
        .setFooter({ text: mutDef.ability ? `Ability: ${mutDef.ability}` : 'Cosmetic mutation' })
        .setTimestamp();

      // Extra flair for rare tiers
      if (mutDef.tier === 'SECRET') {
        embed.setTitle('🔱 SECRET MUTATION APPLIED!');
        embed.setDescription(
          `> 🔱 **This is an extraordinarily rare mutation.**\n\n` +
          `${tierBadge} **${mutDef.name}** has been permanently fused into **${targetItem.name}**!\n\n` +
          `> ${mutDef.desc}`
        );
      } else if (mutDef.tier === 'Mythic') {
        embed.setTitle('🌈 Mythic Mutation Applied!');
      } else if (mutDef.tier === 'Legendary') {
        embed.setTitle('👑 Legendary Mutation Applied!');
      }

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
