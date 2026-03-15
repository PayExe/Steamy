const STEAM_URLS = {
  APP_LIST: 'https://api.steampowered.com/ISteamApps/GetAppList/v2/',
  APP_DETAILS: 'https://store.steampowered.com/api/appdetails',
  REVIEWS: 'https://store.steampowered.com/appreviews/',
  STORE_SEARCH: 'https://store.steampowered.com/api/storesearch/',
  FEATURED: 'https://store.steampowered.com/api/featured/',
  FEATURED_CATEGORIES: 'https://store.steampowered.com/api/featuredcategories/',
  STORE_APP: 'https://store.steampowered.com/app/',
};

const EMOJIS = {
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  LOADING: '⏳',
  STAR: '⭐',
  TRASH: '🗑️',
  BROOM: '🧹',
  MAILBOX_EMPTY: '📭',
  GAME: '🎮',
  CONTROLLER: '🕹️',
  PUZZLE: '🧩',
  FREE: '🆓',
  TOOLS: '🛠️',
  TV: '📺',
  FIRE: '🔥',
  MONEY: '💶',
  LOCK_OPEN: '🔓',
  QUESTION: '❔',
  FILM: '🎬',
  GUIDE: '📖',
  HELP: '❓',
  VERY_POSITIVE: '👍',
  POSITIVE: '🙂',
  MIXED: '😐',
  NEGATIVE: '👎',
  VERY_NEGATIVE: '💩',
  OVERWHELMINGLY_POSITIVE: '🌟',
};

const STEAM_TYPES = {
  GAME: 'game',
  DLC: 'dlc',
  DEMO: 'demo',
  MOD: 'mod',
  EPISODE: 'episode',
};

const TYPE_EMOJI = {
  [STEAM_TYPES.GAME]: EMOJIS.GAME,
  [STEAM_TYPES.DLC]: EMOJIS.PUZZLE,
  [STEAM_TYPES.DEMO]: EMOJIS.FREE,
  [STEAM_TYPES.MOD]: EMOJIS.TOOLS,
  [STEAM_TYPES.EPISODE]: EMOJIS.TV,
};

const REVIEW_EMOJI = {
  'Overwhelmingly Positive': EMOJIS.OVERWHELMINGLY_POSITIVE,
  'Very Positive': EMOJIS.VERY_POSITIVE,
  'Positive': EMOJIS.POSITIVE,
  'Mostly Positive': EMOJIS.POSITIVE,
  'Mixed': EMOJIS.MIXED,
  'Mostly Negative': EMOJIS.NEGATIVE,
  'Negative': EMOJIS.NEGATIVE,
  'Very Negative': EMOJIS.NEGATIVE,
  'Overwhelmingly Negative': EMOJIS.VERY_NEGATIVE,
};

const PAGINATION = {
  ITEMS_PER_PAGE: 10,
  MAX_AUTOCOMPLETE_RESULTS: 25,
  MAX_AUTOCOMPLETE_LENGTH: 100,
};

const COOLDOWN = {
  COMMAND: 3000,
  CACHE_APPLIST: 3600000,
};

const LIMITS = {
  NAME_LENGTH: 100,
  DESCRIPTION_LENGTH: 600,
};

const COLORS = {
  PRIMARY: 0x0099ff,
  STEAM: 0x1b2838,
  DISCORD: 0x7289DA,
  ERROR: 0xFF0000,
};

const STEAM_CONFIG = {
  COUNTRY_CODE_STORE: 'fr',
  COUNTRY_CODE_SEARCH: 'US',
  LANGUAGE: 'english',
  USER_AGENT: 'node-fetch',
};

module.exports = {
  STEAM_URLS,
  EMOJIS,
  STEAM_TYPES,
  TYPE_EMOJI,
  REVIEW_EMOJI,
  PAGINATION,
  COOLDOWN,
  LIMITS,
  COLORS,
  STEAM_CONFIG,
};
