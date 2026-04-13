import type { Metadata } from 'next'
import './globals.css'
import AppNavbar from '@/components/app-navbar'
import AuthSessionSync from '@/components/auth-session-sync'
import { ToastProvider } from '@/components/ui/toast'

export const metadata: Metadata = {
  title: 'Alwahaa Documents',
  description: 'Alwahaa Documents Clearing and Business Consultant.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <ToastProvider>
          <AuthSessionSync />
          <AppNavbar />
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
