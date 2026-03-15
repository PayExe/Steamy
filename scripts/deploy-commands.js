require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, ChannelType } = require('discord.js');
const { EMOJIS } = require('../src/constants');

const commands = [
  new SlashCommandBuilder()
    .setName('addwishlist')
    .setDescription('Ajoute un jeu à ta wishlist.')
    .addStringOption(o =>
      o
        .setName('jeu')
        .setDescription('Nom du jeu')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  new SlashCommandBuilder()
    .setName('removewishlist')
    .setDescription('Retire un jeu de ta wishlist.')
    .addStringOption(o =>
      o
        .setName('jeu')
        .setDescription('Nom du jeu')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  new SlashCommandBuilder()
    .setName('showwishlist')
    .setDescription('Affiche une wishlist.')
    .addUserOption(o =>
      o
        .setName('utilisateur')
        .setDescription("L'utilisateur dont tu veux voir la wishlist")
    )
    .addIntegerOption(o =>
      o.setName('page').setDescription('Numéro de page')
    ),

  new SlashCommandBuilder()
    .setName('clearwishlist')
    .setDescription('Vide ta wishlist.'),

  new SlashCommandBuilder()
    .setName('library-steam')
    .setDescription('Infos détaillées sur un jeu Steam.')
    .addStringOption(o =>
      o
        .setName('jeu')
        .setDescription('Nom du jeu')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  new SlashCommandBuilder()
    .setName('random-steam')
    .setDescription('Un jeu Steam au hasard.'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche la liste des commandes.'),

  new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Ajoute/retire un salon autorisé (mods). Sans argument = reset.')
    .addChannelOption(o =>
      o
        .setName('salon')
        .setDescription('Le salon à ajouter/retirer')
        .addChannelTypes(ChannelType.GuildText)
    ),
].map(c => c.toJSON());

const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error(
    `${EMOJIS.ERROR} DISCORD_TOKEN/TOKEN et CLIENT_ID requis dans le .env`
  );
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(
      `${EMOJIS.LOADING} Déploiement de ${commands.length} commandes...`
    );
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log(
      `${EMOJIS.SUCCESS} Commandes déployées avec succès !`
    );
  } catch (err) {
    console.error(
      `${EMOJIS.ERROR} Erreur lors du déploiement :`,
      err
    );
    process.exit(1);
  }
})();
