'use client'

import { Fragment } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  FileText,
  LayoutDashboard,
  Search,
  Send,
  Settings,
  Users,
  ListTree,
  ChevronRight,
  ChevronsUpDown,
  Check,
  ShieldCheck,
} from 'lucide-react'
import type { AdminDto } from '@/lib/api/auth'
import { useAppSelection } from './app-context'
import { AppLink, useAppRouter } from './app-link'
import { ADMIN_HOME, appKey, switchAppPath } from '@/lib/app-routes'
import { QuotaArc } from '@/components/quota-arc'
import { StatusPill } from './status-pill'
import { statusColors } from '@/lib/theme'
import { useRole } from './role-context'
import { CosmicBackground } from './cosmic-background'
import { PreviewBanner } from './preview-banner'
import { AccountMenu, CollapsedSidebarTrigger, SidebarBrand } from './shell-parts'
import { cn } from '@/lib/utils'
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

/**
 * Khung của console APP (đội app service): ô chọn app + menu của một app. Màn Quản trị EWS
 * (`/admin/*`, chỉ Super Admin) có khung riêng — `<AdminShell>`; `<AppGate>` chọn khung.
 */
export function AppShell({ children, admin }: { children: React.ReactNode; admin: AdminDto }) {
  const path = usePathname()
  const t = useTranslations('shell')
  const tn = useTranslations('nav')
  const tr = useTranslations('roles')
  const { me, isSuperAdmin } = useRole()
  // `apps` tới từ AppProvider (layout nạp từ /admin/apps), không còn là mock. `app` đọc từ `?app=`
  // trên đường dẫn — null ở màn toàn tổ chức mở chưa kèm app (lib/app-routes.ts).
  const { app, apps } = useAppSelection()
  const router = useAppRouter()
  // Thấy app của nhiều org thì ô chọn app chia nhóm theo org (danh sách đã xếp theo org ở layout).
  const multiOrg = new Set(apps.map((a) => a.org_id)).size > 1
  // Vai THẬT trong org của app đang xem — console app là chỗ làm việc của thành viên org, kể cả khi
  // người đó cũng là Super Admin (quyền đó dùng ở khu Quản trị EWS).
  const orgRole = me.orgs.find((o) => o.id === app?.org_id)?.role ?? null
  const roleLabel = orgRole ? tr(orgRole) : isSuperAdmin ? tr('superAdmin') : tr('user')
  const toAdmin = isSuperAdmin ? { href: ADMIN_HOME, label: tn('ewsAdmin'), icon: ShieldCheck } : undefined
  const appDot = app ? (statusColors[app.status] ?? statusColors.draft) : statusColors.draft

  // Breadcrumb top bar: nhóm / mục nav khớp prefix dài nhất với path hiện tại
  const breadcrumbMap = [
    { href: '/', name: 'overview', group: 'ews' },
    { href: '/compose', name: 'compose', group: 'notifications' },
    { href: '/notifications', name: 'history', group: 'notifications' },
    { href: '/scheduled', name: 'scheduled', group: 'notifications' },
    { href: '/topics', name: 'topics', group: null },
    { href: '/users', name: 'users', group: 'recipients' },
    { href: '/subscriptions', name: 'subscriptions', group: 'recipients' },
    { href: '/templates', name: 'templates', group: null },
    { href: '/settings/profile', name: 'profile', group: 'appSettings' },
    { href: '/settings/credentials', name: 'credentials', group: 'appSettings' },
    { href: '/settings/quota', name: 'quota', group: 'appSettings' },
    { href: '/settings/origins', name: 'origins', group: 'appSettings' },
    { href: '/settings/sync', name: 'sync', group: 'appSettings' },
  ] as const

  const crumb = breadcrumbMap
    .filter((l) => (l.href === '/' ? path === '/' : path.startsWith(l.href)))
    .sort((a, b) => b.href.length - a.href.length)[0]

  return (
    <div className="min-h-screen relative flex">
      <CosmicBackground />
      <SidebarProvider defaultOpen>
        <Sidebar collapsible="icon" className="border-r border-[var(--orbit)] bg-sidebar/95 backdrop-blur-xl">
          {/* Header: System Brand Logo & App Service Switcher */}
          <SidebarHeader className="p-3 border-b border-[var(--orbit)] space-y-2 group-data-[collapsible=icon]:h-14 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:space-y-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
            <SidebarBrand href="/" subtitle="Notification Hub" />

            {/* 2. Sleek App Service Selector */}
            <SidebarMenu className="group-data-[collapsible=icon]:hidden">
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <SidebarMenuButton
                        size="sm"
                        className="h-8 w-full justify-between rounded-lg bg-[var(--void)]/60 border border-[var(--orbit)] px-2.5 text-xs hover:border-[var(--starlight)]/40 hover:bg-[var(--void)]/90 transition-all"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {/* Chấm theo TRẠNG THÁI THẬT, không phải xanh cố định: app đang tạm ngưng
                              mà hiện chấm xanh là nói dối ở chỗ luôn nhìn thấy. Màu lấy từ
                              `statusColors` — cùng nguồn với <StatusPill> trong menu bên dưới. */}
                          <div
                            className="size-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: appDot, boxShadow: `0 0 6px ${appDot}` }}
                          />
                          <span className="font-medium text-sidebar-foreground truncate">{app?.name ?? t('chooseApp')}</span>
                        </div>
                        <ChevronsUpDown className="size-3 text-muted-foreground shrink-0" />
                      </SidebarMenuButton>
                    }
                  />
                  <DropdownMenuContent
                    className="w-(--anchor-width) min-w-64 rounded-xl border border-border/80 bg-popover p-2 shadow-lg"
                    side="bottom"
                    align="start"
                    sideOffset={6}
                  >
                    {/* DropdownMenuLabel là Menu.GroupLabel -> bắt buộc nằm TRONG
                        <DropdownMenuGroup>; để ngoài sẽ ném Base UI error #31
                        ("MenuGroupContext is missing") và trắng trang khi mở menu. */}
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
                        {t('switchApp')}
                      </DropdownMenuLabel>
                      {apps.map((a, i) => (
                        <Fragment key={a.app_id}>
                        {/* Nhiều org: tên org làm tiêu đề mỗi nhóm (danh sách đã xếp theo org). */}
                        {multiOrg && a.org_id !== apps[i - 1]?.org_id && (
                          <div className="px-2 pt-2 pb-1 text-[10px] text-muted-foreground truncate">{a.org_name}</div>
                        )}
                        <DropdownMenuItem
                          // Đổi app = đổi `?app=`: ở lại màn này, hoặc về danh sách nếu đang ở trang chi tiết.
                          onClick={() => router.push(switchAppPath(path), { app: appKey(a) })}
                          className={cn(
                            'flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-xs',
                            a.app_id === app?.app_id && 'bg-sidebar-accent font-medium',
                          )}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate">{a.name}</span>
                            <span className="font-mono text-[10px] text-muted-foreground truncate">{a.app_id}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <StatusPill status={a.status} />
                            {a.app_id === app?.app_id && <Check className="size-3.5 text-[var(--starlight)]" />}
                          </div>
                        </DropdownMenuItem>
                        </Fragment>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          {/* Navigation Items */}
          <SidebarContent className="px-2 py-2 space-y-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-2 group-data-[collapsible=icon]:space-y-1">
            {/* Nhóm Điều hành */}
            <SidebarGroup className="group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-0.5">
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground group-data-[collapsible=icon]:hidden">
                {tn('groupOperate')}
              </SidebarGroupLabel>
              <SidebarMenu className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
                {/* Tổng quan */}
                <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                  <SidebarMenuButton
                    render={<AppLink href="/" />}
                    isActive={path === '/'}
                    tooltip={tn('overview')}
                  >
                    <LayoutDashboard className="size-4" />
                    <span>{tn('overview')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Thông báo (Collapsible) */}
                <Collapsible
                  defaultOpen={path.startsWith('/compose') || path.startsWith('/notifications') || path.startsWith('/scheduled')}
                  className="group/collapsible"
                >
                  <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuButton
                          tooltip={tn('notifications')}
                          isActive={path.startsWith('/compose') || path.startsWith('/notifications') || path.startsWith('/scheduled')}
                        >
                          <Send className="size-4" />
                          <span>{tn('notifications')}</span>
                          <ChevronRight className="ml-auto size-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                        </SidebarMenuButton>
                      }
                    />
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/compose" />} isActive={path === '/compose'}>
                            <span>{tn('compose')}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/notifications" />} isActive={path.startsWith('/notifications')}>
                            <span>{tn('history')}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/scheduled" />} isActive={path === '/scheduled'}>
                            <span>{tn('scheduled')}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>

                {/* Chủ đề */}
                <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                  <SidebarMenuButton
                    render={<AppLink href="/topics" />}
                    isActive={path.startsWith('/topics')}
                    tooltip={tn('topics')}
                  >
                    <ListTree className="size-4" />
                    <span>{tn('topics')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Người nhận (Collapsible) */}
                <Collapsible
                  defaultOpen={path.startsWith('/users') || path.startsWith('/subscriptions')}
                  className="group/collapsible"
                >
                  <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuButton
                          tooltip={tn('recipients')}
                          isActive={path.startsWith('/users') || path.startsWith('/subscriptions')}
                        >
                          <Users className="size-4" />
                          <span>{tn('recipients')}</span>
                          <ChevronRight className="ml-auto size-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                        </SidebarMenuButton>
                      }
                    />
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/users" />} isActive={path.startsWith('/users')}>
                            <span>{tn('users')}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        {/* `/subscriptions` (còn mock) đã gỡ khỏi menu: màn Người nhận hiện đúng dữ liệu đó bằng số
                            thật. Hai cửa, một cửa giả, là cách chắc chắn để người mới bấm nhầm (mục 2.5). */}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>

                {/* Templates */}
                <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                  <SidebarMenuButton
                    render={<AppLink href="/templates" />}
                    isActive={path.startsWith('/templates')}
                    tooltip={tn('templates')}
                  >
                    <FileText className="size-4" />
                    <span>{tn('templates')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            {/* Nhóm Cài đặt */}
            <SidebarGroup className="group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-0.5">
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground group-data-[collapsible=icon]:hidden">
                {tn('groupSystem')}
              </SidebarGroupLabel>
              <SidebarMenu className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
                <Collapsible
                  defaultOpen={path.startsWith('/settings')}
                  className="group/collapsible"
                >
                  <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuButton
                          tooltip={tn('appSettings')}
                          isActive={path.startsWith('/settings')}
                        >
                          <Settings className="size-4" />
                          <span>{tn('appSettings')}</span>
                          <ChevronRight className="ml-auto size-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                        </SidebarMenuButton>
                      }
                    />
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/settings/profile" />} isActive={path === '/settings/profile'}>
                            <span>{tn('profile')}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/settings/credentials" />} isActive={path === '/settings/credentials'}>
                            <span>{tn('credentials')}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/settings/quota" />} isActive={path === '/settings/quota'}>
                            <span>{tn('quota')}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/settings/origins" />} isActive={path === '/settings/origins'}>
                            <span>{tn('origins')}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/settings/sync" />} isActive={path === '/settings/sync'}>
                            <span>{tn('sync')}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroup>

            <CollapsedSidebarTrigger />
          </SidebarContent>

          {/* Footer: tài khoản, vai thật, ngôn ngữ, đăng xuất */}
          <SidebarFooter className="p-2 border-t border-[var(--orbit)] group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
            <AccountMenu admin={admin} roleLabel={roleLabel} switchArea={toAdmin} />
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        {/* Main Content Area */}
        <SidebarInset className="bg-transparent min-w-0">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--orbit)] bg-[var(--deep)]/85 px-4 lg:px-6 backdrop-blur-xl transition-[width,height] ease-linear">
            <Breadcrumb>
              <BreadcrumbList>
                {crumb?.group && (
                  <>
                    <BreadcrumbItem>
                      <BreadcrumbLink render={<AppLink href={crumb.href} />} className="text-muted-foreground hover:text-foreground">
                        {tn(crumb.group)}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </>
                )}
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground">
                    {crumb ? tn(crumb.name) : (path.split('/').filter(Boolean).pop() ?? tn('overview'))}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="ml-auto flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-lg border border-[var(--orbit)] bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground sm:flex">
                <Search className="size-3.5" />
                <span>{t('search')}</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  ⌘K
                </kbd>
              </div>
              {app && (
                <div
                  className="hidden items-center gap-2 text-xs md:flex rounded-lg border border-[var(--orbit)] bg-muted/30 px-2.5 py-1"
                  title={t('quotaTitle', { used: app.quota_used ?? 0, max: app.quota })}
                >
                  <QuotaArc used={app.quota_used ?? 0} max={app.quota} className="size-4" />
                  <span className="text-muted-foreground">{t('quota')}</span>
                  <span className="font-mono tabular-nums font-semibold text-[var(--starlight)]">
                    {app.quota_used ?? 0}/{app.quota}
                  </span>
                </div>
              )}
            </div>
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
