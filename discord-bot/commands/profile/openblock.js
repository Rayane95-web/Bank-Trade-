const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { formatNumber, random, addXp } = require('../../utils/helpers');
const { rollMutation, rollMutations, MUTATIONS, TIER_COLORS } = require('../../utils/mutations');
const config = require('../../config/config');

// Roll one item from the lucky block loot table
function rollBlock() {
  const total = config.luckyBlockLoot.reduce((a, l) => a + l.weight, 0);
  let r = Math.random() * total;
  for (const loot of config.luckyBlockLoot) { r -= loot.weight; if (r <= 0) return loot; }
  return config.luckyBlockLoot[0];
}

// Lucky block gives 1–3 bonus mutations at higher chance (50%)
function blockMutationCount() {
  const r = Math.random();
  if (r < 0.02) return 3;   // 2%  — triple mutation
  if (r < 0.12) return 2;   // 10% — double mutation
  if (r < 0.50) return 1;   // 38% — single mutation
  return 0;
}

const SMASH_LINES = [
  '💥 *You wind up…*',
  '🔨 *SMASH!*',
  '🌟 *The block explodes into light…*',
];

// Process a single block smash and apply rewards to the user; returns reward lines + metadata
function smashOneBlock(user) {
  const loot      = rollBlock();
  const mutCount  = blockMutationCount();
  const mutations = mutCount > 0 ? rollMutations(mutCount) : [];
  const isAdminSK = loot.id === 'admin_sk';
  const lines     = [];

  if (loot.coinReward && loot.coinReward[1] > 0) {
    const coins       = random(loot.coinReward[0], loot.coinReward[1]);
    user.wallet      += coins;
    user.totalEarned += coins;
    lines.push(`💰 **${formatNumber(coins)}** coins`);
  } else if (loot.id === 'nothing') {
    lines.push('💨 **Nothing.** Better luck next time.');
  }

  if (loot.xpReward) {
    const xpGained = random(loot.xpReward[0], loot.xpReward[1]);
    const { leveledUp, newLevel } = addXp(user, xpGained);
    lines.push(`⭐ **${xpGained}** XP gained${leveledUp ? ` *(Level Up → **${newLevel}**!)*` : ''}`);
  }

  if (loot.itemReward) {
    const itemDef = config.shop.find(i => i.id === loot.itemReward);
    if (itemDef) {
      const expiresAt = itemDef.duration ? new Date(Date.now() + itemDef.duration).toISOString() : null;
      if (isAdminSK) {
        user.inventory.push({ itemId: 'admin_sk', name: '🔱 Admin SK', quantity: 1, expiresAt: null, isAdminSK: true });
        const shieldIdx = user.inventory.findIndex(i => i.itemId === 'shield');
        if (shieldIdx !== -1) user.inventory[shieldIdx].expiresAt = null;
        else user.inventory.push({ itemId: 'shield', name: '🛡️ Rob Shield', quantity: 1, expiresAt: null });
        lines.push('🔱 **ADMIN SK** — Permanent Shield + All Mythic Bonuses!');
      } else {
        const existing = user.inventory.find(i => i.itemId === loot.itemReward);
        if (existing) existing.quantity++;
        else user.inventory.push({ itemId: loot.itemReward, name: itemDef.name, quantity: 1, expiresAt });
        lines.push(`${itemDef.name}`);
      }
    }
  }

  // Guaranteed mutation drop from loot table entry
  if (loot.mutationReward) {
    const mutDef = MUTATIONS.find(m => m.id === loot.mutationReward);
    if (mutDef) {
      user.inventory.push({
        itemId:       `mutation_${mutDef.id}_${Date.now()}_${Math.random()}`,
        name:         `${mutDef.name} Mutation`,
        quantity:     1,
        expiresAt:    null,
        mutationId:   mutDef.id,
        mutationTier: mutDef.tier,
      });
      lines.push(`${TIER_COLORS[mutDef.tier]} **${mutDef.name}** *[${mutDef.tier}]*\n  ↳ ${mutDef.desc}`);
    }
  }

  // Bonus random mutations
  for (const mut of mutations) {
    user.inventory.push({
      itemId:       `mutation_${mut.id}_${Date.now()}_${Math.random()}`,
      name:         `${mut.name} Mutation`,
      quantity:     1,
      expiresAt:    null,
      mutationId:   mut.id,
      mutationTier: mut.tier,
    });
    lines.push(`${TIER_COLORS[mut.tier]} **${mut.name}** *[${mut.tier}]* ✨\n  ↳ ${mut.desc}`);
  }

  const allMuts = [
    ...(loot.mutationReward ? [MUTATIONS.find(m => m.id === loot.mutationReward)] : []),
    ...mutations,
  ].filter(Boolean);

  return { lines, isAdminSK, mutations: allMuts, mutCount: allMuts.length };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('openblock').setDescription('Smash Lucky Blocks from your inventory')
    .addIntegerOption(o => o.setName('quantity').setDescription('How many blocks to smash (default: 1, max: 100)').setMinValue(1).setMaxValue(100)),

  async execute(interaction) {
    await interaction.deferReply();
    try {
      const quantity  = interaction.options.getInteger('quantity') ?? 1;
      const user      = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      const blockItem = user.inventory.find(i => i.itemId === 'lucky_block' && i.quantity > 0);
      if (!blockItem) return interaction.editReply({ embeds: [errorEmbed('You have no Lucky Blocks! Buy one with `/buy lucky_block`.')] });

      const available = blockItem.quantity;
      const toSmash   = Math.min(quantity, available);

      if (quantity > available)
        await interaction.followUp({ embeds: [{ color: config.colors.warning, description: `⚠️ You only have **${available}** block${available !== 1 ? 's' : ''} — smashing ${toSmash}.` }], ephemeral: true }).catch(() => {});

      // Consume blocks
      blockItem.quantity -= toSmash;
      if (blockItem.quantity <= 0) user.inventory.splice(user.inventory.indexOf(blockItem), 1);

      // Smash all blocks and collect results
      const allLines     = [];
      let   gotAdminSK   = false;
      let   totalMutCount = 0;
      let   bestMut      = null;

      for (let i = 0; i < toSmash; i++) {
        const { lines, isAdminSK, mutations, mutCount } = smashOneBlock(user);
        if (toSmash > 1) allLines.push(`**Block ${i + 1}:**`);
        allLines.push(...lines);
        if (isAdminSK) gotAdminSK = true;
        totalMutCount += mutCount;
        for (const m of mutations) {
          if (!bestMut || m.weight < bestMut.weight) bestMut = m;
        }
      }

      db.saveUser(user);

      // ── Dramatic smash animation ─────────────────────────────────────────
      const startEmbed = new EmbedBuilder()
        .setColor(0xFFFF00)
        .setTitle(toSmash > 1 ? `🟨 Smashing ${toSmash} Lucky Blocks…` : '🟨 Lucky Block')
        .setDescription(SMASH_LINES[0])
        .setTimestamp();

      const smashBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('block_smash').setLabel('💥 SMASH!').setStyle(ButtonStyle.Danger)
      );

      const msg = await interaction.editReply({ embeds: [startEmbed], components: [smashBtn] });

      const col = msg.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, time: 30000, max: 1 });

      col.on('collect', async btn => {
        await btn.deferUpdate();

        // Step 1 — smash animation
        await btn.editReply({ embeds: [new EmbedBuilder().setColor(0xFF6600).setTitle('💥 SMASHING…').setDescription(SMASH_LINES[1]).setTimestamp()], components: [] });
        await new Promise(r => setTimeout(r, 1200));

        // Step 2 — explosion
        await btn.editReply({ embeds: [new EmbedBuilder().setColor(0xFFFFFF).setTitle('🌟 EXPLODING…').setDescription(SMASH_LINES[2]).setTimestamp()] });
        await new Promise(r => setTimeout(r, 1200));

        // Step 3 — result
        const embedColor = gotAdminSK              ? 0xFFD700
                         : bestMut?.tier === 'SECRET'    ? 0xFFD700
                         : bestMut?.tier === 'Mythic'    ? 0xFF00FF
                         : bestMut?.tier === 'Legendary' ? 0xF1C40F
                         : config.colors.success;

        let desc = allLines.join('\n\n');
        if (desc.length > 3900) desc = desc.slice(0, 3900) + '\n…*(truncated)*';

        const resultEmbed = new EmbedBuilder()
          .setColor(embedColor)
          .setTitle(gotAdminSK ? '🔱 ✨ THE ADMIN SK ✨ 🔱' : `🟨 ${toSmash > 1 ? `${toSmash} Blocks` : 'Block'} Result${totalMutCount > 1 ? ` (+${totalMutCount} Mutations!)` : ''}`)
          .setDescription(desc || '💨 Nothing.')
          .addFields({ name: '👛 New Wallet', value: `\`${formatNumber(user.wallet)}\``, inline: true })
          .setFooter({ text: totalMutCount > 0 ? `🎲 ${totalMutCount} mutation${totalMutCount > 1 ? 's' : ''} rolled!` : 'No mutations' })
          .setTimestamp();

        if (gotAdminSK) {
          resultEmbed.setDescription(
            '> 🔱 **You have received the rarest item in existence.**\n> Permanent Rob Shield. All Mythic bonuses. Forever.\n\n' + desc
          );
        }

        await btn.editReply({ embeds: [resultEmbed] });
      });

      col.on('end', (_, reason) => {
        if (reason === 'time') {
          let desc = allLines.join('\n') || 'Nothing.';
          if (desc.length > 3900) desc = desc.slice(0, 3900) + '\n…*(truncated)*';
          msg.edit({ embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle(`🟨 ${toSmash > 1 ? `${toSmash} Blocks` : 'Block'} Auto-Smashed`).setDescription(desc).setTimestamp()], components: [] }).catch(() => {});
        }
      });

    } catch (err) { console.error(err); return interaction.editReply({ embeds: [errorEmbed('Something went wrong.')] }); }
  },
};
