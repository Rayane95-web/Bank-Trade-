require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  mongoUri: null, // not used — JSON db
  version: process.env.BOT_VERSION || '2.0.0',

  developer: {
    name:      process.env.DEV_NAME     || 'Unknown',
    discord:   process.env.DEV_DISCORD  || 'N/A',
    github:    process.env.DEV_GITHUB   || null,
    website:   process.env.DEV_WEBSITE  || null,
    bio:       process.env.DEV_BIO      || 'No bio provided.',
    avatarUrl: process.env.DEV_AVATAR_URL || null,
  },

  developerIds: ['1409299407010271416', ...(process.env.DEVELOPER_IDS || '').split(',').map(id => id.trim()).filter(Boolean)],
  logChannelId: process.env.LOG_CHANNEL_ID,

  colors: {
    primary:  0x5865F2,
    success:  0x57F287,
    error:    0xED4245,
    warning:  0xFEE75C,
    gold:     0xF1C40F,
    purple:   0x9B59B6,
    info:     0x3498DB,
  },

  economy: {
    dailyAmount:       500,
    dailyCooldown:     86400000,
    workMin:           50,
    workMax:           350,
    workCooldown:      3600000,
    crimeCooldown:     7200000,
    robCooldown:       3600000,
    robSuccessChance:  0.40,
    crimeSuccessChance:0.55,
    startingBalance:   100,
  },

  xp: {
    perMessage:      { min: 5, max: 15 },
    cooldown:        60000,
    levelMultiplier: 100,
  },

  // ─── SHOP ─────────────────────────────────────────────────────────────────
  shop: [
    // Boosts
    { id: 'xp_boost',     name: '⚡ XP Boost',        price: 500,        description: 'Double XP gain for 1 hour',                   type: 'boost',      duration: 3600000   },
    { id: 'multiplier',   name: '💎 Coin Multiplier', price: 1000,       description: '1.5× coins from /work for 2 hours',            type: 'boost',      duration: 7200000   },
    { id: 'crime_pass',   name: '🎭 Crime Pass',       price: 1500,       description: '+20% success chance on /crime for 4 hours',    type: 'boost',      duration: 14400000  },
    { id: 'daily_boost',  name: '📅 Daily Boost',      price: 800,        description: 'Doubles your next /daily reward (consumed on use)',type: 'boost',   duration: 86400000  },

    // Protection
    { id: 'shield',       name: '🛡️ Rob Shield',      price: 750,        description: 'Blocks all /rob attempts for 6 hours',          type: 'protection', duration: 21600000  },
    { id: 'lucky_charm',  name: '🍀 Lucky Charm',      price: 300,        description: '+10% win chance on gambling for 3 hours',       type: 'boost',      duration: 10800000  },

    // Permanent upgrades
    { id: 'bank_upgrade', name: '🏦 Bank Upgrade',     price: 2000,       description: 'Permanently increases bank limit by +10,000',   type: 'permanent'                       },

    // Luxury / flex items (flex items — no functional effect, just prestige value)
    { id: 'iphone17',     name: '📱 iPhone 17',        price: 1299,       description: 'The latest iPhone. Flex on everyone. (Prestige item)', type: 'flex'                      },
    { id: 'yacht',        name: '🛥️ Yacht',            price: 500000,     description: 'A luxury superyacht. The ultimate flex. (Prestige item)', type: 'flex'                   },
    { id: 'private_jet',  name: '✈️ Private Jet',      price: 2500000,    description: 'Your own private jet. Insane flex. (Prestige item)',     type: 'flex'                    },
    { id: 'mansion',      name: '🏰 Mansion',          price: 10000000,   description: 'A 50-room mansion. You made it. (Prestige item)',         type: 'flex'                    },
    { id: 'space_rocket', name: '🚀 Space Rocket',     price: 100000000,  description: 'Your own rocket. Literally a billionaire. (Prestige item)',type: 'flex'                   },

    // Gacha / RNG
    { id: 'cart',         name: '🛒 Mystery Cart',     price: 2500,       description: 'Roll RNG for a random item + possible mutation! Use /opencart after buying.', type: 'gacha' },
    { id: 'lucky_block',  name: '🟨 Lucky Block',      price: 5000,       description: 'Smash for a rare reward, mutations, or the legendary Admin SK (0.01%)! Use /openblock.', type: 'gacha' },
  ],

  quests: [
    { id: 'daily_chat',     name: '💬 Chatterbox', description: 'Send 20 messages today',      type: 'daily', goal: 20, reward: 200,  xpReward: 50  },
    { id: 'daily_commands', name: '⌨️ Commander',  description: 'Use 5 slash commands today',  type: 'daily', goal: 5,  reward: 150,  xpReward: 30  },
    { id: 'daily_gamble',   name: '🎰 High Roller', description: 'Play 3 gambling games today', type: 'daily', goal: 3,  reward: 300,  xpReward: 75  },
    { id: 'daily_work',     name: '💼 Workaholic',  description: 'Use /work 2 times today',     type: 'daily', goal: 2,  reward: 250,  xpReward: 60  },
  ],

  // Cart loot table — what items can roll out of a Mystery Cart
  cartLoot: [
    { id: 'coins_small',  name: '💰 Coins',        weight: 35, coinReward: [500,   2000]   },
    { id: 'coins_medium', name: '💰 Big Coins',     weight: 20, coinReward: [2000,  8000]   },
    { id: 'coins_large',  name: '💰 Jackpot Coins', weight: 5,  coinReward: [10000, 50000]  },
    { id: 'xp_boost',     name: '⚡ XP Boost',      weight: 15, itemReward: 'xp_boost'      },
    { id: 'multiplier',   name: '💎 Coin Multi',    weight: 10, itemReward: 'multiplier'    },
    { id: 'shield',       name: '🛡️ Rob Shield',    weight: 8,  itemReward: 'shield'        },
    { id: 'lucky_charm',  name: '🍀 Lucky Charm',   weight: 5,  itemReward: 'lucky_charm'   },
    { id: 'iphone17',     name: '📱 iPhone 17',     weight: 2,  itemReward: 'iphone17'      },
    // Mutation drops from cart
    { id: 'mut_candy',    name: '🍬 Candy Mutation',   weight: 4,  mutationReward: 'candy'    },
    { id: 'mut_radiant',  name: '☀️ Radiant Mutation', weight: 3,  mutationReward: 'radiant'  },
    { id: 'mut_stellar',  name: '⭐ Stellar Mutation',  weight: 3,  mutationReward: 'stellar'  },
    { id: 'mut_inferno',  name: '🔥 Inferno Mutation',  weight: 2,  mutationReward: 'inferno'  },
    { id: 'mut_red_moon', name: '🌕 Red Moon Mutation', weight: 2,  mutationReward: 'red_moon' },
  ],

  // Lucky block loot table
  luckyBlockLoot: [
    { id: 'coins_small',  name: '💰 Coins',           weight: 25,   coinReward: [1000,   5000]    },
    { id: 'coins_large',  name: '💰 Mega Coins',       weight: 10,   coinReward: [10000,  100000]  },
    { id: 'xp_bomb',      name: '⭐ XP Bomb',          weight: 15,   xpReward:   [500,    2000]    },
    { id: 'multiplier',   name: '💎 Coin Multi',       weight: 12,   itemReward: 'multiplier'      },
    { id: 'shield',       name: '🛡️ Rob Shield',       weight: 10,   itemReward: 'shield'          },
    { id: 'crime_pass',   name: '🎭 Crime Pass',        weight: 8,    itemReward: 'crime_pass'      },
    { id: 'iphone17',     name: '📱 iPhone 17',         weight: 5,    itemReward: 'iphone17'        },
    { id: 'yacht',        name: '🛥️ Yacht',             weight: 2,    itemReward: 'yacht'           },
    { id: 'nothing',      name: '💨 Nothing',           weight: 8,    coinReward: [0, 0]            },
    { id: 'admin_sk',     name: '🔱 Admin SK',          weight: 0.01, itemReward: 'admin_sk'        }, // 0.01%
    // Mutation drops from lucky block (higher-tier)
    { id: 'mut_frost',    name: '🧊 Frost Mutation',    weight: 3,    mutationReward: 'frost'       },
    { id: 'mut_galaxy',   name: '🌌 Galaxy Mutation',   weight: 2,    mutationReward: 'galaxy'      },
    { id: 'mut_nebula',   name: '🔮 Nebula Mutation',   weight: 1,    mutationReward: 'nebula'      },
    { id: 'mut_void',     name: '🕳️ Void Mutation',     weight: 1,    mutationReward: 'void_new'    },
    { id: 'mut_admin',    name: '👑 Admin Mutation',    weight: 0.001,mutationReward: 'admin'       }, // 0.001%
  ],
};
