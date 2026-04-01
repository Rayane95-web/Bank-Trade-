const config = require('../config/config');

function resetDailyQuests(user) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const questDef of config.quests) {
    let progress = user.quests.find(q => q.questId === questDef.id);
    if (!progress) {
      user.quests.push({ questId: questDef.id, progress: 0, completed: false, claimed: false, lastReset: today.toISOString() });
      continue;
    }
    const lastReset = new Date(progress.lastReset);
    lastReset.setHours(0, 0, 0, 0);
    if (lastReset < today) {
      progress.progress  = 0;
      progress.completed = false;
      progress.claimed   = false;
      progress.lastReset = today.toISOString();
    }
  }
}

function trackQuest(user, type, amount = 1) {
  resetDailyQuests(user);
  const matching = config.quests.filter(q => {
    if (q.id.includes('chat')    && type === 'chat')    return true;
    if (q.id.includes('command') && type === 'command') return true;
    if (q.id.includes('gamble')  && type === 'gamble')  return true;
    if (q.id.includes('work')    && type === 'work')    return true;
    return false;
  });
  for (const questDef of matching) {
    const progress = user.quests.find(q => q.questId === questDef.id);
    if (!progress || progress.completed) continue;
    progress.progress = Math.min(progress.progress + amount, questDef.goal);
    if (progress.progress >= questDef.goal) progress.completed = true;
  }
}

module.exports = { resetDailyQuests, trackQuest };
