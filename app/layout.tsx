import type { Metadata } from 'next'
import './globals.css'
import AppNavbar from '@/components/app-navbar'
import { AppThemeProvider } from '@/components/app-theme-provider'
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
    <html
      lang="en"
      className="h-full antialiased"
      data-theme="dark"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col" data-theme="dark">
        <AppThemeProvider>
          <ToastProvider>
            <AuthSessionSync />
            <AppNavbar />
            {children}
          </ToastProvider>
        </AppThemeProvider>
      </body>
    </html>
  )
}
