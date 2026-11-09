<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList est un outil de liste de répertoires riche en fonctionnalités, prenant en charge le montage de dizaines de disques cloud avec aperçu, téléchargement, partage de fichiers et plus encore</em></p>
  <p>Ce dépôt est le port officiel TypeScript + Serverless du projet <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a></p>
  <p>Fonctionne sur Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/build-verify.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/build-verify.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList-Worker" alt="latest version" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList-Worker?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList-Worker/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>

📘 [Documentation](https://doc.oplist.org) · 🌏 [Documentation (Chine continentale)](https://doc.oplist.org.cn)  · ⚖️ [Conditions d'utilisation](https://doc.oplist.org/terms)  · 🔒 [Politique de confidentialité](https://doc.oplist.org/privacy)

</div>

<div align="center">

[English](README_en.md) | [简体中文](../README.md) | [繁體中文](README_zh-TW.md) | [日本語](README_ja.md) | [한국어](README_ko.md) | Français | [Deutsch](README_de.md) 

[Português](README_pt.md) | [Русский](README_ru.md) | [العربية](README_ar.md) | [Italiano](README_it.md) | [हिन्दी](README_hi.md) | [Español](README_es.md)

[Projet amont](https://github.com/OpenListTeam/OpenList) · [Guide de contribution](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CONTRIBUTING.md) · [Code de conduite](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CODE_OF_CONDUCT.md) · [Licence](./LICENSE)

[🌎 Démo globale](https://new.oplist.org) 　|　 [🇨🇳 Démo Chine](https://new.oplist.org.cn)

</div>

---

## Déploiement en un clic

Cliquez sur le bouton ci-dessous pour déployer ce projet sur la plateforme correspondante en un clic：
<div align="center">


| EdgeOne Makers · International | EdgeOne Makers · Chine | Cloudflare Workers · Global | Alibaba Cloud ESA · Chine |
| :---: | :---: | :---: | :---: |
| [![Déployer sur EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Déployer sur EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) | [![Déployer sur Alibaba Cloud ESA](assets/esa-deploy.svg)](https://esa.console.aliyun.com/edge/function/list) |

</div>

> [!IMPORTANT]
> - Si Cloudflare affiche `impossible de récupérer le contenu du dépôt`, [forkez](https://github.com/OpenListTeam/OpenList-Worker/fork) d'abord ce projet puis déployez en vous connectant au dépôt Github
> - Pour Alibaba Cloud ESA, importez ce dépôt depuis **Edge Computing et IA → Fonctions et Pages** dans la console : le fichier `esa.jsonc` inclus définit déjà l'installation, la compilation et les ressources statiques. Après le déploiement, configurez `JWT_SECRET` et `KV_NAMESPACE` (par défaut `openlist`) et créez au préalable l'espace de noms EdgeKV du même nom
> - Lors du déploiement, renseignez `JWT_SECRET` (chaîne aléatoire de 16+ caractères, par ex. `openssl rand -hex 32`) : elle signe les JWT et chiffre les données ; si elle n'est pas définie, elle est générée et persistée pendant l'initialisation
> - Le stockage utilise automatiquement le backend persistant de la plateforme (`DB_DRIVER=auto`) — aucune configuration requise ; pour les autres variables, voir [Variables d'environnement](https://doc.oplist.org/ecosystem/official_worker/guide_env)
> - Après le déploiement, la première visite ouvre l'**assistant d'installation** : définissez le compte et le mot de passe administrateur dans le navigateur pour terminer l'initialisation (définissez `ADMIN_PASS` pour l'ignorer)


## Fonctionnalités

OpenList est un système de liste et de gestion de fichiers multi-stockages fonctionnant sur des plateformes d'edge computing. Il unifie les fichiers dispersés sur différents disques cloud, stockages d'objets et services de protocole dans une interface unique pour la navigation, l'aperçu, le téléchargement et la gestion.

OpenList-Worker est le port officiel TypeScript + Serverless du projet [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList). Le backend a été réécrit de Go vers un service TypeScript exécuté sur Workers, tandis que le frontend conserve une interface et une expérience d'interaction cohérentes.

### Agrégation de stockages

**78 pilotes de stockage** intégrés, prêts à monter divers backends de stockage :

- **Disques cloud domestiques** : Aliyundrive (Open/Share), Quark (Open/UC TV), Baidu Netdisk (Album), 115 (Open/Share), 123 Pan (Open/Share), Tianyi Cloud (189/PC/TV), China Mobile Cloud (139/Hecaiyun), Wopan, Thunder, Tencent Weiyun, Lanzou, PikPak (Share), Doubao, Guangyapan, Chaoxing Group, Lenovo NAS Share, Teambition, WPS Cloud, Alibaba Docs, HalalCloud, MediaTrack, etc.
- **Disques cloud internationaux** : Google Drive (Album), OneDrive (App/ShareLink), Dropbox, MEGA, MediaFire, Proton Drive, Yandex Disk, Degoo, Bunny Storage, TeraBox, etc.
- **Stockage d'objets** : Compatible S3 (AWS/OSS/COS/MinIO, etc.), Cloudflare R2 (binding Workers ou API S3), UpYun USS, Azure Blob, WebDAV, FTP, SFTP, SMB, IPFS, etc.
- **Hébergement de code** : GitHub, GitHub Releases, CNB Releases
- **Programmes de disque cloud** : OpenList (Share), AList V3, Cloudreve V3/V4, Kodbox, Seafile, Teldrive, Febbox, etc.
- **Autres pilotes** : Netease Music, Misskey, Emby, Cloudflare Image Hosting, etc.

En plus des stockages réels ci-dessus, des pilotes virtuels/fonctionnels tels que `Local`, `Alias`, `UrlTree`, `AutoIndex`, `Strm`, `Crypt`, `Virtual` et `Chunk` sont également fournis pour les montages locaux, les alias d'adresse, les listes d'URL, le stockage chiffré et le découpage en morceaux.

### Capacités principales

- **Navigation de fichiers** : navigation unifiée dans l'arborescence, avec aperçu en ligne d'images, vidéos, audio, documents, code, archives et plus.
- **Téléversement et téléchargement** : téléversement inter-stockage, téléchargement par lot, streaming et redirection de lien direct.
- **Partage de fichiers** : génération de liens de partage avec expiration, mot de passe et contrôle des permissions, prenant en charge l'accès anonyme et le partage de répertoires.
- **Recherche plein texte** : recherche rapide de fichiers dans les stockages indexés.
- **Tâches hors ligne** : file d'attente de tâches en arrière-plan prenant en charge les opérations par lot et le traitement asynchrone.
- **Interfaces externes** : exposer le stockage agrégé via le protocole WebDAV ou compatible S3 pour le montage dans des outils tiers.
- **Service MCP** : fournir un point de terminaison Model Context Protocol pouvant être intégré et appelé par des assistants IA et d'autres clients.
- **Déduplication des requêtes concurrentes** : les requêtes identiques de liste de répertoire / métadonnées au même instant n'interrogent le disque upstream qu'une seule fois ; les autres réutilisent le même résultat, évitant les limitations de débit et la consommation CPU inutiles.

### Gestion des accès

- **Permissions** : contrôle d'accès basé sur les rôles (RBAC), prenant en charge les groupes d'utilisateurs, les permissions de lecture/écriture au niveau des répertoires et les quotas.
- **Authentification** : mots de passe de compte intégrés avec vérification TOTP, connexion WebAuthn/FIDO, authentification unique SSO et authentification d'annuaire LDAP.
- **Renforcement de la sécurité** : sessions JWT, protection CSRF, protection contre le détournement de clic (X-Frame-Options), Content Security Policy (CSP).
- **Contrôles de santé** : fournir une sonde de vivacité `/health` et une sonde de préparation `/healthz` pour la surveillance et l'alerte.

### Déploiement de plateforme

- **Plateformes d'exécution** : Cloudflare Workers, Tencent Cloud EdgeOne Makers, Alibaba Cloud ESA, Vercel / AWS Lambda et environnements de conteneurs Node.js.
- **Stockage de données** : Cloudflare D1 (SQLite) comme principal, ainsi que KV / Blob / Durable Objects et MySQL / MariaDB externes.
- **Déploiement en un clic** : points d'entrée de déploiement pour EdgeOne, Cloudflare Workers et Alibaba Cloud ESA + assistant d'installation.

---

## Déploiement manuel

### Prérequis

- Node.js 18+ (pnpm recommandé)
- Un compte Cloudflare (pour le déploiement sur Workers)

### Développement local

```bash
# 1. Installer les dépendances
pnpm install

# 2. Configurer les liaisons et variables dans wrangler.jsonc selon les besoins (JWT_SECRET voir .dev.vars.example)

# 3. Démarrer le serveur de développement (récupère automatiquement le frontend officiel et exécute le Worker)
pnpm run dev:unified

# Ou exécuter uniquement le Worker (sans récupérer le frontend)
pnpm run dev:worker
```

### Déploiement en production

```bash
# Déploiement en un clic : compiler le frontend → déployer sur Cloudflare Workers (les liaisons KV sont provisionnées automatiquement par wrangler)
pnpm run deploy

# Ou déployer directement le Worker (ignorer la compilation du frontend)
pnpm run deploy:worker
```

---

## Stack technique

### Backend

- **Environnement d'exécution** : Cloudflare Workers / EdgeOne Functions / Alibaba Cloud ESA (Edge Computing)
- **Framework web** : Hono.js
- **Base de données** : Cloudflare D1 (SQLite) / KV / Blob / Durable Objects ou MySQL / MariaDB externe
- **Langage** : TypeScript
- **Outils de build** : Wrangler, esbuild

### Frontend

- **Framework** : SolidJS + TypeScript (officiel [OpenList-Frontend](https://github.com/OpenListTeam/OpenList-Frontend))
- **Bibliothèque UI** : Hope UI
- **Outil de build** : Vite

---

## Configuration

Après le déploiement, la **première visite du site ouvre automatiquement l'assistant d'installation** : définissez le compte et le mot de passe administrateur dans le navigateur pour terminer l'initialisation. Pour ignorer l'assistant, configurez `ADMIN_PASS` afin d'initialiser automatiquement l'admin.

La plupart des déploiements ne nécessitent **aucune configuration supplémentaire** : le stockage utilise par défaut `DB_DRIVER=auto`, qui sélectionne automatiquement un backend persistant disponible (Cloudflare Workers → KV / D1 / DO, EdgeOne / ESA → Blob). La seule variable à définir explicitement est :

| Variable | Description |
| :--- | :--- |
| `JWT_SECRET` | Clé de signature des jetons JWT (≥16 caractères, recommandé : `openssl rand -hex 32`), également utilisée pour l'authentification des tâches cron. Si elle n'est pas définie, elle est générée et persistée lors de l'initialisation |

> Configurez `JWT_SECRET` en tant que **Secret** (et non variable simple) : les variables simples peuvent être écrasées par la configuration du dépôt lors d'un redéploiement, les Secrets non.

Les autres variables ont des valeurs par défaut raisonnables :

| Variable | Défaut | Description |
| :--- | :--- | :--- |
| `ADMIN_PASS` | — | Ignore l'assistant d'installation et initialise l'admin avec ce mot de passe |
| `DB_FORMAT` | `map` | Format de stockage : `map` (objet JSON entier) / `key` (par clé) / `sql` (tables relationnelles, compatible backend Go) |
| `DB_DRIVER` | `auto` | Pilote de stockage : `auto` / `blob` / `cfkv` / `kv` / `d1` / `do` / `mysql` ; un pilote explicite n'est jamais remplacé automatiquement |
| `DB_CIPHER` | `none` | Chiffrement au repos des champs sensibles (aucun par défaut), par ex. `aes-256-gcm` |
| `ALLOW_URLS` | — | Liste d'autorisation CORS (séparée par des virgules ; même origine uniquement si non définie) |
| `MAX_UPLOAD` / `MAX_UPPART` | 26214400 / 16777216 | Taille maximale (octets) d'un téléversement complet / d'un fragment multipart |
| `ASSET_URLS` | — | URL de base CDN des ressources frontend, prend en charge le paramètre `$version` |

Les listes de répertoires et les liens de téléchargement sont toujours récupérés directement depuis le disque — aucun cache entre les requêtes (pas de variables `CACHE_*`), les modifications externes sont visibles immédiatement.

Pour la liste complète des variables (chiffrement `DB_CIPHER`, paramètres `cfkv` / MySQL, etc.) et les étapes de déploiement par plateforme, consultez la documentation :

- [Variables d'environnement](https://doc.oplist.org/ecosystem/official_worker/guide_env)
- [Déploiement](https://doc.oplist.org/ecosystem/official_worker/guide)
- [FAQ](https://doc.oplist.org/ecosystem/official_worker/about)

## Support

Si vous rencontrez des problèmes, de l'aide est disponible via les canaux suivants :

- 🐛 **Rapports de bugs ou demandes de fonctionnalités** : visitez [_Issues_](https://github.com/OpenListTeam/OpenList-Worker/issues)
- 💬 **Questions générales et discussion** : visitez le forum [_Discussions_](https://github.com/OpenListTeam/OpenList/discussions)

## Licence

`OpenList` est un logiciel open source sous licence [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt).


## Contact

🌐 [@GitHub](https://github.com/OpenListTeam) · ✈️ [Groupe Telegram](https://t.me/OpenListTeam) · ✈️ [Canal Telegram](https://t.me/OpenListOfficial)

## Contributeurs

Merci aux projets suivants et à leurs contributeurs :

- L'auteur et tous les contributeurs de [Alist](https://github.com/AlistGo/alist)
- L'auteur et tous les contributeurs de [OpenList](https://github.com/OpenListTeam/OpenList) (version Go)
- Tous les contributeurs de ce projet :

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
