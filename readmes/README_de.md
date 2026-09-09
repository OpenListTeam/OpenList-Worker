<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList ist ein funktionsreiches Verzeichnislisten-Tool, das das Mounten von Dutzenden Cloud-Laufwerken mit Dateivorschau, Download, Freigabe und mehr unterstützt</em></p>
  <p>Dieses Repository ist der offizielle TypeScript + Serverless-Port des Projekts <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a></p>
  <p>Läuft auf Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/edgeone-artifact-guard.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/edgeone-artifact-guard.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList-Worker" alt="latest version" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList-Worker?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList-Worker/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>

📘 [Dokumentation](https://doc.oplist.org) · 🌏 [Dokumentation (chinesisches Festland)](https://doc.oplist.org.cn)  · ⚖️ [Nutzungsbedingungen](https://doc.oplist.org/terms)  · 🔒 [Datenschutzerklärung](https://doc.oplist.org/privacy)

</div>

<div align="center">

[English](README_en.md) | [简体中文](../README.md) | [繁體中文](README_zh-TW.md) | [日本語](README_ja.md) | [한국어](README_ko.md) | [Français](README_fr.md) | Deutsch 

[Português](README_pt.md) | [Русский](README_ru.md) | [العربية](README_ar.md) | [Italiano](README_it.md) | [हिन्दी](README_hi.md) | [Español](README_es.md)

[Upstream-Projekt](https://github.com/OpenListTeam/OpenList) · [Beitragsleitfaden](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CONTRIBUTING.md) · [Verhaltenskodex](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CODE_OF_CONDUCT.md) · [Lizenz](./LICENSE)

[🌎 Globale Demo](https://new.oplist.org) 　|　 [🇨🇳 China-Demo](https://new.oplist.org.cn)

</div>

---

## One-Click-Bereitstellung

Klicken Sie auf die Schaltfläche unten, um dieses Projekt mit einem Klick auf der entsprechenden Plattform bereitzustellen：
<div align="center">


| EdgeOne Makers · International | EdgeOne Makers · China | Cloudflare Workers · Global |
| :---: | :---: | :---: |
| [![Auf EdgeOne bereitstellen](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Auf EdgeOne bereitstellen](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) |

</div>

> [!IMPORTANT]
> - Wenn Cloudflare `Repository-Inhalt kann nicht abgerufen werden` anzeigt, [forken](https://github.com/OpenListTeam/OpenList-Worker/fork) Sie dieses Projekt zuerst und stellen Sie es dann über die Verbindung zum Github-Repository bereit
> - Konfigurieren Sie nach der Bereitstellung die Umgebungsvariablen: **EdgeOne**: [Internationale Konsole](https://console.edgeone.ai/makers) · [China-Konsole](https://console.cloud.tencent.com/edgeone/makers); **Cloudflare**: [Worker-Dashboard](https://dash.cloudflare.com/). Umgebungsvariablen:
>   - `DB_DRIVER`: Datenspeichermodus: `json` (Standard) / `d1` (Cloudflare) / `kv` / `mysql`
>   - `DB_JSON_BACKEND`: Backend für das `json`-Format: `blob` (Standard) / `kv` / `cf_rest`
>   - Weitere optionale Variablen finden Sie im **detaillierten Bereitstellungsleitfaden**: [Cloudflare](https://doc.oplist.org/guide/installation/worker#deploy-to-cloudflare-workers) · [EdgeOne](https://doc.oplist.org/guide/installation/worker#deploy-to-edgeone) · [ESA](https://doc.oplist.org/guide/installation/worker#deploy-to-alibaba-cloud-esa)


## Funktionen

OpenList ist ein Dateilisten- und Verwaltungssystem mit mehreren Speicher-Aggregationen, das auf Edge-Computing-Plattformen läuft. Es vereint Dateien aus verschiedenen Cloud-Laufwerken, Objektspeichern und Protokolldiensten in einer einzigen Oberfläche zum Durchsuchen, Anzeigen, Herunterladen und Verwalten.

OpenList-Worker ist der offizielle TypeScript + Serverless-Port des Projekts [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList). Das Backend wurde von Go auf einen auf Workers laufenden TypeScript-Dienst umgeschrieben, während das Frontend eine konsistente Oberfläche und Interaktionserfahrung beibehält.

### Speicher-Aggregation

**78 Speichertreiber** integriert, bereit zum Mounten verschiedener Speicher-Backends:

- **Inländische Cloud-Laufwerke**: Aliyundrive (Open/Share), Quark (Open/UC TV), Baidu Netdisk (Album), 115 (Open/Share), 123 Pan (Open/Share), Tianyi Cloud (189/PC/TV), China Mobile Cloud (139/Hecaiyun), Wopan, Thunder, Tencent Weiyun, Lanzou, PikPak (Share), Doubao, Guangyapan, Chaoxing Group, Lenovo NAS Share, Teambition, WPS Cloud, Alibaba Docs, HalalCloud, MediaTrack usw.
- **Internationale Cloud-Laufwerke**: Google Drive (Album), OneDrive (App/ShareLink), Dropbox, MEGA, MediaFire, Proton Drive, Yandex Disk, Degoo, Bunny Storage, TeraBox usw.
- **Objektspeicher**: S3-kompatibel (AWS/OSS/COS/MinIO usw.), UpYun USS, Azure Blob, WebDAV, FTP, SFTP, SMB, IPFS usw.
- **Code-Hosting**: GitHub, GitHub Releases, CNB Releases
- **Cloud-Laufwerk-Programme**: OpenList (Share), AList V3, Cloudreve V3/V4, Kodbox, Seafile, Teldrive, Febbox usw.
- **Weitere Treiber**: Netease Music, Misskey, Emby, Cloudflare Image Hosting usw.

Zusätzlich zu den oben genannten echten Speichern werden auch virtuelle/funktionale Treiber wie `Local`, `Alias`, `UrlTree`, `AutoIndex`, `Strm`, `Crypt`, `Virtual` und `Chunk` für lokale Mounts, Adressaliase, URL-Listen, verschlüsselte Speicherung und Chunking bereitgestellt.

### Kernfunktionen

- **Dateidurchsuchen**: einheitliches Durchsuchen des Verzeichnisbaums, mit Online-Vorschau von Bildern, Videos, Audio, Dokumenten, Code, Archiven und mehr.
- **Hochladen & Herunterladen**: speicherübergreifendes Hochladen, Stapel-Download, Streaming und Direktlink-Weiterleitung.
- **Dateifreigabe**: Erzeugen von Freigabe-Links mit Ablauf, Passwort und Berechtigungssteuerung, unterstützt anonymen Zugriff und Verzeichnisfreigabe.
- **Volltextsuche**: schnelles Suchen von Dateien in indizierten Speichern.
- **Offline-Aufgaben**: Hintergrund-Aufgabenwarteschlange für Stapeloperationen und asynchrone Verarbeitung.
- **Externe Schnittstellen**: aggregierten Speicher über WebDAV oder S3-kompatibles Protokoll bereitstellen, zum Mounten in Drittanbieter-Tools.
- **MCP-Dienst**: bietet einen Model-Context-Protocol-Endpunkt, der von KI-Assistenten und anderen Clients integriert und aufgerufen werden kann.

### Zugriffsverwaltung

- **Berechtigungen**: rollenbasierte Zugriffskontrolle (RBAC), unterstützt Benutzergruppen, Lese-/Schreibberechtigungen auf Verzeichnisebene und Kontingente.
- **Authentifizierung**: integrierte Kontokennwörter mit TOTP-Verifizierung, WebAuthn/FIDO-Anmeldung, SSO-Single-Sign-on und LDAP-Verzeichnisauthentifizierung.
- **Sicherheitshärtung**: JWT-Sitzungen, CSRF-Schutz, Clickjacking-Schutz (X-Frame-Options), Content Security Policy (CSP).
- **Gesundheitsprüfungen**: bietet eine `/health`-Liveness-Probe und eine `/healthz`-Readiness-Probe für Überwachung und Alarmierung.

### Plattform-Bereitstellung

- **Laufzeitplattformen**: Cloudflare Workers, Tencent Cloud EdgeOne Makers, Vercel, Serverless und Node.js-Containerumgebungen.
- **Datenspeicher**: Cloudflare D1 (SQLite) als primär, unterstützt auch MySQL, MariaDB, PostgreSQL, SQL Server.
- **Persistenter Cache**: Cloudflare KV / EdgeOne Blob (optional) für Konfigurationspersistenz und Caching.
- **One-Click-Bereitstellung**: unterstützt One-Click-Bereitstellungsbuttons + Initialisierung auf EdgeOne, Cloudflare Workers und anderen Plattformen.

---

## Manuelle Bereitstellung

### Voraussetzungen

- Node.js 18+ (pnpm empfohlen)
- Ein Cloudflare-Konto (für die Bereitstellung auf Workers)

### Lokale Entwicklung

```bash
# 1. Abhängigkeiten installieren
pnpm install

# 2. wrangler.toml konfigurieren (JWT_SECRET, KV/D1-Bindungen eintragen)

# 3. Entwicklungsserver starten (holt automatisch das offizielle Frontend und führt den Worker aus)
pnpm run dev:unified

# Oder nur den Worker ausführen (ohne das Frontend zu holen)
pnpm run dev:worker
```

### Produktionsbereitstellung

```bash
# One-Click-Bereitstellung: sicherstellen, dass der KV-Namespace existiert → offizielles Frontend holen → auf Cloudflare Workers bereitstellen
pnpm run deploy

# Oder den Worker direkt bereitstellen (KV-Prüfung und Frontend-Build überspringen)
pnpm run deploy:worker
```

---

## Tech-Stack

### Backend

- **Laufzeit**: Cloudflare Workers (Edge Computing)
- **Web-Framework**: Hono.js
- **Datenbank**: Cloudflare D1 (SQLite) / unterstützt MySQL, MariaDB, PostgreSQL, SQL Server
- **Cache**: Cloudflare KV (optional)
- **Sprache**: TypeScript
- **Build-Tools**: Wrangler, esbuild

### Frontend

- **Framework**: React 19 + TypeScript
- **UI-Bibliotheken**: Ant Design / Material-UI
- **Build-Tool**: Vite

---


## Support

Bei Problemen ist Hilfe über die folgenden Kanäle verfügbar:

- 🐛 **Fehlerberichte oder Funktionsanfragen**: besuchen Sie [_Issues_](https://github.com/OpenListTeam/OpenList-Worker/issues)
- 💬 **Allgemeine Fragen und Diskussion**: besuchen Sie das [_Discussions_](https://github.com/OpenListTeam/OpenList/discussions)-Forum

## Lizenz

`OpenList` ist Open-Source-Software unter der [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt)-Lizenz.


## Kontakt

🌐 [@GitHub](https://github.com/OpenListTeam) · ✈️ [Telegram-Gruppe](https://t.me/OpenListTeam) · ✈️ [Telegram-Kanal](https://t.me/OpenListOfficial)

## Mitwirkende

Danke an die folgenden Projekte und ihre Mitwirkenden:

- Der Autor und alle Mitwirkenden von [Alist](https://github.com/AlistGo/alist)
- Der Autor und alle Mitwirkenden von [OpenList](https://github.com/OpenListTeam/OpenList) (Go-Version)
- Alle Mitwirkenden dieses Projekts:

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
