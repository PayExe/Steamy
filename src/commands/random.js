const { EmbedBuilder } = require('discord.js');
const steam = require('../steam');
const { bq } = require('../utils');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

async function getRandomPool() {
  try {
    const [featured, categories] = await Promise.all([
      fetch('https://store.steampowered.com/api/featured/').then(r => r.json()),
      fetch('https://store.steampowered.com/api/featuredcategories/').then(r => r.json()),
    ]);

    const pool = [];
    for (const game of (featured.featured_win || [])) pool.push(game);
    for (const key of ['specials', 'top_sellers', 'new_releases', 'coming_soon']) {
      for (const game of (categories[key]?.items || [])) pool.push(game);
    }
    return pool.filter(g => g.id || g.appid);
  } catch { return []; }
}

async function handle(interaction) {
  const pool = await getRandomPool();
  if (!pool.length) return interaction.reply({ content: '❌ Steam ne répond pas, réessaie plus tard.' });

  const pick = pool[Math.floor(Math.random() * pool.length)];
  const appid = pick.id || pick.appid;
  const info = await steam.getAppDetails(appid);

  if (!info?.success) return interaction.reply({ content: '❌ Pas de chance, réessaie.' });
  const data = info.data;

  const embed = new EmbedBuilder()
    .setAuthor({ name: 'Steam', iconURL: 'attachment://STEAM.png' })
    .setTitle(`**${data.name.toUpperCase()}**`)
    .setURL(`https://store.steampowered.com/app/${appid}`)
    .setDescription(bq(data.short_description || '*Pas de description.*'))
    .setImage(data.header_image)
    .setColor(0x1b2838)
    .setTimestamp();

  interaction.reply({ embeds: [embed], files: [{ attachment: 'assets/STEAM.png', name: 'STEAM.png' }] });
}

module.exports = { handle };
