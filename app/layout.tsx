import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppShell } from '@/components/app-shell'
import { RoleProvider } from '@/components/role-context'
import { AppProvider } from '@/components/app-context'
import { Toaster } from '@/components/ui/sonner'
const inter = Inter({ subsets: ['latin', 'vietnamese'], variable: '--next-font-sans' })
const space = Space_Grotesk({ subsets: ['latin'], variable: '--next-font-heading' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--next-font-mono' })
export const metadata: Metadata = {
  title: 'EWS Notification Service',
  description: 'Nền tảng thông báo nội bộ EWS',
  icons: { icon: '/apps/ews-astrolink/icon.svg', apple: '/apps/ews-astrolink/apple-icon.png' },
}
export const viewport: Viewport = { colorScheme: 'light', themeColor: '#FFFFFF' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="light bg-background">
      <body className={`${inter.variable} ${space.variable} ${mono.variable} antialiased`}>
        <RoleProvider>
          <AppProvider>
            <AppShell>{children}</AppShell>
          </AppProvider>
        </RoleProvider>
        <Toaster theme="light" position="bottom-right" richColors />
      </body>
    </html>
  )
}
