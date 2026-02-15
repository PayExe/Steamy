# Steamy

Bot Discord qui connecte ton serveur a Steam. Wishlist, recherche de jeux, infos detaillees, jeux au hasard.

## Features

- **Wishlist perso** -- Chaque utilisateur peut ajouter, retirer et consulter sa propre liste de jeux Steam. Pagination incluse quand la liste est longue. Les jeux en promo sont marques.
- **Fiche jeu detaillee** -- Affiche le prix, les evaluations, la date de sortie et le trailer d'un jeu Steam.
- **Jeu aleatoire** -- Propose un jeu au hasard parmi les tops, promos et nouveautes Steam.
- **Autocomplete** -- Toutes les commandes avec un nom de jeu proposent des suggestions en temps reel.
- **Restriction par salon** -- Les mods peuvent limiter l'utilisation du bot a un ou plusieurs salons specifiques.
- **Anti-spam** -- Cooldown de 3 secondes entre chaque commande par utilisateur.

## Commandes

| Commande | Description |
|---|---|
| `/addwishlist [jeu]` | Ajoute un jeu a ta wishlist |
| `/removewishlist [jeu]` | Retire un jeu de ta wishlist |
| `/showwishlist [@user] [page]` | Affiche une wishlist |
| `/clearwishlist` | Vide ta wishlist |
| `/library-steam [jeu]` | Infos detaillees sur un jeu |
| `/random-steam` | Un jeu au hasard |
| `/setchannel [salon]` | Ajoute/retire un salon autorise (mods) |
| `/help` | Aide |

## Installation

```bash
git clone https://github.com/ton-user/Steamy.git
cd Steamy
npm install
```

Cree un fichier `.env` :

```
DISCORD_TOKEN=ton_token
CLIENT_ID=ton_client_id
```

Deploie les commandes puis lance le bot :

```bash
node deploy-commands.js
node index.js
```

## Structure

```
index.js             Point d'entree, routing des commandes
steam.js             API Steam (recherche, details, reviews, autocomplete)
db.js                Base de donnees locale (lowdb)
utils.js             Helpers partages
deploy-commands.js   Enregistrement des slash commands
commands/
  wishlist.js        Ajout, suppression, affichage, pagination
  library.js         Fiche detaillee d'un jeu
  random.js          Jeu aleatoire
  help.js            Commande d'aide
  setchannel.js      Restriction par salon
```

## Stack

- [discord.js](https://discord.js.org/) v14
- [lowdb](https://github.com/typicode/lowdb) pour le stockage JSON
- API Steam (Store Search, App Details, Reviews, Featured)
