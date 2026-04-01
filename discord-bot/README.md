# 🤖 Discord Economy Bot

A fully-featured Discord economy, leveling, and gambling bot built with **discord.js v14** and **MongoDB**.

---

## ✨ Features

| System | Commands |
|---|---|
| 💰 **Economy** | `/balance` `/deposit` `/withdraw` `/pay` `/daily` `/work` `/rob` `/crime` |
| 🎮 **Gambling** | `/crash` `/mines` `/coinflip` `/slots` `/dice` |
| 👤 **Profile** | `/profile` `/leaderboard` `/inventory` `/shop` `/buy` `/quests` `/claim` |
| ⚙️ **Admin** | `/addmoney` `/removemoney` `/setbalance` `/resetuser` `/banfromeconomy` `/additem` `/removeitem` `/givexp` |
| 🤖 **General** | `/ping` `/botinfo` `/help` |

---

## 🚀 Setup

### 1. Prerequisites
- **Node.js 18+** — https://nodejs.org
- **MongoDB** — https://www.mongodb.com/try/download/community (local) or https://www.mongodb.com/atlas (free cloud)
- A **Discord Bot** — https://discord.com/developers/applications

### 2. Create Your Bot
1. Go to https://discord.com/developers/applications
2. Click **New Application** → give it a name
3. Go to **Bot** → click **Add Bot**
4. Enable these **Privileged Gateway Intents**:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
5. Copy your **Bot Token**
6. Go to **OAuth2 → General** and copy your **Client ID**

### 3. Invite the Bot
Use this URL (replace `YOUR_CLIENT_ID`):
```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=277025770560&scope=bot+applications.commands
```

### 4. Install & Configure
```bash
# Install dependencies
npm install

# Copy the example env file
cp .env.example .env
```

Edit `.env` with your values:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_test_guild_id     # Optional: for instant slash command updates
MONGODB_URI=mongodb://localhost:27017/discordbot
BOT_VERSION=2.0.0
DEVELOPER=YourName
ADMIN_ROLE_ID=your_admin_role_id  # Optional: role that can use admin commands
LOG_CHANNEL_ID=your_log_channel   # Optional: channel for admin action logs
```

### 5. Deploy Slash Commands
```bash
# Deploy to a specific guild (instant, great for testing)
# Set GUILD_ID in .env first, then:
npm run deploy

# Or deploy globally (takes up to 1 hour to propagate)
# Remove GUILD_ID from .env, then:
npm run deploy
```

### 6. Start the Bot
```bash
# Production
npm start

# Development (auto-restart on changes)
npm run dev
```

---

## 📁 Project Structure

```
discord-bot/
├── index.js                    # Entry point — loads commands & events
├── deploy-commands.js          # Slash command registration script
├── package.json
├── .env.example
│
├── config/
│   └── config.js               # All bot settings (economy rates, XP, shop items)
│
├── models/
│   ├── User.js                 # User schema (balance, XP, inventory, quests...)
│   └── AdminLog.js             # Admin action logging
│
├── commands/
│   ├── economy/                # balance, deposit, withdraw, pay, daily, work, rob, crime
│   ├── gambling/               # crash, mines, coinflip, slots, dice
│   ├── profile/                # profile, shop, buy, inventory, quests, claim, leaderboard
│   ├── admin/                  # addmoney, removemoney, setbalance, resetuser, ban, givexp...
│   └── general/                # ping, botinfo, help
│
├── events/
│   ├── ready.js                # Bot startup, DB connect, activity rotation
│   ├── interactionCreate.js    # Slash command handler + quest tracking
│   └── messageCreate.js        # XP gain from chatting
│
└── utils/
    ├── database.js             # MongoDB connection
    ├── embeds.js               # Embed builder helpers
    ├── helpers.js              # Shared utilities (cooldowns, XP, RNG, admin check)
    └── questTracker.js         # Daily quest progress tracking
```

---

## ⚙️ Configuration

All key settings live in `config/config.js`:

```js
economy: {
  dailyAmount: 500,          // Base daily reward
  workMin: 50, workMax: 350, // Work earnings range
  robSuccessChance: 0.40,    // 40% rob success rate
  crimeSuccessChance: 0.55,  // 55% crime success rate
}

xp: {
  perMessage: { min: 5, max: 15 }, // XP per message
  cooldown: 60000,                  // 60s between XP gains (anti-spam)
  levelMultiplier: 100,             // XP needed = level × 100
}
```

To add shop items, edit the `shop` array in `config/config.js`.

---

## 🔒 Admin Permissions

Admin commands require **either**:
- Discord `Administrator` permission, **or**
- The role ID set in `ADMIN_ROLE_ID` in your `.env`

---

## 🎮 Gambling Details

| Game | Mechanic | House Edge |
|---|---|---|
| **Crash** | Multiplier grows until random crash point | ~4% |
| **Mines** | 5×5 grid, reveal gems, avoid bombs | ~3% |
| **Slots** | 3-reel weighted symbols, 2× to 15× payouts | ~5% |
| **Coinflip** | 50/50 (55% with Lucky Charm item) | ~0% |
| **Dice** | Roll vs bot, higher wins, ties refunded | ~0% |

---

## 🐛 Troubleshooting

**Commands not appearing?**
- Run `npm run deploy` again
- If using GUILD_ID, commands appear instantly; global commands take up to 1 hour

**MongoDB connection error?**
- Ensure MongoDB is running: `mongod` (local) or check Atlas connection string
- Check your `MONGODB_URI` in `.env`

**Bot not responding?**
- Verify `Message Content Intent` is enabled in the Developer Portal
- Check the bot has `Send Messages` and `Use Application Commands` permissions

---

## 📄 License
MIT — free to use and modify.
