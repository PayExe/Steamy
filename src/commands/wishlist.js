const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const steam = require('../steam');
const db = require('../db');
const { bq } = require('../utils');

async function buildPage(username, list, page) {
  const maxPage = Math.ceil(list.length / 10) || 1;
  const p = Math.max(1, Math.min(page, maxPage));
  const start = (p - 1) * 10;
  const games = list.slice(start, start + 10);

  const embed = new EmbedBuilder()
    .setTitle(`🎮・Wishlist de ${username.toUpperCase()} (page ${p}/${maxPage})`)
    .setColor(0x0099ff)
    .setTimestamp();

  let gotThumbnail = false;
  const lines = [];

  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    let star = '';
    try {
      const info = await steam.getAppDetails(g.appid);
      const price = info?.data?.price_overview;
      if (price && price.initial > price.final) star = '⭐️ ';
      if (!gotThumbnail && info?.data?.header_image) {
        embed.setThumbnail(info.data.header_image);
        gotThumbnail = true;
      }
    } catch {}
    lines.push(`**${start + i + 1}. ${star}${g.name}**`);
    lines.push(bq(`[Voir sur Steam](https://store.steampowered.com/app/${g.appid})`));
  }

  if (lines.length) embed.setDescription(lines.join('\n'));
  return { embed, page: p, maxPage };
}

function paginationButtons(userId, page, maxPage) {
  if (maxPage <= 1) return null;
  const row = new ActionRowBuilder();
  if (page > 1) {
    row.addComponents(new ButtonBuilder()
      .setCustomId(`wishlist_prev_${userId}_${page - 1}`)
      .setLabel('⬅️ Précédent').setStyle(ButtonStyle.Primary));
  }
  if (page < maxPage) {
    row.addComponents(new ButtonBuilder()
      .setCustomId(`wishlist_next_${userId}_${page + 1}`)
      .setLabel('Suivant ➡️').setStyle(ButtonStyle.Primary));
  }
  return row;
}

async function add(interaction) {
  const name = interaction.options.getString('jeu');
  if (!name || name.length > 100) return interaction.reply({ content: '❌ Nom invalide (1-100 chars).' });

  const appid = await steam.searchAppId(name);
  if (!appid) return interaction.reply({ content: '❌ Jeu introuvable.' });

  const info = await steam.getAppDetails(appid);
  const type = info?.data?.type;
  if (!info?.success || (type !== 'game' && type !== 'dlc')) {
    return interaction.reply({ content: '❌ Seuls les jeux et DLC Steam sont acceptés.' });
  }

  const ok = await db.addGame(interaction.user.id, name, appid);
  if (!ok) return interaction.reply({ content: '⚠️ Déjà dans ta wishlist.' });
  interaction.reply({ content: `✅ **${name}** ajouté à ta wishlist.` });
}

async function remove(interaction) {
  const name = interaction.options.getString('jeu');
  if (!name || name.length > 100) return interaction.reply({ content: '❌ Nom invalide.' });

  const removed = await db.removeGame(interaction.user.id, name);
  if (!removed) return interaction.reply({ content: "❌ Ce jeu n'est pas dans ta wishlist." });
  interaction.reply({ content: `🗑️ **${removed.name}** retiré.` });
}

async function show(interaction) {
  const target = interaction.options.getUser('utilisateur') || interaction.user;
  const list = await db.getWishlist(target.id);
  if (!list.length) return interaction.reply({ content: `📭 ${target.username} a une wishlist vide.` });

  const pageNum = interaction.options.getInteger('page') || 1;
  const { embed, page, maxPage } = await buildPage(target.username, list, pageNum);
  const btns = paginationButtons(target.id, page, maxPage);
  interaction.reply({ embeds: [embed], components: btns ? [btns] : [] });
}

async function clear(interaction) {
  await db.clearWishlist(interaction.user.id);
  interaction.reply({ content: '🧹 Wishlist vidée.' });
}

async function onButton(interaction) {
  const parts = interaction.customId.split('_');
  const userId = parts[2];
  const pageNum = Number(parts[3]);

  const list = await db.getWishlist(userId);
  const { embed, page, maxPage } = await buildPage(interaction.user.username, list, pageNum);
  const btns = paginationButtons(userId, page, maxPage);
  interaction.update({ embeds: [embed], components: btns ? [btns] : [] });
}

async function autocomplete(interaction) {
  const focused = interaction.options.getFocused();

  if (interaction.commandName === 'removewishlist') {
    const list = await db.getWishlist(interaction.user.id);
    const matches = list
      .filter(g => g.name.toLowerCase().startsWith(focused.toLowerCase()))
      .slice(0, 25);
    return interaction.respond(matches.map(g => ({ name: g.name, value: g.name })));
  }

  const choices = await steam.autocomplete(focused);
  interaction.respond(choices);
}

module.exports = { add, remove, show, clear, onButton, autocomplete };
