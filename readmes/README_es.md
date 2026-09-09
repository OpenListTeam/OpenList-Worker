<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList es una herramienta de listado de directorios que admite el montaje de múltiples unidades en la nube, con docenas de backends de almacenamiento en la nube, gestión de archivos, uso compartido y más.</em></p>

  <p>Este repositorio es el puerto oficial TypeScript + Serverless del proyecto <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a>.</p>
  <p>Se ejecuta en Cloudflare Workers / EdgeOne Cloud Function.</p>

<a href="https://github.com/OpenListTeam/OpenList/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList/actions?query=workflow%3ABuild"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList/build.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList" alt="latest version" /></a>

<a href="https://github.com/OpenListTeam/OpenList/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>

</div>

<div align="center">

[English](README_en.md) | [中文](../README.md) | [日本語](README_ja.md) | [한국어](README_ko.md) | [Français](README_fr.md) | [Deutsch](README_de.md) | Español（este archivo） | [Português](README_pt.md) | [Русский](README_ru.md) | [العربية](README_ar.md) | [Italiano](README_it.md)

[Proyecto upstream](https://github.com/OpenListTeam/OpenList) · [Guía de contribución](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CONTRIBUTING.md) · [Código de conducta](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CODE_OF_CONDUCT.md) · [Licencia](../LICENSE)

[🌎 Demo global](https://new.oplist.org) 　|　 [🇨🇳 Demo China](https://new.oplist.org.cn)

</div>

---

## Despliegue en un clic

Haz clic en el botón de abajo para desplegar este proyecto en la plataforma correspondiente con un clic：

<div align="center">

| EdgeOne Makers · Internacional | EdgeOne Makers · China | Cloudflare Workers · Global |
| :---: | :---: | :---: |
| [![Desplegar en EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Desplegar en EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Desplegar en Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) |

</div>

> [!IMPORTANT]
> Después del despliegue, la primera visita al sitio lanzará automáticamente el **asistente de instalación**：
>
> Variables de entorno / secretos opcionales：
> - `ENCRYPTION_SECRET`：clave de cifrado estática（se recomiendan ≥16 caracteres；se usa para cifrar campos sensibles）
> - `JWT_SECRET`：clave de firma JWT（recomendada；se autogenera y persiste en KV si no se configura）
> - `CRON_SECRET`：clave de autenticación para tareas de actualización programadas（opcional，solo necesaria para tareas programadas de EdgeOne）

## Funciones

OpenList-Worker es un sistema de listado y gestión de archivos multi-almacenamiento que se ejecuta en plataformas de computación en el borde（edge），unificando archivos dispersos en diferentes unidades en la nube，almacenamiento de objetos y servicios de protocolo en una sola interfaz para navegar，previsualizar，descargar y gestionar.

### Acerca del puerto TS

OpenList-Worker es el puerto TypeScript del proyecto oficial [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList).

El backend se ha reescrito de Go a un servicio TypeScript que se ejecuta en Workers，mientras que el frontend mantiene una interfaz y experiencia de interacción consistentes.

### Agregación de almacenamiento

**Más de 80 controladores de almacenamiento** integrados，listos para montar varios backends de almacenamiento：

| Categoría | Backends compatibles |
| :--- | :--- |
| Unidades en la nube domésticas | Aliyundrive（Open/Share），Quark，Baidu Netdisk，115，123 Pan，Thunder，Tianyi Cloud（189），Tencent Weiyun，Lanzou，PikPak，UC Cloud，China Mobile Cloud，139 Cloud，Doubao，Wopan，Tianyi Family Cloud，LeTV Cloud，etc. |
| Unidades en la nube internacionales | Google Drive，OneDrive（App/ShareLink），Dropbox，MEGA，MediaFire，Proton Drive，Yandex Disk，Degoo，Bunny Storage，TeraBox，etc. |
| Almacenamiento de objetos | Compatible con S3（AWS/OSS/COS/MinIO，etc.），WebDAV，FTP，SFTP，SMB，IPFS，Azure Blob，etc. |
| Alojamiento de código | GitHub，GitHub Releases，CNB Releases |
| Programas de unidad en la nube | OpenList / AList V3，Cloudreve V3/V4，Kodbox，Seafile，Teldrive，Febbox，etc. |
| Otros controladores | Netease Music，Misskey，Emby，compartir 115，compartir Aliyundrive，compartir Quark，etc. |

Además de los almacenamientos reales anteriores，también se proporcionan controladores virtuales/funcionales como `Local`，`Alias`，`UrlTree`，`AutoIndex`，`Strm`，`Crypt`，`Virtual` y `Chunk` para montajes locales，alias de direcciones，listas de URL，almacenamiento cifrado y fragmentación.

### Capacidades principales

- **Navegación de archivos**：navegación unificada del árbol de directorios，con vista previa en línea de imágenes，videos，audio，documentos，código，archivos y más.
- **Subida y descarga**：subida entre almacenamientos，descarga por lotes，transmisión y redirección de enlace directo.
- **Compartir archivos**：generar enlaces para compartir con caducidad，contraseña y control de permisos，admitiendo acceso anónimo y uso compartido de directorios.
- **Búsqueda de texto completo**：búsqueda rápida de archivos en almacenamientos indexados.
- **Tareas sin conexión**：cola de tareas en segundo plano que admite operaciones por lotes y procesamiento asíncrono.
- **Interfaces externas**：exponer el almacenamiento agregado mediante el protocolo WebDAV o compatible con S3 para montarlo en herramientas de terceros.
- **Servicio MCP**：proporcionar un endpoint de Model Context Protocol que puede integrarse e invocarse desde asistentes de IA y otros clientes.

### Gestión de accesos

- **Permisos**：control de acceso basado en roles（RBAC），que admite grupos de usuarios，permisos de lectura/escritura a nivel de directorio y cuotas.
- **Autenticación**：contraseñas de cuenta integradas con verificación TOTP，inicio de sesión WebAuthn/FIDO，inicio de sesión único SSO y autenticación de directorio LDAP.
- **Endurecimiento de seguridad**：sesiones JWT，protección CSRF，protección contra clickjacking（X-Frame-Options），Content Security Policy（CSP）.
- **Comprobaciones de salud**：proporcionar una sonda de vida `/health` y una sonda de preparación `/healthz` para monitorización y alertas.

### Despliegue

- **Plataformas de ejecución**：Cloudflare Workers，Tencent Cloud EdgeOne Makers，Vercel，Serverless y entornos de contenedores Node.js.
- **Almacenamiento de datos**：Cloudflare D1（SQLite）como principal，también compatible con MySQL，MariaDB，PostgreSQL，SQL Server.
- **Caché persistente**：Cloudflare KV / EdgeOne Blob（opcional）para persistencia de configuración y caché.
- **Despliegue en un clic**：admite botones de despliegue en un clic + inicialización en EdgeOne，Cloudflare Workers y otras plataformas.

---

## Despliegue manual

### Requisitos previos

- Node.js 18+
- Una cuenta de Cloudflare（para desplegar en Workers）

### Desarrollo local

```bash
# 1. Instalar dependencias del backend
npm install

# 2. Instalar dependencias del frontend
npm run install:page

# 3. Configurar wrangler.jsonc（rellenar JWT_SECRET，enlaces KV/D1）

# 4. Iniciar el servidor de desarrollo del backend
npm run dev

# 5. Iniciar el servidor de desarrollo del frontend en otra terminal
npm run dev:page
```

### Despliegue en producción

```bash
# Despliegue en un clic（build del frontend + despliegue del backend en Cloudflare Workers）
npm run deploy
```

---

## Stack tecnológico

### Backend

- **Entorno de ejecución**：Cloudflare Workers（Edge Computing）
- **Framework web**：Hono.js
- **Base de datos**：Cloudflare D1（SQLite）/ compatible con MySQL，MariaDB，PostgreSQL，SQL Server
- **Caché**：Cloudflare KV（opcional）
- **Lenguaje**：TypeScript
- **Herramientas de build**：Wrangler，esbuild

### Frontend

- **Framework**：React 19 + TypeScript
- **Bibliotecas UI**：Ant Design / Material-UI
- **Herramienta de build**：Vite

---

## Documentación

- 📘 [Documentación oficial](https://doc.oplist.org)
- 🌏 [Espejo de China](https://doc.oplist.org.cn)
- ⚖️ [Términos de uso](https://doc.oplist.org/terms)
- 🔒 [Política de privacidad](https://doc.oplist.org/privacy)

## Soporte

Para preguntas generales，visita el foro de [_Discussions_](https://github.com/OpenListTeam/OpenList/discussions). **_Issues_ es solo para informes de errores y solicitudes de funciones.**

## Licencia

`OpenList` es software de código abierto bajo la licencia [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt).

## Contacto

- [@GitHub](https://github.com/OpenListTeam)
- [Grupo de Telegram](https://t.me/OpenListTeam)
- [Canal de Telegram](https://t.me/OpenListOfficial)

## Colaboradores

Agradecemos sinceramente al autor del proyecto original [AlistGo/alist](https://github.com/AlistGo/alist)，[Xhofe](https://github.com/Xhofe)，y a todos los demás colaboradores.

Gracias a estas personas estupendas：

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
