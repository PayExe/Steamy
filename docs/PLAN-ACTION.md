# Steamy — Plan d'action complet

Bot Discord **Steamy** : Node.js + discord.js v14, stockage lowdb (JSON), API Steam.

Ce document est un cahier des charges exécutable. Chaque tâche précise les fichiers, les lignes concernées, le problème et la solution attendue. L'objectif est qu'une IA (ou un dev) puisse l'exécuter sans ambiguïté.

Priorités :
- **P0** = bug critique, casse le bot ou une feature
- **P1** = bug / dette importante
- **P2** = amélioration / feature
- **P3** = à faire avant launch, optionnel

---

## 1. Contexte technique

- `index.js` → lance `src/bot.js`
- `src/bot.js` → client Discord, routing, events, loop d'alertes
- `src/steam.js` → API Steam (search, details, reviews, autocomplete)
- `src/db.js` → lowdb (fichier `db.json` à la racine, déjà dans `.gitignore`)
- `src/alerts.js` → logique d'alertes prix (user + admin)
- `src/constants.js` → URLs, emojis, couleurs, cooldowns, limites
- `src/utils.js` → helpers (blockquote, validateGameName, embeds)
- `src/commands/*` → une commande par fichier
- `scripts/deploy-commands.js` → enregistre les slash commands

Commandes actuelles : `addwishlist`, `removewishlist`, `showwishlist`, `clearwishlist`, `library-steam`, `random-steam`, `help`, `setchannel`, `adminalerts`, `dailyalert`, `notifconfig`.

**Prérequis runtime : Node >= 18** (pour utiliser le `fetch` natif).

---

## 2. Bugs critiques (P0)

### 2.1 `steam.searchGames` n'existe pas — crash autocomplete

- **Fichier :** `src/commands/adminalerts.js:51`
- **Problème :** `steam.searchGames(input.value)` est appelé mais la fonction n'est jamais exportée par `src/steam.js` (exporte seulement `getAppList, getAppDetails, getReviews, searchAppId, autocomplete`). → `TypeError` → l'autocomplete de `/adminalerts add` plante.
- **Cause racine probable des "jeux introuvables"** (marathon, silent hill f, RE requiem) : cette fonction manquante.
- **Fix :**
  - Ajouter dans `src/steam.js` une fonction `searchGames(term)` qui retourne un tableau d'objets `{ appid, name }`.
  - Implémentation recommandée : réutiliser `storeSearch(term)` ; si vide, fallback sur `getAppList()` filtré par similarité (préfixe puis `includes`).
  - Exporter `searchGames` dans `module.exports`.
  - Mettre à jour `src/commands/adminalerts.js:51` : la valeur passée par l'autocomplete `add` est un `appid` (string). Pour `add`, on peut soit conserver l'appid reçu, soit refaire un `searchAppId`/`getAppDetails` pour valider. Vérifier le flux de bout en bout.

### 2.2 Les DM de baisse de prix ne partent jamais (mauvaise minuterie)

- **Fichier :** `src/bot.js:288-290` + `src/bot.js:133-225` (`checkAndNotifyPriceDrops`)
- **Problème :** `setInterval(..., COOLDOWN.PRICE_CHECK)` (3600000 ms = 1h) + condition `currentMinute !== 0` (ligne 147). Si le bot démarre à la minute 42, le check tourne toutes les heures à la minute 42 → ne tombe jamais à minute 0 → **les DM n'arrivent jamais**.
- **Fix attendu :** remplacer par un vrai scheduler aligné sur l'horloge :
  - Option A (recommandée) : ajouter la dépendance `node-cron` et faire `cron.schedule('0 * * * *', ...)` (chaque heure à la minute 0).
  - Option B (sans dépendance) : calculer le délai jusqu'à la prochaine minute 0 et enchaîner avec `setTimeout`, puis relancer. Supprimer la condition `currentMinute !== 0`.

### 2.3 Fréquence "tous les N jours" fausse

- **Fichier :** `src/bot.js:150` (`const cycleDay = currentDay % config.interval;`)
- **Problème :** `currentDay = now.getDay()` retourne le jour de la semaine (0-6). `cycleDay !== 0` → avec `interval: 2`, ça n'envoie **que le dimanche** au lieu de "tous les 2 jours".
- **Fix attendu :** utiliser `lastSent` (déjà stocké dans `config`) :
  - Si `interval === 1` → envoyer (sous réserve des autres conditions).
  - Sinon → vérifier que `(now - lastSent) >= interval jours` (ou comparer `Math.floor((now - lastSentEpoch) / 86400000) >= interval`).
  - Garder le mécanisme existant `config.lastSent = today` après envoi.

---

## 3. Bugs / dette (P1)

### 3.1 Username erroné dans la pagination wishlist

- **Fichier :** `src/commands/wishlist.js:168` (`onButton`)
- **Problème :** `buildPage(interaction.user.username, ...)` affiche le pseudo de celui qui clique, pas celui du propriétaire de la wishlist.
- **Fix attendu :** retrouver le username du propriétaire. Options :
  - Passer `interaction.user.username` seulement si `userId === interaction.user.id`, sinon `client.users.fetch(userId)` (en conservant le client accessible, ex. via `interaction.client`).
  - Ou inclure le username dans le `customId` (attention limite 100 chars).
  - Bonus : vérifier que seul le propriétaire (ou un mod) puisse cliquer sur les boutons `wishlist_*` (actuellement n'importe qui peut paginer la liste d'un autre).

### 3.2 `require()` dans la boucle

- **Fichier :** `src/bot.js:163-164` (`require('discord.js')` et `require('./constants')` à l'intérieur de la boucle `for` dans `checkAndNotifyPriceDrops`)
- **Fix attendu :** remonter ces `require` en haut du fichier, avec les autres.

### 3.3 Définitions SlashCommand dupliquées

- **Fichier :** `src/commands/adminalerts.js`, `src/commands/dailyalert.js`, `src/commands/notifconfig.js` (chaque module exporte `data`), **et** `scripts/deploy-commands.js` redéfinit ces commandes à la main.
- **Problème :** risque de dérive (une modif dans `data` d'un module n'est pas reflétée dans le deploy).
- **Fix attendu :** une seule source de vérité. Structure proposée :
  - Chaque module de commande exporte déjà son `data`.
  - `scripts/deploy-commands.js` importe `data` depuis chaque module de commande au lieu de tout redéfinir, et ne garde en dur que les commandes qui n'ont pas de module dédié (ou toutes, au choix, mais importées).
  - Tester avec `npm run deploy`.

### 3.4 `node-fetch` ESM + hack `import()`

- **Fichiers :** `src/steam.js:1`, `src/commands/random.js:2`
- **Problème :** `node-fetch` v3 est ESM-only, importé en CJS via `import()` dynamique. Inutile sur Node >= 18 (fetch natif global).
- **Fix attendu :**
  - Supprimer `node-fetch` des dépendances (`package.json`).
  - Remplacer tous les `fetch(...)` par le `fetch` global (aucun import).
  - Supprimer la ligne wrapper dans `src/steam.js` et `src/commands/random.js`.
  - Vérifier que rien d'autre n'utilise `node-fetch`.

### 3.5 `.env.example` obsolète

- **Fichier :** `.env.example`
- **Problème :** contient `STEAM_API_KEY` (jamais utilisé) et omet `CLIENT_ID` (pourtant requis par `scripts/deploy-commands.js:171`).
- **Fix attendu :**
  ```
  DISCORD_TOKEN=your_token_here
  CLIENT_ID=your_client_id_here
  ```
  (retirer `STEAM_API_KEY`). Le `.env` réel doit aussi contenir `CLIENT_ID`.

### 3.6 `appid` incohérent (string vs number) dans les données

- **Fichier :** `db.json` (ex. `"appid": 2651280` en number, les autres en string)
- **Fix attendu :** forcer `String(appid)` à l'écriture (déjà fait dans `db.addGame`) et normaliser les données existantes dans `db.json`. Ajouter une petite migration/idempotence dans `db.js` au démarrage (ex. normaliser tous les appid en string).

### 3.7 Alertes : appels Steam en série, pas de cache ni retry

- **Fichiers :** `src/alerts.js` (boucles `for` avec `await steam.getAppDetails` séquentiels), `src/steam.js:getAppDetails`
- **Problème :** N appels API par user + par guild à chaque check → lent et risque de rate-limit Steam.
- **Fix attendu :**
  - **Cache mémoire** des prix : `Map<appid, {price, checkedAt}>` avec TTL (ex. 1h) dans `steam.js` (ou un module `priceCache`). Éviter les appels répétés pour un même jeu.
  - **Concurrence limitée** : batch les `getAppDetails` avec `Promise.all` par lots (ex. 5-10 à la fois).
  - **Retry/backoff** léger sur erreur réseau (ex. 1 retry après 500ms).

### 3.8 Trailer pointant vers un fichier vidéo énorme

- **Fichier :** `src/commands/library.js:89-96`
- **Problème :** le champ "Trailer" pointe vers le `webm.max`/`mp4.max` (fichier potentiellement énorme).
- **Fix attendu :** mettre un lien vers la page Steam du jeu (`https://store.steampowered.com/app/{appid}`) ou, si dispo, un lien YouTube (souvent présent dans les infos du trailer). Ne jamais linker la qualité max du fichier.

### 3.9 `formatPrice` dupliqué

- **Fichiers :** `src/commands/library.js:6-15`, logique prix aussi dans `src/alerts.js` et `src/bot.js`
- **Fix attendu :** centraliser dans `src/utils.js` une fonction `formatPrice(data)` (ou `formatPriceOverview(po)`) et l'utiliser partout (library, wishlist, alerts).

---

## 4. Refactor / architecture (P1-P2)

### 4.1 Scheduler → `node-cron`

- **Fichier :** `src/bot.js`
- **Fix attendu :** ajouter `node-cron` dans `package.json`. Remplacer les `setInterval` par :
  - `cron.schedule('0 * * * *', () => checkAndNotifyPriceDrops(client))` — prix user, toutes les heures à 00.
  - `cron.schedule('0 20 * * *', () => checkAndSendDailyAlerts(client))` — quotidien 20h.
  - Supprimer la logique manuelle `hour/minutes` de chaque fonction (les conditions sont gérées par cron).
  - Attention fuseau : définir un fuseau constant (ex. `Europe/Paris`) ou utiliser la machine locale, à documenter.

### 4.2 Une seule source de vérité pour les commandes

- **Fichiers :** `scripts/deploy-commands.js` + modules `src/commands/*`
- **Fix attendu :** décrit en 3.3. S'assurer que `setDefaultMemberPermissions` et les descriptions sont cohérents (adminalerts est en anglais, dailyalert/notifconfig en français → uniformiser).

### 4.3 Centraliser les embeds (design system)

- **Fichier :** `src/utils.js`
- **Fix attendu :** créer un helper `steamEmbed()` (couleur `COLORS.STEAM`, footer "Steamy • /help", timestamp) et l'utiliser dans `library.js`, `random.js`, `wishlist.js`, `help.js`, `alerts`/`bot.js`. Voir section 6 (UI).

---

## 5. Nouvelles features (P2)

> Certaines viennent du fichier `checklist.txt` (déjà présent dans le repo), d'autres sont des suggestions.

### 5.1 Comparateur de prix (`/compare [jeu]`)

- **Problème :** Instant Gaming n'a **pas d'API publique**. Utiliser **IsThereAnyDeal (ITAD)** ou **GG.deals**.
- **Détails :**
  - API ITAD : nécessite une clé gratuite (`ITAD_API_KEY` dans `.env`). Endpoint : `https://api.isthereanydeal.com/games/search/v1` + `https://api.isthereanydeal.com/games/overview/v2`.
  - GG.deals : `https://gg.deals/api/deals/` (param `appid` Steam).
  - Résultat attendu : embed listant 3-5 boutiques avec prix, réduction, lien.
  - Le jeu étant cherché par appid Steam, réutiliser `steam.searchAppId` en entrée.
  - Créer `src/commands/compare.js` + l'ajouter au routing `src/bot.js` + au deploy.

### 5.2 Seuil de prix personnel (`/setprice [jeu] [prix]`)

- **Fichier :** nouveau `src/commands/setprice.js` + modif `src/alerts.js` / `src/bot.js`
- **Détails :** chaque user définit un seuil par jeu (`{ appid, threshold }`). Dans `checkUserAlertPrices`, alerter quand `currentPrice <= threshold` (en plus de la promo ≥ `LIMITS.DISCOUNT_THRESHOLD`). Stockage dans `db.js` (nouvelle collection `priceTargets`).

### 5.3 Top promos et sorties (`/sales`, `/upcoming`)

- **Fichier :** nouveau `src/commands/sales.js` (ou étendre `random.js`)
- **Détails :** réutiliser `STEAM_URLS.FEATURED_CATEGORIES` :
  - `/sales` → `specials` (top promos), triées par discount, embed paginé.
  - `/upcoming` → `coming_soon`, avec date de sortie (via `getAppDetails`).

### 5.4 Historique des commandes 24h pour mods (`/history`)

- **Détail :** requis un logging structuré. Voir section 7 (pino). Stocker en mémoire ou en fichier les événements `{user, command, guild, channel, timestamp}`.
- **Commande :** `/history [utilisateur]` (mods/admins uniquement), embed paginé (réutiliser le pattern de pagination de `wishlist.js` / `adminalerts.js`).

### 5.5 Profils et badges

- **Fichier :** nouveau `src/commands/profile.js` + collection `stats` dans `db.js`
- **Détails :** incrémenter des compteurs (jeux ajoutés, commandes, prix trouvés) à chaque interaction. `/profile` affiche : nb de jeux en wishlist, nb de commandes, badges débloqués (ex. "Collectionneur 10+ jeux", "Chasseur de promo"). Créer `src/badges.js` pour la logique.

### 5.6 Commande NSFW admin (`/nsfw`)

- **Détail :** commande admin pour afficher/autoriser un message NSFW dans un salon (au choix du serveur). Simple : `/nsfw on|off` + permission admin, affiche une confirmation.

### 5.7 Opt-in / opt-out des DM

- **Fichier :** `src/db.js`, `src/bot.js`, `src/commands/notifconfig.js`
- **Problème :** tout utilisateur avec une wishlist reçoit les DM par défaut.
- **Fix attendu :** ajouter `notificationsEnabled` (défaut `true` ou `false`, à choisir) dans `notifconfig`, et skip dans `checkAndNotifyPriceDrops` si désactivé.

### 5.8 Watchlist de nouveaux jeux connus (alertes admin)

- **Détail :** déjà partiellement couvert par `adminalerts`. Ajouter un type d'alerte `NEW_RELEASE` (voir `ALERT_REASONS` dans `constants.js`, déjà prévu mais non utilisé) : notifier quand un jeu surveillé passe `coming_soon` → `available` ou a une date de sortie proche.

---

## 6. Interface utilisateur (embeds) — P2

- [ ] **Design system** : helper `steamEmbed()` central (voir 4.3) — couleur `COLORS.STEAM`, footer, timestamp.
- [ ] **deferReply systématique** : dans chaque commande qui fait des appels réseau lents, faire `await interaction.deferReply()` puis `editReply`. Éviter les "interaction failed".
- [ ] **Select menus** pour la wishlist : dropdown de pages + bouton "Retirer" inline par jeu (customId `wishlist_remove_{appid}`).
- [ ] **Modals** pour `/addwishlist` : un champ pour coller plusieurs jeux (un par ligne) → plusieurs `db.addGame` en boucle.
- [ ] **Expiration des boutons** : généraliser le `collector` avec `time: 60000` (déjà fait dans `adminalerts.js`) pour tous les messages paginés, et retirer les composants à la fin.
- [ ] **Timestamps relatifs** : utiliser `<t:${Math.floor(date/1000)}:R>` pour les dates de sortie dans `library.js`.
- [ ] **Supprimer les lignes vides `\u200b`** dans `library.js:79,91-95` — les remplacer par une mise en page propre (fields inline correctement répartis).
- [ ] **Uniformiser la langue** : tout en français (actuellement `adminalerts.js` est en anglais).
- [ ] **Autocomplete** : filtrer les non-jeux (démo/software) dans `steam.autocomplete` pour `addwishlist` (le `add` filtre déjà après-coup, mais l'autocomplete propose des démos).

---

## 7. Qualité / outils (P2-P3)

### 7.1 Tests

- **Fichier :** `package.json` (script `test` actuellement en erreur)
- **Fix attendu :** utiliser `node:test` (0 dépendance) ou **Vitest**.
  - Priorité de tests :
    1. `steam.searchAppId` (mock fetch) — cas "marathon", "silent hill f", "RE requiem".
    2. `alerts.checkUserAlertPrices` (mock `getAppDetails`).
    3. `db` add/remove/clear/toggleChannel (temp file).
    4. Logique de fréquence des alertes (2.3).
- Script : `"test": "node --test"` (avec `node:test`).

### 7.2 Lint + format

- **Fix attendu :** ajouter **ESLint** (config `eslint:recommended`, parser `@eslint/js`) et **Prettier** (`prettier` + `eslint-plugin-prettier`). Scripts `lint` et `format`. Une config `eslint.config.js` (flat config).

### 7.3 Logging structuré

- **Fix attendu :** remplacer `console.log`/`console.error` par **pino** (`pino` + `pino-pretty` en dev). Logger : interactions, erreurs, envois d'alertes, rate-limits. Garder un format lisible en dev.

### 7.4 TypeScript (optionnel, P3)

- **Note :** peut attendre. Si fait, commencer par `src/steam.js` et `src/db.js` (les contrats), migration incrémentale (fichiers en `.ts`, `allowJs` temporaire). Le bug 2.1 aurait été attrapé par TS.

---

## 8. Avant le launch (P3)

### 8.1 Hébergement / uptime
- [ ] Docker (`Dockerfile` node:20-alpine, `CMD node index.js`, policy `restart: unless-stopped`) **ou** PM2 (`pm2 start index.js --name steamy`, `pm2 startup` + `pm2 save`).
- [ ] `node --enable-source-maps` ou stack traces complètes pour debug.
- [ ] Vérifier Node >= 18 (fetch natif).

### 8.2 Données
- [ ] **Backup automatique** de `db.json` (cron copie horaire, rotation 7 jours) **ou** migrer vers `better-sqlite3` (requêtes par user/guild, pas de fichier JSON qui peut se corrompre, WAL mode). Si migration : adapter `db.js` (garder la même API pour ne pas toucher aux commandes).
- [ ] Migration des `appid` en string (3.6).

### 8.3 Monitoring
- [ ] Alerte Discord sur crash : hook webhook Discord envoyant un message si le process tombe (script `pm2`/docker `restart` + hook, ou un petit `healthcheck`).
- [ ] Vérifier les logs (7.3) pour les rate-limits Steam.

### 8.4 Sécurité / permissions
- [ ] Vérifier les intents Discord (`GatewayIntentBits.Guilds` suffit aujourd'hui — ne pas en ajouter inutilement).
- [ ] Vérifier les permissions du bot : ne demander que `SendMessages`, `EmbedLinks`, `AddReactions`, `ManageChannels` (pour setchannel), `ManageMessages` (pour adminalerts), `ReadMessageHistory`.
- [ ] Ne jamais logger les données personnelles en clair (pseudos, contenus) — logger des IDs uniquement.
- [ ] `DISCORD_TOKEN` et `CLIENT_ID` uniquement via `.env` (déjà le cas), ne jamais les committer.

### 8.5 Docs
- [ ] Mettre à jour le README : stack finale (fetch natif, node-cron, tests, lint), instructions d'installation complètes (`.env`, `npm install`, `npm run deploy`, `npm start`), liste des nouvelles commandes.
- [ ] Mettre à jour `docs/memo.txt` si besoin.

---

## 9. Checklist récapitulative (exécution)

### 🔧 Changer
- [ ] (P1) 3.2 remonter les `require` hors des boucles
- [ ] (P1) 3.3 une seule source de vérité des commandes
- [ ] (P1) 3.4 retirer node-fetch → fetch natif
- [ ] (P1) 3.5 corriger `.env.example`
- [ ] (P1) 3.6 normaliser les `appid` en string
- [ ] (P1) 3.9 centraliser `formatPrice`
- [ ] (P2) 4.1 node-cron pour les schedulers
- [ ] (P2) 4.3 design system d'embeds

### 🐛 Fix
- [x] 2.1 `steam.searchGames` manquant (P0)
- [x] 2.2 DM prix jamais envoyés (P0)
- [x] 2.3 fréquence "tous les N jours" fausse (P0)
- [x] 3.1 username pagination wishlist (P1)
- [x] 3.7 cache + retry API Steam (P1)
- [x] 3.8 trailer → lien page Steam (P1)

### ➕ Ajouter
- [ ] 5.1 `/compare` (IsThereAnyDeal / GG.deals)
- [ ] 5.2 seuil de prix perso `/setprice`
- [ ] 5.3 `/sales` et `/upcoming`
- [ ] 5.4 `/history` 24h pour mods
- [ ] 5.5 `/profile` + badges
- [ ] 5.6 `/nsfw` admin
- [ ] 5.7 opt-in/opt-out DM
- [ ] 5.8 alertes new releases

### 🎨 UI
- [ ] Section 6 (deferReply, select menus, modals, timestamps relatifs, uniformisation FR)

### 🚀 Avant launch
- [ ] Section 8 (hébergement, backup/DB, monitoring, permissions, docs, tests, lint, logs)

---

## 10. Ordre de travail recommandé

1. **P0** : 2.1 → 2.2 → 2.3 (bugs bloquants).
2. **P1** : 3.1 → 3.4 → 3.5 → 3.6 → 3.2 → 3.3 → 3.7 → 3.8 → 3.9.
3. **P2 architecture** : 4.1 (node-cron) → 4.3 (design system embeds).
4. **P2 features** : 5.3 (le plus simple, réutilise les endpoints existants) → 5.7 → 5.1 → 5.4 → 5.2 → 5.8 → 5.5 → 5.6.
5. **UI** : section 6 (s'articule avec 4.3).
6. **Qualité + launch** : section 7 puis 8.

À chaque étape : `npm run deploy` après modif des commandes, test manuel, et commit séparé par tâche.
