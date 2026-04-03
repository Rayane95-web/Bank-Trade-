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

  // ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────
  achievements: [
    { id: 'first_blood',    name: '🩸 First Blood',      description: 'Win your first gambling game',          condition: { type: 'gamesWon',    value: 1      } },
    { id: 'high_roller',    name: '🎲 High Roller',      description: 'Gamble 100 times',                      condition: { type: 'gamesPlayed', value: 100    } },
    { id: 'millionaire',    name: '💰 Millionaire',      description: 'Accumulate 1,000,000 coins net worth',  condition: { type: 'netWorth',    value: 1000000} },
    { id: 'billionaire',    name: '💎 Billionaire',      description: 'Accumulate 1,000,000,000 coins',        condition: { type: 'netWorth',    value: 1e9    } },
    { id: 'streak_7',       name: '🔥 Week Warrior',     description: 'Maintain a 7-day daily streak',         condition: { type: 'streak',      value: 7      } },
    { id: 'streak_30',      name: '📅 Monthly Grinder',  description: 'Maintain a 30-day daily streak',        condition: { type: 'streak',      value: 30     } },
    { id: 'streak_100',     name: '💯 Century Streak',   description: 'Maintain a 100-day daily streak',       condition: { type: 'streak',      value: 100    } },
    { id: 'level_10',       name: '⭐ Rising Star',      description: 'Reach Level 10',                        condition: { type: 'level',       value: 10     } },
    { id: 'level_50',       name: '🌟 Veteran',          description: 'Reach Level 50',                        condition: { type: 'level',       value: 50     } },
    { id: 'level_100',      name: '👑 Legend',           description: 'Reach Level 100',                       condition: { type: 'level',       value: 100    } },
    { id: 'collector',      name: '🎒 Collector',        description: 'Own 10 different items',                condition: { type: 'itemCount',   value: 10     } },
    { id: 'mutation_hunter',name: '🧬 Mutation Hunter',  description: 'Own 5 mutations',                       condition: { type: 'mutCount',    value: 5      } },
    { id: 'social_butterfly',name:'🦋 Social Butterfly', description: 'Refer 5 users to the server',           condition: { type: 'referrals',   value: 5      } },
    { id: 'guild_founder',  name: '🏰 Guild Founder',    description: 'Create a guild',                        condition: { type: 'manual',      value: 0      } },
    { id: 'bounty_hunter',  name: '🎯 Bounty Hunter',    description: 'Complete 10 bounties',                  condition: { type: 'manual',      value: 0      } },
    { id: 'craftsman',      name: '⚒️ Craftsman',        description: 'Craft 5 items',                         condition: { type: 'manual',      value: 0      } },
    { id: 'investor',       name: '📈 Investor',         description: 'Have 3 active investments',             condition: { type: 'manual',      value: 0      } },
    { id: 'tournament_champ',name:'🏆 Champion',         description: 'Win a tournament',                      condition: { type: 'manual',      value: 0      } },
  ],

  // ─── GUILDS ───────────────────────────────────────────────────────────────
  guilds: {
    createCost:       5000,    // coins to create a guild
    maxMembers:       20,
    maxNameLength:    32,
    treasuryTaxRate:  0.02,    // 2% tax on contributions
    weeklyBonus:      1000,    // coins distributed to members weekly
  },

  // ─── INVESTMENTS ──────────────────────────────────────────────────────────
  investments: [
    { id: 'savings',    name: '🏦 Savings Account',  minAmount: 1000,    maxAmount: 100000,   returnRate: 0.05,  duration: 86400000,    description: '5% return after 24 hours'          },
    { id: 'stocks',     name: '📈 Stock Market',     minAmount: 5000,    maxAmount: 500000,   returnRate: 0.15,  duration: 259200000,   description: '15% return after 3 days (volatile)' },
    { id: 'crypto',     name: '₿ Crypto',            minAmount: 10000,   maxAmount: 1000000,  returnRate: 0.40,  duration: 604800000,   description: '40% return after 7 days (high risk)'},
    { id: 'real_estate',name: '🏠 Real Estate',      minAmount: 50000,   maxAmount: 5000000,  returnRate: 0.25,  duration: 1209600000,  description: '25% return after 14 days'           },
    { id: 'venture',    name: '🚀 Venture Capital',  minAmount: 100000,  maxAmount: 10000000, returnRate: 1.00,  duration: 2592000000,  description: '100% return after 30 days'          },
  ],

  // ─── CRAFTING ─────────────────────────────────────────────────────────────
  crafting: [
    {
      id: 'super_boost',
      name: '⚡💎 Super Boost',
      description: 'Combines XP Boost + Coin Multiplier into a 3-hour super boost',
      ingredients: [{ itemId: 'xp_boost', qty: 1 }, { itemId: 'multiplier', qty: 1 }],
      result: { itemId: 'super_boost', name: '⚡💎 Super Boost', duration: 10800000, type: 'boost' },
    },
    {
      id: 'mega_shield',
      name: '🛡️🍀 Mega Shield',
      description: 'Combines Rob Shield + Lucky Charm into a 12-hour mega shield',
      ingredients: [{ itemId: 'shield', qty: 1 }, { itemId: 'lucky_charm', qty: 1 }],
      result: { itemId: 'mega_shield', name: '🛡️🍀 Mega Shield', duration: 43200000, type: 'protection' },
    },
    {
      id: 'loot_box_basic',
      name: '📦 Basic Loot Box',
      description: 'Craft a basic loot box from 3 Mystery Carts',
      ingredients: [{ itemId: 'cart', qty: 3 }],
      result: { itemId: 'loot_box_basic', name: '📦 Basic Loot Box', type: 'lootbox', tier: 'basic' },
    },
    {
      id: 'loot_box_premium',
      name: '💜 Premium Loot Box',
      description: 'Craft a premium loot box from 2 Lucky Blocks',
      ingredients: [{ itemId: 'lucky_block', qty: 2 }],
      result: { itemId: 'loot_box_premium', name: '💜 Premium Loot Box', type: 'lootbox', tier: 'premium' },
    },
  ],

  // ─── LOOT BOXES ───────────────────────────────────────────────────────────
  lootBoxes: {
    basic: {
      name: '📦 Basic Loot Box',
      price: 3000,
      loot: [
        { id: 'coins',      weight: 40, coinReward: [500,  5000]  },
        { id: 'xp_boost',   weight: 25, itemReward: 'xp_boost'    },
        { id: 'shield',     weight: 20, itemReward: 'shield'       },
        { id: 'lucky_charm',weight: 15, itemReward: 'lucky_charm'  },
      ],
    },
    premium: {
      name: '💜 Premium Loot Box',
      price: 10000,
      loot: [
        { id: 'coins',      weight: 30, coinReward: [5000, 50000]  },
        { id: 'multiplier', weight: 20, itemReward: 'multiplier'   },
        { id: 'crime_pass', weight: 15, itemReward: 'crime_pass'   },
        { id: 'iphone17',   weight: 10, itemReward: 'iphone17'     },
        { id: 'mut_candy',  weight: 15, mutationReward: 'candy'    },
        { id: 'mut_radiant',weight: 10, mutationReward: 'radiant'  },
      ],
    },
    legendary: {
      name: '🌟 Legendary Loot Box',
      price: 50000,
      loot: [
        { id: 'coins',      weight: 20, coinReward: [25000, 250000] },
        { id: 'yacht',      weight: 5,  itemReward: 'yacht'         },
        { id: 'mut_galaxy', weight: 15, mutationReward: 'galaxy'    },
        { id: 'mut_nebula', weight: 10, mutationReward: 'nebula'    },
        { id: 'mut_void',   weight: 5,  mutationReward: 'void_new'  },
        { id: 'bank_upgrade',weight:20, itemReward: 'bank_upgrade'  },
        { id: 'multiplier', weight: 25, itemReward: 'multiplier'    },
      ],
    },
  },

  // ─── BOUNTIES ─────────────────────────────────────────────────────────────
  bounties: [
    { id: 'gamble_50',    name: '🎲 Gambler',        description: 'Play 50 gambling games',          type: 'stat',    stat: 'gamesPlayed',  goal: 50,   reward: 2500,  xpReward: 500  },
    { id: 'earn_10k',     name: '💰 Earner',          description: 'Earn 10,000 coins total',         type: 'stat',    stat: 'totalEarned',  goal: 10000,reward: 1500,  xpReward: 300  },
    { id: 'win_20',       name: '🏆 Winner',          description: 'Win 20 gambling games',           type: 'stat',    stat: 'gamesWon',     goal: 20,   reward: 3000,  xpReward: 600  },
    { id: 'streak_14',    name: '🔥 Dedicated',       description: 'Reach a 14-day login streak',     type: 'streak',  goal: 14,             reward: 5000,  xpReward: 1000 },
    { id: 'level_20',     name: '⭐ Leveler',         description: 'Reach Level 20',                  type: 'level',   goal: 20,             reward: 4000,  xpReward: 800  },
    { id: 'refer_3',      name: '🤝 Recruiter',       description: 'Refer 3 new users',               type: 'referrals',goal: 3,             reward: 6000,  xpReward: 1200 },
    { id: 'craft_3',      name: '⚒️ Crafter',         description: 'Craft 3 items',                   type: 'manual',  goal: 3,              reward: 2000,  xpReward: 400  },
    { id: 'invest_2',     name: '📈 Investor',        description: 'Make 2 investments',              type: 'manual',  goal: 2,              reward: 3500,  xpReward: 700  },
  ],

  // ─── SEASONAL EVENTS ──────────────────────────────────────────────────────
  seasonalEvents: {
    current: 'winter_2025',
    events: {
      winter_2025: {
        name: '❄️ Winter Festival 2025',
        active: true,
        startDate: '2025-12-01',
        endDate:   '2026-01-15',
        bonusMultiplier: 1.25,   // 25% bonus on all earnings
        exclusiveItems: [
          { id: 'snowflake',   name: '❄️ Snowflake',    price: 2500,  description: 'A rare winter snowflake. Seasonal flex item.', type: 'flex' },
          { id: 'hot_cocoa',   name: '☕ Hot Cocoa',    price: 500,   description: '+5% daily bonus for 24h', type: 'boost', duration: 86400000 },
          { id: 'santa_hat',   name: '🎅 Santa Hat',    price: 1500,  description: 'Festive hat. Prestige item.', type: 'flex' },
        ],
        exclusiveMutations: ['frost', 'galaxy'],
      },
      summer_2025: {
        name: '☀️ Summer Bash 2025',
        active: false,
        startDate: '2025-06-01',
        endDate:   '2025-08-31',
        bonusMultiplier: 1.15,
        exclusiveItems: [
          { id: 'sunglasses',  name: '😎 Sunglasses',   price: 800,   description: 'Cool shades. Flex item.', type: 'flex' },
          { id: 'beach_ball',  name: '🏖️ Beach Ball',   price: 300,   description: 'Summer vibes.', type: 'flex' },
        ],
        exclusiveMutations: ['radiant', 'inferno'],
      },
    },
  },

  // ─── TOURNAMENTS ──────────────────────────────────────────────────────────
  tournaments: {
    entryFee:       1000,
    maxParticipants: 16,
    prizePool: {
      1: 0.50,   // 50% of total pot to 1st
      2: 0.30,   // 30% to 2nd
      3: 0.20,   // 20% to 3rd
    },
    games: ['coinflip', 'dice', 'slots'],
    roundDuration: 300000,   // 5 minutes per round
    cooldown:      86400000, // once per day
  },
};
