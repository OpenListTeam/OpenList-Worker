<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList è uno strumento di elenco directory ricco di funzionalità che supporta il montaggio di decine di unità cloud con anteprima, download, condivisione dei file e altro ancora</em></p>
  <p>Questo repository è il port ufficiale TypeScript + Serverless del progetto <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a></p>
  <p>Esegue su Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/build-verify.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/build-verify.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList-Worker" alt="latest version" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList-Worker?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList-Worker/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>

📘 [Documentazione](https://doc.oplist.org) · 🌏 [Documentazione (Cina continentale)](https://doc.oplist.org.cn)  · ⚖️ [Termini d'uso](https://doc.oplist.org/terms)  · 🔒 [Informativa sulla privacy](https://doc.oplist.org/privacy)

</div>

<div align="center">

[English](README_en.md) | [简体中文](../README.md) | [繁體中文](README_zh-TW.md) | [日本語](README_ja.md) | [한국어](README_ko.md) | [Français](README_fr.md) | [Deutsch](README_de.md) 

[Português](README_pt.md) | [Русский](README_ru.md) | [العربية](README_ar.md) | Italiano | [हिन्दी](README_hi.md) | [Español](README_es.md)

[Progetto upstream](https://github.com/OpenListTeam/OpenList) · [Guida ai contributi](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CONTRIBUTING.md) · [Codice di condotta](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CODE_OF_CONDUCT.md) · [Licenza](./LICENSE)

[🌎 Demo globale](https://new.oplist.org) 　|　 [🇨🇳 Demo Cina](https://new.oplist.org.cn)

</div>

---

## Deploy con un clic

Clicca il pulsante qui sotto per distribuire questo progetto sulla piattaforma corrispondente con un clic:
<div align="center">


| EdgeOne Makers · Internazionale | EdgeOne Makers · Cina | Cloudflare Workers · Globale | Alibaba Cloud ESA · Cina |
| :---: | :---: | :---: | :---: |
| [![Deploy su EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Deploy su EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) | [![Deploy su Alibaba Cloud ESA](assets/esa-deploy.svg)](https://esa.console.aliyun.com/edge/function/list) |

</div>

> [!IMPORTANT]
> - Se Cloudflare mostra `impossibile recuperare il contenuto del repository`, [fai un fork](https://github.com/OpenListTeam/OpenList-Worker/fork) di questo progetto e poi distribuisci collegandoti al repository Github
> - Per Alibaba Cloud ESA, importa questo repository da **Edge Computing e AI → Funzioni e Pages** nella console: il file `esa.jsonc` incluso definisce già installazione, build e risorse statiche. Dopo il deploy, imposta `JWT_SECRET` e `KV_NAMESPACE` (predefinito `openlist`) e crea in anticipo il namespace EdgeKV con lo stesso nome
> - Durante il deploy compila `JWT_SECRET` (stringa casuale di 16+ caratteri, ad es. `openssl rand -hex 32`): firma i JWT e cifra i dati; se non impostata, viene generata e salvata durante l'inizializzazione
> - L'archiviazione usa automaticamente il backend persistente della piattaforma (`DB_DRIVER=auto`) — nessuna configurazione necessaria; per le altre variabili vedi [Variabili d'ambiente](https://doc.oplist.org/ecosystem/official_worker/guide_env)
> - Dopo il deploy, la prima visita apre la **procedura guidata di installazione**: imposta account e password admin nel browser per completare l'inizializzazione (imposta `ADMIN_PASS` per saltarla)


## Funzionalità

OpenList è un sistema di elenco e gestione file multi-archiviazione che gira su piattaforme di edge computing. Unifica file sparsi su diverse unità cloud, object storage e servizi di protocollo in un'unica interfaccia per navigare, visualizzare in anteprima, scaricare e gestire.

OpenList-Worker è il port ufficiale TypeScript + Serverless del progetto [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList). Il backend è stato riscritto da Go a un servizio TypeScript eseguito su Workers, mentre il frontend mantiene un'interfaccia e un'esperienza di interazione coerenti.

### Aggregazione degli storage

Oltre **78 driver di storage** integrati, pronti a montare vari backend di storage:

- **Unità cloud domestiche**: Aliyundrive (Open/Share), Quark (Open/UC TV), Baidu Netdisk (Album), 115 (Open/Share), 123 Pan (Open/Share), Tianyi Cloud (189/PC/TV), China Mobile Cloud (139/Hecaiyun), Wopan, Thunder, Tencent Weiyun, Lanzou, PikPak (Share), Doubao, Guangyapan, Chaoxing Group, Lenovo NAS Share, Teambition, WPS Cloud, Alibaba Docs, HalalCloud, MediaTrack, ecc.
- **Unità cloud internazionali**: Google Drive (Album), OneDrive (App/ShareLink), Dropbox, MEGA, MediaFire, Proton Drive, Yandex Disk, Degoo, Bunny Storage, TeraBox, ecc.
- **Object storage**: Compatibile con S3 (AWS/OSS/COS/MinIO, ecc.), Cloudflare R2 (binding Workers o API S3), UpYun USS, Azure Blob, WebDAV, FTP, SFTP, SMB, IPFS, ecc.
- **Hosting del codice**: GitHub, GitHub Releases, CNB Releases
- **Programmi di unità cloud**: OpenList (Share), AList V3, Cloudreve V3/V4, Kodbox, Seafile, Teldrive, Febbox, ecc.
- **Altri driver**: Netease Music, Misskey, Emby, Cloudflare Image Hosting, ecc.

Oltre agli storage reali sopra indicati, sono forniti anche driver virtuali/funzionali come `Local`, `Alias`, `UrlTree`, `AutoIndex`, `Strm`, `Crypt`, `Virtual` e `Chunk` per montaggi locali, alias di indirizzi, liste di URL, archiviazione cifrata e suddivisione in parti.

### Capacità principali

- **Navigazione dei file**: navigazione unificata dell'albero delle directory, con anteprima online di immagini, video, audio, documenti, codice, archivi e altro.
- **Caricamento e download**: caricamento tra storage, download in batch, streaming e reindirizzamento con link diretto.
- **Condivisione file**: generazione di link di condivisione con scadenza, password e controllo dei permessi, con supporto per accesso anonimo e condivisione di directory.
- **Ricerca full-text**: ricerca rapida di file negli storage indicizzati.
- **Attività offline**: coda di attività in background con supporto per operazioni batch ed elaborazione asincrona.
- **Interfacce esterne**: esporre lo storage aggregato tramite protocollo WebDAV o compatibile con S3 per il montaggio in strumenti di terze parti.
- **Servizio MCP**: fornire un endpoint Model Context Protocol integrabile e richiamabile da assistenti IA e altri client.
- **Deduplicazione delle richieste concorrenti**: richieste identiche di elenco directory / metadati nello stesso istante raggiungono il disco upstream una sola volta; le altre riutilizzano lo stesso risultato, evitando limiti di frequenza e consumo CPU inutili.

### Gestione degli accessi

- **Permessi**: controllo degli accessi basato sui ruoli (RBAC), con supporto per gruppi di utenti, permessi di lettura/scrittura a livello di directory e quote.
- **Autenticazione**: password degli account integrate con verifica TOTP, accesso WebAuthn/FIDO, single sign-on SSO e autenticazione di directory LDAP.
- **Rafforzamento della sicurezza**: sessioni JWT, protezione CSRF, protezione dal clickjacking (X-Frame-Options), Content Security Policy (CSP).
- **Controlli di salute**: fornire una sonda di vitalità `/health` e una sonda di prontezza `/healthz` per monitoraggio e avvisi.

### Deploy su piattaforme

- **Piattaforme di esecuzione**: Cloudflare Workers, Tencent Cloud EdgeOne Makers, Alibaba Cloud ESA, Vercel / AWS Lambda e ambienti container Node.js.
- **Archiviazione dati**: Cloudflare D1 (SQLite) come principale, oltre a KV / Blob / Durable Objects e MySQL / MariaDB esterni.
- **Deploy con un clic**: punti di accesso al deploy per EdgeOne, Cloudflare Workers e Alibaba Cloud ESA + procedura guidata di installazione.

---

## Deploy manuale

### Prerequisiti

- Node.js 18+ (pnpm consigliato)
- Un account Cloudflare (per il deploy su Workers)

### Sviluppo locale

```bash
# 1. Installa le dipendenze
pnpm install

# 2. Configura binding e variabili in wrangler.jsonc secondo necessità (JWT_SECRET vedi .dev.vars.example)

# 3. Avvia il server di sviluppo (ottiene automaticamente il frontend ufficiale ed esegue il Worker)
pnpm run dev:unified

# Oppure esegui solo il Worker (senza ottenere il frontend)
pnpm run dev:worker
```

### Deploy in produzione

```bash
# Deploy con un clic: compila il frontend → distribuisci su Cloudflare Workers (i binding KV vengono forniti automaticamente da wrangler)
pnpm run deploy

# Oppure distribuisci direttamente il Worker (salta la build del frontend)
pnpm run deploy:worker
```

---

## Stack tecnologico

### Backend

- **Ambiente di esecuzione**: Cloudflare Workers / EdgeOne Functions / Alibaba Cloud ESA (Edge Computing)
- **Framework web**: Hono.js
- **Database**: Cloudflare D1 (SQLite) / KV / Blob / Durable Objects o MySQL / MariaDB esterno
- **Linguaggio**: TypeScript
- **Strumenti di build**: Wrangler, esbuild

### Frontend

- **Framework**: SolidJS + TypeScript (ufficiale [OpenList-Frontend](https://github.com/OpenListTeam/OpenList-Frontend))
- **Libreria UI**: Hope UI
- **Strumento di build**: Vite

---

## Configurazione

Dopo il deploy, la **prima visita al sito apre automaticamente la procedura guidata di installazione**: imposta account e password dell'amministratore nel browser per completare l'inizializzazione. Per saltare la procedura, configura `ADMIN_PASS` per inizializzare automaticamente l'admin.

La maggior parte dei deploy **non richiede configurazione aggiuntiva**: l'archiviazione usa per impostazione predefinita `DB_DRIVER=auto`, che seleziona automaticamente un backend persistente disponibile (Cloudflare Workers → KV / D1 / DO, EdgeOne / ESA → Blob). L'unica variabile da impostare esplicitamente è:

| Variabile | Descrizione |
| :--- | :--- |
| `JWT_SECRET` | Chiave di firma dei token JWT (≥16 caratteri, consigliato: `openssl rand -hex 32`), usata anche per l'autenticazione delle attività cron. Se non impostata, viene generata e salvata durante l'inizializzazione |

> Configura `JWT_SECRET` come **Secret** (non come variabile normale): le variabili normali possono essere sovrascritte dalla configurazione del repository al nuovo deploy, i Secret no.

Le altre variabili hanno valori predefiniti ragionevoli:

| Variabile | Predefinito | Descrizione |
| :--- | :--- | :--- |
| `ADMIN_PASS` | — | Salta la procedura guidata e inizializza l'admin con questa password |
| `DB_FORMAT` | `map` | Formato di archiviazione: `map` (oggetto JSON intero) / `key` (per chiave) / `sql` (tabelle relazionali, compatibile con il backend Go) |
| `DB_DRIVER` | `auto` | Driver di archiviazione: `auto` / `blob` / `cfkv` / `kv` / `d1` / `do` / `mysql`; un driver esplicito non viene mai sostituito automaticamente |
| `DB_CIPHER` | `none` | Cifratura at-rest dei campi sensibili (nessuna per impostazione predefinita), ad es. `aes-256-gcm` |
| `ALLOW_URLS` | — | Allowlist CORS (separata da virgole; solo stessa origine se non impostata) |
| `MAX_UPLOAD` / `MAX_UPPART` | 26214400 / 16777216 | Dimensione massima (byte) di un upload completo / di un frammento multipart |
| `ASSET_URLS` | — | URL base CDN per le risorse frontend, supporta il segnaposto `$version` |

Gli elenchi delle directory e i link di download vengono sempre recuperati direttamente dal disco — non esiste cache tra richieste (nessuna variabile `CACHE_*`), quindi le modifiche esterne sono visibili immediatamente.

Per l'elenco completo delle variabili (cifratura dei campi `DB_CIPHER`, impostazioni `cfkv` / MySQL ecc.) e i passaggi di deploy per piattaforma, consulta la documentazione:

- [Variabili d'ambiente](https://doc.oplist.org/ecosystem/official_worker/guide_env)
- [Deploy](https://doc.oplist.org/ecosystem/official_worker/guide)
- [FAQ](https://doc.oplist.org/ecosystem/official_worker/about)

## Supporto

In caso di problemi, l'aiuto è disponibile attraverso i seguenti canali:

- 🐛 **Segnalazioni di bug o richieste di funzionalità**: visita [_Issues_](https://github.com/OpenListTeam/OpenList-Worker/issues)
- 💬 **Domande generali e discussione**: visita il forum [_Discussions_](https://github.com/OpenListTeam/OpenList/discussions)

## Licenza

`OpenList` è un software open source sotto licenza [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt).


## Contatti

🌐 [@GitHub](https://github.com/OpenListTeam) · ✈️ [Gruppo Telegram](https://t.me/OpenListTeam) · ✈️ [Canale Telegram](https://t.me/OpenListOfficial)

## Collaboratori

Grazie ai seguenti progetti e ai loro collaboratori:

- L'autore e tutti i collaboratori di [Alist](https://github.com/AlistGo/alist)
- L'autore e tutti i collaboratori di [OpenList](https://github.com/OpenListTeam/OpenList) (versione Go)
- Tutti i collaboratori di questo progetto:

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
