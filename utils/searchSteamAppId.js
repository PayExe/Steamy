
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

async function searchSteamAppId(query) {
  if (!query) return null;

  const trimmed = String(query).trim();
  if (/^\d+$/.test(trimmed)) return trimmed;

  const q = trimmed.toLowerCase();
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
