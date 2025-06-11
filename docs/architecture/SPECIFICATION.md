# 日報システム開発指示書

## プロジェクト概要

従業員の日々の作業内容を記録・管理し、上司とのコミュニケーションを促進するWebベースの日報システムの開発。関数型DDD設計による型安全なアーキテクチャを採用し、段階的な機能実装を行う。

### 現在の実装状況（2024年12月時点）
- ✅ **ドメイン層**: 完全実装（型定義、ワークフロー、エラーハンドリング）
- ✅ **データベース**: Prismaスキーマ完成
- 🚧 **バックエンドAPI**: 基本的なHono REST API実装
- 🚧 **フロントエンド**: 認証UI基盤とshadcn/ui設定
- ❌ **gRPC**: 未実装（Protocol Buffers定義済み）
- ❌ **Slack連携**: 未実装（将来フェーズ）

### 機能優先度

**Phase 1（実装済み・進行中）**:
- ✅ ユーザー認証・管理
- 🚧 日報作成・編集・閲覧
- 🚧 作業記録の複数行管理（プロジェクト、作業時間、作業内容、進捗率）
- ✅ 困ったこと・明日の予定記録
- 🚧 日報の承認・差し戻しワークフロー

**Phase 2（計画中）**:
- 上司によるコメント機能
- 従業員別・プロジェクト別集計
- レポート出力（CSV/PDF）
- gRPC API実装

**Phase 3（将来）**:
- Slack連携（リマインダー、通知）
- 高度な分析・ダッシュボード機能

## 技術スタック

### 共通
- **言語**: TypeScript（strict mode、`any`/`unknown`使用禁止）
- **ID生成**: ULID
- **テスト**: Vitest (unit) + Playwright (E2E)
- **リンター/フォーマッター**: Biome（ESLint + Prettierの代替）
- **型安全性**: Branded Types + Either型パターン
- **モノレポ**: npm workspaces

### フロントエンド
- **フレームワーク**: Next.js 14 (App Router)
- **UIフレームワーク**: shadcn/ui
- **コンポーネント開発**: Storybook（設定済み、コンポーネント未作成）
- **スタイリング**: Tailwind CSS
- **状態管理**: Zustand（認証ストア実装済み）
- **フォーム**: React Hook Form + Zod（ログインフォーム実装済み）
- **API通信**: REST API（現在）、gRPC（計画中）

### バックエンド
- **HTTP API**: Hono（基本エンドポイント実装済み）
- **gRPC**: nice-grpc（Protocol Buffers定義済み、実装未完了）
- **ORM**: Prisma（スキーマ完成、リポジトリ実装済み）
- **データベース**: PostgreSQL
- **認証**: JWT + bcrypt（実装済み）
- **アーキテクチャ**: 関数型DDD
- **ランタイム**: Node.js + tsx

### インフラ・外部サービス
- **データベース**: PostgreSQL（Prismaスキーマ完成、Docker Compose構成予定）
- **Slack API**: Slack Web API（Phase 3で実装予定）
- **ファイル出力**: PDFKit, csv-writer（Phase 2で実装予定）
- **デプロイメント**: 本番環境未設定（開発環境のみ）

## アーキテクチャ

### 関数型DDD設計原則

1. **型ファーストアプローチ**: TypeScriptの型でドメインモデルを定義
2. **Workflowパターン**: 全ての業務処理をworkflow関数内に封じ込め
3. **純粋関数**: 副作用のない関数を基本とし、副作用は明示的に分離
4. **イミュータブル**: 全てのデータ構造をimmutableとして扱う
5. **関数合成**: 小さな関数を組み合わせて複雑な処理を構築

### 現在のディレクトリ構成

```
project-root/
├── src/
│   ├── front/                   # Next.js 14 フロントエンド
│   │   ├── app/                # App Router
│   │   │   ├── (auth)/         # 認証関連ページ（実装済み）
│   │   │   ├── dashboard/      # ダッシュボード（基本構造のみ）
│   │   │   └── globals.css     # グローバルスタイル
│   │   ├── components/         # UIコンポーネント
│   │   │   ├── shadcn/ui/     # shadcn/uiコンポーネント（実装済み）
│   │   │   └── auth/          # 認証フォーム（実装済み）
│   │   ├── lib/               # ユーティリティ・設定
│   │   │   ├── auth.ts        # 認証ストア（実装済み）
│   │   │   └── utils.ts       # ユーティリティ関数
│   │   ├── types/             # フロントエンド型定義
│   │   └── package.json       # フロントエンド依存関係
│   ├── backend/                 # Hono HTTP API バックエンド
│   │   ├── domain/             # ドメイン層（実装済み）
│   │   │   ├── types/          # ドメイン型定義
│   │   │   │   ├── base.ts     # Either型、Result型、基本型
│   │   │   │   ├── user.ts     # ユーザードメイン型
│   │   │   │   └── daily-report.ts # 日報ドメイン型
│   │   │   ├── workflows/      # ビジネスロジック（実装済み）
│   │   │   │   ├── user-workflow.ts
│   │   │   │   └── daily-report-workflow.ts
│   │   │   └── errors/         # ドメインエラー（実装済み）
│   │   ├── infrastructure/     # インフラ層（部分実装）
│   │   │   ├── database/       # Prisma関連（実装済み）
│   │   │   ├── repositories/   # データアクセス層（実装済み）
│   │   │   ├── grpc/          # gRPCサーバー（未実装）
│   │   │   ├── slack/         # Slack連携（未実装）
│   │   │   └── auth/          # 認証（実装済み）
│   │   ├── application/        # アプリケーション層（部分実装）
│   │   │   ├── services/      # アプリケーションサービス（実装済み）
│   │   │   └── handlers/      # gRPCハンドラー（未実装）
│   │   ├── index.ts           # Honoサーバーエントリポイント（実装済み）
│   │   ├── tsconfig.json      # TypeScript設定
│   │   └── package.json       # バックエンド依存関係
│   └── shared/                  # 共通モジュール
│       ├── proto/              # Protocol Buffers定義（定義済み、生成未実装）
│       ├── types/              # 共通型定義（未実装）
│       └── utils/              # 共通ユーティリティ（未実装）
├── prisma/
│   └── schema.prisma           # ✅ 完全なデータベーススキーマ
├── tests/
│   ├── unit/                  # ✅ ドメインワークフローテスト
│   └── e2e/                   # ✅ Playwright E2Eテスト
├── docs/                       # ドキュメント
├── .env.example               # 環境変数テンプレート
├── biome.json                 # Biome設定
└── package.json               # ルートpackage.json（モノレポ設定）
```

### ドメイン層設計

#### 実装済みの型定義 (`backend/src/domain/types/`)

```typescript
// base.ts - 基本型とEither型パターン
export type Brand<K, T> = K & { __brand: T }
export type UserId = Brand<string, 'UserId'>
export type DailyReportId = Brand<string, 'DailyReportId'>

export type Either<E, A> = 
  | { tag: 'Left'; left: E }    // エラー
  | { tag: 'Right'; right: A }  // 成功

// user.ts - ユーザードメイン
export type UserRole = 'admin' | 'manager' | 'employee'

export type User = {
  id: UserId
  email: string
  password?: string
  name: string
  role: UserRole
  departmentId: DepartmentId
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// daily-report.ts - 日報ドメイン
export type DailyReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

export type TaskProgress = {
  projectId: ProjectId
  description: string
  hoursSpent: number
  progress: number  // 0-100の進捗率
}

export type DailyReport = {
  id: DailyReportId
  userId: UserId
  date: Date
  tasks: TaskProgress[]
  challenges: string
  nextDayPlan: string
  status: DailyReportStatus
  submittedAt?: Date
  approvedAt?: Date
  approvedBy?: UserId
  feedback?: string
  createdAt: Date
  updatedAt: Date
}
```

#### 実装済みのWorkflow例 (`backend/src/domain/workflows/`)

```typescript
// daily-report-workflow.ts - 日報ワークフロー
export const createDailyReportWorkflow = (
  reportRepo: DailyReportRepository,
  userRepo: UserRepository
) => async (
  input: CreateDailyReportInput
): Promise<Either<DomainError, DailyReport>> => {
  // 1. バリデーション
  const validationResult = validateCreateInput(input)
  if (validationResult.tag === 'Left') {
    return validationResult
  }

  // 2. ユーザー存在確認
  const user = await userRepo.findById(input.userId)
  if (!user) {
    return left(notFound('ユーザーが見つかりません'))
  }

  // 3. 重複チェック
  const existingReport = await reportRepo.findByUserAndDate(input.userId, input.date)
  if (existingReport) {
    return left(businessRuleViolation('指定された日付の日報は既に存在します'))
  }

  // 4. エンティティ作成・保存
  const report: DailyReport = {
    id: createDailyReportId(ulid()),
    userId: input.userId,
    date: input.date,
    tasks: input.tasks,
    challenges: input.challenges,
    nextDayPlan: input.nextDayPlan,
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const created = await reportRepo.create(report)
  return right(created)
}

// ビジネスルールに基づくバリデーション
const validateCreateInput = (input: CreateDailyReportInput): Either<DomainError, CreateDailyReportInput> => {
  if (input.tasks.length === 0) {
    return left(validationError('少なくとも1つのタスクを入力してください'))
  }

  const totalHours = input.tasks.reduce((sum, task) => sum + task.hoursSpent, 0)
  if (totalHours > 24) {
    return left(validationError('1日の作業時間は24時間を超えることはできません'))
  }

  return right(input)
}
```

## 開発ルール

### 型安全性
- `any`, `unknown`の使用禁止
- 全ての関数に明示的な型注釈
- Zodスキーマによる実行時バリデーション
- Tagged Union Typesの活用

### 関数型プログラミング
- 純粋関数を基本とする
- 副作用は明示的に分離（IO, Database, External API）
- Pipeline演算子スタイルの関数合成
- Option/Either型による例外処理

### エラーハンドリング
```typescript
// Either型による統一的なエラーハンドリング（実装済み）
export type Either<E, A> = 
  | { tag: 'Left'; left: E }    // エラー
  | { tag: 'Right'; right: A }  // 成功

export type DomainError = {
  type: 'NOT_FOUND' | 'ALREADY_EXISTS' | 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'BUSINESS_RULE_VIOLATION'
  message: string
  details?: unknown
}

// Workflow内でのエラーハンドリング例
export const submitDailyReportWorkflow = (
  reportRepo: DailyReportRepository
) => async (
  input: SubmitDailyReportInput
): Promise<Either<DomainError, DailyReport>> => {
  const report = await reportRepo.findById(input.id)
  if (!report) {
    return left(notFound('日報が見つかりません'))
  }

  if (report.userId !== input.userId) {
    return left(forbidden('他のユーザーの日報を提出することはできません'))
  }

  if (report.status === 'submitted' || report.status === 'approved') {
    return left(businessRuleViolation('既に提出済みまたは承認済みの日報です'))
  }

  const updated = await reportRepo.update({
    ...report,
    status: 'submitted',
    submittedAt: new Date(),
    updatedAt: new Date(),
  })

  return right(updated)
}
```

### データベースアクセス
- Repository パターンを使用
- Prismaクライアントの直接使用禁止（Repository経由のみ）
- トランザクション管理の明示化

### テスト戦略

#### テストファイル配置ルール
- テストファイルは対象ファイルと同じディレクトリに配置
- テストファイル名は `{対象ファイル名}.spec.ts` 形式
- Storybookファイル（フロントエンドコンポーネントのみ）も同様に `{コンポーネント名}.stories.tsx` 形式で同じディレクトリに配置

例:
```
components/
├── Button.tsx
├── Button.spec.ts
└── Button.stories.tsx
```

#### 単体テスト
```typescript
// ドメインロジックのテスト（daily-report-workflow.spec.ts）
describe('createDailyReportWorkflow', () => {
  it('should create daily report with valid input', async () => {
    // Given
    const mockRepository = createMockRepository()
    const input = createValidInput()
    
    // When
    const result = await createDailyReportWorkflow(mockRepository)(input)
    
    // Then
    expect(result.success).toBe(true)
    expect(mockRepository.save).toHaveBeenCalledWith(expectedDailyReport)
  })
})
```

#### 統合テスト
- gRPCエンドポイントのテスト
- データベース操作のテスト
- Slack連携のテスト

### コード品質
- リンター/フォーマッター: Biome（統一的なコード品質管理）
- コミットメッセージ: Conventional Commits
- PR必須レビュー

## 実装ガイドライン

### gRPC実装

#### Protocol Buffers生成
```bash
# 共通protoファイルから型生成
npm run proto:generate
```

#### サーバー実装
```typescript
// backend/src/infrastructure/grpc/server.ts
import { createServer } from 'nice-grpc'
import { DailyReportServiceImplementation } from '../application/handlers'

const server = createServer()
server.add(DailyReportServiceDefinition, dailyReportHandler)
```

#### クライアント実装
```typescript
// frontend/src/lib/grpc-client.ts
import { createChannel, createClient } from 'nice-grpc-web'
import { DailyReportServiceDefinition } from '@shared/proto'

const channel = createChannel('http://localhost:9090')
const client = createClient(DailyReportServiceDefinition, channel)
```

### Prismaスキーマ

```prisma
// backend/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid()) @db.VarChar(26)
  username     String   @unique @db.VarChar(50)
  email        String   @unique @db.VarChar(100)
  passwordHash String   @map("password_hash") @db.VarChar(255)
  role         String   @db.VarChar(20)
  managerId    String?  @map("manager_id") @db.VarChar(26)
  slackUserId  String   @map("slack_user_id") @db.VarChar(50)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  manager      User?          @relation("UserManager", fields: [managerId], references: [id])
  subordinates User[]         @relation("UserManager")
  dailyReports DailyReport[]
  comments     Comment[]

  @@map("users")
}

model DailyReport {
  id           String   @id @default(cuid()) @db.VarChar(26)
  userId       String   @map("user_id") @db.VarChar(26)
  reportDate   DateTime @map("report_date") @db.Date
  memo         String?
  tomorrowPlan String?  @map("tomorrow_plan")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  user        User          @relation(fields: [userId], references: [id])
  workRecords WorkRecord[]
  comments    Comment[]

  @@unique([userId, reportDate])
  @@map("daily_reports")
}
```

### フロントエンド実装

#### shadcn/ui設定
```json
// components.json
{
  "style": "default",
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/front/styles/globals.css",
    "baseColor": "neutral",
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/shadcn/ui"
  }
}
```

コンポーネント追加コマンド:
```bash
npm run ui button  # ボタンコンポーネント追加
npm run ui card    # カードコンポーネント追加
```

#### shadcn/ui使用例
```typescript
// src/front/components/daily-report-form.tsx
import { Button } from '@/components/shadcn/ui/button'
import { Input } from '@/components/shadcn/ui/input'
import { Textarea } from '@/components/shadcn/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/ui/card'

export const DailyReportForm = () => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'workRecords'
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>日報作成</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 作業記録 */}
        {fields.map((field, index) => (
          <div key={field.id} className="space-y-2 border rounded p-4">
            <Input placeholder="プロジェクト名" {...register(`workRecords.${index}.projectName`)} />
            <Input type="number" placeholder="作業時間" {...register(`workRecords.${index}.workHours`)} />
            <Textarea placeholder="作業内容" {...register(`workRecords.${index}.workContent`)} />
            <Button variant="destructive" onClick={() => remove(index)}>削除</Button>
          </div>
        ))}
        
        <Button onClick={() => append({ projectName: '', workHours: 0, workContent: '' })}>
          作業記録追加
        </Button>
        
        {/* その他事項 */}
        <Textarea placeholder="困ったこと、相談したいこと" {...register('memo')} />
        <Textarea placeholder="明日やること" {...register('tomorrowPlan')} />
      </CardContent>
    </Card>
  )
}
```

## 開発フロー

### セットアップ
1. `docker-compose up -d` - PostgreSQLコンテナ起動
2. `npm install` - 依存関係インストール
3. `npm run db:setup` - Prisma初期化
4. `npm run proto:generate` - Protocol Buffers生成
5. `npm run dev` - 開発サーバー起動

### 開発フェーズ
1. **Phase 1**: 基本機能（認証、日報CRUD、コメント）
2. **Phase 2**: 集計・レポート機能
3. **Phase 3**: Slack連携機能

### テスト実行
```bash
# 全テスト実行
npm run test

# ウォッチモード
npm run test:watch

# カバレッジ
npm run test:coverage
```

### コンポーネント管理
```bash
# shadcn/uiコンポーネント追加
npm run ui
```

## Docker構成

### docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: daily-report-db
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: daily_report
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### Docker操作コマンド
```bash
# PostgreSQL起動
docker-compose up -d

# PostgreSQL停止
docker-compose down

# データボリューム込みで削除
docker-compose down -v

# ログ確認
docker-compose logs -f postgres

# PostgreSQLに接続
docker-compose exec postgres psql -U postgres -d daily_report
```

## 環境変数

### Backend (.env)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/daily_report"
JWT_SECRET="your-jwt-secret"
SLACK_BOT_TOKEN="xoxb-your-slack-bot-token"
SLACK_CHANNEL_ID="C1234567890"
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_GRPC_URL="http://localhost:9090"
```

## デプロイメント

### 本番環境
- **Frontend**: Vercel
- **Backend**: Railway / Render
- **Database**: PostgreSQL (Railway / Supabase)

### CI/CD
- GitHub Actions（未設定）
- 自動テスト実行（計画中）
- 型チェック（ローカルのみ）
- リント・フォーマット（Biome設定済み）
- セキュリティスキャン（未設定）

## 現在の実装状況と次のステップ

### ✅ 完了済み（2024年12月時点）

1. **プロジェクト基盤**
   - モノレポ構成（npm workspaces）
   - TypeScript strict mode設定
   - Biome（linting/formatting）設定
   - Vitest + Playwright テスト環境

2. **バックエンド ドメイン層**
   - Branded Types（型安全性確保）
   - Either型によるエラーハンドリング
   - 日報・ユーザー ドメインモデル
   - 包括的なワークフロー実装（作成、更新、提出、承認、差し戻し）
   - ドメインエラー型定義

3. **データベース設計**
   - 完全なPrismaスキーマ（User, Department, Project, DailyReport, Task, Notification）
   - リレーション設計完了

4. **バックエンド インフラ層（部分実装）**
   - Prismaクライアント設定
   - Repository実装（DailyReport, User）
   - 認証サービス（bcrypt, JWT）

5. **フロントエンド基盤**
   - Next.js 14 + App Router
   - shadcn/ui設定とコンポーネント導入
   - 認証フォーム（React Hook Form + Zod）
   - Zustand認証ストア

6. **テスト**
   - ドメインワークフロー単体テスト
   - E2E認証フローテスト

### 🚧 次の優先実装項目

**Phase 1A - 基本機能完成**:
1. REST API CRUD操作完全実装
2. フロントエンド日報作成・編集画面
3. 日報一覧・詳細表示画面
4. ユーザー管理画面（管理者向け）
5. 基本的な認証・認可機能

**Phase 1B - ワークフロー完成**:
1. 日報承認・差し戻しUI
2. 通知システム基盤
3. プロジェクト管理機能
4. 部門管理機能

**Phase 2 - 高度な機能**:
1. gRPCサーバー・クライアント実装
2. レポート生成（CSV/PDF）
3. 集計・分析画面
4. ダッシュボード機能

**Phase 3 - 外部連携**:
1. Slack API連携
2. リマインダー・通知システム
3. 本番デプロイ環境構築

### 技術的負債と改善項目
- Protocol Buffers生成スクリプト実装
- Docker Compose設定
- CI/CD パイプライン構築
- セキュリティ監査・テスト
- パフォーマンス最適化
- エラー境界とログ管理