import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import './globals.css'
import { RoleProvider } from '@/components/role-context'
import { AppProvider } from '@/components/app-context'
import { AppGate } from '@/components/app-gate'
import { Toaster } from '@/components/ui/sonner'
import { listVisibleApps } from '@/lib/api/apps'
import { getMe } from '@/lib/api/me'
import type { AdminProfileDto } from '@/lib/api/types'
import { isSessionExpired, sessionToken } from '@/lib/api/client'
import { currentAdmin, type AdminDto } from '@/lib/api/auth'
import { describeError } from '@/lib/api/error-message'
import { ApiError } from '@/lib/api/problem'
import { BRAND_APPLE_ICON_SRC, BRAND_ICON_192_SRC, BRAND_ICON_SRC } from '@/lib/brand'
import type { App } from '@/lib/mock-data'
import { consoleOrgs } from '@/lib/access'
import { PATHNAME_HEADER } from '@/middleware'
const inter = Inter({ subsets: ['latin', 'vietnamese'], variable: '--next-font-sans' })
const space = Space_Grotesk({ subsets: ['latin'], variable: '--next-font-heading' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--next-font-mono' })
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta')
  return {
    title: 'EWS Notification Service',
    description: t('description'),
    // metadata.icons KHÔNG tự thêm basePath -> đường dẫn đã ghép sẵn trong lib/brand.ts.
    icons: {
      icon: [
        { url: BRAND_ICON_SRC, sizes: '32x32', type: 'image/png' },
        { url: BRAND_ICON_192_SRC, sizes: '192x192', type: 'image/png' },
      ],
      apple: BRAND_APPLE_ICON_SRC,
    },
  }
}
export const viewport: Viewport = { colorScheme: 'light', themeColor: '#FFFFFF' }

/** Console quản trị luôn đọc trạng thái thật — không phục vụ bản dựng sẵn lúc build. */
export const dynamic = 'force-dynamic'

/** Chưa đọc được vai (API hỏng): không cho thấy gì — sai về phía an toàn. */
const NO_ACCESS: AdminProfileDto = { isSuperAdmin: false, orgs: [], appRoles: {} }

/**
 * Nơi DUY NHẤT nạp vai (`/admin/me`) và danh sách app của console app (`consoleOrgs`: Super Admin
 * mọi org, người khác org mình là thành viên — ADR-0022, ADR-0023 của backend).
 * Chạy phía server nên token phiên không rời máy chủ.
 * API hỏng không làm sập toàn bộ console — trả lý do để `<NoAppsScreen>` nói ra.
 *
 * Phiên hết hiệu lực thì KHÔNG phải lỗi hạ tầng: trả `expired` để layout đưa về trang đăng nhập,
 * chứ không hiện màn "không đọc được danh sách app" làm người dùng đi sửa nhầm chỗ.
 */
async function loadApps(): Promise<{ me: AdminProfileDto; apps: App[]; error: string | null; expired: boolean }> {
  try {
    const me = await getMe()
    return { me, apps: await listVisibleApps(consoleOrgs(me)), error: null, expired: false }
  } catch (err) {
    if (!(err instanceof ApiError)) throw err
    if (isSessionExpired(err)) return { me: NO_ACCESS, apps: [], error: null, expired: true }
    return { me: NO_ACCESS, apps: [], error: await describeError(err), expired: false }
  }
}

/**
 * Khung HTML dùng chung cho cả trang đăng nhập lẫn console — font, nền, toast, ngôn ngữ.
 *
 * `<NextIntlClientProvider>` tự nhận ngôn ngữ và bộ câu chữ của request (`i18n/request.ts`) để
 * component client dùng được `useTranslations`. Bộ câu chữ chỉ là chữ trên giao diện — không có
 * cấu hình hay giá trị bí mật nào trong `messages/*.json`.
 */
async function Document({ children }: { children: React.ReactNode }) {
  return (
    <html lang={await getLocale()} className="light bg-background">
      <body className={`${inter.variable} ${space.variable} ${mono.variable} antialiased`}>
        <NextIntlClientProvider>
          {children}
          <Toaster theme="light" position="bottom-right" richColors />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

const LOGIN_PATH = '/login'
/** Hai trang đăng nhập — Microsoft và mật khẩu. Thiếu trang nào ở đây là trang đó bị đá về `/login`. */
const LOGIN_PAGES: ReadonlySet<string | null> = new Set([LOGIN_PATH, '/login/password'])

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Đường dẫn do `middleware.ts` gắn vào header: layout là server component, tự nó không biết
  // đang dựng trang nào.
  const pathname = (await headers()).get(PATHNAME_HEADER)
  const admin = await currentAdmin()

  /*
    Chưa đăng nhập -> khung trần cho trang đăng nhập.

    Không gọi `/admin/apps` ở nhánh này là có chủ đích: chưa có phiên thì đường đó đóng, gọi chỉ
    để nhận 401. Cookie còn nhưng phiên đã chết (hết hạn, hoặc đăng xuất ở máy khác) cũng rơi vào
    đây — đưa thẳng về trang đăng nhập, không hiện màn báo lỗi hạ tầng làm người dùng sửa nhầm chỗ.
  */
  if (admin === null) {
    if (!LOGIN_PAGES.has(pathname)) redirect(LOGIN_PATH)
    return <Document>{children}</Document>
  }
  // Đã đăng nhập mà vẫn ở trang đăng nhập (vừa bấm đăng nhập xong) -> để trang đó tự chuyển vào console.
  if (LOGIN_PAGES.has(pathname)) return <Document>{children}</Document>

  const { me, apps, error, expired } = await loadApps()
  if (expired) redirect(LOGIN_PATH)

  return (
    <Document>
      <RoleProvider me={me}>
        <AppProvider apps={apps}>
          {/*
            Layout KHÔNG tự chọn màn hình bên trong console: `<AppGate>` (client) mới biết đang ở
            đường dẫn nào và dựng khung tương ứng — shell, trang Tổ chức, màn chưa có app,
            hay màn báo lỗi.
          */}
          <AppGate error={error} admin={admin}>
            {children}
          </AppGate>
        </AppProvider>
      </RoleProvider>
    </Document>
  )
}
