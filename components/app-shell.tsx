'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  FileText,
  LayoutDashboard,
  Send,
  Settings,
  Users,
  ListTree,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import type { AdminDto } from '@/lib/api/auth'
import { useAppSelection } from './app-context'
import { AppLink } from './app-link'
import { ADMIN_HOME, isWorkspaceRoute } from '@/lib/app-routes'
import { useRole } from './role-context'
import { CosmicBackground } from './cosmic-background'
import { PreviewBanner } from './preview-banner'
import { isPreviewRoute } from '@/lib/preview-routes'
import { AppSwitcher } from './app-switcher'
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
 *
 * Mục menu trỏ tới màn còn là bản xem trước (`lib/preview-routes.ts`) bị ẩn — số liệu minh hoạ
 * không được hiện cho người dùng. Đấu xong màn nào thì thêm vào `WIRED_ROUTES`, mục tự hiện lại.
 */
export function AppShell({ children, admin }: { children: React.ReactNode; admin: AdminDto }) {
  const path = usePathname()
  const tn = useTranslations('nav')
  const tr = useTranslations('roles')
  const { me, isSuperAdmin } = useRole()
  // `apps` tới từ AppProvider (layout nạp từ /admin/apps), không còn là mock. `app` đọc từ `?app=`
  // trên đường dẫn — null ở màn toàn tổ chức mở chưa kèm app (lib/app-routes.ts).
  const { app } = useAppSelection()
  // Vai THẬT trong org của app đang xem — console app là chỗ làm việc của thành viên org, kể cả khi
  // người đó cũng là Super Admin (quyền đó dùng ở khu Quản trị EWS).
  const orgRole = me.orgs.find((o) => o.id === app?.org_id)?.role ?? null
  const roleLabel = orgRole ? tr(orgRole) : isSuperAdmin ? tr('superAdmin') : tr('user')
  const toAdmin = isSuperAdmin ? { href: ADMIN_HOME, label: tn('ewsAdmin'), icon: ShieldCheck } : undefined

  // Breadcrumb top bar: nhóm / mục nav khớp prefix dài nhất với path hiện tại
  const breadcrumbMap = [
    { href: '/', name: 'overview', group: 'ews' },
    { href: '/compose', name: 'compose', group: 'notifications' },
    { href: '/notifications', name: 'history', group: 'notifications' },
    { href: '/scheduled', name: 'scheduled', group: 'notifications' },
    { href: '/topics', name: 'topics', group: null },
    { href: '/users', name: 'recipients', group: null },
    { href: '/subscriptions', name: 'subscriptions', group: null },
    { href: '/templates', name: 'templates', group: null },
    { href: '/settings/profile', name: 'profile', group: 'appSettings' },
    { href: '/settings/credentials', name: 'credentials', group: 'appSettings' },
    { href: '/settings/quota', name: 'quota', group: 'appSettings' },
    { href: '/settings/webhooks', name: 'webhooks', group: 'appSettings' },
    { href: '/settings/tracking', name: 'tracking', group: 'appSettings' },
    { href: '/settings/limits', name: 'limits', group: 'appSettings' },
    { href: '/settings/sync', name: 'sync', group: 'appSettings' },
  ] as const

  const crumb = breadcrumbMap
    .filter((l) => (l.href === '/' ? path === '/' : path.startsWith(l.href)))
    .sort((a, b) => b.href.length - a.href.length)[0]

  // Bàn làm việc (màn soạn template): menu trái thu gọn mỗi lần vào, mở được tạm; rời màn thì menu về đúng trạng thái
  // người dùng chọn ở các màn khác — hai trạng thái tách nhau để thu menu tự động không ghi đè lựa chọn đó.
  const workspace = isWorkspaceRoute(path)
  const [menuOpen, setMenuOpen] = useState(true)
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)
  useEffect(() => {
    if (workspace) setWorkspaceMenuOpen(false)
  }, [workspace])

  return (
    <div className="min-h-screen relative flex">
      <CosmicBackground />
      <SidebarProvider
        open={workspace ? workspaceMenuOpen : menuOpen}
        onOpenChange={workspace ? setWorkspaceMenuOpen : setMenuOpen}
      >
        <Sidebar collapsible="icon" className="border-r border-[var(--orbit)] bg-sidebar/95 backdrop-blur-xl">
          {/* Header: System Brand Logo & App Service Switcher */}
          <SidebarHeader className="p-3 border-b border-[var(--orbit)] space-y-2 group-data-[collapsible=icon]:h-14 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:space-y-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
            <SidebarBrand href="/" subtitle="Notification Hub" />

            <AppSwitcher />
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
                        {!isPreviewRoute('/compose') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton render={<AppLink href="/compose" />} isActive={path === '/compose'}>
                              <span>{tn('compose')}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/notifications" />} isActive={path.startsWith('/notifications')}>
                            <span>{tn('history')}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        {!isPreviewRoute('/scheduled') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton render={<AppLink href="/scheduled" />} isActive={path === '/scheduled'}>
                              <span>{tn('scheduled')}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
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

                {/* Người nhận — một mục, không nhóm: kênh mới hiện thành cột / khối trong chính màn này, không
                    thành mục con. `/subscriptions` (còn mock) đã gỡ: hai cửa, một cửa giả, là cách chắc chắn để
                    người mới bấm nhầm (mục 2.5). Không gọi "Danh bạ" — đó là tài khoản EWS ở Quản trị EWS. */}
                <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                  <SidebarMenuButton
                    render={<AppLink href="/users" />}
                    isActive={path.startsWith('/users')}
                    tooltip={tn('recipients')}
                  >
                    <Users className="size-4" />
                    <span>{tn('recipients')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

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
                        {!isPreviewRoute('/settings/profile') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton render={<AppLink href="/settings/profile" />} isActive={path === '/settings/profile'}>
                              <span>{tn('profile')}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/settings/credentials" />} isActive={path === '/settings/credentials'}>
                            <span>{tn('credentials')}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        {!isPreviewRoute('/settings/quota') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton render={<AppLink href="/settings/quota" />} isActive={path === '/settings/quota'}>
                              <span>{tn('quota')}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/settings/webhooks" />} isActive={path === '/settings/webhooks'}>
                            <span>{tn('webhooks')}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/settings/tracking" />} isActive={path === '/settings/tracking'}>
                            <span>{tn('tracking')}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/settings/limits" />} isActive={path === '/settings/limits'}>
                            <span>{tn('limits')}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        {!isPreviewRoute('/settings/sync') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton render={<AppLink href="/settings/sync" />} isActive={path === '/settings/sync'}>
                              <span>{tn('sync')}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
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
          {!workspace && (
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

          </header>
          )}

          <main className={cn('w-full min-w-0', !workspace && 'px-4 lg:px-6 py-6')}>
            <PreviewBanner />
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
