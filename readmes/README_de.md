<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList ist ein funktionsreiches Verzeichnislisten-Tool, das das Mounten von Dutzenden Cloud-Laufwerken mit Dateivorschau, Download, Freigabe und mehr unterstützt</em></p>
  <p>Dieses Repository ist der offizielle TypeScript + Serverless-Port des Projekts <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a></p>
  <p>Läuft auf Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/build-verify.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/build-verify.yml?branch=main" alt="Build status" /></a>
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


| EdgeOne Makers · International | EdgeOne Makers · China | Cloudflare Workers · Global | Alibaba Cloud ESA · China |
| :---: | :---: | :---: | :---: |
| [![Auf EdgeOne bereitstellen](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Auf EdgeOne bereitstellen](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) | [![Auf Alibaba Cloud ESA bereitstellen](assets/esa-deploy.svg)](https://esa.console.aliyun.com/edge/function/list) |

</div>

> [!IMPORTANT]
> - Wenn Cloudflare `Repository-Inhalt kann nicht abgerufen werden` anzeigt, [forken](https://github.com/OpenListTeam/OpenList-Worker/fork) Sie dieses Projekt zuerst und stellen Sie es dann über die Verbindung zum Github-Repository bereit
> - Importieren Sie für Alibaba Cloud ESA dieses Repository in der Konsole unter **Edge Computing und AI → Funktionen und Pages**: Die enthaltene `esa.jsonc` definiert bereits Installations-, Build- und Static-Asset-Einstellungen. Setzen Sie nach der Bereitstellung `JWT_SECRET` und `KV_NAMESPACE` (Standard `openlist`) und legen Sie vorab den gleichnamigen EdgeKV-Namespace an
> - Tragen Sie bei der Bereitstellung `JWT_SECRET` ein (Zufallszeichenfolge mit 16+ Zeichen, z. B. `openssl rand -hex 32`): Sie signiert JWTs und verschlüsselt Daten; ohne Angabe wird sie bei der Initialisierung erzeugt und gespeichert
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

- **Dateidurchsuchen**: einheitliches Durchsuchen des Verzeichnisbaums, mit Online-Vorschau von Bildern, Videos, Audio, Dokumenten, Code, Archiven und mehr.
- **Hochladen & Herunterladen**: speicherübergreifendes Hochladen, Stapel-Download, Streaming und Direktlink-Weiterleitung.
- **Dateifreigabe**: Erzeugen von Freigabe-Links mit Ablauf, Passwort und Berechtigungssteuerung, unterstützt anonymen Zugriff und Verzeichnisfreigabe.
- **Volltextsuche**: schnelles Suchen von Dateien in indizierten Speichern.
- **Offline-Aufgaben**: Hintergrund-Aufgabenwarteschlange für Stapeloperationen und asynchrone Verarbeitung.
- **Externe Schnittstellen**: aggregierten Speicher über WebDAV oder S3-kompatibles Protokoll bereitstellen, zum Mounten in Drittanbieter-Tools.
- **MCP-Dienst**: bietet einen Model-Context-Protocol-Endpunkt, der von KI-Assistenten und anderen Clients integriert und aufgerufen werden kann.
- **Parallelitäts-Deduplizierung**: identische Verzeichnislisten- / Metadatenanfragen im selben Moment werden nur einmal an das Upstream-Laufwerk gestellt; weitere Anfragen nutzen dasselbe Ergebnis, um unnötige Ratenbegrenzungen und CPU-Last zu vermeiden.

### Zugriffsverwaltung

- **Berechtigungen**: rollenbasierte Zugriffskontrolle (RBAC), unterstützt Benutzergruppen, Lese-/Schreibberechtigungen auf Verzeichnisebene und Kontingente.
- **Authentifizierung**: integrierte Kontokennwörter mit TOTP-Verifizierung, WebAuthn/FIDO-Anmeldung, SSO-Single-Sign-on und LDAP-Verzeichnisauthentifizierung.
- **Sicherheitshärtung**: JWT-Sitzungen, CSRF-Schutz, Clickjacking-Schutz (X-Frame-Options), Content Security Policy (CSP).
- **Gesundheitsprüfungen**: bietet eine `/health`-Liveness-Probe und eine `/healthz`-Readiness-Probe für Überwachung und Alarmierung.

### Plattform-Bereitstellung

- **Laufzeitplattformen**: Cloudflare Workers, Tencent Cloud EdgeOne Makers, Alibaba Cloud ESA, Vercel / AWS Lambda und Node.js-Containerumgebungen.
- **Datenspeicher**: Cloudflare D1 (SQLite) als primär, außerdem KV / Blob / Durable Objects sowie externes MySQL / MariaDB.
- **One-Click-Bereitstellung**: Bereitstellungseinstiege für EdgeOne, Cloudflare Workers und Alibaba Cloud ESA + Installationsassistent.

---

## Manuelle Bereitstellung

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

## Konfiguration

Nach der Bereitstellung öffnet der **erste Besuch der Website automatisch den Installationsassistenten** — legen Sie dort das Admin-Konto und das Passwort fest, um die Initialisierung abzuschließen. Um den Assistenten zu überspringen, setzen Sie `ADMIN_PASS`; der Admin wird dann automatisch initialisiert.

Die meisten Bereitstellungen benötigen **keine zusätzliche Konfiguration**: Der Datenspeicher nutzt standardmäßig `DB_DRIVER=auto` und wählt automatisch ein verfügbares persistentes Backend (Cloudflare Workers → KV / D1 / DO, EdgeOne / ESA → Blob). Explizit gesetzt werden sollte nur:

| Variable | Beschreibung |
| :--- | :--- |
| `JWT_SECRET` | Signaturschlüssel für JWT-Tokens (≥16 Zeichen, empfohlen: `openssl rand -hex 32`), wird auch zur Authentifizierung von Cron-Aufgaben verwendet. Ohne Angabe wird er bei der Initialisierung erzeugt und gespeichert |

> Konfigurieren Sie `JWT_SECRET` als **Secret** (nicht als normale Variable): Normale Variablen können bei einer erneuten Bereitstellung durch die Repository-Konfiguration überschrieben werden, Secrets nicht.

Alle anderen Variablen haben sinnvolle Standardwerte:

| Variable | Standard | Beschreibung |
| :--- | :--- | :--- |
| `ADMIN_PASS` | — | Überspringt den Installationsassistenten und initialisiert den Admin mit diesem Passwort |
| `DB_FORMAT` | `map` | Speicherformat: `map` (ganzes JSON-Objekt) / `key` (pro Schlüssel) / `sql` (relationale Tabellen, kompatibel zum Go-Backend) |
| `DB_DRIVER` | `auto` | Speichertreiber: `auto` / `blob` / `cfkv` / `kv` / `d1` / `do` / `mysql`; ein explizit gesetzter Treiber wird nicht automatisch ersetzt |
| `DB_CIPHER` | `none` | Verschlüsselung sensibler Felder auf dem Datenträger (standardmäßig keine), z. B. `aes-256-gcm` |
| `ALLOW_URLS` | — | CORS-Allowlist (kommagetrennt; ohne Angabe nur gleiche Origin) |
| `MAX_UPLOAD` / `MAX_UPPART` | 26214400 / 16777216 | Maximale Größe (Bytes) für einen gesamten Upload / ein Multipart-Chunk |
| `ASSET_URLS` | — | CDN-Basis-URL für Frontend-Assets, unterstützt den Platzhalter `$version` |

Verzeichnislisten und Download-Links werden immer direkt vom Laufwerk abgerufen — es gibt keinen Cache über Anfragen hinweg (keine `CACHE_*`-Variablen), externe Änderungen sind sofort sichtbar.

Die vollständige Variablenliste (Feldverschlüsselung `DB_CIPHER`, `cfkv` / MySQL-Einstellungen usw.) und die Bereitstellungsschritte je Plattform finden Sie in der Dokumentation:

- [Umgebungsvariablen](https://doc.oplist.org/ecosystem/official_worker/guide_env)
- [Bereitstellung](https://doc.oplist.org/ecosystem/official_worker/guide)
- [FAQ](https://doc.oplist.org/ecosystem/official_worker/about)

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
