import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing data
  await prisma.notification.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.task.deleteMany()
  await prisma.dailyReport.deleteMany()
  await prisma.user.deleteMany()
  await prisma.project.deleteMany()
  await prisma.department.deleteMany()

  console.log('✅ Cleared existing data')

  // Create departments
  const engineering = await prisma.department.create({
    data: {
      name: '開発部',
      description: 'ソフトウェア開発を担当する部門',
    },
  })

  const sales = await prisma.department.create({
    data: {
      name: '営業部',
      description: '営業活動を担当する部門',
    },
  })

  const hr = await prisma.department.create({
    data: {
      name: '人事部',
      description: '人事管理を担当する部門',
    },
  })

  console.log('✅ Created departments')

  // Create users
  const adminPassword = await hash('admin123', 10)
  const managerPassword = await hash('manager123', 10)
  const employeePassword = await hash('employee123', 10)

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      username: 'admin',
      passwordHash: adminPassword,
      name: '管理者',
      role: 'ADMIN',
      departmentId: hr.id,
      slackUserId: 'U_ADMIN_001',
    },
  })

  const manager1 = await prisma.user.create({
    data: {
      email: 'manager1@example.com',
      username: 'yamada.taro',
      passwordHash: managerPassword,
      name: '山田 太郎',
      role: 'MANAGER',
      departmentId: engineering.id,
      slackUserId: 'U_MANAGER_001',
    },
  })

  const manager2 = await prisma.user.create({
    data: {
      email: 'manager2@example.com',
      username: 'sato.hanako',
      passwordHash: managerPassword,
      name: '佐藤 花子',
      role: 'MANAGER',
      departmentId: sales.id,
      slackUserId: 'U_MANAGER_002',
    },
  })

  const employee1 = await prisma.user.create({
    data: {
      email: 'employee1@example.com',
      username: 'suzuki.ichiro',
      passwordHash: employeePassword,
      name: '鈴木 一郎',
      role: 'EMPLOYEE',
      departmentId: engineering.id,
      managerId: manager1.id,
      slackUserId: 'U_EMPLOYEE_001',
    },
  })

  const employee2 = await prisma.user.create({
    data: {
      email: 'employee2@example.com',
      username: 'tanaka.jiro',
      passwordHash: employeePassword,
      name: '田中 二郎',
      role: 'EMPLOYEE',
      departmentId: engineering.id,
      managerId: manager1.id,
      slackUserId: 'U_EMPLOYEE_002',
    },
  })

  const employee3 = await prisma.user.create({
    data: {
      email: 'employee3@example.com',
      username: 'takahashi.saburo',
      passwordHash: employeePassword,
      name: '高橋 三郎',
      role: 'EMPLOYEE',
      departmentId: sales.id,
      managerId: manager2.id,
      slackUserId: 'U_EMPLOYEE_003',
    },
  })

  console.log('✅ Created users')

  // Create projects
  const project1 = await prisma.project.create({
    data: {
      name: '新規Webアプリケーション開発',
      description: '顧客管理システムの新規開発プロジェクト',
      departmentId: engineering.id,
      status: 'ACTIVE',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
    },
  })

  const project2 = await prisma.project.create({
    data: {
      name: 'モバイルアプリ改修',
      description: '既存モバイルアプリのUI/UX改善',
      departmentId: engineering.id,
      status: 'ACTIVE',
      startDate: new Date('2024-06-01'),
    },
  })

  const project3 = await prisma.project.create({
    data: {
      name: '新規顧客開拓キャンペーン',
      description: '2024年度の新規顧客獲得キャンペーン',
      departmentId: sales.id,
      status: 'ACTIVE',
      startDate: new Date('2024-04-01'),
      endDate: new Date('2024-09-30'),
    },
  })

  console.log('✅ Created projects')

  // Create daily reports with tasks
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const twoDaysAgo = new Date(today)
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

  // Employee1's reports
  const report1 = await prisma.dailyReport.create({
    data: {
      userId: employee1.id,
      date: today,
      challenges: 'APIのレスポンス速度が遅い問題について調査中です。',
      nextDayPlan: 'キャッシュ機構の実装を進める予定です。',
      status: 'SUBMITTED',
      submittedAt: new Date(),
      tasks: {
        create: [
          {
            projectId: project1.id,
            description: 'ユーザー認証APIの実装',
            hoursSpent: 4.5,
            progress: 80,
          },
          {
            projectId: project1.id,
            description: 'データベーススキーマの設計',
            hoursSpent: 3.0,
            progress: 100,
          },
        ],
      },
    },
  })

  const report2 = await prisma.dailyReport.create({
    data: {
      userId: employee1.id,
      date: yesterday,
      challenges: '特になし',
      nextDayPlan: 'APIの実装を継続',
      status: 'APPROVED',
      submittedAt: yesterday,
      approvedAt: yesterday,
      approvedBy: manager1.id,
      feedback: '良い進捗です。APIのパフォーマンスにも注意してください。',
      tasks: {
        create: [
          {
            projectId: project1.id,
            description: 'ログイン機能の実装',
            hoursSpent: 6.0,
            progress: 100,
          },
          {
            projectId: project1.id,
            description: 'ユニットテストの作成',
            hoursSpent: 2.0,
            progress: 50,
          },
        ],
      },
    },
  })

  // Employee2's report
  const report3 = await prisma.dailyReport.create({
    data: {
      userId: employee2.id,
      date: today,
      challenges: 'React Nativeのバージョンアップで一部機能が動作しない',
      nextDayPlan: '問題の原因を特定し、修正を行う',
      status: 'DRAFT',
      tasks: {
        create: [
          {
            projectId: project2.id,
            description: 'React Nativeのバージョンアップ',
            hoursSpent: 3.0,
            progress: 40,
          },
          {
            projectId: project2.id,
            description: '新UIコンポーネントの実装',
            hoursSpent: 4.5,
            progress: 60,
          },
        ],
      },
    },
  })

  // Employee3's report
  const report4 = await prisma.dailyReport.create({
    data: {
      userId: employee3.id,
      date: yesterday,
      challenges: '見込み客へのアプローチ方法を改善する必要がある',
      nextDayPlan: '新しいプレゼン資料を作成する',
      status: 'REJECTED',
      submittedAt: yesterday,
      rejectedAt: yesterday,
      rejectedBy: manager2.id,
      feedback: '具体的な数値目標を記載してください。訪問件数や商談数など。',
      tasks: {
        create: [
          {
            projectId: project3.id,
            description: '新規顧客訪問（5件）',
            hoursSpent: 5.0,
            progress: 100,
          },
          {
            projectId: project3.id,
            description: '提案資料の作成',
            hoursSpent: 3.0,
            progress: 70,
          },
        ],
      },
    },
  })

  console.log('✅ Created daily reports with tasks')

  // Create comments
  await prisma.comment.create({
    data: {
      dailyReportId: report1.id,
      userId: manager1.id,
      content: 'APIのパフォーマンス問題について、明日ミーティングで詳しく話しましょう。',
      isRead: false,
    },
  })

  await prisma.comment.create({
    data: {
      dailyReportId: report2.id,
      userId: manager1.id,
      content: 'テストカバレッジも意識して進めてください。目標は80%以上です。',
      isRead: true,
    },
  })

  console.log('✅ Created comments')

  // Create notifications
  await prisma.notification.create({
    data: {
      userId: manager1.id,
      type: 'REPORT_SUBMITTED',
      title: '日報が提出されました',
      message: '鈴木 一郎さんから日報が提出されました。',
      relatedEntityId: report1.id,
      relatedEntityType: 'daily_report',
    },
  })

  await prisma.notification.create({
    data: {
      userId: employee1.id,
      type: 'COMMENT_ADDED',
      title: '新しいコメントがあります',
      message: '山田 太郎さんがあなたの日報にコメントしました。',
      relatedEntityId: report1.id,
      relatedEntityType: 'daily_report',
      isRead: false,
    },
  })

  await prisma.notification.create({
    data: {
      userId: employee3.id,
      type: 'REPORT_REJECTED',
      title: '日報が差し戻されました',
      message: '佐藤 花子さんがあなたの日報を差し戻しました。',
      relatedEntityId: report4.id,
      relatedEntityType: 'daily_report',
      isRead: true,
      readAt: yesterday,
    },
  })

  console.log('✅ Created notifications')

  // Display summary
  const departmentCount = await prisma.department.count()
  const userCount = await prisma.user.count()
  const projectCount = await prisma.project.count()
  const reportCount = await prisma.dailyReport.count()
  const taskCount = await prisma.task.count()
  const commentCount = await prisma.comment.count()
  const notificationCount = await prisma.notification.count()

  console.log('\n📊 Seeding Summary:')
  console.log(`  - Departments: ${departmentCount}`)
  console.log(`  - Users: ${userCount}`)
  console.log(`  - Projects: ${projectCount}`)
  console.log(`  - Daily Reports: ${reportCount}`)
  console.log(`  - Tasks: ${taskCount}`)
  console.log(`  - Comments: ${commentCount}`)
  console.log(`  - Notifications: ${notificationCount}`)

  console.log('\n🔑 Test Accounts:')
  console.log('  Admin: admin@example.com / admin123')
  console.log('  Manager: manager1@example.com / manager123')
  console.log('  Employee: employee1@example.com / employee123')
}

main()
  .then(async () => {
    await prisma.$disconnect()
    console.log('\n✅ Database seeding completed!')
  })
  .catch(async (e) => {
    console.error('❌ Error during seeding:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
