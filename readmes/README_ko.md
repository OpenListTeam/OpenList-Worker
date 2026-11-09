<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList는 다양한 기능을 갖춘 디렉터리 목록 도구로, 수십 가지 클라우드 드라이브 마운트와 파일 미리보기/다운로드/공유 등을 지원합니다</em></p>
  <p>이 저장소는 공식 <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a> 프로젝트의 TypeScript + Serverless 아키텍처 포팅 버전입니다</p>
  <p>Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA에서 실행됩니다</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/build-verify.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/build-verify.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList-Worker?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/stargazers"><img src="https://img.shields.io/github/stars/OpenListTeam/OpenList-Worker?color=%23ED8936&logo=github" alt="Stars" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/forks"><img src="https://img.shields.io/github/forks/OpenListTeam/OpenList-Worker?color=%239F7AEA&logo=github" alt="Forks" /></a>

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
> - Alibaba Cloud ESA의 경우 콘솔의 **엣지 컴퓨팅 및 AI → 함수 및 Pages**에서 이 저장소를 가져오세요
> - 배포 시 `JWT_SECRET`(≥16자)을 설정하세요. JWT 서명과 암호화에 사용됩니다
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

- **파일 관리**：통합 디렉터리 트리 탐색과 이미지 / 동영상 / 오디오 / 문서 / 코드 / 압축 파일 온라인 미리보기；스토리지 간 업로드, 일괄 다운로드, 스트리밍, 다이렉트 링크 리다이렉트；유효기간·비밀번호·권한 제어가 포함된 공유 링크.
- **검색 및 작업**：인덱싱된 스토리지의 전체 텍스트 검색；일괄 작업과 비동기 처리를 위한 백그라운드 작업 큐.
- **외부 인터페이스**：WebDAV、S3 호환 프로토콜, AI 어시스턴트용 MCP 엔드포인트.
- **접근 및 인증**：RBAC（사용자 그룹, 디렉터리 수준 읽기·쓰기 권한, 할당량）, 계정 비밀번호 + TOTP / WebAuthn / SSO / LDAP.
- **보안 및 운영**：JWT 세션, CSRF, 클릭재킹（X-Frame-Options）및 CSP 보호, `/health`·`/healthz` 프로브.
- **동시 요청 중복 제거**：같은 순간의 동일한 디렉터리 목록 / 메타데이터 요청은 업스트림 드라이브에 한 번만 전달되고, 나머지는 같은 결과를 재사용하여 속도 제한과 CPU 소모를 줄입니다.
- **실행 플랫폼**：Cloudflare Workers、Tencent Cloud EdgeOne Makers、Alibaba Cloud ESA、Vercel / AWS Lambda 및 Node.js 컨테이너.
- **데이터 스토리지**：Cloudflare D1（SQLite）주 사용, KV / Blob / Durable Objects 및 외부 MySQL / MariaDB 지원.
- **원클릭 배포**：EdgeOne、Cloudflare Workers、Alibaba Cloud ESA 배포 버튼 + 설치 마법사.

---

## 수동 배포

<details>
<summary>사전 요구 사항, 로컬 개발 및 프로덕션 배포 보기</summary>

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

</details>

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

## 배포 설정

배포 후 다음 변수를 설정하세요:

| 변수 | 기본값 | 설명 |
| :--- | :--- | :--- |
| `JWT_SECRET` | (없음) | JWT 서명 키 (≥16자) |
| `DB_FORMAT` | `map` | `map` (JSON) / `key` (키별) / `sql` (관계형) |
| `DB_DRIVER` | `auto` | `auto` / `blob` / `cfkv` / `kv` / `d1` / `do` / `mysql` |
| `DB_CIPHER` | `none` | 민감 필드 저장 시 암호화, 예: `aes-256-gcm` |

전체 변수 목록은 [설정 변수](https://doc.oplist.org/ecosystem/official_worker/guide_env)를 참고하세요.

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
