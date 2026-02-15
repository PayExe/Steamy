const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

let cachedApps = null;
let cacheDate = 0;

async function getAppList() {
  if (cachedApps && Date.now() - cacheDate < 3600000) return cachedApps;

  const res = await fetch('https://api.steampowered.com/ISteamApps/GetAppList/v2/');
  const data = await res.json();
  cachedApps = data.applist.apps;
  cacheDate = Date.now();
  return cachedApps;
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

async function searchAppId(query) {
  if (!query) return null;
  const q = String(query).trim();
  if (/^\d+$/.test(q)) return q;

  const low = q.toLowerCase();

  try {
    const url = `https://store.steampowered.com/api/storesearch/?cc=US&l=english&term=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'node-fetch' } });
    const json = await res.json();
    const items = (json?.items || []).map(i => ({ appid: i.id || i.appid, name: i.name }));

    const hit = items.find(a => a.name?.toLowerCase() === low)
      || items.find(a => a.name?.toLowerCase().startsWith(low))
      || items.find(a => a.name?.toLowerCase().includes(low));
    if (hit?.appid) return String(hit.appid);
  } catch {}

  const apps = await getAppList();
  const hit = apps.find(a => a.name && a.name.toLowerCase() === low)
    || apps.find(a => a.name && a.name.toLowerCase().startsWith(low))
    || apps.find(a => a.name && a.name.toLowerCase().includes(low));
  return hit ? String(hit.appid) : null;
}

async function autocomplete(focused) {
  const apps = await getAppList();
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
