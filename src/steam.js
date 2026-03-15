const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const { STEAM_URLS, COOLDOWN, LIMITS, STEAM_CONFIG } = require('./constants');

let cachedApps = null;
let cacheDate = 0;

async function getAppList() {
  if (cachedApps && Date.now() - cacheDate < COOLDOWN.CACHE_APPLIST) {
    return cachedApps;
  }

  try {
    const res = await fetch(STEAM_URLS.APP_LIST);
    if (!res.ok) throw new Error(`Steam API ${res.status}`);
    const data = await res.json();
    cachedApps = data.applist.apps;
    cacheDate = Date.now();
  } catch (e) {
    console.error('[Steam] getAppList:', e.message);
    if (cachedApps) return cachedApps;
  }
  
  return cachedApps || [];
}

async function getAppDetails(appid) {
  try {
    const res = await fetch(
      `${STEAM_URLS.APP_DETAILS}?appids=${appid}&cc=${STEAM_CONFIG.COUNTRY_CODE_STORE}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json[appid];
  } catch (e) {
    console.error('[Steam] getAppDetails:', e.message);
    return null;
  }
}

async function getReviews(appid) {
  try {
    const res = await fetch(`${STEAM_URLS.REVIEWS}${appid}?json=1&language=all`);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.query_summary || null;
  } catch (e) {
    console.error('[Steam] getReviews:', e.message);
    return null;
  }
}

async function storeSearch(term) {
  if (!term || typeof term !== 'string') return [];
  
  try {
    const url = `${STEAM_URLS.STORE_SEARCH}?cc=${STEAM_CONFIG.COUNTRY_CODE_SEARCH}&l=${STEAM_CONFIG.LANGUAGE}&term=${encodeURIComponent(term)}`;
    const res = await fetch(url, { 
      headers: { 'User-Agent': STEAM_CONFIG.USER_AGENT } 
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.items || []).map(i => ({ 
      appid: i.id || i.appid, 
      name: i.name 
    }));
  } catch (e) {
    console.error('[Steam] storeSearch:', e.message);
    return [];
  }
}

async function searchAppId(query) {
  if (!query) return null;
  
  const q = String(query).trim();
  
  if (/^\d+$/.test(q)) return q;

  const q_lower = q.toLowerCase();
  
  const storeResults = await storeSearch(q);
  const exactMatch = storeResults.find(a => a.name?.toLowerCase() === q_lower);
  if (exactMatch?.appid) return String(exactMatch.appid);
  
  const prefixMatch = storeResults.find(a => a.name?.toLowerCase().startsWith(q_lower));
  if (prefixMatch?.appid) return String(prefixMatch.appid);
  
  const partialMatch = storeResults.find(a => a.name?.toLowerCase().includes(q_lower));
  if (partialMatch?.appid) return String(partialMatch.appid);

  const apps = await getAppList();
  if (!apps.length) return null;
  
  const appExact = apps.find(a => a.name?.toLowerCase() === q_lower);
  if (appExact) return String(appExact.appid);
  
  const appPrefix = apps.find(a => a.name?.toLowerCase().startsWith(q_lower));
  if (appPrefix) return String(appPrefix.appid);
  
  const appPartial = apps.find(a => a.name?.toLowerCase().includes(q_lower));
  return appPartial ? String(appPartial.appid) : null;
}

async function autocomplete(focused) {
  if (!focused || focused.length < 2) return [];

  const storeResults = await storeSearch(focused);
  if (storeResults.length) {
    const seen = new Set();
    return storeResults
      .filter(a => {
        if (!a.name || seen.has(a.name)) return false;
        seen.add(a.name);
        return true;
      })
      .slice(0, 25)
      .map(a => ({ name: a.name, value: a.name }));
  }

  const apps = await getAppList();
  if (!apps.length) return [];
  
  const q = focused.toLowerCase();
  let results = apps.filter(a => 
    a.name && 
    a.name.length <= LIMITS.NAME_LENGTH && 
    a.name.toLowerCase().includes(q)
  );

  results.sort((a, b) => {
    const al = a.name.toLowerCase();
    const bl = b.name.toLowerCase();
    
    if (al === q) return -1;
    if (bl === q) return 1;
    if (al.startsWith(q) && !bl.startsWith(q)) return -1;
    if (bl.startsWith(q) && !al.startsWith(q)) return 1;
    return 0;
  });

  const seen = new Set();
  return results
    .filter(a => {
      if (seen.has(a.name)) return false;
      seen.add(a.name);
      return true;
    })
    .slice(0, 25)
    .map(a => ({ name: a.name, value: a.name }));
}

module.exports = { 
  getAppList, 
  getAppDetails, 
  getReviews, 
  searchAppId, 
  autocomplete 
};
