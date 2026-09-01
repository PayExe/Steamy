const db = require('./db');
const steam = require('./steam');
const { LIMITS } = require('./constants');

async function addAdminAlert(guildId, gameName, appid) {
  const alerts = await db.getAdminAlerts(guildId);
  
  if (alerts.some(a => a.appid === String(appid))) {
    return { success: false, reason: 'duplicate' };
  }
  
  alerts.push({ name: gameName, appid: String(appid), addedAt: Date.now() });
  await db.saveAdminAlerts(guildId, alerts);
  return { success: true };
}

async function removeAdminAlert(guildId, gameName) {
  const alerts = await db.getAdminAlerts(guildId);
  const index = alerts.findIndex(a => a.name.toLowerCase() === gameName.toLowerCase());
  
  if (index === -1) {
    return { success: false, reason: 'not_found' };
  }
  
  const removed = alerts.splice(index, 1)[0];
  await db.saveAdminAlerts(guildId, alerts);
  return { success: true, removed };
}

async function getAdminAlerts(guildId) {
  return db.getAdminAlerts(guildId);
}

async function checkUserAlertPrices(userId) {
  const wishlist = await db.getWishlist(userId);
  const triggered = [];
  
  for (const game of wishlist) {
    const details = await steam.getAppDetails(game.appid);
    
    if (!details || !details.price_overview) continue;
    
    const current = details.price_overview.final / 100;
    const original = details.price_overview.initial / 100;
    const discount = Math.round(((original - current) / original) * 100);
    
    if (discount >= LIMITS.DISCOUNT_THRESHOLD) {
      triggered.push({
        appid: game.appid,
        name: game.name,
        discount,
        currentPrice: current,
        originalPrice: original,
        appName: details.name,
      });
    }
  }
  
  return triggered;
}

async function checkAdminAlertPrices(guildId) {
  const alerts = await db.getAdminAlerts(guildId);
  const triggered = [];
  
  for (const alert of alerts) {
    const details = await steam.getAppDetails(alert.appid);
    
    if (!details || !details.price_overview) continue;
    
    const current = details.price_overview.final / 100;
    const original = details.price_overview.initial / 100;
    const discount = Math.round(((original - current) / original) * 100);
    
    if (discount >= LIMITS.DISCOUNT_THRESHOLD) {
      triggered.push({
        ...alert,
        discount,
        currentPrice: current,
        originalPrice: original,
        appName: details.name,
      });
    }
  }
  
  return triggered;
}

async function getAllAdminAlerts() {
  return db.getAllAdminAlerts();
}

module.exports = {
  addAdminAlert,
  removeAdminAlert,
  getAdminAlerts,
  checkUserAlertPrices,
  checkAdminAlertPrices,
  getAllAdminAlerts,
};
