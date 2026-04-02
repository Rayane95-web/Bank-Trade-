/**
 * mutations.js
 * Shared mutation definitions used by /cart and /luckyblock
 *
 * Mutation tiers:
 *   Common    — cosmetic / small stat boost
 *   Uncommon  — noticeable bonus
 *   Rare      — strong bonus
 *   Epic      — very strong
 *   Legendary — massive
 *   Mythic    — insane
 *   SECRET    — 0.01% items only
 */

const MUTATIONS = [
  // ── Common (total weight ~55) ──────────────────────────────────────────────
  { id: 'lucky',        name: '🍀 Lucky',          tier: 'Common',    weight: 20, desc: '+5% coin gain from all sources'       },
  { id: 'speedy',       name: '⚡ Speedy',          tier: 'Common',    weight: 18, desc: '-10% cooldowns on work & crime'       },
  { id: 'shiny',        name: '✨ Shiny',           tier: 'Common',    weight: 17, desc: 'Your item glows (cosmetic)'           },

  // ── Uncommon (total weight ~35) ───────────────────────────────────────────
  { id: 'golden',       name: '🌟 Golden',          tier: 'Uncommon',  weight: 14, desc: '+15% coin gain from work'             },
  { id: 'reinforced',   name: '🔩 Reinforced',      tier: 'Uncommon',  weight: 12, desc: 'Rob Shield lasts 2× longer'          },
  { id: 'magnetic',     name: '🧲 Magnetic',        tier: 'Uncommon',  weight: 9,  desc: '+10% chance to find bonus coins'      },

  // ── Rare (total weight ~20) ───────────────────────────────────────────────
  { id: 'infused',      name: '💠 Infused',         tier: 'Rare',      weight: 8,  desc: '+25% XP gain'                        },
  { id: 'cursed',       name: '💀 Cursed',          tier: 'Rare',      weight: 7,  desc: 'Double or nothing on /crime'         },
  { id: 'ethereal',     name: '🌀 Ethereal',        tier: 'Rare',      weight: 5,  desc: '+20% gambling win chance'            },

  // ── Epic (total weight ~10) ───────────────────────────────────────────────
  { id: 'blazing',      name: '🔥 Blazing',         tier: 'Epic',      weight: 4,  desc: '+50% coins from /work'               },
  { id: 'frozen',       name: '❄️ Frozen',          tier: 'Epic',      weight: 3,  desc: 'Immune to /rob for 24h on equip'     },
  { id: 'storm',        name: '⛈️ Storm',           tier: 'Epic',      weight: 3,  desc: '+30% daily reward'                   },

  // ── Legendary (total weight ~4) ───────────────────────────────────────────
  { id: 'divine',       name: '👑 Divine',          tier: 'Legendary', weight: 2,  desc: '2× all coin gains for 1 hour'        },
  { id: 'void',         name: '🌑 Void',            tier: 'Legendary', weight: 1,  desc: 'Steals 5% of any robber\'s wallet'   },
  { id: 'celestial',    name: '🌠 Celestial',       tier: 'Legendary', weight: 1,  desc: '3× XP gain for 2 hours'              },

  // ── Mythic (total weight ~0.5) ────────────────────────────────────────────
  { id: 'omnipotent',   name: '🌈 Omnipotent',      tier: 'Mythic',    weight: 0.3,  desc: 'All bonuses ×2 for 30 mins'                              },
  { id: 'shadow',       name: '🖤 Shadow',           tier: 'Mythic',    weight: 0.2,  desc: '/rob always succeeds (1 use)'                            },

  // ── New mutations ─────────────────────────────────────────────────────────
  { id: 'red_moon',     name: '🌕 Red Moon',         tier: 'Rare',      weight: 5,    desc: '+100% coin multiplier for 1 hour',         color: 'red',        duration: 3600000,   ability: 'coin_multiplier_2x'    },
  { id: 'admin',        name: '👑 Admin',             tier: 'SECRET',    weight: 0.001,desc: 'ALL abilities combined (permanent)',        color: 'gold',       duration: null,      ability: 'all_permanent'         },
  { id: 'galaxy',       name: '🌌 Galaxy',            tier: 'Epic',      weight: 3,    desc: '+3× XP gain for 2 hours',                  color: 'purple',     duration: 7200000,   ability: 'xp_3x'                 },
  { id: 'candy',        name: '🍬 Candy',             tier: 'Uncommon',  weight: 8,    desc: '+50% gambling win chance for 1 hour',      color: 'pink',       duration: 3600000,   ability: 'gamble_win_50'         },
  { id: 'inferno',      name: '🔥 Inferno',           tier: 'Rare',      weight: 6,    desc: '+75% work earnings for 1.5 hours',         color: 'orange',     duration: 5400000,   ability: 'work_earnings_75'      },
  { id: 'frost',        name: '🧊 Frost',             tier: 'Epic',      weight: 4,    desc: 'Immune to /rob for 12 hours',              color: 'cyan',       duration: 43200000,  ability: 'rob_immune_12h'        },
  { id: 'nebula',       name: '🔮 Nebula',            tier: 'Legendary', weight: 1.5,  desc: '+2× level progression for 3 hours',        color: 'dark_purple',duration: 10800000,  ability: 'level_2x'              },
  { id: 'radiant',      name: '☀️ Radiant',           tier: 'Uncommon',  weight: 9,    desc: '+25% daily reward for 24 hours',           color: 'yellow',     duration: 86400000,  ability: 'daily_25'              },
  { id: 'void_new',     name: '🕳️ Void',              tier: 'Legendary', weight: 1.5,  desc: 'Steal 10% of robber\'s coins when robbed', color: 'black',      duration: null,      ability: 'void_counter'          },
  { id: 'stellar',      name: '⭐ Stellar',            tier: 'Rare',      weight: 5,    desc: '+50% XP and coins for 1 hour',             color: 'silver',     duration: 3600000,   ability: 'xp_coin_50'            },

  // ── SECRET (0.01%) ────────────────────────────────────────────────────────
  { id: 'admin_sk',     name: '🔱 Admin SK',          tier: 'SECRET',    weight: 0.01, desc: 'Permanent Rob Shield + all Mythic bonuses + golden aura'  },
];

const TIER_COLORS = {
  Common:    '⬜',
  Uncommon:  '🟩',
  Rare:      '🟦',
  Epic:      '🟪',
  Legendary: '🟨',
  Mythic:    '🌈',
  SECRET:    '🔱',
};

function rollMutation() {
  const total = MUTATIONS.reduce((a, m) => a + m.weight, 0);
  let r = Math.random() * total;
  for (const m of MUTATIONS) {
    r -= m.weight;
    if (r <= 0) return m;
  }
  return MUTATIONS[0];
}

function rollMutations(count = 1) {
  const results = [];
  for (let i = 0; i < count; i++) results.push(rollMutation());
  return results;
}

module.exports = { MUTATIONS, TIER_COLORS, rollMutation, rollMutations };
