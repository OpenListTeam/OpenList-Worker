<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList ist ein Verzeichnislisten-Tool, das das Mounten mehrerer Cloud-Laufwerke unterstützt, mit Dutzenden von Cloud-Speicher-Backends, Dateiverwaltung, Freigabe und mehr.</em></p>

  <p>Dieses Repository ist der offizielle TypeScript + Serverless-Port des Projekts <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a>.</p>
  <p>Läuft auf Cloudflare Workers / EdgeOne Cloud Function.</p>

<a href="https://github.com/OpenListTeam/OpenList/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList/actions?query=workflow%3ABuild"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList/build.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList" alt="latest version" /></a>

<a href="https://github.com/OpenListTeam/OpenList/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>

</div>

<div align="center">

[English](README_en.md) | [简体中文](../README.md) | [繁體中文](README_zh-TW.md) | [日本語](README_ja.md) | [한국어](README_ko.md) | [Français](README_fr.md) | Deutsch

[Português](README_pt.md) | [Русский](README_ru.md) | [العربية](README_ar.md) | [Italiano](README_it.md) | [हिन्दी](README_hi.md) | [Español](README_es.md)

[Upstream-Projekt](https://github.com/OpenListTeam/OpenList) · [Beitragsleitfaden](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CONTRIBUTING.md) · [Verhaltenskodex](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CODE_OF_CONDUCT.md) · [Lizenz](../LICENSE)

[🌎 Globale Demo](https://new.oplist.org) 　|　 [🇨🇳 China-Demo](https://new.oplist.org.cn)

</div>

---

## One-Click-Bereitstellung

Klicken Sie auf die Schaltfläche unten, um dieses Projekt mit einem Klick auf der entsprechenden Plattform bereitzustellen：

<div align="center">

| EdgeOne Makers · International | EdgeOne Makers · China | Cloudflare Workers · Global |
| :---: | :---: | :---: |
| [![Auf EdgeOne bereitstellen](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Auf EdgeOne bereitstellen](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Auf Cloudflare Workers bereitstellen](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) |

</div>

> [!IMPORTANT]
> Nach der Bereitstellung startet der erste Besuch der Website automatisch den **Installationsassistenten**：
>
> Optionale Umgebungsvariablen / Secrets：
> - `ENCRYPTION_SECRET`：statischer Verschlüsselungsschlüssel（≥16 Zeichen empfohlen；zum Verschlüsseln sensibler Felder）
> - `JWT_SECRET`：JWT-Signaturschlüssel（empfohlen；wird bei Nichtangabe automatisch generiert und in KV gespeichert）
> - `CRON_SECRET`：Authentifizierungsschlüssel für geplante Aktualisierungsaufgaben（optional，nur für geplante EdgeOne-Aufgaben erforderlich）

## Funktionen

OpenList-Worker ist ein Dateilisten- und Verwaltungssystem mit mehreren Speicher-Aggregationen，das auf Edge-Computing-Plattformen läuft und Dateien aus verschiedenen Cloud-Laufwerken，Objektspeichern und Protokolldiensten in einer einzigen Oberfläche zum Durchsuchen，Anzeigen，Herunterladen und Verwalten vereint.

### Über den TS-Port

OpenList-Worker ist der TypeScript-Port des offiziellen Projekts [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList).

Das Backend wurde von Go auf einen auf Workers laufenden TypeScript-Dienst umgeschrieben，während das Frontend eine konsistente Oberfläche und Interaktionserfahrung beibehält.

### Speicher-Aggregation

**78 Speichertreiber** integriert，bereit zum Mounten verschiedener Speicher-Backends：

| Kategorie | Unterstützte Backends |
| :--- | :--- |
| Inländische Cloud-Laufwerke | Aliyundrive（Open/Share），Quark，Baidu Netdisk，115，123 Pan，Thunder，Tianyi Cloud（189），Tencent Weiyun，Lanzou，PikPak，UC Cloud，China Mobile Cloud，139 Cloud，Doubao，Wopan，Tianyi Family Cloud，LeTV Cloud usw. |
| Internationale Cloud-Laufwerke | Google Drive，OneDrive（App/ShareLink），Dropbox，MEGA，MediaFire，Proton Drive，Yandex Disk，Degoo，Bunny Storage，TeraBox usw. |
| Objektspeicher | S3-kompatibel（AWS/OSS/COS/MinIO usw.），WebDAV，FTP，SFTP，SMB，IPFS，Azure Blob usw. |
| Code-Hosting | GitHub，GitHub Releases，CNB Releases |
| Cloud-Laufwerk-Programme | OpenList / AList V3，Cloudreve V3/V4，Kodbox，Seafile，Teldrive，Febbox usw. |
| Weitere Treiber | Netease Music，Misskey，Emby，115-Freigabe，Aliyundrive-Freigabe，Quark-Freigabe usw. |

Zusätzlich zu den oben genannten echten Speichern werden auch virtuelle/funktionale Treiber wie `Local`，`Alias`，`UrlTree`，`AutoIndex`，`Strm`，`Crypt`，`Virtual` und `Chunk` für lokale Mounts，Adressaliase，URL-Listen，verschlüsselte Speicherung und Chunking bereitgestellt.

### Kernfunktionen

- **Dateidurchsuchen**：einheitliches Durchsuchen des Verzeichnisbaums，mit Online-Vorschau von Bildern，Videos，Audio，Dokumenten，Code，Archiven und mehr.
- **Hochladen & Herunterladen**：speicherübergreifendes Hochladen，Stapel-Download，Streaming und Direktlink-Weiterleitung.
- **Dateifreigabe**：Erzeugen von Freigabe-Links mit Ablauf，Passwort und Berechtigungssteuerung，unterstützt anonymen Zugriff und Verzeichnisfreigabe.
- **Volltextsuche**：schnelles Suchen von Dateien in indizierten Speichern.
- **Offline-Aufgaben**：Hintergrund-Aufgabenwarteschlange für Stapeloperationen und asynchrone Verarbeitung.
- **Externe Schnittstellen**：aggregierten Speicher über WebDAV oder S3-kompatibles Protokoll bereitstellen，zum Mounten in Drittanbieter-Tools.
- **MCP-Dienst**：bietet einen Model-Context-Protocol-Endpunkt，der von KI-Assistenten und anderen Clients integriert und aufgerufen werden kann.

### Zugriffsverwaltung

- **Berechtigungen**：rollenbasierte Zugriffskontrolle（RBAC），unterstützt Benutzergruppen，Lese-/Schreibberechtigungen auf Verzeichnisebene und Kontingente.
- **Authentifizierung**：integrierte Kontokennwörter mit TOTP-Verifizierung，WebAuthn/FIDO-Anmeldung，SSO-Single-Sign-on und LDAP-Verzeichnisauthentifizierung.
- **Sicherheitshärtung**：JWT-Sitzungen，CSRF-Schutz，Clickjacking-Schutz（X-Frame-Options），Content Security Policy（CSP）.
- **Gesundheitsprüfungen**：bietet eine `/health`-Liveness-Probe und eine `/healthz`-Readiness-Probe für Überwachung und Alarmierung.

### Bereitstellung

- **Laufzeitplattformen**：Cloudflare Workers，Tencent Cloud EdgeOne Makers，Vercel，Serverless und Node.js-Containerumgebungen.
- **Datenspeicher**：Cloudflare D1（SQLite）als primär，unterstützt auch MySQL，MariaDB，PostgreSQL，SQL Server.
- **Persistenter Cache**：Cloudflare KV / EdgeOne Blob（optional）für Konfigurationspersistenz und Caching.
- **One-Click-Bereitstellung**：unterstützt One-Click-Bereitstellungsbuttons + Initialisierung auf EdgeOne，Cloudflare Workers und anderen Plattformen.

---

## Manuelle Bereitstellung

### Voraussetzungen

- Node.js 18+
- Ein Cloudflare-Konto（für die Bereitstellung auf Workers）

### Lokale Entwicklung

```bash
# 1. Backend-Abhängigkeiten installieren
npm install

# 2. Frontend-Abhängigkeiten installieren
npm run install:page

# 3. wrangler.jsonc konfigurieren（JWT_SECRET，KV/D1-Bindungen eintragen）

# 4. Backend-Entwicklungsserver starten
npm run dev

# 5. Frontend-Entwicklungsserver in einem anderen Terminal starten
npm run dev:page
```

### Produktionsbereitstellung

```bash
# One-Click-Bereitstellung（Frontend-Build + Backend auf Cloudflare Workers bereitstellen）
npm run deploy
```

---

## Tech-Stack

### Backend

- **Laufzeit**：Cloudflare Workers（Edge Computing）
- **Web-Framework**：Hono.js
- **Datenbank**：Cloudflare D1（SQLite）/ unterstützt MySQL，MariaDB，PostgreSQL，SQL Server
- **Cache**：Cloudflare KV（optional）
- **Sprache**：TypeScript
- **Build-Tools**：Wrangler，esbuild

### Frontend

- **Framework**：React 19 + TypeScript
- **UI-Bibliotheken**：Ant Design / Material-UI
- **Build-Tool**：Vite

---

## Dokumentation

- 📘 [Offizielle Dokumentation](https://doc.oplist.org)
- 🌏 [China-Spiegel](https://doc.oplist.org.cn)
- ⚖️ [Nutzungsbedingungen](https://doc.oplist.org/terms)
- 🔒 [Datenschutzerklärung](https://doc.oplist.org/privacy)

## Support

Für allgemeine Fragen besuchen Sie bitte das [_Discussions_](https://github.com/OpenListTeam/OpenList/discussions)-Forum. **_Issues_ sind nur für Fehlerberichte und Funktionsanfragen bestimmt.**

## Lizenz

`OpenList` ist Open-Source-Software unter der [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt)-Lizenz.

## Kontakt

- [@GitHub](https://github.com/OpenListTeam)
- [Telegram-Gruppe](https://t.me/OpenListTeam)
- [Telegram-Kanal](https://t.me/OpenListOfficial)

## Mitwirkende

Wir danken herzlich dem Autor des Originalprojekts [AlistGo/alist](https://github.com/AlistGo/alist)，[Xhofe](https://github.com/Xhofe)，und allen anderen Mitwirkenden.

Danke an diese großartigen Menschen：

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
