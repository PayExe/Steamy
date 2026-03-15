const { EmbedBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const steam = require('../steam');
const { bq } = require('../utils');
const { EMOJIS, COLORS, STEAM_URLS } = require('../constants');

async function getRandomPool() {
  try {
    const [featured, categories] = await Promise.all([
      fetch(STEAM_URLS.FEATURED).then(r => r.json()),
      fetch(STEAM_URLS.FEATURED_CATEGORIES).then(r => r.json()),
    ]);

    const pool = [];
    
    for (const game of (featured.featured_win || [])) {
      pool.push(game);
    }
    
    for (const key of ['specials', 'top_sellers', 'new_releases', 'coming_soon']) {
      for (const game of (categories[key]?.items || [])) {
        pool.push(game);
      }
    }
    
    return pool.filter(g => g.id || g.appid);
  } catch (e) {
    console.error('[Random] getRandomPool:', e.message);
    return [];
  }
}

async function handle(interaction) {
  const pool = await getRandomPool();
  if (!pool.length) {
    return interaction.reply({ 
      content: `${EMOJIS.ERROR} Steam ne répond pas, réessaie plus tard.`,
      ephemeral: true 
    });
  }

  const pick = pool[Math.floor(Math.random() * pool.length)];
  const appid = pick.id || pick.appid;
  
  const info = await steam.getAppDetails(appid);
  if (!info?.success) {
    return interaction.reply({ 
      content: `${EMOJIS.ERROR} Pas de chance, réessaie.`,
      ephemeral: true 
    });
  }

  const data = info.data;

  const embed = new EmbedBuilder()
    .setAuthor({ name: 'Steam', iconURL: 'attachment://STEAM.png' })
    .setTitle(`**${data.name.toUpperCase()}**`)
    .setURL(`${STEAM_URLS.STORE_APP}${appid}`)
    .setDescription(bq(data.short_description || '*Pas de description.*'))
    .setImage(data.header_image)
    .setColor(COLORS.STEAM)
    .setTimestamp();

  await interaction.reply({ 
    embeds: [embed], 
    files: [{ attachment: 'assets/STEAM.png', name: 'STEAM.png' }] 
  });
}

module.exports = { handle };
