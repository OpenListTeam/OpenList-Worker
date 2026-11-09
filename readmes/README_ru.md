<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList — это многофункциональный инструмент для отображения каталогов, поддерживающий монтирование десятков облачных дисков с предпросмотром, загрузкой, обменом файлами и многим другим</em></p>
  <p>Этот репозиторий является официальным портом проекта <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a> на TypeScript + Serverless</p>
  <p>Работает на Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/build-verify.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/build-verify.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList-Worker?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/stargazers"><img src="https://img.shields.io/github/stars/OpenListTeam/OpenList-Worker?color=%23ED8936&logo=github" alt="Stars" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/forks"><img src="https://img.shields.io/github/forks/OpenListTeam/OpenList-Worker?color=%239F7AEA&logo=github" alt="Forks" /></a>

📘 [Документация](https://doc.oplist.org) · 🌏 [Документация (континентальный Китай)](https://doc.oplist.org.cn)  · ⚖️ [Условия использования](https://doc.oplist.org/terms)  · 🔒 [Политика конфиденциальности](https://doc.oplist.org/privacy)

</div>

<div align="center">

[English](README_en.md) | [简体中文](../README.md) | [繁體中文](README_zh-TW.md) | [日本語](README_ja.md) | [한국어](README_ko.md) | [Français](README_fr.md) | [Deutsch](README_de.md) 

[Português](README_pt.md) | Русский | [العربية](README_ar.md) | [Italiano](README_it.md) | [हिन्दी](README_hi.md) | [Español](README_es.md)

[Исходный проект](https://github.com/OpenListTeam/OpenList) · [Руководство по участию](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CONTRIBUTING.md) · [Кодекс поведения](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CODE_OF_CONDUCT.md) · [Лицензия](./LICENSE)

[🌎 Глобальная демо](https://new.oplist.org) 　|　 [🇨🇳 Демо Китай](https://new.oplist.org.cn)

</div>

---

## Развёртывание в один клик

Нажмите кнопку ниже, чтобы развернуть этот проект на соответствующей платформе в один клик:
<div align="center">


| EdgeOne Makers · Международный | EdgeOne Makers · Китай | Cloudflare Workers · Глобальный | Alibaba Cloud ESA · Китай |
| :---: | :---: | :---: | :---: |
| [![Развернуть на EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Развернуть на EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) | [![Развернуть на Alibaba Cloud ESA](assets/esa-deploy.svg)](https://esa.console.aliyun.com/edge/function/list) |

</div>

> [!IMPORTANT]
> - Если Cloudflare отображает `не удаётся получить содержимое репозитория`, сначала [сделайте fork](https://github.com/OpenListTeam/OpenList-Worker/fork) этого проекта, а затем разверните, подключившись к репозиторию Github
> - Для Alibaba Cloud ESA импортируйте этот репозиторий в консоли через **Периферийные вычисления и ИИ → Функции и Pages**
> - Задайте `JWT_SECRET` при развёртывании (≥16 символов) для подписи JWT и шифрования
> - Хранилище данных автоматически использует встроенный постоянный бэкенд платформы (`DB_DRIVER=auto`) — настройка не требуется; остальные переменные см. в [Переменные окружения](https://doc.oplist.org/ecosystem/official_worker/guide_env)
> - При первом посещении после развёртывания открывается **мастер установки**: задайте учётную запись и пароль администратора в браузере, чтобы завершить инициализацию (установите `ADMIN_PASS`, чтобы пропустить мастер)


## Возможности

OpenList — это система отображения и управления файлами с агрегацией нескольких хранилищ, работающая на платформах периферийных вычислений. Она объединяет файлы, разбросанные по разным облачным дискам, объектным хранилищам и протокольным сервисам, в одном интерфейсе для просмотра, предпросмотра, загрузки и управления.

OpenList-Worker — это официальный порт проекта [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList) на TypeScript + Serverless. Бэкенд был переписан с Go на сервис TypeScript, работающий на Workers, а фронтенд сохраняет единый интерфейс и опыт взаимодействия.

### Агрегация хранилищ

Встроено **78 драйверов хранилищ**, готовых к монтированию различных бэкендов хранилищ:

- **Отечественные облачные диски**: Aliyundrive (Open/Share), Quark (Open/UC TV), Baidu Netdisk (Альбом), 115 (Open/Share), 123 Pan (Open/Share), Tianyi Cloud (189/PC/TV), China Mobile Cloud (139/Hecaiyun), Wopan, Thunder, Tencent Weiyun, Lanzou, PikPak (Share), Doubao, Guangyapan, Chaoxing Group, Lenovo NAS Share, Teambition, WPS Cloud, Alibaba Docs, HalalCloud, MediaTrack и др.
- **Международные облачные диски**: Google Drive (Альбом), OneDrive (App/ShareLink), Dropbox, MEGA, MediaFire, Proton Drive, Yandex Disk, Degoo, Bunny Storage, TeraBox и др.
- **Объектные хранилища**: S3-совместимые (AWS/OSS/COS/MinIO и др.), Cloudflare R2 (привязка Workers или S3 API), UpYun USS, Azure Blob, WebDAV, FTP, SFTP, SMB, IPFS и др.
- **Хостинг кода**: GitHub, GitHub Releases, CNB Releases
- **Программы облачных дисков**: OpenList (Share), AList V3, Cloudreve V3/V4, Kodbox, Seafile, Teldrive, Febbox и др.
- **Прочие драйверы**: Netease Music, Misskey, Emby, Cloudflare Image Hosting и др.

Помимо указанных выше реальных хранилищ, также предоставляются виртуальные/функциональные драйверы, такие как `Local`, `Alias`, `UrlTree`, `AutoIndex`, `Strm`, `Crypt`, `Virtual` и `Chunk`, для локального монтирования, псевдонимов адресов, списков URL, зашифрованного хранения и разбиения на части.

### Основные возможности

- **Управление файлами**: единый просмотр дерева каталогов с онлайн-предпросмотром изображений, видео, аудио, документов, кода и архивов; загрузка между хранилищами, пакетное скачивание, потоковая передача и перенаправление по прямой ссылке; ссылки для обмена со сроком действия, паролем и контролем прав.
- **Поиск и задачи**: полнотекстовый поиск в проиндексированных хранилищах; фоновая очередь задач для пакетных операций и асинхронной обработки.
- **Внешние интерфейсы**: WebDAV, S3-совместимый протокол и конечная точка MCP для ИИ-ассистентов.
- **Доступ и аутентификация**: RBAC (группы пользователей, права чтения/записи на уровне каталогов, квоты), пароли учётных записей + TOTP / WebAuthn / SSO / LDAP.
- **Безопасность и эксплуатация**: сессии JWT, защита CSRF, кликджекинг (X-Frame-Options) и CSP, пробы `/health` и `/healthz`.
- **Дедупликация одновременных запросов**: одинаковые запросы списка каталога / метаданных обращаются к вышестоящему диску только один раз; остальные используют тот же результат, снижая ограничения частоты и нагрузку на CPU.
- **Платформы выполнения**: Cloudflare Workers, Tencent Cloud EdgeOne Makers, Alibaba Cloud ESA, Vercel / AWS Lambda и контейнеры Node.js.
- **Хранение данных**: Cloudflare D1 (SQLite) как основное, а также KV / Blob / Durable Objects и внешние MySQL / MariaDB.
- **Развёртывание в один клик**: кнопки развёртывания EdgeOne, Cloudflare Workers и Alibaba Cloud ESA + мастер установки.

---

## Ручное развёртывание

<details>
<summary>Показать требования, локальную разработку и развёртывание в продакшн</summary>

### Предварительные требования

- Node.js 18+ (рекомендуется pnpm)
- Учётная запись Cloudflare (для развёртывания на Workers)

### Локальная разработка

```bash
# 1. Установить зависимости
pnpm install

# 2. При необходимости настроить привязки и переменные в wrangler.jsonc (JWT_SECRET см. .dev.vars.example)

# 3. Запустить сервер разработки (автоматически получает официальный фронтенд и запускает Worker)
pnpm run dev:unified

# Или запустить только Worker (без получения фронтенда)
pnpm run dev:worker
```

### Развёртывание в продакшн

```bash
# Развёртывание в один клик: собрать фронтенд → развернуть на Cloudflare Workers (привязки KV создаются wrangler автоматически)
pnpm run deploy

# Или развернуть Worker напрямую (пропустить сборку фронтенда)
pnpm run deploy:worker
```

</details>

---

## Технологический стек

### Бэкенд

- **Среда выполнения**: Cloudflare Workers / EdgeOne Functions / Alibaba Cloud ESA (Edge Computing)
- **Веб-фреймворк**: Hono.js
- **База данных**: Cloudflare D1 (SQLite) / KV / Blob / Durable Objects или внешние MySQL / MariaDB
- **Язык**: TypeScript
- **Инструменты сборки**: Wrangler, esbuild

### Фронтенд

- **Фреймворк**: SolidJS + TypeScript (официальный [OpenList-Frontend](https://github.com/OpenListTeam/OpenList-Frontend))
- **UI-библиотека**: Hope UI
- **Инструмент сборки**: Vite

---

## Конфигурация развёртывания

После развёртывания задайте следующие переменные:

| Переменная | По умолчанию | Описание |
| :--- | :--- | :--- |
| `JWT_SECRET` | (нет) | Ключ подписи JWT (≥16 символов) |
| `DB_FORMAT` | `map` | `map` (JSON) / `key` (по ключам) / `sql` (реляционный) |
| `DB_DRIVER` | `auto` | `auto` / `blob` / `cfkv` / `kv` / `d1` / `do` / `mysql` |
| `DB_CIPHER` | `none` | Шифрование чувствительных полей на диске, например `aes-256-gcm` |

Полный список переменных см. в разделе [Переменные конфигурации](https://doc.oplist.org/ecosystem/official_worker/guide_env).

## Поддержка

Если у вас возникли проблемы, помощь доступна по следующим каналам:

- 🐛 **Сообщения об ошибках или запросы функций**: посетите [_Issues_](https://github.com/OpenListTeam/OpenList-Worker/issues)
- 💬 **Общие вопросы и обсуждение**: посетите форум [_Discussions_](https://github.com/OpenListTeam/OpenList/discussions)

## Лицензия

`OpenList` — это программное обеспечение с открытым исходным кодом под лицензией [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt).


## Контакты

🌐 [@GitHub](https://github.com/OpenListTeam) · ✈️ [Группа в Telegram](https://t.me/OpenListTeam) · ✈️ [Канал в Telegram](https://t.me/OpenListOfficial)

## Участники

Благодарим следующие проекты и их участников:

- Автора и всех участников [Alist](https://github.com/AlistGo/alist)
- Автора и всех участников [OpenList](https://github.com/OpenListTeam/OpenList) (версия Go)
- Всех участников этого проекта:

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
