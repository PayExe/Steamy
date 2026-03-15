const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const steam = require('../steam');
const db = require('../db');
const { bq, validateGameName } = require('../utils');
const { EMOJIS, COLORS, PAGINATION, STEAM_URLS, STEAM_TYPES } = require('../constants');

async function buildPage(username, list, page) {
  const maxPage = Math.ceil(list.length / PAGINATION.ITEMS_PER_PAGE) || 1;
  const p = Math.max(1, Math.min(page, maxPage));
  const start = (p - 1) * PAGINATION.ITEMS_PER_PAGE;
  const games = list.slice(start, start + PAGINATION.ITEMS_PER_PAGE);

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.GAME} Wishlist de ${username.toUpperCase()} (page ${p}/${maxPage})`)
    .setColor(COLORS.PRIMARY)
    .setTimestamp();

  let gotThumbnail = false;
  const lines = [];

  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    let star = '';
    try {
      const info = await steam.getAppDetails(g.appid);
      const price = info?.data?.price_overview;
      if (price && price.initial > price.final) star = `${EMOJIS.STAR} `;
      if (!gotThumbnail && info?.data?.header_image) {
        embed.setThumbnail(info.data.header_image);
        gotThumbnail = true;
      }
    } catch (e) {
      console.error('[Wishlist] buildPage:', e.message);
    }
    lines.push(`**${start + i + 1}. ${star}${g.name}**`);
    lines.push(bq(`[Voir sur Steam](${STEAM_URLS.STORE_APP}${g.appid})`));
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
      .setLabel(`${EMOJIS.CONTROLLER} Précédent`)
      .setStyle(ButtonStyle.Primary));
  }
  
  if (page < maxPage) {
    row.addComponents(new ButtonBuilder()
      .setCustomId(`wishlist_next_${userId}_${page + 1}`)
      .setLabel(`Suivant ${EMOJIS.CONTROLLER}`)
      .setStyle(ButtonStyle.Primary));
  }
  
  return row;
}

async function add(interaction) {
  const name = interaction.options.getString('jeu');
  
  const validation = validateGameName(name);
  if (validation !== true) {
    return interaction.reply({ content: validation, ephemeral: true });
  }

  const appid = await steam.searchAppId(name);
  if (!appid) {
    return interaction.reply({ 
      content: `${EMOJIS.ERROR} Jeu introuvable.`,
      ephemeral: true 
    });
  }

  const info = await steam.getAppDetails(appid);
  if (!info?.success) {
    return interaction.reply({ 
      content: `${EMOJIS.ERROR} Impossible de récupérer les infos du jeu.`,
      ephemeral: true 
    });
  }

  const type = info.data.type;
  if (type !== STEAM_TYPES.GAME && type !== STEAM_TYPES.DLC) {
    return interaction.reply({ 
      content: `${EMOJIS.ERROR} Seuls les jeux et DLC Steam sont acceptés.`,
      ephemeral: true 
    });
  }

  const ok = await db.addGame(interaction.user.id, name, appid);
  if (!ok) {
    return interaction.reply({ 
      content: `${EMOJIS.WARNING} Déjà dans ta wishlist.`,
      ephemeral: true 
    });
  }

  await interaction.reply({ 
    content: `${EMOJIS.SUCCESS} **${name}** ajouté à ta wishlist.`,
    ephemeral: true 
  });
}

async function remove(interaction) {
  const name = interaction.options.getString('jeu');
  
  const validation = validateGameName(name);
  if (validation !== true) {
    return interaction.reply({ content: validation, ephemeral: true });
  }

  const removed = await db.removeGame(interaction.user.id, name);
  if (!removed) {
    return interaction.reply({ 
      content: `${EMOJIS.ERROR} Ce jeu n'est pas dans ta wishlist.`,
      ephemeral: true 
    });
  }

  await interaction.reply({ 
    content: `${EMOJIS.TRASH} **${removed.name}** retiré.`,
    ephemeral: true 
  });
}

async function show(interaction) {
  const target = interaction.options.getUser('utilisateur') || interaction.user;
  const list = await db.getWishlist(target.id);
  
  if (!list.length) {
    return interaction.reply({ 
      content: `${EMOJIS.MAILBOX_EMPTY} ${target.username} a une wishlist vide.`,
      ephemeral: true 
    });
  }

  const pageNum = interaction.options.getInteger('page') || 1;
  const { embed, page, maxPage } = await buildPage(target.username, list, pageNum);
  const btns = paginationButtons(target.id, page, maxPage);
  
  await interaction.reply({ 
    embeds: [embed], 
    components: btns ? [btns] : [] 
  });
}

async function clear(interaction) {
  await db.clearWishlist(interaction.user.id);
  await interaction.reply({ 
    content: `${EMOJIS.BROOM} Wishlist vidée.`,
    ephemeral: true 
  });
}

async function onButton(interaction) {
  const parts = interaction.customId.split('_');
  const userId = parts[2];
  const pageNum = Number(parts[3]);

  const list = await db.getWishlist(userId);
  const { embed, page, maxPage } = await buildPage(interaction.user.username, list, pageNum);
  const btns = paginationButtons(userId, page, maxPage);
  
  await interaction.update({ 
    embeds: [embed], 
    components: btns ? [btns] : [] 
  });
}

async function autocomplete(interaction) {
  const focused = interaction.options.getFocused();

  if (interaction.commandName === 'removewishlist') {
    const list = await db.getWishlist(interaction.user.id);
    const matches = list
      .filter(g => g.name.toLowerCase().startsWith(focused.toLowerCase()))
      .slice(0, PAGINATION.MAX_AUTOCOMPLETE_RESULTS);
    return interaction.respond(matches.map(g => ({ name: g.name, value: g.name })));
  }

  const choices = await steam.autocomplete(focused);
  await interaction.respond(choices);
}

module.exports = { add, remove, show, clear, onButton, autocomplete };
