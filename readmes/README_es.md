<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList es una herramienta de listado de directorios rica en funciones que admite el montaje de decenas de unidades en la nube con vista previa, descarga, uso compartido de archivos y más</em></p>
  <p>Este repositorio es el puerto oficial TypeScript + Serverless del proyecto <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a></p>
  <p>Se ejecuta en Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/build-verify.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/build-verify.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList-Worker?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/stargazers"><img src="https://img.shields.io/github/stars/OpenListTeam/OpenList-Worker?color=%23ED8936&logo=github" alt="Stars" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/forks"><img src="https://img.shields.io/github/forks/OpenListTeam/OpenList-Worker?color=%239F7AEA&logo=github" alt="Forks" /></a>

📘 [Documentación](https://doc.oplist.org) · 🌏 [Documentación (China continental)](https://doc.oplist.org.cn)  · ⚖️ [Términos de uso](https://doc.oplist.org/terms)  · 🔒 [Política de privacidad](https://doc.oplist.org/privacy)

</div>

<div align="center">

[English](README_en.md) | [简体中文](../README.md) | [繁體中文](README_zh-TW.md) | [日本語](README_ja.md) | [한국어](README_ko.md) | [Français](README_fr.md) | [Deutsch](README_de.md) 

[Português](README_pt.md) | [Русский](README_ru.md) | [العربية](README_ar.md) | [Italiano](README_it.md) | [हिन्दी](README_hi.md) | Español

[Proyecto upstream](https://github.com/OpenListTeam/OpenList) · [Guía de contribución](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CONTRIBUTING.md) · [Código de conducta](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CODE_OF_CONDUCT.md) · [Licencia](./LICENSE)

[🌎 Demo global](https://new.oplist.org) 　|　 [🇨🇳 Demo China](https://new.oplist.org.cn)

</div>

---

## Despliegue en un clic

Haz clic en el botón de abajo para desplegar este proyecto en la plataforma correspondiente con un clic:
<div align="center">


| EdgeOne Makers · Internacional | EdgeOne Makers · China | Cloudflare Workers · Global | Alibaba Cloud ESA · China |
| :---: | :---: | :---: | :---: |
| [![Desplegar en EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Desplegar en EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) | [![Desplegar en Alibaba Cloud ESA](assets/esa-deploy.svg)](https://esa.console.aliyun.com/edge/function/list) |

</div>

> [!IMPORTANT]
> - Si Cloudflare muestra `no se puede obtener el contenido del repositorio`, [bifurca](https://github.com/OpenListTeam/OpenList-Worker/fork) este proyecto primero y luego despliega conectándote al repositorio de Github
> - Para Alibaba Cloud ESA, importa este repositorio desde **Computación en el borde e IA → Funciones y Pages** en la consola
> - Configura `JWT_SECRET` durante el despliegue (≥16 caracteres) para firmar JWT y cifrar datos
> - El almacenamiento usa automáticamente el backend persistente de la plataforma (`DB_DRIVER=auto`) — sin configuración adicional; para el resto de variables consulta [Variables de entorno](https://doc.oplist.org/ecosystem/official_worker/guide_env)
> - Tras el despliegue, la primera visita abre el **asistente de instalación**: define la cuenta y la contraseña del administrador en el navegador para completar la inicialización (define `ADMIN_PASS` para omitirlo)


## Funciones

OpenList es un sistema de listado y gestión de archivos multi-almacenamiento que se ejecuta en plataformas de computación en el borde (edge). Unifica archivos dispersos en diferentes unidades en la nube, almacenamiento de objetos y servicios de protocolo en una sola interfaz para navegar, previsualizar, descargar y gestionar.

OpenList-Worker es el puerto oficial TypeScript + Serverless del proyecto [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList). El backend se ha reescrito de Go a un servicio TypeScript que se ejecuta en Workers, mientras que el frontend mantiene una interfaz y experiencia de interacción consistentes.

### Agregación de almacenamiento

**78 controladores de almacenamiento** integrados, listos para montar varios backends de almacenamiento:

- **Unidades en la nube domésticas**: Aliyundrive (Open/Share), Quark (Open/UC TV), Baidu Netdisk (Álbum), 115 (Open/Share), 123 Pan (Open/Share), Tianyi Cloud (189/PC/TV), China Mobile Cloud (139/Hecaiyun), Wopan, Thunder, Tencent Weiyun, Lanzou, PikPak (Share), Doubao, Guangyapan, Chaoxing Group, Lenovo NAS Share, Teambition, WPS Cloud, Alibaba Docs, HalalCloud, MediaTrack, etc.
- **Unidades en la nube internacionales**: Google Drive (Álbum), OneDrive (App/ShareLink), Dropbox, MEGA, MediaFire, Proton Drive, Yandex Disk, Degoo, Bunny Storage, TeraBox, etc.
- **Almacenamiento de objetos**: Compatible con S3 (AWS/OSS/COS/MinIO, etc.), Cloudflare R2 (Workers binding o API S3), UpYun USS, Azure Blob, WebDAV, FTP, SFTP, SMB, IPFS, etc.
- **Alojamiento de código**: GitHub, GitHub Releases, CNB Releases
- **Programas de unidad en la nube**: OpenList (Share), AList V3, Cloudreve V3/V4, Kodbox, Seafile, Teldrive, Febbox, etc.
- **Otros controladores**: Netease Music, Misskey, Emby, Cloudflare Image Hosting, etc.

Además de los almacenamientos reales anteriores, también se proporcionan controladores virtuales/funcionales como `Local`, `Alias`, `UrlTree`, `AutoIndex`, `Strm`, `Crypt`, `Virtual` y `Chunk` para montajes locales, alias de direcciones, listas de URL, almacenamiento cifrado y fragmentación.

### Capacidades principales

- **Gestión de archivos**: navegación unificada del árbol de directorios con vista previa en línea de imágenes, vídeos, audio, documentos, código y archivos; subida entre almacenamientos, descarga por lotes, streaming y redirección de enlace directo; enlaces compartidos con caducidad, contraseña y control de permisos.
- **Búsqueda y tareas**: búsqueda de texto completo en almacenamientos indexados; cola de tareas en segundo plano para operaciones por lotes y procesamiento asíncrono.
- **Interfaces externas**: WebDAV, protocolo compatible con S3 y endpoint MCP para asistentes de IA.
- **Acceso y autenticación**: RBAC (grupos de usuarios, permisos de lectura/escritura por directorio, cuotas), contraseñas de cuenta + TOTP / WebAuthn / SSO / LDAP.
- **Seguridad y operación**: sesiones JWT, protección CSRF, clickjacking (X-Frame-Options) y CSP, sondas `/health` y `/healthz`.
- **Deduplicación de solicitudes concurrentes**: las solicitudes idénticas de listado de directorios / metadatos llegan al disco upstream una sola vez; las demás reutilizan el resultado, reduciendo límites de tasa y consumo de CPU.
- **Plataformas de ejecución**: Cloudflare Workers, Tencent Cloud EdgeOne Makers, Alibaba Cloud ESA, Vercel / AWS Lambda y contenedores Node.js.
- **Almacenamiento de datos**: Cloudflare D1 (SQLite) como principal, además de KV / Blob / Durable Objects y MySQL / MariaDB externos.
- **Despliegue en un clic**: botones de despliegue de EdgeOne, Cloudflare Workers y Alibaba Cloud ESA + asistente de instalación.

---

## Despliegue manual

<details>
<summary>Ver requisitos, desarrollo local y despliegue en producción</summary>

### Requisitos previos

- Node.js 18+ (se recomienda pnpm)
- Una cuenta de Cloudflare (para desplegar en Workers)

### Desarrollo local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar los enlaces y variables en wrangler.jsonc según sea necesario (JWT_SECRET ver .dev.vars.example)

# 3. Iniciar el servidor de desarrollo (obtiene automáticamente el frontend oficial y ejecuta el Worker)
pnpm run dev:unified

# O ejecutar solo el Worker (sin obtener el frontend)
pnpm run dev:worker
```

### Despliegue en producción

```bash
# Despliegue en un clic: compilar el frontend → desplegar en Cloudflare Workers (los enlaces KV los aprovisiona wrangler automáticamente)
pnpm run deploy

# O desplegar directamente el Worker (omitir la compilación del frontend)
pnpm run deploy:worker
```

</details>

---

## Stack tecnológico

### Backend

- **Entorno de ejecución**: Cloudflare Workers / EdgeOne Functions / Alibaba Cloud ESA (Edge Computing)
- **Framework web**: Hono.js
- **Base de datos**: Cloudflare D1 (SQLite) / KV / Blob / Durable Objects o MySQL / MariaDB externo
- **Lenguaje**: TypeScript
- **Herramientas de build**: Wrangler, esbuild

### Frontend

- **Framework**: SolidJS + TypeScript (oficial [OpenList-Frontend](https://github.com/OpenListTeam/OpenList-Frontend))
- **Biblioteca UI**: Hope UI
- **Herramienta de build**: Vite

---

## Configuración del despliegue

Tras el despliegue, define las siguientes variables:

| Variable | Valor predeterminado | Descripción |
| :--- | :--- | :--- |
| `JWT_SECRET` | (ninguno) | Clave de firma JWT (≥16 caracteres) |
| `DB_FORMAT` | `map` | `map` (JSON) / `key` (por clave) / `sql` (relacional) |
| `DB_DRIVER` | `auto` | `auto` / `blob` / `cfkv` / `kv` / `d1` / `do` / `mysql` |
| `DB_CIPHER` | `none` | Cifrado en reposo de campos sensibles, por ejemplo `aes-256-gcm` |

Para la lista completa de variables, consulta [Variables de configuración](https://doc.oplist.org/ecosystem/official_worker/guide_env).

## Soporte

Si encuentras algún problema, hay ayuda disponible a través de los siguientes canales:

- 🐛 **Informes de errores o solicitudes de funciones**: visita [_Issues_](https://github.com/OpenListTeam/OpenList-Worker/issues)
- 💬 **Preguntas generales y discusión**: visita el foro de [_Discussions_](https://github.com/OpenListTeam/OpenList/discussions)

## Licencia

`OpenList` es software de código abierto bajo la licencia [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt).


## Contacto

🌐 [@GitHub](https://github.com/OpenListTeam) · ✈️ [Grupo de Telegram](https://t.me/OpenListTeam) · ✈️ [Canal de Telegram](https://t.me/OpenListOfficial)

## Colaboradores

Gracias a los siguientes proyectos y sus colaboradores:

- El autor y todos los colaboradores de [Alist](https://github.com/AlistGo/alist)
- El autor y todos los colaboradores de [OpenList](https://github.com/OpenListTeam/OpenList) (versión Go)
- Todos los colaboradores de este proyecto:

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
