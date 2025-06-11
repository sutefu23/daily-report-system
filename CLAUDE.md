# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

日報管理システム - 従業員の日々の作業内容を記録・管理し、上司とのコミュニケーションを促進するWebベースのシステム。

### 現在の実装状況
- **ドメイン層**: ✅ 完成（型定義、ワークフロー、エラーハンドリング）
- **バックエンドAPI**: 🚧 部分実装（Hono REST API、gRPC未実装）
- **フロントエンド**: 🚧 基本UI（認証フォーム、shadcn/ui基盤）
- **データベース**: ✅ Prismaスキーマ完成
- **テスト**: 🚧 ドメインロジックとE2Eの一部

### 技術スタック
- **共通**: TypeScript (strict mode), ULID for IDs, Vitest for testing, Biome for linting
- **Frontend**: Next.js 14 (App Router), shadcn/ui, Tailwind CSS, Zustand, React Hook Form + Zod
- **Backend**: Hono (HTTP), Prisma (Database), PostgreSQL, JWT, bcrypt
- **通信**: REST API (実装済み) + gRPC with Protocol Buffers (計画中)
- **外部連携**: Slack API (計画中)
- **Testing**: Vitest (unit), Playwright (E2E)

### アーキテクチャ
- **設計思想**: 関数型DDD (Domain-Driven Design)
- **原則**: 型ファースト、Workflowパターン、純粋関数、イミュータブル、関数合成
- **モノレポ構成**: src/ (frontend, backend, shared)

## Development Commands

### セットアップ
```bash
npm install          # 依存関係インストール
npm run db:migrate   # Prismaマイグレーション
npm run test:install # Playwright依存関係インストール
```

### 開発
```bash
npm run dev              # フロントエンド・バックエンド同時起動
npm run dev:frontend     # フロントエンドのみ起動
npm run dev:backend      # バックエンドのみ起動
npm run test             # 全ワークスペースのテスト実行
npm run test:e2e         # E2Eテスト実行
npm run test:e2e:ui      # E2EテストUI実行
npm run lint             # Biomeリント実行
npm run lint:fix         # Biomeリント＋自動修正
npm run format           # Biomeフォーマット
npm run typecheck        # TypeScript型チェック
npm run ui               # shadcn/uiコンポーネント追加
```

### データベース
```bash
npm run db:migrate   # マイグレーション実行
npm run db:studio    # Prisma Studio起動
npm run db:seed      # Seeder実行
```

### ビルド・デプロイ
```bash
npm run build            # 全体ビルド
npm run build:frontend   # フロントエンドビルド
npm run build:backend    # バックエンドビルド
npm run build:shared     # 共通モジュールビルド
```

## Architecture

### 現在のディレクトリ構成
```
src/
├── front/                      # Next.js 14 フロントエンド
│   ├── app/                   # App Router
│   │   ├── (auth)/           # 認証関連ページ
│   │   ├── dashboard/        # ダッシュボード
│   │   └── globals.css       # グローバルスタイル
│   ├── components/           # UIコンポーネント
│   │   ├── shadcn/ui/       # shadcn/uiコンポーネント
│   │   └── auth/            # 認証フォーム
│   ├── lib/                 # ユーティリティ・設定
│   │   ├── auth.ts          # 認証ストア（Zustand）
│   │   └── utils.ts         # ユーティリティ関数
│   ├── types/               # フロントエンド型定義
│   └── package.json         # フロントエンド依存関係
├── backend/                    # Hono HTTP API バックエンド
│   ├── domain/              # ドメイン層（関数型DDD）
│   │   ├── types/           # Branded Types + ドメインモデル
│   │   │   ├── base.ts      # Either型、Result型、基本型
│   │   │   ├── user.ts      # ユーザードメイン型
│   │   │   └── daily-report.ts # 日報ドメイン型
│   │   ├── errors/          # ドメインエラー定義
│   │   └── workflows/       # ビジネスワークフロー（純粋関数）
│   │       ├── user-workflow.ts
│   │       └── daily-report-workflow.ts
│   ├── infrastructure/      # インフラ層
│   │   ├── database/        # Prismaクライアント設定
│   │   ├── repositories/    # データアクセス層
│   │   │   ├── user-repository.ts
│   │   │   └── daily-report-repository.ts
│   │   └── auth/           # 認証サービス
│   │       ├── password-hasher.ts # bcryptラッパー
│   │       └── token-generator.ts # JWT生成
│   ├── application/         # アプリケーション層
│   │   └── services/        # ドメインワークフロー統合
│   │       ├── user-service.ts
│   │       └── daily-report-service.ts
│   ├── index.ts            # Honoサーバーエントリポイント
│   ├── tsconfig.json       # TypeScript設定
│   └── package.json        # バックエンド依存関係
├── shared/                     # 共通モジュール
│   └── package.json         # 共有依存関係
├── prisma/
│   └── schema.prisma        # ✅ 完全なデータベーススキーマ
└── tests/
    ├── unit/               # ✅ ドメインワークフローテスト
    └── e2e/                # ✅ Playwright E2Eテスト
```

### 実装状況詳細

**✅ 完了済み**:
- ドメイン層の完全実装（型安全性、ワークフロー、エラーハンドリング）
- Prismaスキーマ定義（User, Department, Project, DailyReport, Task, Notification）
- 基本的なHono REST APIサーバー
- フロントエンド認証UI基盤
- Unit testing + E2E testing基盤

**🚧 部分実装**:
- REST APIエンドポイント（基本的な構造のみ）
- ユーザーリポジトリ（基本機能のみ）
- フロントエンドUI（認証フォームのみ）

**❌ 未実装**:
- gRPCサーバー・クライアント
- Slack API連携
- 完全なCRUD API
- フロントエンド日報管理画面
- 管理者機能
- ファイルアップロード

### 重要な設計パターン

#### 1. Branded Types（型安全性確保）
```typescript
export type Brand<K, T> = K & { __brand: T }
export type UserId = Brand<string, 'UserId'>
export type DailyReportId = Brand<string, 'DailyReportId'>

export const createUserId = (id: string): UserId => id as UserId
```

#### 2. Either Type Pattern（エラーハンドリング）
```typescript
export type Either<E, A> = 
  | { tag: 'Left'; left: E }    // エラー
  | { tag: 'Right'; right: A }  // 成功

export const left = <E, A>(e: E): Either<E, A> => ({ tag: 'Left', left: e })
export const right = <E, A>(a: A): Either<E, A> => ({ tag: 'Right', right: a })
```

#### 3. Workflow Pattern（純粋関数でビジネスロジック）
```typescript
export const createDailyReportWorkflow = (
  reportRepo: DailyReportRepository,
  userRepo: UserRepository
) => async (
  input: CreateDailyReportInput
): Promise<Either<DomainError, DailyReport>> => {
  // バリデーション → ビジネスルール → データ操作
}
```

#### 4. Repository Pattern（データアクセス抽象化）
```typescript
export type DailyReportRepository = {
  findById: (id: string) => Promise<DailyReport | null>
  create: (report: DailyReport) => Promise<DailyReport>
  // Prismaクライアントの直接使用は禁止
}
```

## 開発ルール

### TypeScript厳格ルール
- `any`, `unknown`の使用禁止
- 全ての関数に明示的な型注釈
- 純粋関数を基本とし、副作用は明示的に分離
- Branded Typesによる型安全性確保

### コード品質
- Biomeによる統一的なlinting・formatting
- Vitestによる包括的なテスト
- Playwrightによる E2E テスト
- 関数型プログラミング原則の遵守

### コミットルール
- Conventional Commitsに従う
- PRは必須レビュー
- テストカバレッジ維持

## 設定情報

### shadcn/ui設定
- コンポーネントディレクトリ: `src/front/components/shadcn/ui`
- components.jsonの設定で上記パスを指定
- `npm run ui` でコンポーネント追加

### 環境変数（.env.example参照）
```bash
# Backend environment variables
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/daily_report"
JWT_SECRET="your-jwt-secret-here"
SLACK_BOT_TOKEN="xoxb-your-slack-bot-token"
SLACK_CHANNEL_ID="C1234567890"

# Frontend environment variables (in .env.local)
# NEXT_PUBLIC_GRPC_URL="http://localhost:9090"
```

## 主要API仕様

### 現在実装済みのREST API
```typescript
POST /api/auth/login         # ユーザー認証
POST /api/users              # ユーザー作成
POST /api/daily-reports      # 日報作成
PUT  /api/daily-reports/:id  # 日報更新
POST /api/daily-reports/:id/submit  # 日報提出
POST /api/daily-reports/:id/approve # 日報承認
POST /api/daily-reports/:id/reject  # 日報差し戻し
```

### Protocol Buffers定義済み（未実装）
- AuthService（login, refresh, logout, validate）
- DailyReportService（CRUD + comment操作）

## 関連ドキュメント
- 詳細な仕様書: @docs/architecture/SPECIFICATION.md