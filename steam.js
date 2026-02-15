const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

let cachedApps = null;
let cacheDate = 0;

async function getAppList() {
  if (cachedApps && Date.now() - cacheDate < 3600000) return cachedApps;

  try {
    const res = await fetch('https://api.steampowered.com/ISteamApps/GetAppList/v2/');
    if (!res.ok) throw new Error(`Steam API ${res.status}`);
    const data = await res.json();
    cachedApps = data.applist.apps;
    cacheDate = Date.now();
  } catch (e) {
    console.error('getAppList:', e.message);
    if (cachedApps) return cachedApps;
  }
  return cachedApps || [];
}

async function getAppDetails(appid) {
  try {
    const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&cc=fr`);
    const json = await res.json();
    return json[appid];
  } catch { return null; }
}

async function getReviews(appid) {
  try {
    const res = await fetch(`https://store.steampowered.com/appreviews/${appid}?json=1&language=all`);
    const json = await res.json();
    return json?.query_summary || null;
  } catch { return null; }
}

async function storeSearch(term) {
  try {
    const url = `https://store.steampowered.com/api/storesearch/?cc=US&l=english&term=${encodeURIComponent(term)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'node-fetch' } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.items || []).map(i => ({ appid: i.id || i.appid, name: i.name }));
  } catch { return []; }
}

async function searchAppId(query) {
  if (!query) return null;
  const q = String(query).trim();
  if (/^\d+$/.test(q)) return q;

  const low = q.toLowerCase();
  const items = await storeSearch(q);

  const hit = items.find(a => a.name?.toLowerCase() === low)
    || items.find(a => a.name?.toLowerCase().startsWith(low))
    || items.find(a => a.name?.toLowerCase().includes(low));
  if (hit?.appid) return String(hit.appid);

  const apps = await getAppList();
  if (!apps.length) return null;
  const fallback = apps.find(a => a.name && a.name.toLowerCase() === low)
    || apps.find(a => a.name && a.name.toLowerCase().startsWith(low))
    || apps.find(a => a.name && a.name.toLowerCase().includes(low));
  return fallback ? String(fallback.appid) : null;
}

async function autocomplete(focused) {
  if (!focused || focused.length < 2) return [];

  const items = await storeSearch(focused);
  if (items.length) {
    const seen = new Set();
    return items.filter(a => {
      if (!a.name || seen.has(a.name)) return false;
      seen.add(a.name);
      return true;
    }).slice(0, 20).map(a => ({ name: a.name, value: a.name }));
  }

  const apps = await getAppList();
  if (!apps.length) return [];
  const q = focused.toLowerCase();

  let results = apps.filter(a => a.name && a.name.length <= 100 && a.name.toLowerCase().includes(q));

  results.sort((a, b) => {
    const al = a.name.toLowerCase(), bl = b.name.toLowerCase();
    if (al === q) return -1;
    if (bl === q) return 1;
    if (al.startsWith(q) && !bl.startsWith(q)) return -1;
    if (bl.startsWith(q) && !al.startsWith(q)) return 1;
    return 0;
  });

  const seen = new Set();
  return results.filter(a => {
    if (seen.has(a.name)) return false;
    seen.add(a.name);
    return true;
  }).slice(0, 20).map(a => ({ name: a.name, value: a.name }));
}

module.exports = { getAppList, getAppDetails, getReviews, searchAppId, autocomplete };
