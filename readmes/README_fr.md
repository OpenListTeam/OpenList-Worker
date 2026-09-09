<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList est un outil de liste de répertoires prenant en charge le montage de plusieurs disques cloud, avec des dizaines de backends de stockage cloud, la gestion de fichiers, le partage et plus encore.</em></p>

  <p>Ce dépôt est le port officiel TypeScript + Serverless du projet <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a>.</p>
  <p>Fonctionne sur Cloudflare Workers / EdgeOne Cloud Function.</p>

<a href="https://github.com/OpenListTeam/OpenList/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList/actions?query=workflow%3ABuild"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList/build.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList" alt="latest version" /></a>

<a href="https://github.com/OpenListTeam/OpenList/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>

</div>

<div align="center">

[English](README_en.md) | [中文](../README.md) | [日本語](README_ja.md) | [한국어](README_ko.md) | Français（ce fichier） | [Deutsch](README_de.md) | [Español](README_es.md) | [Português](README_pt.md) | [Русский](README_ru.md) | [العربية](README_ar.md) | [Italiano](README_it.md)

[Projet amont](https://github.com/OpenListTeam/OpenList) · [Guide de contribution](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CONTRIBUTING.md) · [Code de conduite](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CODE_OF_CONDUCT.md) · [Licence](../LICENSE)

[🌎 Démo globale](https://new.oplist.org) 　|　 [🇨🇳 Démo Chine](https://new.oplist.org.cn)

</div>

---

## Déploiement en un clic

Cliquez sur le bouton ci-dessous pour déployer ce projet sur la plateforme correspondante en un clic :

<div align="center">

| EdgeOne Makers · International | EdgeOne Makers · Chine | Cloudflare Workers · Global |
| :---: | :---: | :---: |
| [![Déployer sur EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Déployer sur EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Déployer sur Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) |

</div>

> [!IMPORTANT]
> Après le déploiement, la première visite du site lancera automatiquement l'**assistant d'installation** :
>
> Variables d'environnement / secrets optionnels :
> - `ENCRYPTION_SECRET` : clé de chiffrement statique (≥16 caractères recommandés ; utilisée pour chiffrer les champs sensibles)
> - `JWT_SECRET` : clé de signature JWT (recommandée ; auto-générée et persistée dans KV si non définie)
> - `CRON_SECRET` : clé d'authentification des tâches de rafraîchissement planifiées (optionnelle, uniquement pour les tâches planifiées EdgeOne)

## Fonctionnalités

OpenList-Worker est un système de liste et de gestion de fichiers multi-stockages fonctionnant sur des plateformes de calcul en périphérie (edge), unifiant les fichiers dispersés sur différents disques cloud, stockages d'objets et services de protocole dans une seule interface pour la navigation, l'aperçu, le téléchargement et la gestion.

### À propos du port TypeScript

OpenList-Worker est le port TypeScript du projet officiel [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList).

Le backend a été réécrit de Go vers un service TypeScript fonctionnant sur Workers, tandis que le frontend conserve une interface et une expérience d'interaction cohérentes.

### Agrégation de stockages

**Plus de 80 pilotes de stockage** intégrés, prêts à monter divers backends de stockage :

| Catégorie | Backends pris en charge |
| :--- | :--- |
| Disques cloud domestiques | Aliyundrive (Open/Share), Quark, Baidu Netdisk, 115, 123 Pan, Thunder, Tianyi Cloud (189), Tencent Weiyun, Lanzou, PikPak, UC Cloud, China Mobile Cloud, 139 Cloud, Doubao, Wopan, Tianyi Family Cloud, LeTV Cloud, etc. |
| Disques cloud internationaux | Google Drive, OneDrive (App/ShareLink), Dropbox, MEGA, MediaFire, Proton Drive, Yandex Disk, Degoo, Bunny Storage, TeraBox, etc. |
| Stockage d'objets | Compatible S3 (AWS/OSS/COS/MinIO, etc.), WebDAV, FTP, SFTP, SMB, IPFS, Azure Blob, etc. |
| Hébergement de code | GitHub, GitHub Releases, CNB Releases |
| Programmes de disque cloud | OpenList / AList V3, Cloudreve V3/V4, Kodbox, Seafile, Teldrive, Febbox, etc. |
| Autres pilotes | Netease Music, Misskey, Emby, Partage 115, Partage Aliyundrive, Partage Quark, etc. |

En plus des stockages réels ci-dessus, des pilotes virtuels/fonctionnels tels que `Local`, `Alias`, `UrlTree`, `AutoIndex`, `Strm`, `Crypt`, `Virtual` et `Chunk` sont également fournis pour les montages locaux, les alias d'adresse, les listes d'URL, le stockage chiffré et le découpage en morceaux.

### Capacités principales

- **Navigation de fichiers** : navigation unifiée dans l'arborescence, avec aperçu en ligne d'images, vidéos, audio, documents, code, archives et plus.
- **Téléversement et téléchargement** : téléversement inter-stockage, téléchargement par lot, streaming et redirection de lien direct.
- **Partage de fichiers** : génération de liens de partage avec expiration, mot de passe et contrôle des permissions, prenant en charge l'accès anonyme et le partage de répertoires.
- **Recherche plein texte** : recherche rapide de fichiers dans les stockages indexés.
- **Tâches hors ligne** : file d'attente de tâches en arrière-plan prenant en charge les opérations par lot et le traitement asynchrone.
- **Interfaces externes** : exposer le stockage agrégé via le protocole WebDAV ou compatible S3 pour le montage dans des outils tiers.
- **Service MCP** : fournir un point de terminaison Model Context Protocol pouvant être intégré et appelé par des assistants IA et d'autres clients.

### Gestion des accès

- **Permissions** : contrôle d'accès basé sur les rôles (RBAC), prenant en charge les groupes d'utilisateurs, les permissions de lecture/écriture au niveau des répertoires et les quotas.
- **Authentification** : mots de passe de compte intégrés avec vérification TOTP, connexion WebAuthn/FIDO, authentification unique SSO et authentification d'annuaire LDAP.
- **Renforcement de la sécurité** : sessions JWT, protection CSRF, protection contre le détournement de clic (X-Frame-Options), Content Security Policy (CSP).
- **Contrôles de santé** : fournir une sonde de vivacité `/health` et une sonde de préparation `/healthz` pour la surveillance et l'alerte.

### Déploiement

- **Plateformes d'exécution** : Cloudflare Workers, Tencent Cloud EdgeOne Makers, Vercel, Serverless et environnements de conteneurs Node.js.
- **Stockage de données** : Cloudflare D1 (SQLite) comme principal, prenant également en charge MySQL, MariaDB, PostgreSQL, SQL Server.
- **Cache persistant** : Cloudflare KV / EdgeOne Blob (optionnel) pour la persistance de la configuration et la mise en cache.
- **Déploiement en un clic** : prise en charge des boutons de déploiement en un clic + initialisation sur EdgeOne, Cloudflare Workers et d'autres plateformes.

---

## Déploiement manuel

### Prérequis

- Node.js 18+
- Un compte Cloudflare (pour le déploiement sur Workers)

### Développement local

```bash
# 1. Installer les dépendances du backend
npm install

# 2. Installer les dépendances du frontend
npm run install:page

# 3. Configurer wrangler.jsonc (renseigner JWT_SECRET, les liaisons KV/D1)

# 4. Démarrer le serveur de développement backend
npm run dev

# 5. Démarrer le serveur de développement frontend dans un autre terminal
npm run dev:page
```

### Déploiement en production

```bash
# Déploiement en un clic (build frontend + déploiement backend sur Cloudflare Workers)
npm run deploy
```

---

## Stack technique

### Backend

- **Environnement d'exécution** : Cloudflare Workers (Edge Computing)
- **Framework web** : Hono.js
- **Base de données** : Cloudflare D1 (SQLite) / prend en charge MySQL, MariaDB, PostgreSQL, SQL Server
- **Cache** : Cloudflare KV (optionnel)
- **Langage** : TypeScript
- **Outils de build** : Wrangler, esbuild

### Frontend

- **Framework** : React 19 + TypeScript
- **Bibliothèques UI** : Ant Design / Material-UI
- **Outil de build** : Vite

---

## Documentation

- 📘 [Documentation officielle](https://doc.oplist.org)
- 🌏 [Miroir Chine](https://doc.oplist.org.cn)
- ⚖️ [Conditions d'utilisation](https://doc.oplist.org/terms)
- 🔒 [Politique de confidentialité](https://doc.oplist.org/privacy)

## Support

Pour les questions générales, veuillez consulter le forum [_Discussions_](https://github.com/OpenListTeam/OpenList/discussions). **_Issues_ est réservé aux rapports de bugs et aux demandes de fonctionnalités.**

## Licence

`OpenList` est un logiciel open source sous licence [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt).

## Contact

- [@GitHub](https://github.com/OpenListTeam)
- [Groupe Telegram](https://t.me/OpenListTeam)
- [Canal Telegram](https://t.me/OpenListOfficial)

## Contributeurs

Nous remercions sincèrement l'auteur du projet original [AlistGo/alist](https://github.com/AlistGo/alist), [Xhofe](https://github.com/Xhofe), et tous les autres contributeurs.

Merci à ces personnes formidables :

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
