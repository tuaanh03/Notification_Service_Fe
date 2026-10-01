'use client'

import { usePathname } from 'next/navigation'
import {
  Bell,
  CircleGauge,
  FileText,
  LayoutDashboard,
  Search,
  Send,
  Settings,
  Users,
  ListTree,
  ShieldCheck,
  History,
  Database,
  UserCheck,
  KeyRound,
  Globe,
  RefreshCw,
  ChevronRight,
  ChevronsUpDown,
  Check,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { LogOut } from 'lucide-react'
import { signOutAction } from '@/app/login/actions'
import type { AdminDto } from '@/lib/api/auth'
import { useAppSelection } from './app-context'
import { AppLink, useAppRouter } from './app-link'
import { switchAppPath } from '@/lib/app-routes'
import { Button } from '@/components/ui/button'
import { QuotaArc } from '@/components/quota-arc'
import { StatusPill } from './status-pill'
import { statusColors } from '@/lib/theme'
import { BRAND_LOGO_SRC } from '@/lib/brand'
import { useRole, type DemoRole } from './role-context'
import { CosmicBackground } from './cosmic-background'
import { PreviewBanner } from './preview-banner'
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
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

function CustomSidebarTrigger({
  className,
  tooltipSide = 'bottom',
}: {
  className?: string
  tooltipSide?: 'bottom' | 'right' | 'left' | 'top'
}) {
  const { toggleSidebar, open } = useSidebar()
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              'flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:scale-95 focus-visible:outline-hidden',
              className,
            )}
            aria-label={open ? 'Thu gọn sidebar (Ctrl + B)' : 'Mở rộng sidebar (Ctrl + B)'}
          >
            {open ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
          </button>
        }
      />
      <TooltipContent side={tooltipSide}>
        {open ? 'Thu gọn sidebar (Ctrl + B)' : 'Mở rộng sidebar (Ctrl + B)'}
      </TooltipContent>
    </Tooltip>
  )
}

/** Chữ cái đầu cho avatar. Bảng `admins` chỉ có email, không có tên hiển thị. */
function initialsOf(email: string): string {
  const local = email.split('@')[0] ?? email
  const parts = local.split(/[._-]+/).filter(Boolean)
  const picked = parts.length >= 2 ? [parts[0]!, parts[1]!] : [local]
  return picked
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)
}

export function AppShell({ children, admin }: { children: React.ReactNode; admin: AdminDto }) {
  const path = usePathname()
  const { role, setRole } = useRole()
  // `apps` tới từ AppProvider (layout nạp từ /admin/apps), không còn là mock. `app` đọc từ `?app=`
  // trên đường dẫn — null ở màn `/admin` mở chưa kèm app (lib/app-routes.ts).
  const { app, apps } = useAppSelection()
  const router = useAppRouter()
  // Số thật từ danh sách app của AppProvider. Trước đây lấy `pendingApprovalCount()` của mock:
  // một con số bịa nằm trên khung luôn hiển thị, ngoài vùng <PreviewBanner> che phủ (mục 2.4).
  const pending = apps.filter((a) => a.status === 'pending_approval').length
  const appDot = app ? (statusColors[app.status] ?? statusColors.draft) : statusColors.draft

  // Breadcrumb top bar: nhóm / mục nav khớp prefix dài nhất với path hiện tại
  const breadcrumbMap: Array<{ href: string; name: string; group: string }> = [
    { href: '/', name: 'Tổng quan', group: 'EWS' },
    { href: '/compose', name: 'Soạn thông báo', group: 'Thông báo' },
    { href: '/notifications', name: 'Lịch sử gửi', group: 'Thông báo' },
    { href: '/scheduled', name: 'Đã lên lịch', group: 'Thông báo' },
    { href: '/topics', name: 'Chủ đề', group: 'Chủ đề' },
    { href: '/users', name: 'Users', group: 'Người nhận' },
    { href: '/subscriptions', name: 'Subscriptions', group: 'Người nhận' },
    { href: '/templates', name: 'Templates', group: 'Templates' },
    { href: '/settings/profile', name: 'Hồ sơ', group: 'Cài đặt App' },
    { href: '/settings/credentials', name: 'Credentials', group: 'Cài đặt App' },
    { href: '/settings/quota', name: 'Kênh & Quota', group: 'Cài đặt App' },
    { href: '/settings/origins', name: 'IP & Origin', group: 'Cài đặt App' },
    { href: '/settings/sync', name: 'Sync danh bạ', group: 'Cài đặt App' },
    { href: '/admin/send-approvals', name: 'Duyệt lần gửi', group: 'EWS Tổng' },
    { href: '/admin/apps', name: 'Tất cả app', group: 'EWS Tổng' },
    { href: '/admin/audit', name: 'Audit log', group: 'EWS Tổng' },
    { href: '/admin/directory', name: 'Danh bạ & Resolver', group: 'EWS Tổng' },
  ]

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
            {/* 1. System Brand Logo */}
            <div className="flex items-center justify-between gap-1 w-full group-data-[collapsible=icon]:justify-center">
              <AppLink
                href="/"
                className="flex items-center gap-2.5 px-1 py-1 rounded-lg group transition-colors hover:bg-sidebar-accent/50 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center min-w-0"
              >
                <img
                  src={BRAND_LOGO_SRC}
                  alt=""
                  className="size-8 shrink-0 rounded-full shadow-[0_0_12px_-2px_rgba(34,211,238,0.3)] transition-transform group-hover:scale-110"
                />
                <div className="flex flex-col min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="font-heading font-bold text-sm tracking-wide text-sidebar-foreground group-hover:text-[var(--starlight)] transition-colors truncate">
                    EWS AstroLink
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase truncate">
                    Notification Hub
                  </span>
                </div>
              </AppLink>
              <div className="group-data-[collapsible=icon]:hidden">
                <CustomSidebarTrigger className="text-muted-foreground/70 hover:text-foreground" />
              </div>
            </div>

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
                          <span className="font-medium text-sidebar-foreground truncate">{app?.name ?? 'Chọn app'}</span>
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
                        Chuyển App Service
                      </DropdownMenuLabel>
                      {apps.map((a) => (
                        <DropdownMenuItem
                          key={a.slug}
                          // Đổi app = đổi `?app=`: ở lại màn này, hoặc về danh sách nếu đang ở trang chi tiết.
                          onClick={() => router.push(switchAppPath(path), { app: a.slug })}
                          className={cn(
                            'flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-xs',
                            a.slug === app?.slug && 'bg-sidebar-accent font-medium',
                          )}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate">{a.name}</span>
                            <span className="font-mono text-[10px] text-muted-foreground truncate">{a.app_id}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <StatusPill status={a.status} />
                            {a.slug === app?.slug && <Check className="size-3.5 text-[var(--starlight)]" />}
                          </div>
                        </DropdownMenuItem>
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
                Điều hành
              </SidebarGroupLabel>
              <SidebarMenu className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
                {/* Tổng quan */}
                <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                  <SidebarMenuButton
                    render={<AppLink href="/" />}
                    isActive={path === '/'}
                    tooltip="Tổng quan"
                  >
                    <LayoutDashboard className="size-4" />
                    <span>Tổng quan</span>
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
                          tooltip="Thông báo"
                          isActive={path.startsWith('/compose') || path.startsWith('/notifications') || path.startsWith('/scheduled')}
                        >
                          <Send className="size-4" />
                          <span>Thông báo</span>
                          <ChevronRight className="ml-auto size-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                        </SidebarMenuButton>
                      }
                    />
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/compose" />} isActive={path === '/compose'}>
                            <span>Soạn thông báo</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/notifications" />} isActive={path.startsWith('/notifications')}>
                            <span>Lịch sử gửi</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/scheduled" />} isActive={path === '/scheduled'}>
                            <span>Đã lên lịch</span>
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
                    tooltip="Chủ đề"
                  >
                    <ListTree className="size-4" />
                    <span>Chủ đề</span>
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
                          tooltip="Người nhận"
                          isActive={path.startsWith('/users') || path.startsWith('/subscriptions')}
                        >
                          <Users className="size-4" />
                          <span>Người nhận</span>
                          <ChevronRight className="ml-auto size-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                        </SidebarMenuButton>
                      }
                    />
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/users" />} isActive={path.startsWith('/users')}>
                            <span>Users</span>
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
                    tooltip="Templates"
                  >
                    <FileText className="size-4" />
                    <span>Templates</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            {/* Nhóm Cài đặt */}
            <SidebarGroup className="group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-0.5">
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground group-data-[collapsible=icon]:hidden">
                Hệ thống
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
                          tooltip="Cài đặt App"
                          isActive={path.startsWith('/settings')}
                        >
                          <Settings className="size-4" />
                          <span>Cài đặt App</span>
                          <ChevronRight className="ml-auto size-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                        </SidebarMenuButton>
                      }
                    />
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/settings/profile" />} isActive={path === '/settings/profile'}>
                            <span>Hồ sơ</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/settings/credentials" />} isActive={path === '/settings/credentials'}>
                            <span>Credentials</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/settings/quota" />} isActive={path === '/settings/quota'}>
                            <span>Kênh & Quota</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/settings/origins" />} isActive={path === '/settings/origins'}>
                            <span>IP & Origin</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<AppLink href="/settings/sync" />} isActive={path === '/settings/sync'}>
                            <span>Sync danh bạ</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroup>

            {/* Nhóm EWS Tổng (Super Admin Only) */}
            {role === 'Super Admin' && (
              <SidebarGroup className="group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-0.5">
                <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground group-data-[collapsible=icon]:hidden">
                  EWS Tổng
                </SidebarGroupLabel>
                <SidebarMenu className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
                  <Collapsible
                    defaultOpen={path.startsWith('/admin')}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                      <CollapsibleTrigger
                        render={
                          <SidebarMenuButton
                            tooltip="Quản trị EWS"
                            isActive={path.startsWith('/admin')}
                          >
                            <ShieldCheck className="size-4" />
                            <span>Quản trị EWS</span>
                            <ChevronRight className="ml-auto size-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                          </SidebarMenuButton>
                        }
                      />
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton render={<AppLink href="/admin/send-approvals" />} isActive={path.startsWith('/admin/send-approvals')}>
                              <span>Duyệt lần gửi</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton render={<AppLink href="/admin/apps" />} isActive={path === '/admin/apps'}>
                              <span>Tất cả app</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton render={<AppLink href="/admin/audit" />} isActive={path === '/admin/audit'}>
                              <span>Audit log</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton render={<AppLink href="/admin/directory" />} isActive={path === '/admin/directory'}>
                              <span>Danh bạ & Resolver</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                </SidebarMenu>
              </SidebarGroup>
            )}

            {/* Bottom Action: Trigger mở rộng sidebar khi đang thu gọn */}
            <div className="mt-auto hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center py-2">
              <CustomSidebarTrigger
                tooltipSide="right"
                className="text-muted-foreground hover:bg-[var(--starlight)]/15 hover:text-[var(--starlight)] transition-all"
              />
            </div>
          </SidebarContent>

          {/* Footer: User Profile & Role Switcher */}
          <SidebarFooter className="p-2 border-t border-[var(--orbit)] group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
            <SidebarMenu className="group-data-[collapsible=icon]:items-center">
              <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <SidebarMenuButton
                        size="lg"
                        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground border border-[var(--orbit)] shadow-xs transition-all hover:border-[var(--starlight)]/40 hover:bg-[var(--void)]/80 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center"
                      >
                        <Avatar className="size-8 rounded-lg border border-[var(--orbit)] shrink-0">
                          <AvatarFallback className="rounded-lg bg-gradient-to-br from-[var(--starlight)]/25 to-[var(--pulsar)]/20 text-[var(--starlight)] font-bold text-xs">
                            {initialsOf(admin.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-xs leading-tight min-w-0 group-data-[collapsible=icon]:hidden">
                          <span className="truncate font-semibold text-sidebar-foreground">
                            {admin.email}
                          </span>
                          <span className="truncate text-[10px] text-muted-foreground flex items-center gap-1.5">
                            <span className="inline-block size-1.5 rounded-full bg-[var(--aurora)] shadow-[0_0_5px_var(--aurora)]" />
                            {role}
                          </span>
                        </div>
                        <ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden shrink-0" />
                      </SidebarMenuButton>
                    }
                  />
                  <DropdownMenuContent
                    className="w-(--anchor-width) min-w-64 rounded-xl border border-border/80 bg-popover p-2 shadow-lg"
                    side="top"
                    align="start"
                    sideOffset={8}
                  >
                    {/* User Summary Card */}
                    <div className="flex items-center gap-2.5 px-2 py-2 mb-1 rounded-lg bg-[var(--void)]/60 border border-[var(--orbit)]">
                      <Avatar className="size-9 rounded-lg border border-[var(--orbit)] shrink-0">
                        <AvatarFallback className="rounded-lg bg-gradient-to-br from-[var(--starlight)]/20 to-[var(--pulsar)]/20 text-[var(--starlight)] font-bold text-xs">
                          {initialsOf(admin.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {admin.email}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground truncate">
                          {admin.role}
                        </span>
                      </div>
                    </div>

                    <DropdownMenuSeparator className="my-1 bg-border/60" />

                    {/* GroupLabel phải nằm trong Group — xem ghi chú ở app switcher bên trên. */}
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
                        Chế độ xem demo (Role)
                      </DropdownMenuLabel>
                      {(['App Owner', 'App Admin', 'Super Admin', 'End User'] as DemoRole[]).map((r) => (
                        <DropdownMenuItem
                          key={r}
                          onClick={() => setRole(r)}
                          className={cn(
                            'flex items-center justify-between rounded-lg px-2 py-1.5 cursor-pointer text-xs',
                            r === role && 'bg-sidebar-accent font-medium text-foreground',
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'size-1.5 rounded-full',
                                r === 'Super Admin'
                                  ? 'bg-[var(--solar)] shadow-[0_0_5px_var(--solar)]'
                                  : r === 'App Owner'
                                  ? 'bg-[var(--starlight)] shadow-[0_0_5px_var(--starlight)]'
                                  : r === 'App Admin'
                                  ? 'bg-[var(--aurora)] shadow-[0_0_5px_var(--aurora)]'
                                  : 'bg-muted-foreground'
                              )}
                            />
                            <span>{r}</span>
                          </div>
                          {r === role && <Check className="size-3.5 text-[var(--starlight)]" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator className="my-1 bg-border/60" />

                    <DropdownMenuItem
                      onClick={() => signOutAction()}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-xs text-[var(--solar)]"
                    >
                      <LogOut className="size-3.5" />
                      <span>Đăng xuất</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        {/* Main Content Area */}
        <SidebarInset className="bg-transparent min-w-0">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--orbit)] bg-[var(--deep)]/85 px-4 lg:px-6 backdrop-blur-xl transition-[width,height] ease-linear">
            <Breadcrumb>
              <BreadcrumbList>
                {crumb && crumb.group !== crumb.name && (
                  <>
                    <BreadcrumbItem>
                      <BreadcrumbLink render={<AppLink href={crumb.href} />} className="text-muted-foreground hover:text-foreground">
                        {crumb.group}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </>
                )}
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground">
                    {crumb?.name ?? path.split('/').filter(Boolean).pop() ?? 'Tổng quan'}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="ml-auto flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-lg border border-[var(--orbit)] bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground sm:flex">
                <Search className="size-3.5" />
                <span>Tìm kiếm</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  ⌘K
                </kbd>
              </div>
              {app && (
                <div
                  className="hidden items-center gap-2 text-xs md:flex rounded-lg border border-[var(--orbit)] bg-muted/30 px-2.5 py-1"
                  title={`Quota phút: ${app.quota_used ?? 0}/${app.quota}`}
                >
                  <QuotaArc used={app.quota_used ?? 0} max={app.quota} className="size-4" />
                  <span className="text-muted-foreground">Quota:</span>
                  <span className="font-mono tabular-nums font-semibold text-[var(--starlight)]">
                    {app.quota_used ?? 0}/{app.quota}
                  </span>
                </div>
              )}
              <Button variant="ghost" size="icon-sm" className="relative text-muted-foreground hover:text-foreground" aria-label={`${pending} yêu cầu chờ duyệt`}>
                <Bell className="size-4" />
                {pending > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-[var(--solar)] font-mono text-[9px] font-bold tabular-nums text-white">
                    {pending}
                  </span>
                )}
              </Button>
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
