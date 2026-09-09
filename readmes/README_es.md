<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList es una herramienta de listado de directorios rica en funciones que admite el montaje de decenas de unidades en la nube con vista previa, descarga, uso compartido de archivos y más</em></p>
  <p>Este repositorio es el puerto oficial TypeScript + Serverless del proyecto <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a></p>
  <p>Se ejecuta en Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/edgeone-artifact-guard.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/edgeone-artifact-guard.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList-Worker" alt="latest version" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList-Worker?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList-Worker/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>

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


| EdgeOne Makers · Internacional | EdgeOne Makers · China | Cloudflare Workers · Global |
| :---: | :---: | :---: |
| [![Desplegar en EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Desplegar en EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) |

</div>

> [!IMPORTANT]
> - Si Cloudflare muestra `no se puede obtener el contenido del repositorio`, [bifurca](https://github.com/OpenListTeam/OpenList-Worker/fork) este proyecto primero y luego despliega conectándote al repositorio de Github
> - Después del despliegue, configura las variables de entorno: **EdgeOne**: [Consola internacional](https://console.edgeone.ai/makers) · [Consola China](https://console.cloud.tencent.com/edgeone/makers); **Cloudflare**: [Panel de Worker](https://dash.cloudflare.com/). Variables de entorno:
>   - `DB_DRIVER`: modo de almacenamiento de datos: `json` (por defecto) / `d1` (Cloudflare) / `kv` / `mysql`
>   - `DB_JSON_BACKEND`: backend utilizado por el formato `json`: `blob` (por defecto) / `kv` / `cf_rest`
>   - Para otras variables opcionales, consulta la **guía de despliegue detallada**: [Cloudflare](https://doc.oplist.org/guide/installation/worker#deploy-to-cloudflare-workers) · [EdgeOne](https://doc.oplist.org/guide/installation/worker#deploy-to-edgeone) · [ESA](https://doc.oplist.org/guide/installation/worker#deploy-to-alibaba-cloud-esa)


## Funciones

OpenList es un sistema de listado y gestión de archivos multi-almacenamiento que se ejecuta en plataformas de computación en el borde (edge). Unifica archivos dispersos en diferentes unidades en la nube, almacenamiento de objetos y servicios de protocolo en una sola interfaz para navegar, previsualizar, descargar y gestionar.

OpenList-Worker es el puerto oficial TypeScript + Serverless del proyecto [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList). El backend se ha reescrito de Go a un servicio TypeScript que se ejecuta en Workers, mientras que el frontend mantiene una interfaz y experiencia de interacción consistentes.

### Agregación de almacenamiento

**78 controladores de almacenamiento** integrados, listos para montar varios backends de almacenamiento:

- **Unidades en la nube domésticas**: Aliyundrive (Open/Share), Quark (Open/UC TV), Baidu Netdisk (Álbum), 115 (Open/Share), 123 Pan (Open/Share), Tianyi Cloud (189/PC/TV), China Mobile Cloud (139/Hecaiyun), Wopan, Thunder, Tencent Weiyun, Lanzou, PikPak (Share), Doubao, Guangyapan, Chaoxing Group, Lenovo NAS Share, Teambition, WPS Cloud, Alibaba Docs, HalalCloud, MediaTrack, etc.
- **Unidades en la nube internacionales**: Google Drive (Álbum), OneDrive (App/ShareLink), Dropbox, MEGA, MediaFire, Proton Drive, Yandex Disk, Degoo, Bunny Storage, TeraBox, etc.
- **Almacenamiento de objetos**: Compatible con S3 (AWS/OSS/COS/MinIO, etc.), UpYun USS, Azure Blob, WebDAV, FTP, SFTP, SMB, IPFS, etc.
- **Alojamiento de código**: GitHub, GitHub Releases, CNB Releases
- **Programas de unidad en la nube**: OpenList (Share), AList V3, Cloudreve V3/V4, Kodbox, Seafile, Teldrive, Febbox, etc.
- **Otros controladores**: Netease Music, Misskey, Emby, Cloudflare Image Hosting, etc.

Además de los almacenamientos reales anteriores, también se proporcionan controladores virtuales/funcionales como `Local`, `Alias`, `UrlTree`, `AutoIndex`, `Strm`, `Crypt`, `Virtual` y `Chunk` para montajes locales, alias de direcciones, listas de URL, almacenamiento cifrado y fragmentación.

### Capacidades principales

- **Navegación de archivos**: navegación unificada del árbol de directorios, con vista previa en línea de imágenes, videos, audio, documentos, código, archivos y más.
- **Subida y descarga**: subida entre almacenamientos, descarga por lotes, transmisión y redirección de enlace directo.
- **Compartir archivos**: generar enlaces para compartir con caducidad, contraseña y control de permisos, admitiendo acceso anónimo y uso compartido de directorios.
- **Búsqueda de texto completo**: búsqueda rápida de archivos en almacenamientos indexados.
- **Tareas sin conexión**: cola de tareas en segundo plano que admite operaciones por lotes y procesamiento asíncrono.
- **Interfaces externas**: exponer el almacenamiento agregado mediante el protocolo WebDAV o compatible con S3 para montarlo en herramientas de terceros.
- **Servicio MCP**: proporcionar un endpoint de Model Context Protocol que puede integrarse e invocarse desde asistentes de IA y otros clientes.

### Gestión de accesos

- **Permisos**: control de acceso basado en roles (RBAC), que admite grupos de usuarios, permisos de lectura/escritura a nivel de directorio y cuotas.
- **Autenticación**: contraseñas de cuenta integradas con verificación TOTP, inicio de sesión WebAuthn/FIDO, inicio de sesión único SSO y autenticación de directorio LDAP.
- **Endurecimiento de seguridad**: sesiones JWT, protección CSRF, protección contra clickjacking (X-Frame-Options), Content Security Policy (CSP).
- **Comprobaciones de salud**: proporcionar una sonda de vida `/health` y una sonda de preparación `/healthz` para monitorización y alertas.

### Despliegue en plataformas

- **Plataformas de ejecución**: Cloudflare Workers, Tencent Cloud EdgeOne Makers, Vercel, Serverless y entornos de contenedores Node.js.
- **Almacenamiento de datos**: Cloudflare D1 (SQLite) como principal, también compatible con MySQL, MariaDB, PostgreSQL, SQL Server.
- **Caché persistente**: Cloudflare KV / EdgeOne Blob (opcional) para persistencia de configuración y caché.
- **Despliegue en un clic**: admite botones de despliegue en un clic + inicialización en EdgeOne, Cloudflare Workers y otras plataformas.

---

## Despliegue manual

### Requisitos previos

- Node.js 18+ (se recomienda pnpm)
- Una cuenta de Cloudflare (para desplegar en Workers)

### Desarrollo local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar wrangler.toml (rellenar JWT_SECRET, enlaces KV/D1)

# 3. Iniciar el servidor de desarrollo (obtiene automáticamente el frontend oficial y ejecuta el Worker)
pnpm run dev:unified

# O ejecutar solo el Worker (sin obtener el frontend)
pnpm run dev:worker
```

### Despliegue en producción

```bash
# Despliegue en un clic: asegurar que el namespace KV exista → obtener el frontend oficial → desplegar en Cloudflare Workers
pnpm run deploy

# O desplegar directamente el Worker (omitir la comprobación de KV y la compilación del frontend)
pnpm run deploy:worker
```

---

## Stack tecnológico

### Backend

- **Entorno de ejecución**: Cloudflare Workers (Edge Computing)
- **Framework web**: Hono.js
- **Base de datos**: Cloudflare D1 (SQLite) / compatible con MySQL, MariaDB, PostgreSQL, SQL Server
- **Caché**: Cloudflare KV (opcional)
- **Lenguaje**: TypeScript
- **Herramientas de build**: Wrangler, esbuild

### Frontend

- **Framework**: React 19 + TypeScript
- **Bibliotecas UI**: Ant Design / Material-UI
- **Herramienta de build**: Vite

---


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
