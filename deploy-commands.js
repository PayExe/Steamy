require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, ChannelType } = require('discord.js');

const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

const commands = [
  new SlashCommandBuilder()
    .setName('addwishlist')
    .setDescription('Ajoute un jeu à ta wishlist Steam')
    .addStringOption(o => o.setName('jeu').setDescription('Nom du jeu').setRequired(true).setAutocomplete(true)),

  new SlashCommandBuilder()
    .setName('removewishlist')
    .setDescription('Retire un jeu de ta wishlist Steam')
    .addStringOption(o => o.setName('jeu').setDescription('Nom du jeu').setRequired(true).setAutocomplete(true)),

  new SlashCommandBuilder()
    .setName('showwishlist')
    .setDescription('Affiche la wishlist Steam d\'un utilisateur')
    .addUserOption(o => o.setName('utilisateur').setDescription('Utilisateur ciblé').setRequired(false))
    .addIntegerOption(o => o.setName('page').setDescription('Numéro de page').setRequired(false)),

  new SlashCommandBuilder()
    .setName('clearwishlist')
    .setDescription('Vide toute ta wishlist Steam'),

  new SlashCommandBuilder()
    .setName('random-steam')
    .setDescription('Propose un jeu Steam au hasard'),

  new SlashCommandBuilder()
    .setName('library-steam')
    .setDescription('Affiche les infos détaillées d\'un jeu Steam')
    .addStringOption(o => o.setName('jeu').setDescription('Nom du jeu').setRequired(true).setAutocomplete(true)),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche l\'aide du bot'),

  new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Restreint les commandes à un salon (laisser vide pour retirer)')
    .setDefaultMemberPermissions(0x20)
    .addChannelOption(o => o.setName('salon').setDescription('Salon autorisé').addChannelTypes(ChannelType.GuildText).setRequired(false)),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('⏳ Déploiement des commandes...');
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('✅ Commandes déployées !');
  } catch (err) {
    console.error(err);
  }
})();