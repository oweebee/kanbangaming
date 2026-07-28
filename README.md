# KangBanGaming

Gestionnaire de tâches Kanban pour gamers, optimisé pour Steam.  
Organise ta backlog, suis tes heures de jeu, partage tes boards avec ta communauté.

---

## Fonctionnalités

- **Kanban board** — colonnes personnalisables, drag & drop, vue compacte (desktop et mobile)
- **Intégration Steam** — bannières, stats joueurs en temps réel, succès, actualités, Metacritic, prix
- **Connexion Steam** — authentification via Steam OpenID, compte créé automatiquement
- **Clé API Steam personnelle** — alternative au profil public : chaque membre peut renseigner sa propre clé API Steam dans son profil pour débloquer bibliothèque, succès, wishlist et news même avec un profil privé (voir [Confidentialité du profil Steam](#confidentialité-du-profil-steam))
- **Bannière "En jeu"** — affiche les membres de ta communauté actuellement en train de jouer
- **Panneau infos jeu** — glisse depuis la sidebar, verrouillable, déplaçable gauche/droite
- **Boards publics collaboratifs** — partage un lien sans compte ; tout utilisateur connecté peut ajouter colonnes et cartes (pas seulement le propriétaire). Le créateur peut activer un [contrôle d'accès](#gestion-des-accès-boards-publics) pour restreindre la visibilité/modification à une liste blanche d'utilisateurs (désactivé par défaut)
- **Tâches personnalisées** — cartes non-Steam, 12 types visuels au choix (Farming, Mission, Construction, Quotidien, Événement, Donjon, Item, Boss, Production, IT, Bricolage, Attente), assignation, échéances, progression (%) avec passage automatique en "Terminé" à 100%
- **Sélecteur d'emoji unifié** — même picker pour l'icône de board, de colonne et de carte perso, avec une section "Favoris" en haut listant les derniers emojis utilisés (mémorisée localement par navigateur)
- **Notes sur les cartes** — disponibles sur toutes les cartes (Steam et tâches), avec aperçu automatique des liens collés (style Discord)
- **Recherche globale** — icône toujours visible dans la barre de navigation, cherche parmi tous les jeux et toutes les cartes de tous tes boards
- **Panneau Échéances** — vue synthétique des dates limites et alertes urgentes ; colonnes adaptatives (1 → 2 → 3 selon la largeur du panneau redimensionnable). Chaque carte (perso, Steam, wishlist) est réorganisable par glisser-déposer (souris et tactile), ordre mémorisé localement par catégorie. Bouton masquer (œil) fixe en haut à droite de chaque carte. Les cartes perso/Steam affichent un cartouche coloré à la couleur du board d'origine, cliquable pour y naviguer directement.
- **Wishlist Steam dans les Échéances** — les jeux de ta wishlist avec une date de sortie connue apparaissent automatiquement dans le panneau Échéances (cartouche doré "Steam Wishlist", cartouche "Promo" en plus si le jeu est en soldes Steam, clic → page Steam Store, masquables). Profil Steam public requis (voir [Confidentialité du profil Steam](#confidentialité-du-profil-steam)).
- **Wishlist dans le profil** — liste complète de ta wishlist Steam (tous les jeux, pas seulement ceux déjà sortis), triée par date de sortie quand elle est connue (plus proche en haut), avec miniature, nom, icône promo si le jeu est en soldes Steam, et badge coloré (vert = sorti, orange = bientôt, gris = date lointaine ou inconnue). N'afficher que les jeux déjà sortis est le rôle du panneau Échéances ci-dessus.
- **Sorties à venir & Populaires** — colonne dédiée de l'accueil : carrousel rotatif "Populaires & Recommandés" et liste "Sorties à venir" (jeux Steam sortant dans les 45 prochains jours, mise en avant spéciale le jour J), avec bouton de filtre par genre Steam et/ou Solo/Coop (cumulable, réglage mémorisé localement).
- **Multi-langue** — interface en français, anglais, espagnol, allemand, russe et chinois (détection auto)
- **Zoom de l'interface** — curseur par paliers de 5% (80 → 100%) dans le profil, réduit l'échelle globale de l'app (comme Teams/Discord) pour afficher plus de contenu sur les écrans basse résolution ; réglage sauvegardé par compte
- **Onglet Stats du profil** — onglet dédié (entre "Profil" et "Corbeille") regroupant toutes les statistiques du compte : boards, boards publics, nombre réel de jeux dans la bibliothèque Steam, cartes perso, nombre réel de jeux dans la wishlist Steam, jeux avec échéance, notes écrites, boards publics suivis, board le plus actif, ancienneté du compte.
- **Module Steam bloqué → message explicatif** — si un module dépendant de Steam (bibliothèque/news, succès, wishlist, échéances) ne peut rien afficher car le profil est privé et qu'aucune clé API personnelle n'est configurée, un court message remplace le vide silencieux et propose deux solutions avec liens directs : rendre le profil public, ou générer sa clé API perso (voir [Confidentialité du profil Steam](#confidentialité-du-profil-steam)).
- **Corbeille** — les cartes, notes **et boards** supprimés sont conservés 30 jours avant suppression définitive ; restauration en un clic depuis l'onglet "Corbeille" du profil. Les admins ont une vue globale de toutes les suppressions et peuvent purger. La suppression admin envoie aussi les boards en corbeille.
- **Boards publics suivis** — les boards publics marqués comme "suivis" apparaissent dans une section dédiée sur l'accueil, séparée des autres boards publics, avec leur propre ordre drag & drop.
- **News Bibliothèque** (titre personnalisé « News de *pseudo Steam* ») — 4ᵉ colonne redimensionnable de l'accueil (répartition par défaut 25 % Échéances / 35 % Boards / 20 % News / 20 % Populaire et recommandé, toutes ajustables par glisser-déposer jusqu'à une largeur minimale d'environ une carte). Cartes avec couleur de bordure selon le genre du jeu, tag **Bibliothèque** ou **Wishlist** selon la provenance du jeu, image et début du texte de la news (titre qui revient à la ligne plutôt que d'être tronqué). Regroupe au même niveau de priorité les annonces des jeux de la bibliothèque Steam **et** de la wishlist (jeux pas encore possédés), triées de la plus récente à la plus ancienne ; chargement initial de 20 actualités, le reste se charge progressivement au scroll (pas de pré-génération de contenu non affiché). Même visuel que "Populaire et recommandé" / "Sorties à venir". Disponible aussi en onglet dédié sur mobile. Profil Steam public requis (voir [Confidentialité du profil Steam](#confidentialité-du-profil-steam)).
- **Refresh accueil** — bouton ↻ dans la barre de navigation (desktop et mobile) pour rafraîchir tous les boards sans recharger la page.
- **Filtre par nom** — icône entonnoir à gauche de la recherche globale, même UX que la recherche (clic pour ouvrir, la valeur reste active si on referme le panneau). Deux filtres indépendants : un filtre **global** sur l'accueil qui s'applique en même temps aux boards, à la sidebar, aux échéances, aux news et aux sorties à venir ; et un filtre **local** propre à chaque board ouvert qui ne filtre que ses cartes Kanban (réinitialisé à chaque changement de board). Recherche insensible à la casse et aux accents, disponible web et mobile.
- **Admin** — gestion des utilisateurs, création de comptes, config Discord, approbation
- **Mobile / PWA** — interface adaptée, onglets swipables, vue compacte, slider home, drag tactile sur les boards de l'accueil ; installable comme app (PWA, manifest + icônes) depuis le navigateur mobile

---

## Stack technique

| Côté | Technologie |
|------|-------------|
| Frontend | React 18, Vite 5 |
| Backend | Node.js 20, Express 4 |
| Données | Fichiers JSON persistés sur volume (`/app/data`) |
| Auth | Steam OpenID 2.0 + JWT (jsonwebtoken) + bcrypt |
| Serveur web | Nginx (frontend) |
| Déploiement | Docker, Coolify |
| Mobile | PWA installable (responsive web, manifest.webmanifest) |

---

## Prérequis

- [Node.js 20+](https://nodejs.org) pour le développement local
- [Docker](https://docker.com) pour la production
- Une clé API Steam : [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)

---

## Installation locale

```bash
# Backend
cd backend
npm install
npm run dev   # démarre sur le port 3001

# Frontend (autre terminal)
cd frontend
npm install
npm run dev   # démarre sur http://localhost:5173
```

En local, les variables d'env peuvent être définies dans un fichier `.env` à la racine (voir `.env.example`).

### Auth Steam en développement

Steam OpenID valide le domaine du callback — **`localhost` est refusé**. Pour tester la connexion Steam en local, il faut exposer le backend via un tunnel public :

```bash
# Cloudflare Tunnel (recommandé)
cloudflared tunnel --url http://localhost:3001

# ou ngrok
ngrok http 3001
```

Puis définir les variables d'env avec l'URL générée :

```env
BACKEND_URL=https://xxx.trycloudflare.com
FRONTEND_URL=http://localhost:5173
```

> L'URL du tunnel change à chaque redémarrage (sauf tunnel nommé Cloudflare ou plan payant ngrok). Pour le dev quotidien sans auth Steam, il suffit de se connecter via le compte `admin`.

---

## Variables d'environnement

### Backend

| Variable         | Obligatoire | Défaut | Description |
|------------------|:-----------:|--------|-------------|
| `STEAM_API_KEY`  | ✅ | — | Clé API Steam — [obtenir ici](https://steamcommunity.com/dev/apikey). Nécessaire pour les stats et l'avatar Steam. |
| `JWT_SECRET`     | ✅ | `change-me-in-production` | Clé secrète de signature des tokens JWT. Générer avec : `openssl rand -hex 48` |
| `ADMIN_PASSWORD` | ✅ | `admin123` | Mot de passe du compte `admin` créé au premier démarrage. À changer impérativement en prod. |
| `FRONTEND_URL`   | ⚠️ | auto | URL publique du frontend. **Indispensable pour l'auth Steam.** Sur Coolify, inférée automatiquement depuis `SERVICE_URL_FRONTEND`. À définir manuellement ailleurs. |
| `BACKEND_URL`    | ⚠️ | auto | URL publique du backend (même domaine si Nginx proxy). Sur Coolify, inférée automatiquement. |
| `PORT`           | ❌ | `3001` | Port d'écoute du backend. |

> ⚠️ `FRONTEND_URL` et `BACKEND_URL` sont **critiques pour la connexion Steam** — sans elles, le callback OpenID pointe sur `localhost` et l'auth échoue en production.

> 🔒 `JWT_SECRET` et `STEAM_API_KEY` ne doivent **jamais** être committés. Le fichier `.env` est dans `.gitignore`.

### Frontend

| Variable        | Obligatoire | Description |
|-----------------|:-----------:|-------------|
| `VITE_APP_URL`  | ❌ | URL publique complète de l'app. Utilisée pour les balises Open Graph (aperçus Discord, Twitter/X, iMessage). |

---

## Déploiement sur Coolify

### Étapes

1. Crée un service Docker Compose dans Coolify depuis le repo GitHub
2. Coolify injecte automatiquement `SERVICE_URL_FRONTEND` — **aucune config d'URL nécessaire**
3. Renseigne les variables obligatoires dans l'onglet **Environment Variables** :

| Variable | Valeur |
|---|---|
| `STEAM_API_KEY` | Ta clé API Steam |
| `JWT_SECRET` | Chaîne aléatoire longue (`openssl rand -hex 48`) |
| `ADMIN_PASSWORD` | Mot de passe de l'admin |

C'est tout. `FRONTEND_URL` et `BACKEND_URL` sont résolues automatiquement via `SERVICE_URL_FRONTEND`.

### Persistance des données

Le backend stocke ses données dans `/app/data` (`users.json`, `boards.json`, `settings.json`, `wishlistTrack.json`).  
Configure un **volume persistant** dans Coolify → Persistent Storage :

```
Source (hôte) : /opt/kanbangaming/data
Destination (container) : /app/data
```

Sans ce volume, les données sont perdues à chaque redéploiement.

---

## Déploiement Docker en local (sans Coolify)

Le `docker-compose.yml` du repo est pensé pour Coolify, qui publie les ports et injecte `SERVICE_URL_FRONTEND` automatiquement. Pour lancer avec `docker-compose up` directement sur ta machine, deux ajouts sont nécessaires (absents du fichier par défaut) :

### 1. Publier les ports

```yaml
backend:
  # ...
  ports:
    - "3001:3001"   # nécessaire uniquement pour le tunnel Steam, voir étape 2

frontend:
  # ...
  ports:
    - "8080:80"     # adapte le port hôte à ta convenance
```

L'app est alors accessible sur `http://127.0.0.1:8080` (ou `http://localhost:8080`) — boards, kanban, compte `admin` fonctionnent immédiatement, sans rien d'autre à configurer.

### 2. Activer la connexion Steam

Steam OpenID refuse `localhost`/`127.0.0.1` comme domaine de callback — même règle qu'en [développement local](#auth-steam-en-développement), même solution : un tunnel public pointé sur le **backend** (port 3001) :

```bash
cloudflared tunnel --url http://localhost:3001
# ou : ngrok http 3001
```

Puis, dans le `.env` à la racine :

```env
BACKEND_URL=https://xxx.trycloudflare.com
FRONTEND_URL=http://127.0.0.1:8080
```

Relance les conteneurs pour appliquer :

```bash
docker-compose up -d --force-recreate
```

Le frontend reste accessible localement comme avant (`127.0.0.1:8080`) ; seul l'aller-retour de l'authentification Steam passe par le tunnel.

> Même limite qu'en dev : l'URL du tunnel change à chaque redémarrage (sauf tunnel Cloudflare nommé ou ngrok payant) — il faut alors remettre à jour `BACKEND_URL` et relancer les conteneurs.

---

## Authentification

### Connexion Steam (recommandée)

Les utilisateurs se connectent via le bouton **"Se connecter avec Steam"** — aucun compte préalable requis, le profil est créé automatiquement à la première connexion.

### Accès admin

Un lien discret **"⚙ Administration"** en bas de la page de login révèle le formulaire classique username/password, réservé au compte admin.

Le compte `admin` est créé automatiquement au premier démarrage avec le mot de passe défini dans `ADMIN_PASSWORD`.

### Création de comptes depuis le panel admin

L'admin peut créer des comptes manuellement depuis **Panel Admin → + Créer**. Les comptes créés sont immédiatement actifs et peuvent inclure un Steam ID optionnel.

### Confidentialité du profil Steam

L'app utilise par défaut **une seule clé API Steam globale** (`STEAM_API_KEY`, voir [Variables d'environnement](#variables-denvironnement)) pour tous les comptes — pas une clé personnelle par utilisateur. Or l'API Steam ne lève les restrictions de confidentialité que pour le compte **propriétaire** de la clé utilisée ([doc Valve](https://developer.valvesoftware.com/wiki/Steam_Web_API)).

Concrètement : pour que la bibliothèque, la News Bibliothèque, les succès, la wishlist et la bannière "En jeu" fonctionnent, chaque membre doit avoir un profil Steam **public** (ou au minimum le réglage *Détails du jeu* sur *Public* — Steam → Profil → Modifier le profil → Confidentialité). La connexion (pseudo, avatar, statut en ligne) fonctionne toujours, profil public ou non.

Si le profil est privé **et** qu'aucune clé personnelle n'est configurée, ces modules n'affichent plus un vide silencieux : un court message apparaît à la place, expliquant pourquoi, avec deux liens d'aide — rendre le profil public, ou générer une clé API perso (section ci-dessous). Le statut public/privé du profil est détecté automatiquement (`communityvisibilitystate` Steam) à chaque connexion ou mise à jour du Steam ID.

#### Alternative : clé API Steam personnelle

Pour les membres qui ne veulent pas rendre leur profil public, l'app permet de renseigner **sa propre clé API Steam** dans le profil (onglet Profil → section "Clé API Steam personnelle"). Quand une clé personnelle est configurée, elle est utilisée en priorité sur la clé globale pour ce compte — et comme elle appartient au membre lui-même, elle lève les restrictions de confidentialité même avec un profil privé ou ami uniquement.

- Génération de la clé : [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)
- Prérequis Steam : l'**authentificateur mobile Steam Guard** doit être activé sur le compte pour pouvoir générer une clé.
- La clé est stockée par utilisateur (`steamApiKey` dans `users.json`), jamais renvoyée en clair par l'API (seul un indicateur `hasSteamApiKey` est exposé au frontend) et testée auprès de Steam avant d'être sauvegardée (rejetée si invalide).
- Modifier ou retirer la clé invalide automatiquement les caches Steam (bibliothèque, wishlist, news, échéances) de ce compte pour refléter immédiatement la nouvelle source de données.

### Gestion des accès (boards publics)

Par défaut, un board public reste **collaboratif et ouvert** : n'importe quel utilisateur connecté peut le consulter et y ajouter colonnes/cartes (voir [Boards publics collaboratifs](#fonctionnalités)).

Le **créateur** d'un board public peut activer un contrôle d'accès plus fin via le bouton **🔐 Gestion des accès** dans l'en-tête du board — ce bouton remplace alors le bouton "Quitter" et n'est visible que par lui ; les autres utilisateurs ne voient aucun bouton à cet endroit.

Une fois le contrôle d'accès **activé** :

- Seuls les utilisateurs explicitement **autorisés** (liste blanche) peuvent voir et ouvrir le board ; les autres reçoivent un accès refusé (403).
- Pour chaque utilisateur autorisé, le créateur peut basculer individuellement entre **Modification** et **Lecture seule**.
- Dans la modale de gestion, les utilisateurs autorisés remontent automatiquement en haut de la liste.
- Si l'accès d'un utilisateur est révoqué pendant qu'il a le board ouvert, il en est notifié et renvoyé à l'accueil.

Le contrôle d'accès est **désactivé par défaut** sur tous les boards publics — aucune migration ni action requise, le comportement actuel (accès complet pour tous) est préservé tant que le créateur ne l'active pas explicitement.

**Transfert de propriété.** Pour chaque utilisateur autorisé, le créateur peut aussi lui **donner définitivement la propriété du board** via le bouton 👑, après confirmation. Le board (et son contenu) est alors déplacé vers le compte du nouvel utilisateur, qui devient l'unique créateur :

- L'ancien créateur perd l'accès à la gestion des accès de ce board (il n'en est plus le propriétaire), mais conserve ses droits de modification et suit désormais le board dans ses favoris.
- Le nouveau propriétaire obtient tous les droits, indépendamment de son statut précédent dans la liste d'accès.
- Le transfert est réservé au créateur actuel et irréversible depuis cette modale (le nouveau propriétaire peut, lui, transférer à nouveau le board s'il le souhaite).

Endpoints concernés : `GET/PATCH /api/public/boards/:boardId/access`, `PATCH /api/public/boards/:boardId/access/users/:userId`, `GET /api/public/boards/:boardId/permissions`, `POST /api/public/boards/:boardId/transfer`.

---

## Configuration Discord

L'icône et le lien Discord du serveur de la communauté se configurent dans le **Panel Admin → Paramètres** :

- **URL du serveur Discord** — lien d'invitation (ex: `https://discord.gg/xxxxx`). Si laissé vide, l'icône Discord n'apparaît pas dans l'interface.
- **URL de l'icône** — URL de l'icône du serveur Discord (format `.webp` ou `.png`).

Ces paramètres sont stockés en base de données et prennent effet immédiatement sans redéploiement.

---

## Open Graph (aperçus de lien)

Quand tu partages l'URL sur Discord, Twitter/X, iMessage, etc., une image de preview s'affiche.

1. Ouvre `frontend/public/preview-generator.html` dans Chrome
2. **F12** → icône téléphone/tablette → dimensions `1200 × 630`
3. Menu DevTools **⋮** → **Capture screenshot**
4. Sauvegarde sous `frontend/public/preview.png`
5. Déploie — accessible à `https://TONURL/preview.png`

> Pour tester : [opengraph.xyz](https://www.opengraph.xyz)

---

## Structure du projet

```
├── backend/
│   ├── src/
│   │   └── server.js              # API Express (auth, boards, Steam, OpenID)
│   ├── data/                      # Données JSON (gitignorées, à monter en volume)
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Composant principal + état global
│   │   ├── i18n.js                # Traductions FR/EN/ES/DE/RU/ZH
│   │   ├── zoom.js                # Niveau de zoom interface (persisté par compte)
│   │   ├── utils.js               # Helpers partagés
│   │   └── components/
│   │       ├── GameCard.jsx
│   │       ├── GameModal.jsx
│   │       ├── TaskModal.jsx
│   │       ├── MobileBoard.jsx
│   │       ├── MobileHomeSlider.jsx   # Slider onglets home mobile
│   │       ├── SwipeTabs.jsx          # Onglets swipables (modal)
│   │       ├── KanbanBoard.jsx
│   │       ├── DeadlinePanel.jsx
│   │       ├── BoardAccessModal.jsx   # Gestion des accès (boards publics)
│   │       ├── AdminPanel.jsx
│   │       └── ...
│   ├── public/
│   │   ├── preview.png            # Image Open Graph (à générer, non committée)
│   │   ├── preview-generator.html
│   │   └── task-types/            # Icônes de types de tâches
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── .env.example                   # Variables backend de référence
├── .gitignore
├── docker-compose.yml             # Déploiement Docker / Coolify
└── README.md
```

---

## Sécurité

- `STEAM_API_KEY` n'est **jamais** exposée au frontend — tous les appels Steam passent par le backend
- Idem pour la clé API Steam personnelle d'un utilisateur (`steamApiKey`) : sauvegardée côté serveur uniquement, jamais renvoyée en clair par l'API (juste un indicateur booléen `hasSteamApiKey`)
- Exception : l'**export de sauvegarde admin** (`GET /api/admin/export`, Panel Admin → Paramètres) inclut `users.json` tel quel — donc `steamApiKey` et `passwordHash` en clair/hashés inclus. C'est volontaire : sans ça, une restauration (`POST /api/admin/restore`) ferait perdre les clés perso et mots de passe de tous les comptes. Réservé aux admins (`requireAdmin`) ; le fichier `.json` téléchargé doit être traité comme sensible
- Les mots de passe sont hashés avec `bcrypt`
- Les comptes Steam-only n'ont pas de `passwordHash` — les endpoints protègent contre toute tentative de connexion par mot de passe
- Les routes protégées requièrent un token JWT valide en header `Authorization: Bearer <token>`
- Le fichier `.env` est dans `.gitignore`
