import { redirect } from 'next/navigation'

export default async function DailyWorksByDatePage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const { date } = await params
  redirect(`/daily-works?date=${encodeURIComponent(date)}`)
}
