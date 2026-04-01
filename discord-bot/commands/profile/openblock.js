const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { formatNumber, random, addXp } = require('../../utils/helpers');
const { rollMutation, rollMutations, TIER_COLORS } = require('../../utils/mutations');
const config = require('../../config/config');

// Roll one item from the lucky block loot table
function rollBlock() {
  const total = config.luckyBlockLoot.reduce((a, l) => a + l.weight, 0);
  let r = Math.random() * total;
  for (const loot of config.luckyBlockLoot) { r -= loot.weight; if (r <= 0) return loot; }
  return config.luckyBlockLoot[0];
}

// Lucky block gives 1–3 mutations at higher chance (50%)
function blockMutationCount() {
  const r = Math.random();
  if (r < 0.02) return 3;   // 2% — triple mutation
  if (r < 0.12) return 2;   // 10% — double mutation
  if (r < 0.50) return 1;   // 38% — single mutation
  return 0;
}

const SMASH_LINES = [
  '💥 *You wind up…*',
  '🔨 *SMASH!*',
  '🌟 *The block explodes into light…*',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('openblock').setDescription('Smash a Lucky Block from your inventory'),

  async execute(interaction) {
    await interaction.deferReply();
    try {
      const user      = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      const blockItem = user.inventory.find(i => i.itemId === 'lucky_block' && i.quantity > 0);
      if (!blockItem) return interaction.editReply({ embeds: [errorEmbed('You have no Lucky Blocks! Buy one with `/buy lucky_block`.')] });

      // Consume one block
      blockItem.quantity--;
      if (blockItem.quantity <= 0) user.inventory.splice(user.inventory.indexOf(blockItem), 1);

      // Roll loot
      const loot       = rollBlock();
      const mutCount   = blockMutationCount();
      const mutations  = mutCount > 0 ? rollMutations(mutCount) : [];

      const isAdminSK  = loot.id === 'admin_sk';
      const rewardLines = [];
      let   coinsGained = 0;

      if (loot.coinReward && loot.coinReward[1] > 0) {
        coinsGained      = random(loot.coinReward[0], loot.coinReward[1]);
        user.wallet      += coinsGained;
        user.totalEarned += coinsGained;
        rewardLines.push(`💰 **${formatNumber(coinsGained)}** coins`);
      } else if (loot.id === 'nothing') {
        rewardLines.push('💨 **Nothing.** Better luck next time.');
      }

      if (loot.xpReward) {
        const xpGained = random(loot.xpReward[0], loot.xpReward[1]);
        const { leveledUp, newLevel } = addXp(user, xpGained);
        rewardLines.push(`⭐ **${xpGained}** XP gained${leveledUp ? ` *(Level Up → **${newLevel}**!)*` : ''}`);
      }

      if (loot.itemReward) {
        const itemDef = config.shop.find(i => i.id === loot.itemReward);
        if (itemDef) {
          const expiresAt = itemDef.duration ? new Date(Date.now() + itemDef.duration).toISOString() : null;

          // Admin SK — permanent shield + all mythic bonuses
          if (isAdminSK) {
            user.inventory.push({
              itemId:    'admin_sk',
              name:      '🔱 Admin SK',
              quantity:  1,
              expiresAt: null, // permanent
              isAdminSK: true,
            });
            // Also give permanent shield
            const shieldIdx = user.inventory.findIndex(i => i.itemId === 'shield');
            if (shieldIdx !== -1) { user.inventory[shieldIdx].expiresAt = null; }
            else user.inventory.push({ itemId: 'shield', name: '🛡️ Rob Shield', quantity: 1, expiresAt: null });
          } else {
            const existing = user.inventory.find(i => i.itemId === loot.itemReward);
            if (existing) existing.quantity++;
            else user.inventory.push({ itemId: loot.itemReward, name: itemDef.name, quantity: 1, expiresAt });
          }

          rewardLines.push(isAdminSK ? '🔱 **ADMIN SK** — Permanent Shield + All Mythic Bonuses!' : `${itemDef.name}`);
        }
      }

      // Add mutations
      for (const mut of mutations) {
        user.inventory.push({
          itemId:       `mutation_${mut.id}_${Date.now()}_${Math.random()}`,
          name:         `${mut.name} Mutation`,
          quantity:     1,
          expiresAt:    null,
          mutationId:   mut.id,
          mutationTier: mut.tier,
        });
        rewardLines.push(`${TIER_COLORS[mut.tier]} **${mut.name}** *[${mut.tier}]*\n  ↳ ${mut.desc}`);
      }

      db.saveUser(user);

      // ── Dramatic smash animation ─────────────────────────────────────────
      const startEmbed = new EmbedBuilder()
        .setColor(0xFFFF00)
        .setTitle('🟨 Lucky Block')
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
        const rareMutation = mutations.find(m => ['Legendary','Mythic','SECRET'].includes(m.tier));
        const embedColor   = isAdminSK         ? 0xFFD700
                           : rareMutation?.tier === 'Mythic'    ? 0xFF00FF
                           : rareMutation?.tier === 'Legendary' ? 0xF1C40F
                           : config.colors.success;

        const resultEmbed = new EmbedBuilder()
          .setColor(embedColor)
          .setTitle(isAdminSK ? '🔱 ✨ THE ADMIN SK ✨ 🔱' : `🟨 Lucky Block Result${mutCount > 1 ? ` (+${mutCount} Mutations!)` : ''}`)
          .setDescription(rewardLines.join('\n\n') || '💨 Nothing.')
          .addFields({ name: '👛 New Wallet', value: `\`${formatNumber(user.wallet)}\``, inline: true })
          .setFooter({ text: mutCount > 0 ? `🎲 ${mutCount} mutation${mutCount > 1 ? 's' : ''} rolled!` : 'No mutations' })
          .setTimestamp();

        if (isAdminSK) {
          resultEmbed.setDescription(
            '> 🔱 **You have received the rarest item in existence.**\n> Permanent Rob Shield. All Mythic bonuses. Forever.\n\n' + rewardLines.join('\n\n')
          );
        }

        await btn.editReply({ embeds: [resultEmbed] });
      });

      col.on('end', (_, reason) => {
        if (reason === 'time') {
          msg.edit({ embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('🟨 Block Auto-Smashed').setDescription(rewardLines.join('\n') || 'Nothing.').setTimestamp()], components: [] }).catch(() => {});
        }
      });

    } catch (err) { console.error(err); return interaction.editReply({ embeds: [errorEmbed('Something went wrong.')] }); }
  },
};
