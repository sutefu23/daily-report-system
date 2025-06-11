// 基本型定義とユーティリティ型

// Brand型: 型レベルでの識別子を追加
export type Brand<K, T> = K & { __brand: T }

// ID型定義
export type UserId = Brand<string, 'UserId'>
export type DailyReportId = Brand<string, 'DailyReportId'>
export type DepartmentId = Brand<string, 'DepartmentId'>
export type ProjectId = Brand<string, 'ProjectId'>
export type TaskId = Brand<string, 'TaskId'>
export type CommentId = Brand<string, 'CommentId'>
export type NotificationId = Brand<string, 'NotificationId'>

// ID作成関数
export const createUserId = (id: string): UserId => id as UserId
export const createDailyReportId = (id: string): DailyReportId => id as DailyReportId
export const createDepartmentId = (id: string): DepartmentId => id as DepartmentId
export const createProjectId = (id: string): ProjectId => id as ProjectId
export const createTaskId = (id: string): TaskId => id as TaskId
export const createCommentId = (id: string): CommentId => id as CommentId
export const createNotificationId = (id: string): NotificationId => id as NotificationId

// Either型: エラーハンドリング用
export type Either<E, A> =
  | { tag: 'Left'; left: E } // エラー
  | { tag: 'Right'; right: A } // 成功

// Either型のコンストラクタ
export const left = <E, A>(e: E): Either<E, A> => ({ tag: 'Left', left: e })
export const right = <E, A>(a: A): Either<E, A> => ({ tag: 'Right', right: a })

// Either型のユーティリティ関数
export const isLeft = <E, A>(either: Either<E, A>): either is { tag: 'Left'; left: E } =>
  either.tag === 'Left'
export const isRight = <E, A>(either: Either<E, A>): either is { tag: 'Right'; right: A } =>
  either.tag === 'Right'

// Either型のmap関数
export const map = <E, A, B>(either: Either<E, A>, f: (a: A) => B): Either<E, B> => {
  if (isRight(either)) {
    return right(f(either.right))
  }
  return either
}

// Either型のflatMap関数
export const flatMap = <E, A, B>(either: Either<E, A>, f: (a: A) => Either<E, B>): Either<E, B> => {
  if (isRight(either)) {
    return f(either.right)
  }
  return either
}

// Result型: Either型のエイリアス
export type Result<E, A> = Either<E, A>

// Option型: 値が存在するかしないかを表現
export type Option<A> = { tag: 'None' } | { tag: 'Some'; value: A }

// Option型のコンストラクタ
export const none = <A>(): Option<A> => ({ tag: 'None' })
export const some = <A>(value: A): Option<A> => ({ tag: 'Some', value })

// Option型のユーティリティ関数
export const isNone = <A>(option: Option<A>): option is { tag: 'None' } => option.tag === 'None'
export const isSome = <A>(option: Option<A>): option is { tag: 'Some'; value: A } =>
  option.tag === 'Some'

// 非空配列型
export type NonEmptyArray<T> = [T, ...T[]]

// 日付型のバリデーション
export const isValidDate = (date: Date): boolean => !Number.isNaN(date.getTime())

// 共通のタイムスタンプ型
export type Timestamps = {
  createdAt: Date
  updatedAt: Date
}
