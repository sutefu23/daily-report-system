import { DailyReportDetail } from "@/components/daily-report/daily-report-detail"

export default function DailyReportDetailPage({
  params,
}: {
  params: { id: string }
}) {
  return <DailyReportDetail reportId={params.id} />
}