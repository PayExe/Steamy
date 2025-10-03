require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token) {
  console.warn('⚠️ Aucun token Discord détecté. Assure-toi d\'avoir défini DISCORD_TOKEN (ou TOKEN) dans ton fichier .env.');
}

/* <!--> Liste complète des commandes avec autocomplétion <--> */
const commands = [
  new SlashCommandBuilder()
    .setName('addwishlist')
    .setDescription('Ajoute un jeu à ta wishlist Steam')
    .addStringOption(option =>
      option.setName('jeu')
        .setDescription('Nom du jeu à ajouter')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  new SlashCommandBuilder()
    .setName('removewishlist')
    .setDescription('Supprime un jeu de ta wishlist Steam')
    .addStringOption(option =>
      option.setName('jeu')
        .setDescription('Nom du jeu à retirer')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  new SlashCommandBuilder()
    .setName('showwishlist')
    .setDescription('Affiche la wishlist Steam d\'un utilisateur')
    .addUserOption(option =>
      option.setName('utilisateur')
        .setDescription('Utilisateur dont afficher la wishlist')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName('page')
        .setDescription('Page à afficher')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('clearwishlist')
    .setDescription('Vide toute ta wishlist Steam'),

  new SlashCommandBuilder()
    .setName('random-steam')
    .setDescription('Propose un jeu Steam aléatoire'),

  new SlashCommandBuilder()
    .setName('library-steam')
    .setDescription('Affiche les infos détaillées d’un jeu Steam')
    .addStringOption(option =>
      option.setName('jeu')
        .setDescription('Nom du jeu à rechercher')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche l\'aide du bot')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);
(async () => {
  try {
    console.log('⏳ Déploiement des commandes slash (global)...');

    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    );

    console.log('✅ Commandes globales déployées avec succès !');
  } catch (error) {
    console.error(error);
  }
})();



