'use client'

import { useState, useEffect } from 'react'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function OpsDashboardClock() {
  const [display, setDisplay] = useState('')

  useEffect(() => {
    function update() {
      const now = new Date()
      const d = `${now.getDate()} ${MONTH_SHORT[now.getMonth()]} ${now.getFullYear()}`
      const h = String(now.getHours()).padStart(2, '0')
      const m = String(now.getMinutes()).padStart(2, '0')
      setDisplay(`${d} — ${h}:${m} GST`)
    }
    update()
    const id = setInterval(update, 10_000)
    return () => clearInterval(id)
  }, [])

  return <span suppressHydrationWarning>{display}</span>
}
