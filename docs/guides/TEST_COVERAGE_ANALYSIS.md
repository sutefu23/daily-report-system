# Test Coverage Analysis - 日報管理システム

## 概要
本ドキュメントは、システム仕様書（SPECIFICATION.md、UI_SPECIFICATIONS.md）と現在の統合テストカバレッジの比較分析です。

## 1. 仕様書の要件サマリー

### 機能要件（SPECIFICATION.md より）

#### Phase 1 機能（現在実装中）
- ✅ ユーザー認証・管理
- 🚧 日報作成・編集・閲覧
- 🚧 作業記録の複数行管理（プロジェクト、作業時間、作業内容、進捗率）
- ✅ 困ったこと・明日の予定記録
- 🚧 日報の承認・差し戻しワークフロー

#### Phase 2 機能（計画中）
- 上司によるコメント機能
- 従業員別・プロジェクト別集計
- レポート出力（CSV/PDF）
- gRPC API実装

#### Phase 3 機能（将来）
- Slack連携（リマインダー、通知）
- 高度な分析・ダッシュボード機能

### UI要件（UI_SPECIFICATIONS.md より）

#### 主要画面
1. 認証画面（ログイン、ユーザー登録）
2. ダッシュボード（一般ユーザー、管理者）
3. 日報作成・編集・詳細・一覧画面
4. チーム管理画面（管理者専用）
5. 統計・レポート画面
6. 設定画面

## 2. 現在の統合テストカバレッジ

### ✅ テスト済み機能

#### 認証フロー（simple-auth.test.ts）
- ✅ ユーザー作成とパスワードハッシュ化
- ✅ パスワード検証
- ✅ 重複メールアドレスの防止
- ✅ データベース整合性

#### 日報CRUD操作（daily-report-flow.test.ts）
- ✅ 日報作成（複数タスク含む）
- ✅ 作業記録の更新（削除・再作成）
- ✅ 日付ごとの一意性制約
- ✅ 作業時間の24時間制限検証
- ✅ カスケード削除
- ✅ マネージャーによるコメント追加
- ✅ 日付範囲での日報検索
- ✅ マネージャーのチーム日報閲覧
- ✅ プロジェクト別統計計算

### ❌ 未テスト機能

#### 認証・認可
- ❌ JWT トークン生成・検証
- ❌ ロールベースアクセス制御（admin/manager/employee）
- ❌ トークンリフレッシュ
- ❌ ログアウト処理
- ❌ パスワードリセット

#### 日報ワークフロー
- ❌ 日報提出（draft → submitted）
- ❌ 日報承認（submitted → approved）
- ❌ 日報差し戻し（submitted → rejected）
- ❌ 再提出フロー（rejected → submitted）
- ❌ 承認権限の検証（managerのみ承認可能）

#### ビジネスルール検証
- ❌ 進捗率の0-100%範囲検証
- ❌ 他ユーザーの日報編集防止
- ❌ ステータス遷移ルール
- ❌ 提出済み日報の編集防止

#### 部署・プロジェクト管理
- ❌ 部署の作成・管理（Departmentテーブルなし）
- ❌ プロジェクトの有効/無効化
- ❌ プロジェクト割り当て

#### 通知機能
- ❌ 日報提出時の上司への通知
- ❌ 承認・差し戻し時の通知
- ❌ Slack連携（Phase 3）

#### API エンドポイント
- ❌ REST API 統合テスト
- ❌ 認証ミドルウェア
- ❌ エラーレスポンス形式
- ❌ ページネーション
- ❌ フィルタリング・ソート

## 3. スキーマと仕様の不整合

### 発見された問題

1. **Departmentテーブルの欠如**
   - 仕様: User.departmentId が存在
   - 実装: Prismaスキーマに Department テーブルなし

2. **フィールド名の不一致**
   - 仕様: User.name, DailyReport.tasks
   - 実装: User.username, DailyReport.workRecords

3. **ステータスフィールドの欠如**
   - 仕様: DailyReport.status (draft/submitted/approved/rejected)
   - 実装: DailyReport にステータスフィールドなし

4. **承認関連フィールドの欠如**
   - 仕様: approvedAt, approvedBy, feedback
   - 実装: これらのフィールドが存在しない

5. **UserRole の不一致**
   - 仕様: admin/manager/employee
   - 実装: admin/manager/member

## 4. 推奨される統合テスト追加項目

### 優先度: 高

#### 1. 完全な認証フローテスト
```typescript
describe("Authentication E2E Flow", () => {
  test("ログインからトークン取得、認証付きAPIアクセスまで")
  test("トークン期限切れとリフレッシュ")
  test("無効なトークンでのアクセス拒否")
  test("ロールベースのエンドポイントアクセス制御")
})
```

#### 2. 日報承認ワークフローテスト
```typescript
describe("Daily Report Approval Workflow", () => {
  test("完全な承認フロー: 作成→提出→承認")
  test("差し戻しフロー: 提出→差し戻し→修正→再提出→承認")
  test("権限検証: 一般ユーザーによる承認試行の拒否")
  test("無効なステータス遷移の防止")
})
```

#### 3. REST API 統合テスト
```typescript
describe("REST API Integration", () => {
  test("POST /api/auth/login - 認証エンドポイント")
  test("GET /api/daily-reports - ページネーション付き一覧取得")
  test("POST /api/daily-reports - 新規作成とバリデーション")
  test("PUT /api/daily-reports/:id - 更新と権限チェック")
  test("POST /api/daily-reports/:id/submit - 提出処理")
  test("POST /api/daily-reports/:id/approve - 承認処理")
})
```

### 優先度: 中

#### 4. データ整合性テスト
```typescript
describe("Data Integrity", () => {
  test("トランザクション: 日報作成失敗時のロールバック")
  test("同時更新の競合解決")
  test("削除時の参照整合性")
})
```

#### 5. パフォーマンステスト
```typescript
describe("Performance Tests", () => {
  test("大量データでの日報検索性能")
  test("同時アクセス処理")
  test("N+1問題の検証")
})
```

### 優先度: 低

#### 6. Slack連携テスト（Phase 3）
```typescript
describe("Slack Integration", () => {
  test("日報提出通知")
  test("承認・差し戻し通知")
  test("リマインダー送信")
})
```

## 5. テスト環境の改善提案

### 1. スキーマ移行
- Departmentテーブルの追加
- DailyReportへのステータスフィールド追加
- 承認関連フィールドの追加

### 2. テストデータ管理
- Factoryパターンの実装
- シードデータの整備
- テストごとのデータ分離

### 3. API テストツール
- Supertest の導入
- OpenAPI スキーマベースのテスト
- モックサーバーの活用

### 4. CI/CD 統合
- GitHub Actions での自動テスト
- カバレッジレポート
- パフォーマンス回帰テスト

## 6. アクションアイテム

### 即座に対応すべき項目
1. ✅ Prismaスキーマの修正（ステータス、承認フィールド追加）
2. ✅ 日報ワークフロー統合テストの実装
3. ✅ JWT認証統合テストの実装

### 段階的に対応する項目
1. REST API エンドポイントテスト
2. ロールベースアクセス制御テスト
3. エラーハンドリング統合テスト
4. パフォーマンステスト

### 将来的な対応項目
1. Slack連携テスト
2. レポート生成テスト
3. 高度な分析機能テスト

## まとめ

現在の統合テストは基本的なCRUD操作とデータ整合性をカバーしていますが、ビジネスクリティカルなワークフロー（承認プロセス）、認証・認可、APIエンドポイントのテストが不足しています。

スキーマと仕様の不整合を解消し、優先度の高いテストから順次実装することで、システムの信頼性と保守性を向上させることができます。