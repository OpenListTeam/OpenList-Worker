<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList는 다양한 기능을 갖춘 디렉터리 목록 도구로, 수십 가지 클라우드 드라이브 마운트와 파일 미리보기/다운로드/공유 등을 지원합니다</em></p>
  <p>이 저장소는 공식 <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a> 프로젝트의 TypeScript + Serverless 아키텍처 포팅 버전입니다</p>
  <p>Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA에서 실행됩니다</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/build-verify.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/build-verify.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList-Worker" alt="latest version" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList-Worker?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList-Worker/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>

📘 [사용 문서](https://doc.oplist.org) · 🌏 [사용 문서（중국 본토）](https://doc.oplist.org.cn)  · ⚖️ [이용 약관](https://doc.oplist.org/terms)  · 🔒 [개인정보 처리방침](https://doc.oplist.org/privacy)

</div>

<div align="center">

[English](README_en.md) | [简体中文](../README.md) | [繁體中文](README_zh-TW.md) | [日本語](README_ja.md) | 한국어 | [Français](README_fr.md) | [Deutsch](README_de.md) 

[Português](README_pt.md) | [Русский](README_ru.md) | [العربية](README_ar.md) | [Italiano](README_it.md) | [हिन्दी](README_hi.md) | [Español](README_es.md)

[업스트림 프로젝트](https://github.com/OpenListTeam/OpenList) · [기여 가이드](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CONTRIBUTING.md) · [행동 강령](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CODE_OF_CONDUCT.md) · [라이선스](./LICENSE)

[🌎 글로벌 데모](https://new.oplist.org) 　|　 [🇨🇳 중국 데모](https://new.oplist.org.cn)

</div>

---

## 원클릭 배포

아래 버튼을 클릭하면 해당 플랫폼에 이 프로젝트를 원클릭으로 배포할 수 있습니다：
<div align="center">


| EdgeOne Makers · 국제 | EdgeOne Makers · 중국 | Cloudflare Workers · 글로벌 | Alibaba Cloud ESA · 중국 |
| :---: | :---: | :---: | :---: |
| [![EdgeOne에 배포](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![EdgeOne에 배포](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) | [![Alibaba Cloud ESA에 배포](assets/esa-deploy.svg)](https://esa.console.aliyun.com/edge/function/list) |

</div>

> [!IMPORTANT]
> - Cloudflare에서 `저장소 콘텐츠를 가져올 수 없습니다`라고 표시되면, 먼저 이 프로젝트를 [Fork](https://github.com/OpenListTeam/OpenList-Worker/fork)한 다음 Github 저장소 연결 기능으로 배포하세요
> - Alibaba Cloud ESA의 경우 콘솔의 **엣지 컴퓨팅 및 AI → 함수 및 Pages**에서 이 저장소를 가져오세요. 저장소의 `esa.jsonc`에 설치, 빌드, 정적 자산 디렉터리 설정이 이미 포함되어 있습니다. 배포 후 `JWT_SECRET`과 `KV_NAMESPACE`(기본값 `openlist`)를 설정하고, 동일한 이름의 EdgeKV 네임스페이스를 미리 생성하세요
> - 배포 시 `JWT_SECRET`(16자 이상의 임의 문자열, 예: `openssl rand -hex 32`)을 입력하세요. JWT 서명과 데이터 암호화에 사용되며, 미설정 시 초기화 단계에서 자동 생성·영구 저장됩니다
> - 데이터 저장은 플랫폼 내장 영구 저장소를 자동으로 선택합니다(`DB_DRIVER=auto`) — 대부분 설정이 필요 없으며, 나머지 변수는 [환경 변수](https://doc.oplist.org/ecosystem/official_worker/guide_env)를 참고하세요
> - 배포 후 첫 방문 시 **설치 마법사**가 열립니다. 브라우저에서 관리자 계정과 비밀번호를 설정하면 초기화가 완료됩니다(`ADMIN_PASS`를 설정하면 마법사를 건너뜁니다)


## 기능 소개

OpenList는 엣지 컴퓨팅 플랫폼에서 실행되는 다중 스토리지 집계 파일 목록 및 관리 시스템으로, 여러 클라우드 드라이브, 오브젝트 스토리지, 프로토콜 서비스에 분산된 파일을 하나의 인터페이스에 통합하여 탐색, 미리보기, 다운로드, 관리할 수 있습니다.

OpenList-Worker는 공식 [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList) 프로젝트의 TypeScript + Serverless 포팅 버전으로, 백엔드를 Go에서 Workers에서 실행되는 TypeScript 서비스로 재작성했으며, 프런트엔드는 일관된 인터페이스와 상호작용 경험을 유지합니다.

### 스토리지 집계

**78개의 스토리지 드라이버**를 내장하여 다양한 스토리지 백엔드를 즉시 마운트할 수 있습니다：

- **국내 클라우드 드라이브**：Aliyundrive（오픈 플랫폼/공유）、Quark（오픈 플랫폼/UC TV）、Baidu Netdisk（앨범）、115（오픈 플랫폼/공유）、123 Pan（오픈 플랫폼/공유）、Tianyi Cloud（189/PC/TV）、China Mobile Cloud（139/Hecaiyun）、Wopan、Thunder、Tencent Weiyun、Lanzou、PikPak（공유）、Doubao、Guangyapan、Chaoxing Group、Lenovo NAS 공유、Teambition、WPS Cloud、Alibaba Docs、HalalCloud、MediaTrack 등
- **국제 클라우드 드라이브**：Google Drive（앨범）、OneDrive（앱/공유 링크）、Dropbox、MEGA、MediaFire、Proton Drive、Yandex Disk、Degoo、Bunny Storage、TeraBox 등
- **오브젝트 스토리지**：S3 호환（AWS/OSS/COS/MinIO 등）、Cloudflare R2（Workers 바인딩 또는 S3 API）、UpYun USS、Azure Blob、WebDAV、FTP、SFTP、SMB、IPFS 등
- **코드 호스팅**：GitHub、GitHub Releases、CNB Releases
- **클라우드 드라이브 프로그램**：OpenList（공유）、AList V3、Cloudreve V3/V4、Kodbox、Seafile、Teldrive、Febbox 등
- **기타 드라이버**：Netease Music、Misskey、Emby、Cloudflare 이미지 호스팅 등

위의 실제 스토리지 외에도 `Local`、`Alias`、`UrlTree`、`AutoIndex`、`Strm`、`Crypt`、`Virtual`、`Chunk` 등의 가상/기능 드라이버를 제공하여 로컬 마운트, 주소 별칭, URL 목록, 암호화 스토리지, 청크 분할 등의 시나리오를 지원합니다.

### 핵심 기능

- **파일 탐색**：통합된 디렉터리 트리 탐색. 이미지, 동영상, 오디오, 문서, 코드, 압축 파일 등의 온라인 미리보기 지원.
- **업로드·다운로드**：스토리지 간 업로드, 일괄 다운로드, 스트리밍, 다이렉트 링크 리다이렉트.
- **파일 공유**：유효기간·비밀번호·권한 제어가 포함된 공유 링크 생성. 익명 액세스 및 디렉터리 공유 지원.
- **전체 텍스트 검색**：인덱싱된 스토리지에서 파일을 빠르게 검색.
- **오프라인 작업**：백그라운드 작업 큐로 일괄 작업 및 비동기 처리 지원.
- **외부 인터페이스**：집계 스토리지를 WebDAV 또는 S3 호환 프로토콜로 노출하여 타사 도구에 마운트 가능.
- **MCP 서비스**：Model Context Protocol 엔드포인트를 제공하여 AI 어시스턴트 등의 클라이언트에서 통합·호출 가능.
- **동시 요청 중복 제거**：같은 순간의 동일한 디렉터리 목록 / 메타데이터 요청은 업스트림 드라이브에 한 번만 전달되고, 나머지 요청은 같은 결과를 재사용하여 불필요한 속도 제한과 CPU 소모를 피합니다.

### 권한 관리

- **권한 관리**：역할 기반 접근 제어（RBAC）. 사용자 그룹, 디렉터리 수준 읽기·쓰기 권한 및 할당량 지원.
- **인증 방식**：내장 계정 비밀번호에 더해 TOTP 검증, WebAuthn/FIDO 로그인, SSO 싱글 사인온, LDAP 디렉터리 인증 지원.
- **보안 강화**：JWT 세션, CSRF 방지, 클릭재킹 방지（X-Frame-Options）, 콘텐츠 보안 정책（CSP）.
- **헬스 체크**：`/health` 라이브니스 프로브와 `/healthz` 레디니스 프로브를 제공하여 모니터링·알림에 활용.

### 플랫폼 배포

- **실행 플랫폼**：Cloudflare Workers、Tencent Cloud EdgeOne Makers、Alibaba Cloud ESA、Vercel / AWS Lambda 및 Node.js 컨테이너 환경.
- **데이터 스토리지**：Cloudflare D1（SQLite）을 주로 사용하며 KV / Blob / Durable Objects 및 외부 MySQL / MariaDB도 지원.
- **원클릭 배포**：EdgeOne、Cloudflare Workers、Alibaba Cloud ESA 배포 진입점 + 설치 마법사.

---

## 수동 배포

### 사전 요구 사항

- Node.js 18+（pnpm 권장）
- Cloudflare 계정（Workers 배포용）

### 로컬 개발

```bash
# 1. 의존성 설치
pnpm install

# 2. 필요에 따라 wrangler.jsonc의 바인딩과 변수 설정（JWT_SECRET은 .dev.vars.example 참고）

# 3. 개발 서버 시작（공식 프런트엔드를 자동으로 가져와 Worker 실행）
pnpm run dev:unified

# 또는 Worker만 실행（프런트엔드를 가져오지 않음）
pnpm run dev:worker
```

### 프로덕션 배포

```bash
# 원클릭 배포：프런트엔드 빌드 → Cloudflare Workers에 배포（KV 바인딩은 wrangler가 자동으로 프로비저닝）
pnpm run deploy

# 또는 Worker 직접 배포（프런트엔드 빌드 건너뜀）
pnpm run deploy:worker
```

---

## 기술 스택

### 백엔드

- **실행 환경**：Cloudflare Workers / EdgeOne Functions / Alibaba Cloud ESA（Edge Computing）
- **웹 프레임워크**：Hono.js
- **데이터베이스**：Cloudflare D1（SQLite）/ KV / Blob / Durable Objects 또는 외부 MySQL / MariaDB
- **언어**：TypeScript
- **빌드 도구**：Wrangler、esbuild

### 프런트엔드

- **프레임워크**：SolidJS + TypeScript（공식 [OpenList-Frontend](https://github.com/OpenListTeam/OpenList-Frontend)）
- **UI 라이브러리**：Hope UI
- **빌드 도구**：Vite

---

## 설정

배포 후 **사이트 첫 방문 시 설치 마법사가 자동으로 열립니다**. 브라우저에서 관리자 계정과 비밀번호를 설정하면 초기화가 완료됩니다. 마법사를 건너뛰려면 `ADMIN_PASS`를 설정하면 관리자가 자동으로 초기화됩니다.

대부분의 배포는 **추가 설정이 필요하지 않습니다**. 데이터 저장은 기본적으로 `DB_DRIVER=auto`를 사용하여 사용 가능한 영구 백엔드（Cloudflare Workers → KV / D1 / DO, EdgeOne / ESA → Blob）를 자동으로 선택합니다. 명시적으로 설정할 가치가 있는 유일한 변수는 다음과 같습니다.

| 변수 | 설명 |
| :--- | :--- |
| `JWT_SECRET` | JWT 토큰 서명 키（≥16자, `openssl rand -hex 32` 권장）. cron 작업 인증에도 사용됩니다. 미설정 시 초기화 단계에서 자동 생성·영구 저장됩니다 |

> `JWT_SECRET`은 **Secret**(일반 변수가 아님)으로 설정하세요. 일반 변수는 재배포 시 저장소 설정으로 덮어쓸 수 있지만 Secret은 그렇지 않습니다.

나머지 변수에는 합리적인 기본값이 있습니다.

| 변수 | 기본값 | 설명 |
| :--- | :--- | :--- |
| `ADMIN_PASS` | — | 설치 마법사를 건너뛰고 이 비밀번호로 관리자를 자동 초기화 |
| `DB_FORMAT` | `map` | 저장 형식：`map`(전체 JSON 객체) / `key`(키별) / `sql`(관계형 테이블, Go 백엔드 호환) |
| `DB_DRIVER` | `auto` | 저장 드라이버：`auto` / `blob` / `cfkv` / `kv` / `d1` / `do` / `mysql`; 명시적으로 지정한 드라이버는 자동으로 대체되지 않음 |
| `DB_CIPHER` | `none` | 민감 필드 저장 시 암호화(기본 미암호화), 예: `aes-256-gcm` |
| `ALLOW_URLS` | — | CORS 허용 목록(쉼표 구분, 미설정 시 동일 출처만 허용) |
| `MAX_UPLOAD` / `MAX_UPPART` | 26214400 / 16777216 | 전체 업로드 / 멀티파트 청크 최대 크기(바이트) |
| `ASSET_URLS` | — | 프런트엔드 정적 자산 CDN 주소, `$version` 자리표시자 지원 |

디렉터리 목록과 다운로드 직링크는 항상 드라이브에서 직접 가져오며 요청 간 캐시가 없습니다(`CACHE_*` 변수 없음). 따라서 외부 변경 사항이 즉시 반영됩니다.

전체 환경 변수(필드 암호화 `DB_CIPHER`, `cfkv` / MySQL 연결 설정 등)와 플랫폼별 배포 단계는 문서 사이트를 참고하세요.

- [환경 변수](https://doc.oplist.org/ecosystem/official_worker/guide_env)
- [배포](https://doc.oplist.org/ecosystem/official_worker/guide)
- [FAQ](https://doc.oplist.org/ecosystem/official_worker/about)

## 도움말

사용 중 문제가 발생하면 다음 채널을 통해 도움을 받을 수 있습니다：

- 🐛 **버그 신고 또는 기능 요청**：[_Issues_](https://github.com/OpenListTeam/OpenList-Worker/issues)로 이동
- 💬 **일반 질문 및 소통**：[_Discussions_](https://github.com/OpenListTeam/OpenList/discussions) 포럼으로 이동

## 라이선스

`OpenList`는 [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt) 라이선스 하에 제공되는 오픈소스 소프트웨어입니다.


## 문의하기

🌐 [@GitHub](https://github.com/OpenListTeam) · ✈️ [Telegram 그룹](https://t.me/OpenListTeam) · ✈️ [Telegram 채널](https://t.me/OpenListOfficial)

## 기여자

다음 프로젝트와 그 기여자들에게 감사드립니다：

- [Alist](https://github.com/AlistGo/alist) 프로젝트 작성자 및 모든 기여자
- [OpenList](https://github.com/OpenListTeam/OpenList)（Go 버전）프로젝트 작성자 및 모든 기여자
- 이 프로젝트의 모든 기여자：

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
