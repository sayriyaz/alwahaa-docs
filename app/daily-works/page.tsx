import { redirect } from 'next/navigation'
import { normalizeDailyWorksDate } from '@/lib/daily-works'

export default function DailyWorksIndexPage() {
  const today = normalizeDailyWorksDate(null)
  redirect(`/daily-works/${today}`)
}
