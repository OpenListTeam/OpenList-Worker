<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList — это инструмент для отображения каталогов с поддержкой монтирования нескольких облачных дисков, десятков облачных хранилищ, управления файлами, обмена и многого другого.</em></p>

  <p>Этот репозиторий является официальным портом проекта <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a> на TypeScript + Serverless.</p>
  <p>Работает на Cloudflare Workers / EdgeOne Cloud Function.</p>

<a href="https://github.com/OpenListTeam/OpenList/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList/actions?query=workflow%3ABuild"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList/build.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList" alt="latest version" /></a>

<a href="https://github.com/OpenListTeam/OpenList/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>

</div>

<div align="center">

[English](README_en.md) | [简体中文](../README.md) | [繁體中文](README_zh-TW.md) | [日本語](README_ja.md) | [한국어](README_ko.md) | [Français](README_fr.md) | [Deutsch](README_de.md)

[Português](README_pt.md) | Русский | [العربية](README_ar.md) | [Italiano](README_it.md) | [हिन्दी](README_hi.md) | [Español](README_es.md)

[Исходный проект](https://github.com/OpenListTeam/OpenList) · [Руководство по участию](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CONTRIBUTING.md) · [Кодекс поведения](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CODE_OF_CONDUCT.md) · [Лицензия](../LICENSE)

[🌎 Глобальная демо](https://new.oplist.org) 　|　 [🇨🇳 Демо Китай](https://new.oplist.org.cn)

</div>

---

## Развёртывание в один клик

Нажмите кнопку ниже, чтобы развернуть этот проект на соответствующей платформе в один клик：

<div align="center">

| EdgeOne Makers · Международный | EdgeOne Makers · Китай | Cloudflare Workers · Глобальный |
| :---: | :---: | :---: |
| [![Развернуть на EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Развернуть на EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Развернуть на Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) |

</div>

> [!IMPORTANT]
> После развёртывания при первом посещении сайта автоматически запустится **мастер установки**：
>
> Необязательные переменные окружения / секреты：
> - `ENCRYPTION_SECRET`：статический ключ шифрования（рекомендуется ≥16 символов；используется для шифрования конфиденциальных полей）
> - `JWT_SECRET`：ключ подписи JWT（рекомендуется；при отсутствии генерируется автоматически и сохраняется в KV）
> - `CRON_SECRET`：ключ аутентификации для плановых задач обновления（необязательно，только для плановых задач EdgeOne）

## Возможности

OpenList-Worker — это система отображения и управления файлами с агрегацией нескольких хранилищ，работающая на платформах периферийных вычислений и объединяющая файлы，разбросанные по разным облачным дискам，объектным хранилищам и протокольным сервисам，в одном интерфейсе для просмотра，предпросмотра，загрузки и управления.

### О порте на TypeScript

OpenList-Worker — это порт официального проекта [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList) на TypeScript.

Бэкенд был переписан с Go на сервис TypeScript，работающий на Workers，а фронтенд сохраняет единый интерфейс и опыт взаимодействия.

### Агрегация хранилищ

Встроено **78 драйверов хранилищ**，готовых к монтированию различных бэкендов хранилищ：

| Категория | Поддерживаемые бэкенды |
| :--- | :--- |
| Отечественные облачные диски | Aliyundrive（Open/Share），Quark，Baidu Netdisk，115，123 Pan，Thunder，Tianyi Cloud（189），Tencent Weiyun，Lanzou，PikPak，UC Cloud，China Mobile Cloud，139 Cloud，Doubao，Wopan，Tianyi Family Cloud，LeTV Cloud и др. |
| Международные облачные диски | Google Drive，OneDrive（App/ShareLink），Dropbox，MEGA，MediaFire，Proton Drive，Yandex Disk，Degoo，Bunny Storage，TeraBox и др. |
| Объектные хранилища | S3-совместимые（AWS/OSS/COS/MinIO и др.），WebDAV，FTP，SFTP，SMB，IPFS，Azure Blob и др. |
| Хостинг кода | GitHub，GitHub Releases，CNB Releases |
| Программы облачных дисков | OpenList / AList V3，Cloudreve V3/V4，Kodbox，Seafile，Teldrive，Febbox и др. |
| Прочие драйверы | Netease Music，Misskey，Emby，общий доступ 115，общий доступ Aliyundrive，общий доступ Quark и др. |

Помимо указанных выше реальных хранилищ，также предоставляются виртуальные/функциональные драйверы，такие как `Local`，`Alias`，`UrlTree`，`AutoIndex`，`Strm`，`Crypt`，`Virtual` и `Chunk`，для локального монтирования，псевдонимов адресов，списков URL，зашифрованного хранения и разбиения на части.

### Основные возможности

- **Просмотр файлов**：единый просмотр дерева каталогов с онлайн-предпросмотром изображений，видео，аудио，документов，кода，архивов и др.
- **Загрузка и скачивание**：загрузка между хранилищами，пакетное скачивание，потоковая передача и перенаправление по прямой ссылке.
- **Обмен файлами**：создание ссылок для обмена со сроком действия，паролем и контролем прав，с поддержкой анонимного доступа и обмена каталогами.
- **Полнотекстовый поиск**：быстрый поиск файлов в проиндексированных хранилищах.
- **Офлайн-задачи**：фоновая очередь задач с поддержкой пакетных операций и асинхронной обработки.
- **Внешние интерфейсы**：предоставление агрегированного хранилища по протоколу WebDAV или S3-совместимому протоколу для монтирования в сторонние инструменты.
- **Сервис MCP**：предоставление конечной точки Model Context Protocol，которую можно интегрировать и вызывать из ИИ-ассистентов и других клиентов.

### Управление доступом

- **Права**：управление доступом на основе ролей（RBAC），с поддержкой групп пользователей，прав чтения/записи на уровне каталогов и квот.
- **Аутентификация**：встроенные пароли учётных записей с проверкой TOTP，вход WebAuthn/FIDO，единый вход SSO и аутентификация в каталоге LDAP.
- **Усиление безопасности**：сессии JWT，защита от CSRF，защита от кликджекинга（X-Frame-Options），Content Security Policy（CSP）.
- **Проверки работоспособности**：предоставление пробы живости `/health` и пробы готовности `/healthz` для мониторинга и оповещений.

### Развёртывание

- **Платформы выполнения**：Cloudflare Workers，Tencent Cloud EdgeOne Makers，Vercel，Serverless и контейнерные среды Node.js.
- **Хранение данных**：Cloudflare D1（SQLite）как основное，также поддерживаются MySQL，MariaDB，PostgreSQL，SQL Server.
- **Постоянный кэш**：Cloudflare KV / EdgeOne Blob（необязательно）для сохранения конфигурации и кэширования.
- **Развёртывание в один клик**：поддержка кнопок развёртывания в один клик + инициализация на EdgeOne，Cloudflare Workers и других платформах.

---

## Ручное развёртывание

### Предварительные требования

- Node.js 18+
- Учётная запись Cloudflare（для развёртывания на Workers）

### Локальная разработка

```bash
# 1. Установить зависимости бэкенда
npm install

# 2. Установить зависимости фронтенда
npm run install:page

# 3. Настроить wrangler.jsonc（указать JWT_SECRET，привязки KV/D1）

# 4. Запустить сервер разработки бэкенда
npm run dev

# 5. Запустить сервер разработки фронтенда в другом терминале
npm run dev:page
```

### Развёртывание в продакшн

```bash
# Развёртывание в один клик（сборка фронтенда + развёртывание бэкенда на Cloudflare Workers）
npm run deploy
```

---

## Технологический стек

### Бэкенд

- **Среда выполнения**：Cloudflare Workers（Edge Computing）
- **Веб-фреймворк**：Hono.js
- **База данных**：Cloudflare D1（SQLite）/ поддержка MySQL，MariaDB，PostgreSQL，SQL Server
- **Кэш**：Cloudflare KV（необязательно）
- **Язык**：TypeScript
- **Инструменты сборки**：Wrangler，esbuild

### Фронтенд

- **Фреймворк**：React 19 + TypeScript
- **UI-библиотеки**：Ant Design / Material-UI
- **Инструмент сборки**：Vite

---

## Документация

- 📘 [Официальная документация](https://doc.oplist.org)
- 🌏 [Зеркало в Китае](https://doc.oplist.org.cn)
- ⚖️ [Условия использования](https://doc.oplist.org/terms)
- 🔒 [Политика конфиденциальности](https://doc.oplist.org/privacy)

## Поддержка

По общим вопросам обращайтесь на форум [_Discussions_](https://github.com/OpenListTeam/OpenList/discussions). **_Issues_ предназначены только для сообщений об ошибках и запросов функций.**

## Лицензия

`OpenList` — это программное обеспечение с открытым исходным кодом под лицензией [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt).

## Контакты

- [@GitHub](https://github.com/OpenListTeam)
- [Группа в Telegram](https://t.me/OpenListTeam)
- [Канал в Telegram](https://t.me/OpenListOfficial)

## Участники

Мы искренне благодарим автора исходного проекта [AlistGo/alist](https://github.com/AlistGo/alist)，[Xhofe](https://github.com/Xhofe)，и всех остальных участников.

Спасибо этим замечательным людям：

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
