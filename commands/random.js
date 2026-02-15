const { EmbedBuilder } = require('discord.js');
const steam = require('../steam');
const { bq } = require('../utils');

async function handle(interaction) {
  const apps = await steam.getAppList();

  let found = null;
  for (let i = 0; i < 20 && !found; i++) {
    const pick = apps[Math.floor(Math.random() * apps.length)];
    const info = await steam.getAppDetails(pick.appid);
    if (info?.success && info.data?.type === 'game') {
      found = { ...info.data, appid: pick.appid };
    }
  }

  if (!found) return interaction.reply({ content: '❌ Pas trouvé de jeu aléatoire, réessaie.' });

  const embed = new EmbedBuilder()
    .setAuthor({ name: 'Steam', iconURL: 'attachment://STEAM.png' })
    .setTitle(`**${found.name.toUpperCase()}**`)
    .setURL(`https://store.steampowered.com/app/${found.appid}`)
    .setDescription(bq(found.short_description || '*Pas de description.*'))
    .setImage(found.header_image)
    .setColor(0x1b2838)
    .setTimestamp();

  interaction.reply({ embeds: [embed], files: [{ attachment: 'STEAM.png', name: 'STEAM.png' }] });
}

module.exports = { handle };
