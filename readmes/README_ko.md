<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList는 여러 클라우드 드라이브를 마운트할 수 있는 디렉터리 목록 도구로, 수십 가지 클라우드 스토리지 마운트, 파일 관리, 공유 등을 지원합니다.</em></p>

  <p>이 저장소는 공식 <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a> 프로젝트의 TypeScript + Serverless 포팅 버전입니다.</p>
  <p>Cloudflare Workers / EdgeOne Cloud Function에서 실행됩니다.</p>

<a href="https://github.com/OpenListTeam/OpenList/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList/actions?query=workflow%3ABuild"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList/build.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList" alt="latest version" /></a>

<a href="https://github.com/OpenListTeam/OpenList/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>

</div>

<div align="center">

[English](README_en.md) | [简体中文](../README.md) | [繁體中文](README_zh-TW.md) | [日本語](README_ja.md) | 한국어 | [Français](README_fr.md) | [Deutsch](README_de.md)

[Português](README_pt.md) | [Русский](README_ru.md) | [العربية](README_ar.md) | [Italiano](README_it.md) | [हिन्दी](README_hi.md) | [Español](README_es.md)

[업스트림 프로젝트](https://github.com/OpenListTeam/OpenList) · [기여 가이드](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CONTRIBUTING.md) · [행동 강령](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CODE_OF_CONDUCT.md) · [라이선스](../LICENSE)

[🌎 글로벌 데모](https://new.oplist.org) 　|　 [🇨🇳 중국 데모](https://new.oplist.org.cn)

</div>

---

## 원클릭 배포

아래 버튼을 클릭하면 해당 플랫폼에 이 프로젝트를 원클릭으로 배포할 수 있습니다：

<div align="center">

| EdgeOne Makers · 국제 | EdgeOne Makers · 중국 | Cloudflare Workers · 글로벌 |
| :---: | :---: | :---: |
| [![EdgeOne에 배포](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![EdgeOne에 배포](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Cloudflare Workers에 배포](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) |

</div>

> [!IMPORTANT]
> 배포 후 사이트에 처음 접속하면 자동으로 **설치 마법사**가 시작됩니다：
>
> 선택적 환경 변수 / 시크릿：
> - `ENCRYPTION_SECRET`：정적 암호화 키（16자 이상 권장；민감 필드 암호화에 사용）
> - `JWT_SECRET`：JWT 서명 키（권장；미설정 시 자동 생성되어 KV에 영속화）
> - `CRON_SECRET`：예약 새로고침 작업 인증 키（선택；EdgeOne 예약 작업에만 필요）

## 기능 소개

OpenList-Worker는 엣지 컴퓨팅 플랫폼에서 실행되는 다중 스토리지 집계 파일 목록 및 관리 시스템으로, 여러 클라우드 드라이브, 오브젝트 스토리지, 프로토콜 서비스에 분산된 파일을 하나의 인터페이스에서 탐색, 미리보기, 다운로드, 관리할 수 있습니다.

### TS 포팅 소개

OpenList-Worker는 공식 [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList) 프로젝트의 TypeScript 포팅 버전입니다.

백엔드를 Go에서 Workers에서 실행되는 TypeScript 서비스로 재작성했으며, 프런트엔드는 일관된 인터페이스와 상호작용 경험을 유지합니다.

### 스토리지 집계

**80개 이상의 스토리지 드라이버**를 내장하여 다양한 스토리지 백엔드를 즉시 마운트할 수 있습니다：

| 분류 | 지원 백엔드 |
| :--- | :--- |
| 국내 클라우드 드라이브 | Aliyundrive（Open/Share）, Quark, Baidu Netdisk, 115, 123 Pan, Thunder, Tianyi Cloud（189）, Tencent Weiyun, Lanzou, PikPak, UC Cloud, China Mobile Cloud, 139 Cloud, Doubao, Wopan, Tianyi Family Cloud, LeTV Cloud 등 |
| 해외 클라우드 드라이브 | Google Drive, OneDrive（App/ShareLink）, Dropbox, MEGA, MediaFire, Proton Drive, Yandex Disk, Degoo, Bunny Storage, TeraBox 등 |
| 오브젝트 스토리지 | S3 호환（AWS/OSS/COS/MinIO 등）, WebDAV, FTP, SFTP, SMB, IPFS, Azure Blob 등 |
| 코드 호스팅 | GitHub, GitHub Releases, CNB Releases |
| 클라우드 드라이브 프로그램 | OpenList / AList V3, Cloudreve V3/V4, Kodbox, Seafile, Teldrive, Febbox 등 |
| 기타 드라이버 | Netease Music, Misskey, Emby, 115 Share, Aliyundrive Share, Quark Share 등 |

위의 실제 스토리지 외에도 `Local`, `Alias`, `UrlTree`, `AutoIndex`, `Strm`, `Crypt`, `Virtual`, `Chunk` 등의 가상·기능 드라이버를 제공하여 로컬 마운트, 주소 별칭, URL 목록, 암호화 스토리지, 청크 분할 등의 시나리오를 지원합니다.

### 핵심 기능

- **파일 탐색**：통합된 디렉터리 트리 탐색. 이미지, 동영상, 오디오, 문서, 코드, 압축 파일 등 온라인 미리보기 지원.
- **업로드·다운로드**：스토리지 간 업로드, 일괄 다운로드, 스트리밍, 다이렉트 링크 리다이렉트.
- **파일 공유**：유효기간·비밀번호·권한 제어가 포함된 공유 링크 생성. 익명 액세스 및 디렉터리 공유 지원.
- **전체 텍스트 검색**：인덱싱된 스토리지에서 파일을 빠르게 검색.
- **오프라인 작업**：백그라운드 작업 큐로 일괄 작업 및 비동기 처리 지원.
- **외부 인터페이스**：집계 스토리지를 WebDAV 또는 S3 호환 프로토콜로 노출하여 타사 도구에 마운트 가능.
- **MCP 서비스**：Model Context Protocol 엔드포인트를 제공하여 AI 어시스턴트 등의 클라이언트에서 통합·호출 가능.

### 권한 관리

- **권한**：역할 기반 접근 제어（RBAC）. 사용자 그룹, 디렉터리 수준 읽기·쓰기 권한 및 할당량 지원.
- **인증**：내장 계정 비밀번호에 더해 TOTP 검증, WebAuthn/FIDO 로그인, SSO 싱글 사인온, LDAP 디렉터리 인증 지원.
- **보안 강화**：JWT 세션, CSRF 방지, 클릭재킹 방지（X-Frame-Options）, Content Security Policy（CSP）.
- **헬스 체크**：`/health` 라이브니스 프로브와 `/healthz` 레디니스 프로브를 제공하여 모니터링·알림에 활용.

### 배포

- **실행 플랫폼**：Cloudflare Workers, Tencent Cloud EdgeOne Makers, Vercel, Serverless, Node.js 컨테이너 환경.
- **데이터 스토리지**：Cloudflare D1（SQLite）을 주로 사용하며 MySQL, MariaDB, PostgreSQL, SQL Server도 지원.
- **영속 캐시**：Cloudflare KV / EdgeOne Blob（선택）. 설정 영속화 및 캐시에 사용.
- **원클릭 배포**：EdgeOne, Cloudflare Workers 등 플랫폼에서 원클릭 배포 버튼 + 초기화 지원.

---

## 수동 배포

### 사전 요구 사항

- Node.js 18+
- Cloudflare 계정（Workers 배포용）

### 로컬 개발

```bash
# 1. 백엔드 의존성 설치
npm install

# 2. 프런트엔드 의존성 설치
npm run install:page

# 3. wrangler.jsonc 설정（JWT_SECRET, KV/D1 바인딩 입력）

# 4. 백엔드 개발 서버 시작
npm run dev

# 5. 다른 터미널에서 프런트엔드 개발 서버 시작
npm run dev:page
```

### 프로덕션 배포

```bash
# 원클릭 배포（프런트엔드 빌드 + 백엔드를 Cloudflare Workers에 배포）
npm run deploy
```

---

## 기술 스택

### 백엔드

- **실행 환경**：Cloudflare Workers（Edge Computing）
- **웹 프레임워크**：Hono.js
- **데이터베이스**：Cloudflare D1（SQLite）/ MySQL, MariaDB, PostgreSQL, SQL Server 지원
- **캐시**：Cloudflare KV（선택）
- **언어**：TypeScript
- **빌드 도구**：Wrangler, esbuild

### 프런트엔드

- **프레임워크**：React 19 + TypeScript
- **UI 라이브러리**：Ant Design / Material-UI
- **빌드 도구**：Vite

---

## 문서

- 📘 [공식 문서](https://doc.oplist.org)
- 🌏 [중국 미러](https://doc.oplist.org.cn)
- ⚖️ [이용 약관](https://doc.oplist.org/terms)
- 🔒 [개인정보 처리방침](https://doc.oplist.org/privacy)

## 지원

일반적인 질문은 [_Discussions_](https://github.com/OpenListTeam/OpenList/discussions) 포럼을 방문해 주세요. **_Issues_는 버그 리포트 및 기능 요청 전용입니다.**

## 라이선스

`OpenList`는 [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt) 라이선스 하에 제공되는 오픈소스 소프트웨어입니다.

## 문의하기

- [@GitHub](https://github.com/OpenListTeam)
- [Telegram 그룹](https://t.me/OpenListTeam)
- [Telegram 채널](https://t.me/OpenListOfficial)

## 기여자

원 프로젝트 [AlistGo/alist](https://github.com/AlistGo/alist)의 저자 [Xhofe](https://github.com/Xhofe)와 모든 기여자분들께 진심으로 감사드립니다.

이 훌륭한 분들께 감사드립니다：

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
