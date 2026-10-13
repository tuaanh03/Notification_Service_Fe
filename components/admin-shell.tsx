'use client'

import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Database, History, LayoutDashboard, Layers, Send, SlidersHorizontal } from 'lucide-react'
import type { AdminDto } from '@/lib/api/auth'
import { ADMIN_HOME } from '@/lib/app-routes'
import { AppLink } from './app-link'
import { CosmicBackground } from './cosmic-background'
import { PreviewBanner } from './preview-banner'
import { isPreviewRoute } from '@/lib/preview-routes'
import { AccountMenu, CollapsedSidebarTrigger, SidebarBrand } from './shell-parts'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

/**
 * Menu của khu Quản trị EWS. `/admin/approvals` (còn mock) vẫn gỡ khỏi menu — app tự phục vụ, không còn
 * hàng chờ duyệt (ADR-0023). Mục trỏ tới màn còn là bản xem trước bị lọc ra — đấu xong thì tự hiện.
 */
const NAV = (
  [
    { href: ADMIN_HOME, name: 'allApps', icon: Layers },
    { href: '/admin/send-approvals', name: 'sendApprovals', icon: Send },
    { href: '/admin/audit', name: 'audit', icon: History },
    { href: '/admin/directory', name: 'directory', icon: Database },
    { href: '/admin/settings', name: 'systemSettings', icon: SlidersHorizontal },
  ] as const
).filter((l) => !isPreviewRoute(l.href))

/**
 * Khung của khu Quản trị EWS (`/admin/*`) — CHỈ Super Admin (ADR-0022 của backend).
 *
 * Tách khỏi `<AppShell>` vì việc ở đây là của toàn hệ thống, không của một app: không có ô chọn
 * app, không có vòng quota, không cần `?app=`. Super Admin không thuộc org nào vẫn vào được.
 * `<AppGate>` chọn khung theo đường dẫn; `app/admin/layout.tsx` chặn người không phải Super Admin.
 */
export function AdminShell({ children, admin }: { children: React.ReactNode; admin: AdminDto }) {
  const path = usePathname()
  const t = useTranslations('shell')
  const tn = useTranslations('nav')
  const tr = useTranslations('roles')
  // Super Admin xem được mọi org ở console app (ADR-0023 của backend) — lối về luôn có.
  const backToConsole = { href: '/', label: t('toConsole'), icon: LayoutDashboard }
  // Khớp prefix dài nhất: `/admin/send-approvals/<id>` vẫn sáng mục "Duyệt lần gửi".
  const current = NAV.filter((l) => path === l.href || path.startsWith(`${l.href}/`)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0]

  return (
    <div className="min-h-screen relative flex">
      <CosmicBackground />
      <SidebarProvider defaultOpen>
        <Sidebar collapsible="icon" className="border-r border-[var(--orbit)] bg-sidebar/95 backdrop-blur-xl">
          <SidebarHeader className="p-3 border-b border-[var(--orbit)] group-data-[collapsible=icon]:h-14 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
            <SidebarBrand href={ADMIN_HOME} subtitle={t('adminArea')} />
          </SidebarHeader>

          <SidebarContent className="px-2 py-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-2">
            <SidebarGroup className="group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-0.5">
              <SidebarMenu className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
                {NAV.map((l) => (
                  <SidebarMenuItem key={l.href} className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                    <SidebarMenuButton
                      render={<AppLink href={l.href} />}
                      isActive={current?.href === l.href}
                      tooltip={tn(l.name)}
                    >
                      <l.icon className="size-4" />
                      <span>{tn(l.name)}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>

            <CollapsedSidebarTrigger />
          </SidebarContent>

          <SidebarFooter className="p-2 border-t border-[var(--orbit)] group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
            <AccountMenu admin={admin} roleLabel={tr('superAdmin')} switchArea={backToConsole} />
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="bg-transparent min-w-0">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--orbit)] bg-[var(--deep)]/85 px-4 lg:px-6 backdrop-blur-xl transition-[width,height] ease-linear">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="text-muted-foreground">{tn('ewsAdmin')}</BreadcrumbItem>
                {current && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="font-semibold text-foreground">{tn(current.name)}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <main className="w-full px-4 lg:px-6 py-6 min-w-0">
            <PreviewBanner />
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
