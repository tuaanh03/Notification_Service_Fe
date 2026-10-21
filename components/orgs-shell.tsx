'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppWindow, ArrowLeft, Building2, LayoutGrid, ShieldCheck, Users } from 'lucide-react'
import type { AdminDto } from '@/lib/api/auth'
import { consoleOrgs } from '@/lib/access'
import { ADMIN_HOME, ORGS_APPS, ORGS_HOME, orgMembersPath, orgPath } from '@/lib/app-routes'
import { AppLink } from './app-link'
import { CosmicBackground } from './cosmic-background'
import { useRole } from './role-context'
import { AccountMenu, CollapsedSidebarTrigger, SidebarBrand } from './shell-parts'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
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
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

/**
 * Khung trang Tổ chức (`/orgs`, `/orgs/apps`, `/orgs/<orgId>`, `/orgs/<orgId>/members`) — không thuộc app nào nên không dùng sidebar của
 * `<AppShell>` (mọi mục ở đó cần app). `<AppGate>` chọn khung theo đường dẫn (`isOrgsRoute`).
 */
export function OrgsShell({ children, admin }: { children: React.ReactNode; admin: AdminDto }) {
  const path = usePathname()
  const t = useTranslations('orgs')
  const tn = useTranslations('nav')
  const tr = useTranslations('roles')
  const { me, isSuperAdmin } = useRole()
  // `/orgs/<orgId>[/members]`: org đang xem — cho menu và breadcrumb. Org lạ (không thấy được) thì chỉ
  // còn mục "Tổ chức".
  const [, , rawOrgId, section] = path.split('/')
  const orgId = rawOrgId ? decodeURIComponent(rawOrgId) : null
  const onAllApps = path === ORGS_APPS
  const org = orgId && !onAllApps ? (consoleOrgs(me).find((o) => o.id === orgId) ?? null) : null
  const onMembers = section === 'members'
  const orgNav = org
    ? [
        { href: orgPath(org.id), label: t('navOrgApps'), icon: LayoutGrid, active: !onMembers },
        { href: orgMembersPath(org.id), label: t('navOrgMembers'), icon: Users, active: onMembers },
      ]
    : []
  const mainNav = [
    { href: ORGS_HOME, label: t('title'), icon: Building2, active: org === null && !onAllApps },
    { href: ORGS_APPS, label: t('navAllApps'), icon: AppWindow, active: onAllApps },
  ]
  /*
    Thanh bên có hai tầng: menu chung (Tổ chức, Ứng dụng) và menu của MỘT org — không hiện chồng nhau.
    Đổi tầng thì trượt: vào org trượt từ phải, quay ra trượt từ trái. Lần dựng đầu (tải lại, mở link
    thẳng) không trượt. Tính lúc render (state dẫn xuất) để hiệu ứng chạy ngay khung hình đầu.
  */
  const level = org ? org.id : null
  const [panel, setPanel] = useState<{ level: string | null; slide: string }>({ level, slide: '' })
  if (panel.level !== level) {
    setPanel({ level, slide: level === null ? 'slide-in-from-left-8' : 'slide-in-from-right-8' })
  }
  const slideClass = panel.slide ? `animate-in fade-in duration-200 ${panel.slide} motion-reduce:animate-none` : ''
  const nav = org
    ? [{ href: ORGS_HOME, label: t('title'), icon: ArrowLeft, active: false }]
    : mainNav
  const toAdmin = isSuperAdmin ? { href: ADMIN_HOME, label: tn('ewsAdmin'), icon: ShieldCheck } : undefined

  return (
    <div className="min-h-screen relative flex">
      <CosmicBackground />
      <SidebarProvider defaultOpen>
        <Sidebar collapsible="icon" className="border-r border-[var(--orbit)] bg-sidebar/95 backdrop-blur-xl">
          <SidebarHeader className="p-3 border-b border-[var(--orbit)] group-data-[collapsible=icon]:h-14 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
            <SidebarBrand href={ORGS_HOME} subtitle="Notification Hub" />
          </SidebarHeader>

          <SidebarContent className="overflow-x-hidden px-2 py-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-2">
            {/* `key` theo tầng: đổi tầng là dựng lại khối này -> hiệu ứng trượt chạy lại. */}
            <div key={level ?? 'main'} className={slideClass}>
              <SidebarGroup className="group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-0.5">
                <SidebarMenu className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
                  {nav.map((item) => (
                    <SidebarMenuItem key={item.href} className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                      <SidebarMenuButton render={<AppLink href={item.href} />} isActive={item.active} tooltip={item.label}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>

              {org && (
                <SidebarGroup className="group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-0.5">
                  <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate group-data-[collapsible=icon]:hidden">
                    {org.name}
                  </SidebarGroupLabel>
                  <SidebarMenu className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
                    {orgNav.map((item) => (
                      <SidebarMenuItem key={item.href} className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                        <SidebarMenuButton render={<AppLink href={item.href} />} isActive={item.active} tooltip={item.label}>
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroup>
              )}
            </div>

            <CollapsedSidebarTrigger />
          </SidebarContent>

          <SidebarFooter className="p-2 border-t border-[var(--orbit)] group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
            {/* Trang này không thuộc org nào -> không có "vai trong org" để hiện; nói số org thay vào. */}
            <AccountMenu
              admin={admin}
              roleLabel={isSuperAdmin ? tr('superAdmin') : t('orgCount', { count: consoleOrgs(me).length })}
              switchArea={toAdmin}
            />
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="bg-transparent min-w-0">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--orbit)] bg-[var(--deep)]/85 px-4 lg:px-6 backdrop-blur-xl">
            <Breadcrumb>
              <BreadcrumbList>
                {org ? (
                  <>
                    <BreadcrumbItem>
                      <BreadcrumbLink render={<AppLink href={ORGS_HOME} />} className="inline-flex min-h-6 items-center text-muted-foreground hover:text-foreground">
                        {t('title')}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    {onMembers ? (
                      <>
                        <BreadcrumbItem>
                          <BreadcrumbLink render={<AppLink href={orgPath(org.id)} />} className="inline-flex min-h-6 items-center text-muted-foreground hover:text-foreground">
                            {org.name}
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbPage className="font-semibold text-foreground">{t('navOrgMembers')}</BreadcrumbPage>
                        </BreadcrumbItem>
                      </>
                    ) : (
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-semibold text-foreground">{org.name}</BreadcrumbPage>
                      </BreadcrumbItem>
                    )}
                  </>
                ) : (
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-semibold text-foreground">{onAllApps ? t('navAllApps') : t('title')}</BreadcrumbPage>
                  </BreadcrumbItem>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <main className="w-full px-4 lg:px-6 py-6 min-w-0">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
