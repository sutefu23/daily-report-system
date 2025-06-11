# Integration Test Plan - 日報管理システム

## 概要
本ドキュメントは日報管理システムの統合テスト計画を定義します。各レイヤー間の連携、外部サービスとの統合、エンドツーエンドのユーザーフローをカバーします。

## テスト環境要件
- PostgreSQL (Docker Container)
- Test Database with migrations applied
- JWT Secret for testing
- Mock Slack API (or test workspace)
- Admin credentials from environment variables

## 1. 認証・認可統合テスト

### 1.1 ユーザー登録フロー
```typescript
describe("User Registration Integration", () => {
  test("新規ユーザー登録から認証まで", async () => {
    // 1. POST /api/users でユーザー作成
    // 2. パスワードのbcryptハッシュ化確認
    // 3. データベースへの保存確認
    // 4. POST /api/auth/login でログイン
    // 5. JWTトークン取得確認
  })

  test("重複メールアドレスでの登録拒否", async () => {
    // 1. 既存ユーザー作成
    // 2. 同じメールアドレスで登録試行
    // 3. 適切なエラーレスポンス確認
  })

  test("無効なメールアドレス形式の検証", async () => {
    // 各種無効なメールアドレスでのテスト
  })

  test("パスワード要件の検証", async () => {
    // 弱いパスワードでの登録拒否確認
  })
})
```

### 1.2 ログイン・セッション管理
```typescript
describe("Authentication Flow Integration", () => {
  test("正常なログインフロー", async () => {
    // 1. 正しい認証情報でログイン
    // 2. アクセストークン・リフレッシュトークン取得
    // 3. トークンでの認証済みリクエスト
  })

  test("無効な認証情報でのログイン失敗", async () => {
    // 1. 間違ったパスワードでログイン試行
    // 2. 存在しないメールアドレスでログイン試行
    // 3. 適切なエラーレスポンス確認
  })

  test("トークンベース認証", async () => {
    // 1. 有効なトークンでのAPIアクセス
    // 2. 期限切れトークンでのアクセス拒否
    // 3. 無効なトークンでのアクセス拒否
  })
})
```

### 1.3 ロールベースアクセス制御
```typescript
describe("Role-based Authorization Integration", () => {
  test("一般ユーザーの権限制限", async () => {
    // 1. memberロールでログイン
    // 2. 自分の日報作成・更新・提出が可能
    // 3. 他人の日報承認が不可
  })

  test("管理者の承認権限", async () => {
    // 1. admin/managerロールでログイン
    // 2. 部下の日報承認・差し戻しが可能
    // 3. 権限のない日報へのアクセス制限
  })

  test("Admin seederによる初期管理者作成", async () => {
    // 1. 環境変数からの管理者情報読み込み
    // 2. npm run db:seed実行
    // 3. 管理者アカウントでのログイン確認
  })
})
```

## 2. 日報CRUD操作統合テスト

### 2.1 日報作成フロー
```typescript
describe("Daily Report Creation Integration", () => {
  test("完全な日報作成プロセス", async () => {
    // 1. 認証済みユーザーで日報作成
    // 2. タスク情報を含む日報データ送信
    // 3. データベースへの保存確認（DailyReport + WorkRecord）
    // 4. 作成された日報の取得確認
  })

  test("同一日付での重複作成防止", async () => {
    // 1. 特定日付で日報作成
    // 2. 同じ日付で再度作成試行
    // 3. DAILY_REPORT_ALREADY_EXISTSエラー確認
  })

  test("タスク時間の検証（24時間制限）", async () => {
    // 1. 合計25時間のタスクで日報作成試行
    // 2. INVALID_TASK_HOURSエラー確認
  })

  test("進捗率の検証（0-100%）", async () => {
    // 1. 無効な進捗率（-10%, 150%）でタスク作成
    // 2. INVALID_PROGRESS_VALUEエラー確認
  })

  test("トランザクション処理の確認", async () => {
    // 1. 複数タスクを含む日報作成
    // 2. 途中でエラーを発生させる
    // 3. ロールバック確認（部分的な保存がないこと）
  })
})
```

### 2.2 日報更新フロー
```typescript
describe("Daily Report Update Integration", () => {
  test("ドラフト状態の日報更新", async () => {
    // 1. ドラフト日報の作成
    // 2. タスクの追加・削除・更新
    // 3. WorkRecordの削除・再作成確認
    // 4. 更新後のデータ整合性確認
  })

  test("提出済み日報の更新拒否", async () => {
    // 1. 日報を提出状態に変更
    // 2. 更新試行
    // 3. INVALID_STATUS_TRANSITIONエラー確認
  })

  test("差し戻し日報の再編集", async () => {
    // 1. 日報を差し戻し状態に設定
    // 2. 内容更新
    // 3. 再提出可能であることの確認
  })

  test("他ユーザーの日報更新拒否", async () => {
    // 1. 別ユーザーの日報を更新試行
    // 2. UNAUTHORIZEDエラー確認
  })
})
```

### 2.3 日報ステータス遷移
```typescript
describe("Daily Report Status Transition Integration", () => {
  test("ドラフト→提出→承認フロー", async () => {
    // 1. ドラフト日報作成
    // 2. POST /api/daily-reports/:id/submit で提出
    // 3. 管理者ログイン
    // 4. POST /api/daily-reports/:id/approve で承認
    // 5. 各ステータス遷移の確認
  })

  test("提出→差し戻し→再提出フロー", async () => {
    // 1. 日報提出
    // 2. POST /api/daily-reports/:id/reject でフィードバック付き差し戻し
    // 3. 内容修正
    // 4. 再提出
  })

  test("無効なステータス遷移の防止", async () => {
    // 1. 承認済み日報の再提出試行
    // 2. ドラフトから直接承認試行
    // 3. 各種無効な遷移のエラー確認
  })
})
```

## 3. データベース統合テスト

### 3.1 Prismaリポジトリ層
```typescript
describe("Repository Layer Integration", () => {
  test("UserRepositoryの完全性", async () => {
    // 1. create: パスワードハッシュ化確認
    // 2. findByEmail: 大文字小文字を区別しない検索
    // 3. update: 部分更新の動作確認
    // 4. findById: Branded Type変換確認
  })

  test("DailyReportRepositoryのトランザクション", async () => {
    // 1. create: DailyReport + WorkRecord同時作成
    // 2. update: WorkRecord削除→再作成の原子性
    // 3. findByUserAndDate: 日付での一意性確認
  })

  test("スキーマ不整合の対処", async () => {
    // 1. ドメインモデル→Prismaモデル変換
    // 2. フィールド名マッピング（tasks ↔ workRecords）
    // 3. 欠落フィールドのデフォルト値設定
  })
})
```

### 3.2 データ整合性
```typescript
describe("Data Integrity Integration", () => {
  test("外部キー制約の動作", async () => {
    // 1. 存在しないユーザーIDでの日報作成拒否
    // 2. 存在しないプロジェクトIDでのタスク作成拒否
    // 3. カスケード削除の動作確認
  })

  test("一意制約の動作", async () => {
    // 1. 同一メールアドレスでのユーザー作成拒否
    // 2. 同一ユーザー・日付での日報作成拒否
  })

  test("データマイグレーション", async () => {
    // 1. prisma migrate deployの実行
    // 2. スキーマバージョンの確認
    // 3. ロールバック可能性の確認
  })
})
```

## 4. 外部サービス統合テスト

### 4.1 Slack通知連携
```typescript
describe("Slack Integration", () => {
  test("日報提出時の上司への通知", async () => {
    // 1. supervisorIdとslackIdの設定
    // 2. 日報提出
    // 3. Slack APIコールの確認
    // 4. 通知メッセージ内容の検証
  })

  test("Slack API障害時の処理", async () => {
    // 1. Slack APIをモックでエラー返却
    // 2. 日報提出は成功することを確認
    // 3. エラーログの記録確認
  })

  test("承認・差し戻し時の通知", async () => {
    // 1. 日報承認時の作成者への通知
    // 2. 差し戻し時のフィードバック付き通知
    // 3. 通知失敗時のリトライ処理
  })
})
```

## 5. エンドツーエンド統合テスト

### 5.1 完全なユーザーフロー
```typescript
describe("E2E User Journey Integration", () => {
  test("新入社員の初回日報提出フロー", async () => {
    // 1. 管理者による新規ユーザー作成
    // 2. 初回ログイン
    // 3. プロジェクト割り当て確認
    // 4. 日報作成・タスク登録
    // 5. 提出→上司通知
    // 6. 上司による承認→本人通知
  })

  test("月次日報サイクル", async () => {
    // 1. 月初から月末まで日報作成
    // 2. 週次での上司レビュー
    // 3. 月次集計レポート生成
    // 4. パフォーマンス確認（大量データ）
  })
})
```

### 5.2 エラーリカバリー
```typescript
describe("Error Recovery Integration", () => {
  test("ネットワーク障害からの復旧", async () => {
    // 1. API呼び出し中のタイムアウト
    // 2. リトライ処理の動作確認
    // 3. 部分的な更新の整合性確保
  })

  test("同時更新の競合解決", async () => {
    // 1. 同じ日報を複数ユーザーが同時更新
    // 2. 楽観的ロックによる競合検出
    // 3. 適切なエラーメッセージ返却
  })
})
```

## 6. パフォーマンス統合テスト

### 6.1 負荷テスト
```typescript
describe("Performance Integration", () => {
  test("大量日報データでの検索性能", async () => {
    // 1. 1000件の日報データ生成
    // 2. 日付範囲での検索性能測定
    // 3. インデックス効果の確認
  })

  test("同時アクセス処理", async () => {
    // 1. 100ユーザー同時ログイン
    // 2. 同時日報作成
    // 3. レスポンスタイム測定
  })
})
```

## 7. セキュリティ統合テスト

### 7.1 認証・認可セキュリティ
```typescript
describe("Security Integration", () => {
  test("SQLインジェクション防止", async () => {
    // 1. 各種SQLインジェクション試行
    // 2. Prismaによるサニタイズ確認
  })

  test("XSS防止", async () => {
    // 1. 悪意のあるスクリプトを含む日報作成
    // 2. 適切なエスケープ処理確認
  })

  test("CSRF防止", async () => {
    // 1. 異なるオリジンからのリクエスト
    // 2. トークンベース認証での保護確認
  })

  test("機密情報の保護", async () => {
    // 1. パスワードがレスポンスに含まれない
    // 2. 他ユーザーの個人情報アクセス制限
    // 3. ログに機密情報が記録されない
  })
})
```

## 8. 実装優先順位

### Phase 1 (必須)
1. 認証フロー統合テスト
2. 基本的な日報CRUD統合テスト
3. データベース整合性テスト

### Phase 2 (重要)
1. ステータス遷移統合テスト
2. ロールベース認可テスト
3. エラーハンドリング統合テスト

### Phase 3 (追加機能)
1. Slack通知統合テスト
2. パフォーマンステスト
3. セキュリティテスト

## テスト実行環境

### ローカル環境
```bash
# テスト用データベース起動
docker-compose up -d postgres-test

# マイグレーション実行
npm run db:migrate:test

# 統合テスト実行
npm run test:integration

# 特定のテストスイート実行
npm run test:integration -- --grep "Authentication"
```

### CI/CD環境
```yaml
# GitHub Actions設定例
test-integration:
  services:
    postgres:
      image: postgres:16
      env:
        POSTGRES_PASSWORD: postgres
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
```

## テストデータ管理

### Fixtures
```typescript
// test/fixtures/users.ts
export const testUsers = {
  admin: {
    email: "admin@test.com",
    password: "AdminPassword123!",
    role: "admin"
  },
  member: {
    email: "member@test.com", 
    password: "MemberPassword123!",
    role: "member"
  }
}

// test/fixtures/daily-reports.ts
export const testReports = {
  draft: { status: "draft" },
  submitted: { status: "submitted" },
  approved: { status: "approved" }
}
```

### データベースクリーンアップ
```typescript
beforeEach(async () => {
  await prisma.$transaction([
    prisma.workRecord.deleteMany(),
    prisma.dailyReport.deleteMany(),
    prisma.user.deleteMany()
  ])
})
```

## モニタリング・レポート

### カバレッジ目標
- 統合テスト: 80%以上
- 重要フロー: 100%
- エラーケース: 90%以上

### テスト結果レポート
```bash
# カバレッジレポート生成
npm run test:integration:coverage

# HTMLレポート表示
open coverage/index.html
```

## 注意事項

1. **環境分離**: テスト環境は本番環境から完全に分離すること
2. **データ保護**: 本番データをテストに使用しない
3. **並列実行**: テストは並列実行可能に設計する
4. **冪等性**: 各テストは独立して実行可能にする
5. **タイムアウト**: 適切なタイムアウトを設定し、無限待機を防ぐ