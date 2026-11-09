<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList ist ein funktionsreiches Verzeichnislisten-Tool, das das Mounten von Dutzenden Cloud-Laufwerken mit Dateivorschau, Download, Freigabe und mehr unterstützt</em></p>
  <p>Dieses Repository ist der offizielle TypeScript + Serverless-Port des Projekts <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a></p>
  <p>Läuft auf Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/build-verify.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/build-verify.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList-Worker?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/stargazers"><img src="https://img.shields.io/github/stars/OpenListTeam/OpenList-Worker?color=%23ED8936&logo=github" alt="Stars" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/forks"><img src="https://img.shields.io/github/forks/OpenListTeam/OpenList-Worker?color=%239F7AEA&logo=github" alt="Forks" /></a>

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


| EdgeOne Makers · International | EdgeOne Makers · China | Cloudflare Workers · Global | Alibaba Cloud ESA · China |
| :---: | :---: | :---: | :---: |
| [![Auf EdgeOne bereitstellen](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Auf EdgeOne bereitstellen](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) | [![Auf Alibaba Cloud ESA bereitstellen](assets/esa-deploy.svg)](https://esa.console.aliyun.com/edge/function/list) |

</div>

> [!IMPORTANT]
> - Wenn Cloudflare `Repository-Inhalt kann nicht abgerufen werden` anzeigt, [forken](https://github.com/OpenListTeam/OpenList-Worker/fork) Sie dieses Projekt zuerst und stellen Sie es dann über die Verbindung zum Github-Repository bereit
> - Importieren Sie für Alibaba Cloud ESA dieses Repository in der Konsole unter **Edge Computing und AI → Funktionen und Pages**
> - Setzen Sie bei der Bereitstellung `JWT_SECRET` (≥16 Zeichen) für JWT-Signatur und Verschlüsselung
> - Der Datenspeicher verwendet automatisch das plattformeigene persistente Backend (`DB_DRIVER=auto`) — keine Konfiguration nötig; weitere Variablen siehe [Umgebungsvariablen](https://doc.oplist.org/ecosystem/official_worker/guide_env)
> - Beim ersten Besuch nach der Bereitstellung öffnet sich der **Installationsassistent**: Legen Sie Admin-Konto und Passwort im Browser fest, um die Initialisierung abzuschließen (mit `ADMIN_PASS` überspringen Sie den Assistenten)


## Funktionen

OpenList ist ein Dateilisten- und Verwaltungssystem mit mehreren Speicher-Aggregationen, das auf Edge-Computing-Plattformen läuft. Es vereint Dateien aus verschiedenen Cloud-Laufwerken, Objektspeichern und Protokolldiensten in einer einzigen Oberfläche zum Durchsuchen, Anzeigen, Herunterladen und Verwalten.

OpenList-Worker ist der offizielle TypeScript + Serverless-Port des Projekts [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList). Das Backend wurde von Go auf einen auf Workers laufenden TypeScript-Dienst umgeschrieben, während das Frontend eine konsistente Oberfläche und Interaktionserfahrung beibehält.

### Speicher-Aggregation

**78 Speichertreiber** integriert, bereit zum Mounten verschiedener Speicher-Backends:

- **Inländische Cloud-Laufwerke**: Aliyundrive (Open/Share), Quark (Open/UC TV), Baidu Netdisk (Album), 115 (Open/Share), 123 Pan (Open/Share), Tianyi Cloud (189/PC/TV), China Mobile Cloud (139/Hecaiyun), Wopan, Thunder, Tencent Weiyun, Lanzou, PikPak (Share), Doubao, Guangyapan, Chaoxing Group, Lenovo NAS Share, Teambition, WPS Cloud, Alibaba Docs, HalalCloud, MediaTrack usw.
- **Internationale Cloud-Laufwerke**: Google Drive (Album), OneDrive (App/ShareLink), Dropbox, MEGA, MediaFire, Proton Drive, Yandex Disk, Degoo, Bunny Storage, TeraBox usw.
- **Objektspeicher**: S3-kompatibel (AWS/OSS/COS/MinIO usw.), Cloudflare R2 (Workers-Binding oder S3-API), UpYun USS, Azure Blob, WebDAV, FTP, SFTP, SMB, IPFS usw.
- **Code-Hosting**: GitHub, GitHub Releases, CNB Releases
- **Cloud-Laufwerk-Programme**: OpenList (Share), AList V3, Cloudreve V3/V4, Kodbox, Seafile, Teldrive, Febbox usw.
- **Weitere Treiber**: Netease Music, Misskey, Emby, Cloudflare Image Hosting usw.

Zusätzlich zu den oben genannten echten Speichern werden auch virtuelle/funktionale Treiber wie `Local`, `Alias`, `UrlTree`, `AutoIndex`, `Strm`, `Crypt`, `Virtual` und `Chunk` für lokale Mounts, Adressaliase, URL-Listen, verschlüsselte Speicherung und Chunking bereitgestellt.

### Kernfunktionen

- **Dateiverwaltung**: einheitliches Durchsuchen des Verzeichnisbaums mit Online-Vorschau für Bilder, Videos, Audio, Dokumente, Code und Archive; speicherübergreifendes Hochladen, Stapel-Download, Streaming und Direktlink-Weiterleitung; Freigabe-Links mit Ablauf, Passwort und Berechtigungssteuerung.
- **Suche & Aufgaben**: Volltextsuche in indizierten Speichern; Hintergrund-Aufgabenwarteschlange für Stapel- und asynchrone Verarbeitung.
- **Externe Schnittstellen**: WebDAV, S3-kompatibles Protokoll und ein MCP-Endpunkt für KI-Assistenten.
- **Zugriff & Authentifizierung**: RBAC (Benutzergruppen, Lese-/Schreibrechte auf Verzeichnisebene, Kontingente), Kontokennwörter plus TOTP / WebAuthn / SSO / LDAP.
- **Sicherheit & Betrieb**: JWT-Sitzungen, CSRF-, Clickjacking- (X-Frame-Options) und CSP-Schutz, `/health`- und `/healthz`-Probes.
- **Parallelitäts-Deduplizierung**: identische Verzeichnislisten- / Metadatenanfragen erreichen das Upstream-Laufwerk nur einmal; weitere Anfragen nutzen dasselbe Ergebnis und vermeiden Ratenlimits und CPU-Last.
- **Laufzeitplattformen**: Cloudflare Workers, Tencent Cloud EdgeOne Makers, Alibaba Cloud ESA, Vercel / AWS Lambda und Node.js-Container.
- **Datenspeicher**: Cloudflare D1 (SQLite) als primär, außerdem KV / Blob / Durable Objects und externes MySQL / MariaDB.
- **One-Click-Bereitstellung**: Bereitstellungsschaltflächen für EdgeOne, Cloudflare Workers und Alibaba Cloud ESA + Installationsassistent.

---

## Manuelle Bereitstellung

<details>
<summary>Voraussetzungen, lokale Entwicklung und Produktionsbereitstellung anzeigen</summary>

### Voraussetzungen

- Node.js 18+ (pnpm empfohlen)
- Ein Cloudflare-Konto (für die Bereitstellung auf Workers)

### Lokale Entwicklung

```bash
# 1. Abhängigkeiten installieren
pnpm install

# 2. Bindungen und Variablen in wrangler.jsonc nach Bedarf konfigurieren (JWT_SECRET siehe .dev.vars.example)

# 3. Entwicklungsserver starten (holt automatisch das offizielle Frontend und führt den Worker aus)
pnpm run dev:unified

# Oder nur den Worker ausführen (ohne das Frontend zu holen)
pnpm run dev:worker
```

### Produktionsbereitstellung

```bash
# One-Click-Bereitstellung: Frontend bauen → auf Cloudflare Workers bereitstellen (KV-Bindungen werden von wrangler automatisch bereitgestellt)
pnpm run deploy

# Oder den Worker direkt bereitstellen (Frontend-Build überspringen)
pnpm run deploy:worker
```

</details>

---

## Tech-Stack

### Backend

- **Laufzeit**: Cloudflare Workers / EdgeOne Functions / Alibaba Cloud ESA (Edge Computing)
- **Web-Framework**: Hono.js
- **Datenbank**: Cloudflare D1 (SQLite) / KV / Blob / Durable Objects oder externes MySQL / MariaDB
- **Sprache**: TypeScript
- **Build-Tools**: Wrangler, esbuild

### Frontend

- **Framework**: SolidJS + TypeScript (offizielles [OpenList-Frontend](https://github.com/OpenListTeam/OpenList-Frontend))
- **UI-Bibliothek**: Hope UI
- **Build-Tool**: Vite

---

## Bereitstellungs-Konfiguration

Setzen Sie nach der Bereitstellung die folgenden Variablen:

| Variable | Standard | Beschreibung |
| :--- | :--- | :--- |
| `JWT_SECRET` | (keine) | Signaturschlüssel für JWT (≥16 Zeichen) |
| `DB_FORMAT` | `map` | `map` (JSON) / `key` (pro Schlüssel) / `sql` (relational) |
| `DB_DRIVER` | `auto` | `auto` / `blob` / `cfkv` / `kv` / `d1` / `do` / `mysql` |
| `DB_CIPHER` | `none` | Verschlüsselung sensibler Felder, z. B. `aes-256-gcm` |

Die vollständige Variablenliste finden Sie unter [Konfigurationsvariablen](https://doc.oplist.org/ecosystem/official_worker/guide_env).

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
