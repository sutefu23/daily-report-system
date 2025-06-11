# 日報システム

従業員の日々の作業内容を記録・管理するWebベースの日報システム

## セットアップ手順

### 1. 必要な環境

- Node.js 20.0.0以上
- Docker & Docker Compose
- PostgreSQL（Dockerで起動）

### 2. 環境変数の設定

```bash
# .envファイルを作成（既に作成済みの場合はスキップ）
cp .env.example .env
```

### 3. 依存関係のインストール

```bash
npm install
```

### 4. データベースの起動

```bash
# PostgreSQLを起動
docker compose up -d

# データベースのマイグレーションを実行
npx prisma migrate dev

# Prismaクライアントを生成
npx prisma generate
```

### 5. 開発サーバーの起動

#### フロントエンド（Next.js）

```bash
npm run dev:front
```

フロントエンドは http://localhost:3002 で起動します。

#### バックエンド（Hono）

```bash
npm run dev:backend
```

バックエンドAPIは http://localhost:3000 で起動します。

## 主な機能

- **認証機能**: ログイン、サインアップ、パスワードリセット
- **日報管理**: 作成、編集、一覧表示、詳細表示
- **承認ワークフロー**: 提出、承認、差し戻し
- **ロールベースアクセス制御**: 管理者、マネージャー、従業員

## ディレクトリ構成

```
project-root/
├── src/
│   ├── front/          # Next.js フロントエンド
│   └── backend/        # Hono バックエンドAPI
├── prisma/             # データベーススキーマ
├── docs/               # ドキュメント
└── docker-compose.yml  # Docker設定
```

## 開発コマンド

```bash
# コードフォーマット
npm run format

# リント実行
npm run lint

# 型チェック
npm run typecheck

# データベース管理画面
npx prisma studio
```

## トラブルシューティング

### ポートが使用中の場合

フロントエンドが3002番ポートで起動している場合、他のプロセスが3000/3001番ポートを使用している可能性があります。

### データベース接続エラー

Docker Composeでデータベースが起動しているか確認してください：

```bash
docker compose ps
```

### マイグレーションエラー

データベースをリセットする場合：

```bash
npx prisma migrate reset
```