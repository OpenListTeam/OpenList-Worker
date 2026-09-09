<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList est un outil de liste de répertoires riche en fonctionnalités, prenant en charge le montage de dizaines de disques cloud avec aperçu, téléchargement, partage de fichiers et plus encore</em></p>
  <p>Ce dépôt est le port officiel TypeScript + Serverless du projet <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a></p>
  <p>Fonctionne sur Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/edgeone-artifact-guard.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/edgeone-artifact-guard.yml?branch=main" alt="Build status" /></a>
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


| EdgeOne Makers · International | EdgeOne Makers · Chine | Cloudflare Workers · Global |
| :---: | :---: | :---: |
| [![Déployer sur EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Déployer sur EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) |

</div>

> [!IMPORTANT]
> - Si Cloudflare affiche `impossible de récupérer le contenu du dépôt`, [forkez](https://github.com/OpenListTeam/OpenList-Worker/fork) d'abord ce projet puis déployez en vous connectant au dépôt Github
> - Après le déploiement, configurez les variables d'environnement : **EdgeOne** : [Console internationale](https://console.edgeone.ai/makers) · [Console Chine](https://console.cloud.tencent.com/edgeone/makers) ; **Cloudflare** : [Tableau de bord Worker](https://dash.cloudflare.com/). Variables d'environnement :
>   - `DB_DRIVER` : mode de stockage des données : `json` (défaut) / `d1` (Cloudflare) / `kv` / `mysql`
>   - `DB_JSON_BACKEND` : backend utilisé par le format `json` : `blob` (défaut) / `kv` / `cf_rest`
>   - Pour les autres variables optionnelles, voir le **guide de déploiement détaillé** : [Cloudflare](https://doc.oplist.org/guide/installation/worker#deploy-to-cloudflare-workers) · [EdgeOne](https://doc.oplist.org/guide/installation/worker#deploy-to-edgeone) · [ESA](https://doc.oplist.org/guide/installation/worker#deploy-to-alibaba-cloud-esa)


## Fonctionnalités

OpenList est un système de liste et de gestion de fichiers multi-stockages fonctionnant sur des plateformes d'edge computing. Il unifie les fichiers dispersés sur différents disques cloud, stockages d'objets et services de protocole dans une interface unique pour la navigation, l'aperçu, le téléchargement et la gestion.

OpenList-Worker est le port officiel TypeScript + Serverless du projet [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList). Le backend a été réécrit de Go vers un service TypeScript exécuté sur Workers, tandis que le frontend conserve une interface et une expérience d'interaction cohérentes.

### Agrégation de stockages

**78 pilotes de stockage** intégrés, prêts à monter divers backends de stockage :

- **Disques cloud domestiques** : Aliyundrive (Open/Share), Quark (Open/UC TV), Baidu Netdisk (Album), 115 (Open/Share), 123 Pan (Open/Share), Tianyi Cloud (189/PC/TV), China Mobile Cloud (139/Hecaiyun), Wopan, Thunder, Tencent Weiyun, Lanzou, PikPak (Share), Doubao, Guangyapan, Chaoxing Group, Lenovo NAS Share, Teambition, WPS Cloud, Alibaba Docs, HalalCloud, MediaTrack, etc.
- **Disques cloud internationaux** : Google Drive (Album), OneDrive (App/ShareLink), Dropbox, MEGA, MediaFire, Proton Drive, Yandex Disk, Degoo, Bunny Storage, TeraBox, etc.
- **Stockage d'objets** : Compatible S3 (AWS/OSS/COS/MinIO, etc.), UpYun USS, Azure Blob, WebDAV, FTP, SFTP, SMB, IPFS, etc.
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

### Gestion des accès

- **Permissions** : contrôle d'accès basé sur les rôles (RBAC), prenant en charge les groupes d'utilisateurs, les permissions de lecture/écriture au niveau des répertoires et les quotas.
- **Authentification** : mots de passe de compte intégrés avec vérification TOTP, connexion WebAuthn/FIDO, authentification unique SSO et authentification d'annuaire LDAP.
- **Renforcement de la sécurité** : sessions JWT, protection CSRF, protection contre le détournement de clic (X-Frame-Options), Content Security Policy (CSP).
- **Contrôles de santé** : fournir une sonde de vivacité `/health` et une sonde de préparation `/healthz` pour la surveillance et l'alerte.

### Déploiement de plateforme

- **Plateformes d'exécution** : Cloudflare Workers, Tencent Cloud EdgeOne Makers, Vercel, Serverless et environnements de conteneurs Node.js.
- **Stockage de données** : Cloudflare D1 (SQLite) comme principal, prenant également en charge MySQL, MariaDB, PostgreSQL, SQL Server.
- **Cache persistant** : Cloudflare KV / EdgeOne Blob (optionnel) pour la persistance de la configuration et la mise en cache.
- **Déploiement en un clic** : prise en charge des boutons de déploiement en un clic + initialisation sur EdgeOne, Cloudflare Workers et d'autres plateformes.

---

## Déploiement manuel

### Prérequis

- Node.js 18+ (pnpm recommandé)
- Un compte Cloudflare (pour le déploiement sur Workers)

### Développement local

```bash
# 1. Installer les dépendances
pnpm install

# 2. Configurer wrangler.toml (renseigner JWT_SECRET, les liaisons KV/D1)

# 3. Démarrer le serveur de développement (récupère automatiquement le frontend officiel et exécute le Worker)
pnpm run dev:unified

# Ou exécuter uniquement le Worker (sans récupérer le frontend)
pnpm run dev:worker
```

### Déploiement en production

```bash
# Déploiement en un clic : vérifier que le namespace KV existe → récupérer le frontend officiel → déployer sur Cloudflare Workers
pnpm run deploy

# Ou déployer directement le Worker (ignorer la vérification KV et la compilation du frontend)
pnpm run deploy:worker
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
