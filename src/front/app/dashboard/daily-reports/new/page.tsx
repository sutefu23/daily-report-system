import { DailyReportForm } from "@/components/daily-report/daily-report-form"

export default function NewDailyReportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">日報作成</h2>
        <p className="text-muted-foreground">
          本日の作業内容を記録してください
        </p>
      </div>
      <DailyReportForm />
    </div>
  )
}