<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList は多機能なディレクトリリスティングツールで、数十種類のクラウドドライブのマウントとファイルのプレビュー・ダウンロード・共有などに対応しています</em></p>
  <p>本リポジトリは公式 <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a> プロジェクトの TypeScript + Serverless アーキテクチャ移植版です</p>
  <p>Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA 上で動作します</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/build-verify.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/build-verify.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList-Worker" alt="latest version" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList-Worker?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList-Worker/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>

📘 [使用ドキュメント](https://doc.oplist.org) · 🌏 [使用ドキュメント（中国本土）](https://doc.oplist.org.cn)  · ⚖️ [利用規約](https://doc.oplist.org/terms)  · 🔒 [プライバシーポリシー](https://doc.oplist.org/privacy)

</div>

<div align="center">

[English](README_en.md) | [简体中文](../README.md) | [繁體中文](README_zh-TW.md) | 日本語 | [한국어](README_ko.md) | [Français](README_fr.md) | [Deutsch](README_de.md) 

[Português](README_pt.md) | [Русский](README_ru.md) | [العربية](README_ar.md) | [Italiano](README_it.md) | [हिन्दी](README_hi.md) | [Español](README_es.md)

[上流プロジェクト](https://github.com/OpenListTeam/OpenList) · [貢献ガイド](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CONTRIBUTING.md) · [行動規範](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CODE_OF_CONDUCT.md) · [ライセンス](./LICENSE)

[🌎 グローバルデモ](https://new.oplist.org) 　|　 [🇨🇳 中国デモ](https://new.oplist.org.cn)

</div>

---

## ワンクリックデプロイ

下のボタンをクリックすると、本プロジェクトを対応プラットフォームにワンクリックでデプロイできます：
<div align="center">


| EdgeOne Makers · 国際版 | EdgeOne Makers · 中国版 | Cloudflare Workers · グローバル | Alibaba Cloud ESA · 中国版 |
| :---: | :---: | :---: | :---: |
| [![EdgeOne にデプロイ](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![EdgeOne にデプロイ](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) | [![Alibaba Cloud ESA にデプロイ](assets/esa-deploy.svg)](https://esa.console.aliyun.com/edge/function/list) |

</div>

> [!IMPORTANT]
> - Cloudflare が `ストレージリポジトリの内容を取得できません` と表示する場合、まず本プロジェクトを [Fork](https://github.com/OpenListTeam/OpenList-Worker/fork) し、Github リポジトリへの接続からデプロイしてください
> - Alibaba Cloud ESA の場合は、コンソールの **エッジコンピューティングと AI → 関数と Pages** から本リポジトリをインポートしてください。リポジトリ内の `esa.jsonc` にインストール・ビルド・静的アセットの設定が含まれています。デプロイ後に `JWT_SECRET` と `KV_NAMESPACE`（デフォルト `openlist`）を設定し、同名の EdgeKV 名前空間を事前に作成してください
> - デプロイ時に `JWT_SECRET`（16 文字以上のランダム文字列、例：`openssl rand -hex 32`）を設定してください。JWT 署名とデータ暗号化に使われ、未設定の場合は初期化時に自動生成・永続化されます
> - データ保存はプラットフォーム標準の永続化バックエンドを自動選択します（`DB_DRIVER=auto`）——通常は設定不要です。その他の変数は [環境変数](https://doc.oplist.org/ecosystem/official_worker/guide_env) を参照してください
> - デプロイ後の初回アクセスでは**インストールウィザード**が開きます。ブラウザで管理者アカウントとパスワードを設定して初期化してください（`ADMIN_PASS` を設定するとウィザードをスキップできます）


## 機能紹介

OpenList はエッジコンピューティングプラットフォーム上で動作するマルチストレージ集約型のファイルリスト・管理システムで、異なるクラウドドライブ、オブジェクトストレージ、プロトコルサービスに分散したファイルを単一のインターフェースに統合し、閲覧・プレビュー・ダウンロード・管理できます。

OpenList-Worker は公式 [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList) プロジェクトの TypeScript + Serverless 移植版で、バックエンドを Go から Workers 上で動作する TypeScript サービスに書き換え、フロントエンドは一貫したインターフェースと操作体験を維持しています。

### ストレージ集約

**78 個のストレージドライバー**を内蔵し、さまざまなストレージバックエンドをすぐにマウントできます：

- **国内クラウドドライブ**：アリババクラウドディスク（オープンプラットフォーム/共有）、Quark（オープンプラットフォーム/UC TV 版）、Baidu 網盤（アルバム）、115（オープンプラットフォーム/共有）、123 Pan（オープンプラットフォーム/共有）、天翼クラウドディスク（189/PC/TV）、中国移動クラウドディスク（139/和彩雲）、沃家クラウドディスク、迅雷クラウドディスク、Tencent Weiyun、Lanzou、PikPak（共有）、豆包、光亜盤、超星グループ、Lenovo NAS 共有、Teambition、WPS クラウド、アリババドキュメント、HalalCloud、MediaTrack など
- **海外クラウドドライブ**：Google Drive（アルバム）、OneDrive（アプリ/共有リンク）、Dropbox、MEGA、MediaFire、Proton Drive、Yandex Disk、Degoo、Bunny Storage、TeraBox など
- **オブジェクトストレージ**：S3 互換（AWS/OSS/COS/MinIO など）、Cloudflare R2（Workers バインディングまたは S3 API）、UpYun USS、Azure Blob、WebDAV、FTP、SFTP、SMB、IPFS など
- **コードホスティング**：GitHub、GitHub Releases、CNB Releases
- **クラウドドライブプログラム**：OpenList（共有）、AList V3、Cloudreve V3/V4、Kodbox、Seafile、Teldrive、Febbox など
- **その他のドライバー**：Netease Music、Misskey、Emby、Cloudflare 画像ホスティングなど

上記の実際のストレージに加え、`Local`、`Alias`、`UrlTree`、`AutoIndex`、`Strm`、`Crypt`、`Virtual`、`Chunk` などの仮想・機能ドライバーも提供しており、ローカルマウント、アドレスエイリアス、URL リスト、暗号化ストレージ、チャンク分割などのシーンに対応しています。

### 主な機能

- **ファイル閲覧**：統一されたディレクトリツリー閲覧。画像、動画、音声、ドキュメント、コード、アーカイブなどのオンラインプレビューに対応。
- **アップロード・ダウンロード**：ストレージ間のアップロード、一括ダウンロード、ストリーミング、ダイレクトリンクへのリダイレクト。
- **ファイル共有**：有効期限・パスワード・権限制御付きの共有リンクを生成。匿名アクセスとディレクトリ共有に対応。
- **全文検索**：インデックス済みストレージ内のファイルを高速検索。
- **オフラインタスク**：バックグラウンドタスクキューにより一括操作と非同期処理に対応。
- **外部インターフェース**：集約ストレージを WebDAV または S3 互換プロトコルで公開し、サードパーティツールへのマウントが可能。
- **MCP サービス**：Model Context Protocol エンドポイントを提供し、AI アシスタントなどのクライアントから統合・呼び出し可能。
- **同時リクエストの重複排除**：同一瞬間の同一ディレクトリ一覧 / メタデータ要求は上流ドライブへ一度だけ送信され、他の要求は同じ結果を再利用するため、不要なレート制限や CPU 消費を避けられます。

### 権限管理

- **権限管理**：ロールベースのアクセス制御（RBAC）。ユーザーグループ、ディレクトリ単位の読み書き権限、クォータに対応。
- **認証方式**：組み込みのアカウントパスワードに加え、TOTP 検証、WebAuthn/FIDO ログイン、SSO シングルサインオン、LDAP ディレクトリ認証に対応。
- **セキュリティ強化**：JWT セッション、CSRF 対策、クリックジャッキング対策（X-Frame-Options）、コンテンツセキュリティポリシー（CSP）。
- **ヘルスチェック**：`/health` 生存プローブと `/healthz` 準備プローブを提供し、監視・アラートに利用可能。

### プラットフォームデプロイ

- **実行プラットフォーム**：Cloudflare Workers、Tencent Cloud EdgeOne Makers、Alibaba Cloud ESA、Vercel / AWS Lambda、Node.js コンテナ環境。
- **データストレージ**：Cloudflare D1（SQLite）を主とし、KV / Blob / Durable Objects および外部 MySQL / MariaDB にも対応。
- **ワンクリックデプロイ**：EdgeOne、Cloudflare Workers、Alibaba Cloud ESA のデプロイ入口 + インストールウィザード。

---

## 手動デプロイ

### 前提条件

- Node.js 18+（pnpm 推奨）
- Cloudflare アカウント（Workers へのデプロイに使用）

### ローカル開発

```bash
# 1. 依存関係をインストール
pnpm install

# 2. 必要に応じて wrangler.jsonc のバインディングと変数を設定（JWT_SECRET は .dev.vars.example を参照）

# 3. 開発サーバーを起動（公式フロントエンドを自動取得して Worker を実行）
pnpm run dev:unified

# または Worker のみを実行（フロントエンドを取得しない）
pnpm run dev:worker
```

### 本番デプロイ

```bash
# ワンクリックデプロイ：フロントエンドをビルド → Cloudflare Workers へデプロイ（KV バインディングは wrangler が自動プロビジョニング）
pnpm run deploy

# または Worker を直接デプロイ（フロントエンドのビルドをスキップ）
pnpm run deploy:worker
```

---

## 技術構成

### バックエンド

- **実行環境**：Cloudflare Workers / EdgeOne Functions / Alibaba Cloud ESA（Edge Computing）
- **Web フレームワーク**：Hono.js
- **データベース**：Cloudflare D1（SQLite）/ KV / Blob / Durable Objects または外部 MySQL / MariaDB
- **言語**：TypeScript
- **ビルドツール**：Wrangler、esbuild

### フロントエンド

- **フレームワーク**：SolidJS + TypeScript（公式 [OpenList-Frontend](https://github.com/OpenListTeam/OpenList-Frontend)）
- **UI ライブラリ**：Hope UI
- **ビルドツール**：Vite

---

## 設定

デプロイ後、**サイトへの初回アクセス時にインストールウィザードが自動的に開きます**。ブラウザで管理者アカウントとパスワードを設定すると初期化が完了します。ウィザードをスキップするには `ADMIN_PASS` を設定すると、管理者が自動的に初期化されます。

ほとんどのデプロイでは**追加設定は不要**です。データ保存はデフォルトで `DB_DRIVER=auto` を使用し、利用可能な永続化バックエンド（Cloudflare Workers → KV / D1 / DO、EdgeOne / ESA → Blob）を自動選択します。明示的に設定する価値があるのは次の 1 つだけです。

| 変数 | 説明 |
| :--- | :--- |
| `JWT_SECRET` | JWT トークン署名キー（≥16 文字、`openssl rand -hex 32` 推奨）。cron タスクの認証にも使用されます。未設定の場合は初期化時に自動生成・永続化されます |

> `JWT_SECRET` は**Secret**（通常の変数ではなく）として設定してください。通常の変数は再デプロイ時にリポジトリ設定で上書きされる可能性がありますが、Secret は上書きされません。

その他の変数には適切なデフォルト値があります。

| 変数 | デフォルト | 説明 |
| :--- | :--- | :--- |
| `ADMIN_PASS` | — | インストールウィザードをスキップし、このパスワードで管理者を自動初期化 |
| `DB_FORMAT` | `map` | 保存形式：`map`（JSON 全体）/ `key`（キー単位）/ `sql`（リレーショナルテーブル、Go バックエンド互換） |
| `DB_DRIVER` | `auto` | ストレージドライバー：`auto` / `blob` / `cfkv` / `kv` / `d1` / `do` / `mysql`。明示指定したドライバーは自動的に置き換えられません |
| `DB_CIPHER` | `none` | 機密フィールドの保存時暗号化（デフォルトは暗号化なし）、例：`aes-256-gcm` |
| `ALLOW_URLS` | — | CORS 許可リスト（カンマ区切り、未設定時は同一オリジンのみ） |
| `MAX_UPLOAD` / `MAX_UPPART` | 26214400 / 16777216 | 全体アップロード / マルチパートチャンクの最大サイズ（バイト） |
| `ASSET_URLS` | — | フロントエンド静的アセットの CDN アドレス、`$version` プレースホルダー対応 |

ディレクトリ一覧とダウンロード直リンクは常にドライブから直接取得され、リクエスト間キャッシュはありません（`CACHE_*` 変数なし）。そのため外部の変更は即座に反映されます。

完全な環境変数（フィールド暗号化 `DB_CIPHER`、`cfkv` / MySQL 接続設定など）とプラットフォーム別のデプロイ手順は、ドキュメントサイトを参照してください。

- [環境変数](https://doc.oplist.org/ecosystem/official_worker/guide_env)
- [デプロイ](https://doc.oplist.org/ecosystem/official_worker/guide)
- [FAQ](https://doc.oplist.org/ecosystem/official_worker/about)

## サポート

利用中に問題が発生した場合は、以下のチャネルからヘルプを得られます：

- 🐛 **バグ報告・機能リクエスト**：[_Issues_](https://github.com/OpenListTeam/OpenList-Worker/issues) へ
- 💬 **一般的な質問・交流**：[_Discussions_](https://github.com/OpenListTeam/OpenList/discussions) フォーラムへ

## ライセンス

`OpenList` は [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt) ライセンスに基づくオープンソースソフトウェアです。


## お問い合わせ

🌐 [@GitHub](https://github.com/OpenListTeam) · ✈️ [Telegram グループ](https://t.me/OpenListTeam) · ✈️ [Telegram チャンネル](https://t.me/OpenListOfficial)

## 貢献者

以下のプロジェクトとその貢献者に感謝します：

- [Alist](https://github.com/AlistGo/alist) プロジェクトの作者と全貢献者
- [OpenList](https://github.com/OpenListTeam/OpenList)（Go 版）プロジェクトの作者と全貢献者
- 本プロジェクトの全貢献者：

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
