const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function fetchAppList() {
  try {
    const res = await fetch('https://api.steampowered.com/ISteamApps/GetAppList/v2/');
    const json = await res.json();
    return (json && json.applist && json.applist.apps) || [];
  } catch (e) {
    return [];
  }
}

async function fetchStoreSearch(term) {
  try {
    const url = 'https://store.steampowered.com/api/storesearch/?cc=US&l=english&term=' + encodeURIComponent(term);
    const res = await fetch(url, { headers: { 'User-Agent': 'node-fetch' } });
    const json = await res.json();
    const list = (json && (json.items || json.apps || json.results)) || [];
    return Array.isArray(list) ? list.map(item => ({
      appid: item.id || item.appid || item.app_id || item.appID || item.steam_appid,
      name: item.name || item.title || item.app_name
    })) : [];
  } catch (e) {
    return [];
  }
}

async function searchSteamAppId(query) {
  if (!query) return null;

  const trimmed = String(query).trim();
  if (/^\d+$/.test(trimmed)) return trimmed;

  const q = trimmed.toLowerCase();

  const storeCandidates = await fetchStoreSearch(trimmed);
  const storeExact = storeCandidates.find(a => a.name && a.name.toLowerCase() === q);
  if (storeExact && storeExact.appid) return String(storeExact.appid);

  const storeStarts = storeCandidates.find(a => a.name && a.name.toLowerCase().startsWith(q));
  if (storeStarts && storeStarts.appid) return String(storeStarts.appid);

  const storeIncludes = storeCandidates.find(a => a.name && a.name.toLowerCase().includes(q));
  if (storeIncludes && storeIncludes.appid) return String(storeIncludes.appid);

  const apps = await fetchAppList();
  const candidates = apps.filter(a => a.name && a.name.length > 0).slice(0, 200000);

  const exact = candidates.find(a => a.name.toLowerCase() === q);
  if (exact) return String(exact.appid);

  const starts = candidates.find(a => a.name.toLowerCase().startsWith(q));
  if (starts) return String(starts.appid);

  const includes = candidates.find(a => a.name.toLowerCase().includes(q));
  if (includes) return String(includes.appid);

  return null;
}

module.exports = { searchSteamAppId };
