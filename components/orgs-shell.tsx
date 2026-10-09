'use client'

import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Building2, ShieldCheck } from 'lucide-react'
import type { AdminDto } from '@/lib/api/auth'
import { consoleOrgs } from '@/lib/access'
import { ADMIN_HOME, ORGS_HOME } from '@/lib/app-routes'
import { AppLink } from './app-link'
import { CosmicBackground } from './cosmic-background'
import { useRole } from './role-context'
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
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

/**
 * Khung trang Tổ chức (`/orgs`, `/orgs/<orgId>`) — không thuộc app nào nên không dùng sidebar của
 * `<AppShell>` (mọi mục ở đó cần app). `<AppGate>` chọn khung theo đường dẫn (`isOrgsRoute`).
 */
export function OrgsShell({ children, admin }: { children: React.ReactNode; admin: AdminDto }) {
  const path = usePathname()
  const t = useTranslations('orgs')
  const tn = useTranslations('nav')
  const tr = useTranslations('roles')
  const { me, isSuperAdmin } = useRole()
  // `/orgs/<orgId>`: tên org cho breadcrumb. Org lạ (không thấy được) thì chỉ còn "Tổ chức".
  const orgId = path.startsWith(`${ORGS_HOME}/`) ? decodeURIComponent(path.slice(ORGS_HOME.length + 1)) : null
  const org = orgId ? (consoleOrgs(me).find((o) => o.id === orgId) ?? null) : null
  const toAdmin = isSuperAdmin ? { href: ADMIN_HOME, label: tn('ewsAdmin'), icon: ShieldCheck } : undefined

  return (
    <div className="min-h-screen relative flex">
      <CosmicBackground />
      <SidebarProvider defaultOpen>
        <Sidebar collapsible="icon" className="border-r border-[var(--orbit)] bg-sidebar/95 backdrop-blur-xl">
          <SidebarHeader className="p-3 border-b border-[var(--orbit)] group-data-[collapsible=icon]:h-14 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
            <SidebarBrand href={ORGS_HOME} subtitle="Notification Hub" />
          </SidebarHeader>

          <SidebarContent className="px-2 py-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-2">
            <SidebarGroup className="group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-0.5">
              <SidebarMenu className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
                <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                  <SidebarMenuButton render={<AppLink href={ORGS_HOME} />} isActive tooltip={t('title')}>
                    <Building2 className="size-4" />
                    <span>{t('title')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

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
                      <BreadcrumbLink render={<AppLink href={ORGS_HOME} />} className="text-muted-foreground hover:text-foreground">
                        {t('title')}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="font-semibold text-foreground">{org.name}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                ) : (
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-semibold text-foreground">{t('title')}</BreadcrumbPage>
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
