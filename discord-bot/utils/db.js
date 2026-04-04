/**
 * db.js — Simple JSON file database
 * Replaces MongoDB entirely. Zero setup required.
 *
 * Data is stored in data/users.json
 * All reads/writes are synchronous in memory; file is flushed after every save.
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');

// ── In-memory store ──────────────────────────────────────────────────────────
let store = {};

// ── Bootstrap ────────────────────────────────────────────────────────────────
function init() {
  if (!fs.existsSync(DATA_DIR))  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '{}', 'utf8');
  try {
    store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    store = {};
  }
  console.log('✅ JSON database loaded');
}

// ── Persist ───────────────────────────────────────────────────────────────────
function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

// ── Default user template ────────────────────────────────────────────────────
function defaultUser(userId, guildId, username) {
  return {
    userId,
    guildId,
    username: username || 'Unknown',

    wallet:      100,
    bank:        0,
    bankLimit:   10000,
    totalEarned: 0,
    totalSpent:  0,

    xp:      0,
    level:   1,
    totalXp: 0,

    inventory:    [],
    badges:       [],
    achievements: [],
    quests:       [],

    // Social / guild
    guildId_economy: null,   // guild/clan membership (separate from Discord guildId)
    referrerId:      null,   // userId of who referred this user
    referrals:       [],     // userIds this user has referred

    // Passive income
    investments: [],         // { type, amount, startedAt, matureAt }

    // Engagement
    streak:       0,         // daily login streak
    lastLogin:    null,      // ISO date of last login
    playtime:     0,         // total days active (incremented on login)
    favoriteGame: null,      // most-played game id
    rank:         null,      // cached server wealth rank

    cooldowns: {
      daily:  null,
      work:   null,
      crime:  null,
      rob:    null,
      xp:     null,
    },

    stats: {
      gamesPlayed:   0,
      gamesWon:      0,
      totalGambled:  0,
      totalWon:      0,
      messagesCount: 0,
      commandsUsed:  0,
      dailyStreak:   0,
      // per-game play counts for favoriteGame tracking
      gameCounts:    {},
    },

    banned:    false,
    banReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ── Key helper ────────────────────────────────────────────────────────────────
function key(userId, guildId) {
  return `${guildId}:${userId}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Get or create a user object. Always returns a live reference. */
function getUser(userId, guildId, username) {
  const k = key(userId, guildId);
  if (!store[k]) {
    store[k] = defaultUser(userId, guildId, username);
  } else if (username && store[k].username !== username) {
    store[k].username = username;
  }
  return store[k];
}

/** Persist a user object back to disk. */
function saveUser(user) {
  user.updatedAt = new Date().toISOString();
  const k = key(user.userId, user.guildId);
  store[k] = user;
  save();
}

/** Delete a user (reset). */
function deleteUser(userId, guildId) {
  const k = key(userId, guildId);
  delete store[k];
  save();
}

/** Get all users for a guild, sorted by a field. */
function getLeaderboard(guildId, sortFn, limit = 10) {
  return Object.values(store)
    .filter(u => u.guildId === guildId && !u.banned)
    .sort(sortFn)
    .slice(0, limit);
}

/** Get ALL users for a guild (including banned). */
function getAllUsers(guildId) {
  return Object.values(store).filter(u => u.guildId === guildId);
}

/** Get the full raw store (for export). */
function getRawStore() {
  return store;
}

/** Overwrite the full store (for import). */
function setRawStore(data) {
  store = data;
  save();
}

/** Compute and cache wealth rank for every user in a guild. */
function refreshRanks(guildId) {
  const users = Object.values(store)
    .filter(u => u.guildId === guildId && !u.banned)
    .sort((a, b) => (b.wallet + b.bank) - (a.wallet + a.bank));
  users.forEach((u, i) => { u.rank = i + 1; });
  save();
}

// ── Item helpers (replicate Mongoose virtuals) ───────────────────────────────

function hasActiveItem(user, itemId) {
  const item = (user.inventory || []).find(i => i.itemId === itemId);
  if (!item) return false;
  if (item.expiresAt && new Date(item.expiresAt) < new Date()) return false;
  return true;
}

function xpForNextLevel(user) {
  return user.level * 100;
}

// ── Guild helpers ─────────────────────────────────────────────────────────────

const GUILDS_FILE_PATH = path.join(__dirname, '../data/guilds.json');

function loadGuilds() {
  if (!fs.existsSync(GUILDS_FILE_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(GUILDS_FILE_PATH, 'utf8')); } catch { return {}; }
}

function saveGuilds(data) {
  fs.mkdirSync(path.dirname(GUILDS_FILE_PATH), { recursive: true });
  fs.writeFileSync(GUILDS_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Returns the ISO date string for the most recent Monday (YYYY-MM-DD).
 * Used as the weekly-reset key.
 */
function currentWeekKey() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon … 6=Sat
  const diff = (day === 0 ? -6 : 1 - day); // days back to Monday
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  return monday.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * Record a contribution to a guild's weekly deposit tracker.
 * Resets the counter automatically every Monday.
 *
 * @param {string} guildEconomyId  - The economy guild ID (key in guilds.json)
 * @param {number} netAmount       - Net coins added to treasury (after tax)
 */
function recordGuildDeposit(guildEconomyId, netAmount) {
  const guilds = loadGuilds();
  const guild  = guilds[guildEconomyId];
  if (!guild) return;

  const weekKey = currentWeekKey();

  // Reset if we're in a new week
  if (guild.weeklyResetKey !== weekKey) {
    guild.weeklyDeposits = 0;
    guild.weeklyResetKey = weekKey;
  }

  guild.weeklyDeposits = (guild.weeklyDeposits || 0) + netAmount;
  saveGuilds(guilds);
}

module.exports = {
  init, getUser, saveUser, deleteUser,
  getLeaderboard, getAllUsers,
  getRawStore, setRawStore, refreshRanks,
  hasActiveItem, xpForNextLevel, save,
  loadGuilds, saveGuilds, recordGuildDeposit, currentWeekKey,
};
