<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList は、複数のクラウドドライブをマウントできるディレクトリリスティングツールで、数十種類のクラウドストレージのマウント、ファイル管理、共有などに対応しています。</em></p>

  <p>本リポジトリは公式 <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a> プロジェクトの TypeScript + Serverless 移植版です。</p>
  <p>Cloudflare Workers / EdgeOne Cloud Function 上で動作します。</p>

<a href="https://github.com/OpenListTeam/OpenList/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList/actions?query=workflow%3ABuild"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList/build.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList" alt="latest version" /></a>

<a href="https://github.com/OpenListTeam/OpenList/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>

</div>

<div align="center">

[English](README_en.md) | [简体中文](../README.md) | [繁體中文](README_zh-TW.md) | 日本語 | [한국어](README_ko.md) | [Français](README_fr.md) | [Deutsch](README_de.md)

[Português](README_pt.md) | [Русский](README_ru.md) | [العربية](README_ar.md) | [Italiano](README_it.md) | [हिन्दी](README_hi.md) | [Español](README_es.md)

[上流プロジェクト](https://github.com/OpenListTeam/OpenList) · [貢献ガイド](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CONTRIBUTING.md) · [行動規範](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CODE_OF_CONDUCT.md) · [ライセンス](../LICENSE)

[🌎 グローバルデモ](https://new.oplist.org) 　|　 [🇨🇳 中国デモ](https://new.oplist.org.cn)

</div>

---

## ワンクリックデプロイ

下のボタンをクリックすると、本プロジェクトを対応プラットフォームにワンクリックでデプロイできます：

<div align="center">

| EdgeOne Makers · 国際版 | EdgeOne Makers · 中国版 | Cloudflare Workers · グローバル |
| :---: | :---: | :---: |
| [![EdgeOne にデプロイ](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![EdgeOne にデプロイ](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Cloudflare Workers にデプロイ](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) |

</div>

> [!IMPORTANT]
> デプロイ後、初回アクセス時に自動的に**インストールウィザード**が起動します：
>
> オプションの環境変数 / シークレット：
> - `ENCRYPTION_SECRET`：静的暗号化キー（16文字以上推奨。機密フィールドの暗号化に使用）
> - `JWT_SECRET`：JWT 署名キー（推奨。未設定時は自動生成され KV に永続化）
> - `CRON_SECRET`：定期リフレッシュタスク認証キー（オプション。EdgeOne の定期タスクのみ必要）

## 機能紹介

OpenList-Worker はエッジコンピューティングプラットフォーム上で動作するマルチストレージ集約型のファイルリスティング・管理システムで、さまざまなクラウドドライブ、オブジェクトストレージ、プロトコルサービスに分散したファイルを一つの画面で閲覧・プレビュー・ダウンロード・管理できます。

### TS 版について

OpenList-Worker は公式 [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList) プロジェクトの TypeScript 移植版です。

バックエンドを Go から Workers 上で動作する TypeScript サービスに書き換え、フロントエンドは一貫した画面と操作性を維持しています。

### ストレージ集約

**80 以上のストレージドライバー**を内蔵し、さまざまなストレージバックエンドをすぐにマウントできます：

| カテゴリ | 対応バックエンド |
| :--- | :--- |
| 国内クラウドドライブ | Aliyundrive（Open/Share）、Quark、Baidu Netdisk、115、123 Pan、Thunder、天翼雲（189）、Tencent Weiyun、Lanzou、PikPak、UC クラウド、China Mobile Cloud、139 クラウド、Doubao、Wopan、天翼ファミリークラウド、LeTV クラウドなど |
| 海外クラウドドライブ | Google Drive、OneDrive（App/ShareLink）、Dropbox、MEGA、MediaFire、Proton Drive、Yandex Disk、Degoo、Bunny Storage、TeraBox など |
| オブジェクトストレージ | S3 互換（AWS/OSS/COS/MinIO など）、WebDAV、FTP、SFTP、SMB、IPFS、Azure Blob など |
| コードホスティング | GitHub、GitHub Releases、CNB Releases |
| クラウドドライブプログラム | OpenList / AList V3、Cloudreve V3/V4、Kodbox、Seafile、Teldrive、Febbox など |
| その他のドライバー | Netease Music、Misskey、Emby、115 共有、Aliyundrive 共有、Quark 共有など |

上記の実際のストレージに加え、`Local`、`Alias`、`UrlTree`、`AutoIndex`、`Strm`、`Crypt`、`Virtual`、`Chunk` などの仮想・機能ドライバーも提供しており、ローカルマウント、アドレスエイリアス、URL リスト、暗号化ストレージ、チャンク分割などの用途に対応しています。

### 主な機能

- **ファイル閲覧**：統一されたディレクトリツリー閲覧。画像、動画、音声、ドキュメント、コード、アーカイブなどのオンラインプレビューに対応。
- **アップロード・ダウンロード**：クロスストレージのアップロード、一括ダウンロード、ストリーミング、直リンクへのリダイレクト。
- **ファイル共有**：有効期限・パスワード・権限制御付きの共有リンクを生成。匿名アクセスとディレクトリ共有に対応。
- **全文検索**：インデックス済みストレージ内のファイルを高速検索。
- **オフラインタスク**：バックグラウンドタスクキューによる一括操作と非同期処理に対応。
- **外部インターフェース**：集約ストレージを WebDAV または S3 互換プロトコルで公開し、サードパーティツールへのマウントが可能。
- **MCP サービス**：Model Context Protocol エンドポイントを提供し、AI アシスタントなどのクライアントから統合・呼び出し可能。

### 権限管理

- **権限**：ロールベースのアクセス制御（RBAC）。ユーザーグループ、ディレクトリ単位の読み書き権限、クォータに対応。
- **認証**：組み込みのアカウントパスワードに加え、TOTP 検証、WebAuthn/FIDO ログイン、SSO シングルサインオン、LDAP ディレクトリ認証に対応。
- **セキュリティ強化**：JWT セッション、CSRF 対策、クリックジャッキング対策（X-Frame-Options）、Content Security Policy（CSP）。
- **ヘルスチェック**：`/health` 生存プローブと `/healthz` 準備プローブを提供し、監視・アラートに利用可能。

### デプロイ

- **実行プラットフォーム**：Cloudflare Workers、Tencent Cloud EdgeOne Makers、Vercel、Serverless、Node.js コンテナ環境。
- **データストレージ**：Cloudflare D1（SQLite）を主とし、MySQL、MariaDB、PostgreSQL、SQL Server にも対応。
- **永続キャッシュ**：Cloudflare KV / EdgeOne Blob（オプション）。設定の永続化とキャッシュに使用。
- **ワンクリックデプロイ**：EdgeOne、Cloudflare Workers などのプラットフォームでワンクリックデプロイボタン＋初期化に対応。

---

## 手動デプロイ

### 前提条件

- Node.js 18+
- Cloudflare アカウント（Workers へのデプロイに使用）

### ローカル開発

```bash
# 1. バックエンドの依存関係をインストール
npm install

# 2. フロントエンドの依存関係をインストール
npm run install:page

# 3. wrangler.jsonc を設定（JWT_SECRET、KV/D1 バインディングを記入）

# 4. バックエンド開発サーバーを起動
npm run dev

# 5. 別のターミナルでフロントエンド開発サーバーを起動
npm run dev:page
```

### 本番デプロイ

```bash
# ワンクリックデプロイ（フロントエンドビルド + バックエンドを Cloudflare Workers へデプロイ）
npm run deploy
```

---

## 技術構成

### バックエンド

- **実行環境**：Cloudflare Workers（Edge Computing）
- **Web フレームワーク**：Hono.js
- **データベース**：Cloudflare D1（SQLite）/ MySQL、MariaDB、PostgreSQL、SQL Server に対応
- **キャッシュ**：Cloudflare KV（オプション）
- **言語**：TypeScript
- **ビルドツール**：Wrangler、esbuild

### フロントエンド

- **フレームワーク**：React 19 + TypeScript
- **UI ライブラリ**：Ant Design / Material-UI
- **ビルドツール**：Vite

---

## ドキュメント

- 📘 [公式ドキュメント](https://doc.oplist.org)
- 🌏 [中国ミラー](https://doc.oplist.org.cn)
- ⚖️ [利用規約](https://doc.oplist.org/terms)
- 🔒 [プライバシーポリシー](https://doc.oplist.org/privacy)

## サポート

一般的なご質問は [_Discussions_](https://github.com/OpenListTeam/OpenList/discussions) フォーラムへお願いします。**_Issues_ はバグ報告と機能リクエスト専用です。**

## ライセンス

`OpenList` は [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt) ライセンスの下で提供されるオープンソースソフトウェアです。

## お問い合わせ

- [@GitHub](https://github.com/OpenListTeam)
- [Telegram グループ](https://t.me/OpenListTeam)
- [Telegram チャンネル](https://t.me/OpenListOfficial)

## 貢献者

原プロジェクト [AlistGo/alist](https://github.com/AlistGo/alist) の作者 [Xhofe](https://github.com/Xhofe) とその他すべての貢献者に心より感謝します。

素晴らしい方々に感謝します：

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
