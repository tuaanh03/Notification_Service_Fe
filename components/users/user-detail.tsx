'use client'

import { useState } from 'react'
import { AppLink } from '@/components/app-link'
import {
  Trash2,
  Users,
  Mail,
  Phone,
  MoreHorizontal,
  Copy,
  Send,
  Fingerprint,
  Shield,
  Calendar,
  Clock,
  Tag,
  RadioTower,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { subscriptionsOf, userById, tagsOf } from '@/lib/mock-data'
import { SubscriptionsPanel } from './subscriptions-panel'
import { DataTagsPanel } from './data-tags-panel'
import { EventLogPanel } from './event-log-panel'

export function UserDetail({ id }: { id: string }) {
  const user = userById(id)
  const [extra, setExtra] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [tagsCount, setTagsCount] = useState(() => (user ? tagsOf(user.id).length : 0))

  // State cho Action buttons: Thêm email / Thêm SĐT
  const [addingChannel, setAddingChannel] = useState<'email' | 'sms' | null>(null)
  const [channelValue, setChannelValue] = useState('')

  if (!user)
    return (
      <>
        <PageHeader title="User" />
        <EmptyState
          icon={Users}
          title="Không tìm thấy user"
          description={`Không có hồ sơ ${id}.`}
          action={
            <Button variant="outline" render={<AppLink href="/users" />}>
              Về danh sách Users
            </Button>
          }
        />
      </>
    )

  const subCount = subscriptionsOf(user.id).length + extra

  const handleSaveNewChannel = (e: React.FormEvent) => {
    e.preventDefault()
    if (!channelValue.trim()) return

    setExtra((prev) => prev + 1)
    toast.success(
      `Đã thêm ${addingChannel === 'email' ? 'email' : 'số điện thoại'} mới`,
      {
        description: `${channelValue.trim()} đã được thêm vào danh sách điểm nhận tin.`,
      },
    )
    setChannelValue('')
    setAddingChannel(null)
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id)
    toast.success(`Đã sao chép User ID: ${user.id}`)
  }

  const handleTestPing = () => {
    toast.info(`Đang gửi thông báo kiểm tra đến ${user.name || user.id}...`, {
      description: `Gửi qua ${subCount} kênh nhận tin hiện có.`,
    })
  }

  return (
    <div className="space-y-6">
      {/* Top Header kèm Cụm Action Buttons chuẩn mực SaaS */}
      <PageHeader
        title={user.id}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyId}
              className="h-8.5 text-xs gap-1.5 font-medium border-border/80 shadow-2xs hover:bg-muted/50"
            >
              <Copy className="size-3.5 text-muted-foreground" />
              <span>Copy ID</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAddingChannel('email')
                setChannelValue('')
              }}
              className="h-8.5 text-xs gap-1.5 font-medium border-border/80 shadow-2xs hover:bg-muted/50"
            >
              <Mail className="size-3.5 text-primary" />
              <span>Thêm email</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAddingChannel('sms')
                setChannelValue('')
              }}
              className="h-8.5 text-xs gap-1.5 font-medium border-border/80 shadow-2xs hover:bg-muted/50"
            >
              <Phone className="size-3.5 text-primary" />
              <span>Thêm SĐT</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger render={<span />}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8.5 px-2.5 text-xs gap-1 text-muted-foreground hover:text-foreground border-border/80 shadow-2xs"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-xs">
                <DropdownMenuItem onClick={handleCopyId} className="cursor-pointer gap-2">
                  <Copy className="size-3.5" />
                  <span>Sao chép User ID</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleTestPing} className="cursor-pointer gap-2">
                  <Send className="size-3.5" />
                  <span>Gửi tin kiểm tra (Ping)</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleting(true)}
                  className="cursor-pointer gap-2 text-destructive font-medium"
                >
                  <Trash2 className="size-3.5" />
                  <span>Xóa user khỏi app</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Tabs Navigation phẳng, gọn gàng sát lề trái chuẩn Enterprise */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList
          variant="line"
          className="h-auto p-0 gap-8 bg-transparent border-b border-border/70 w-full justify-start rounded-none"
        >
          <TabsTrigger
            value="overview"
            className="border-none shadow-none bg-transparent hover:bg-transparent px-1 pb-3 text-sm font-medium text-muted-foreground data-active:text-foreground data-active:font-semibold data-active:after:bg-primary cursor-pointer"
          >
            Overview
          </TabsTrigger>

          <TabsTrigger
            value="logs"
            className="border-none shadow-none bg-transparent hover:bg-transparent px-1 pb-3 text-sm font-medium text-muted-foreground data-active:text-foreground data-active:font-semibold data-active:after:bg-primary cursor-pointer"
          >
            Event log
          </TabsTrigger>

          <TabsTrigger
            value="subscriptions"
            className="border-none shadow-none bg-transparent hover:bg-transparent px-1 pb-3 text-sm font-medium text-muted-foreground data-active:text-foreground data-active:font-semibold data-active:after:bg-primary cursor-pointer"
          >
            <span>Subscriptions</span>
            <Badge
              variant="outline"
              className="ml-2 h-4.5 min-w-4.5 px-1.5 rounded-full font-mono text-[10px] text-muted-foreground bg-muted/60 border-border/60"
            >
              {subCount}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="tags"
            className="border-none shadow-none bg-transparent hover:bg-transparent px-1 pb-3 text-sm font-medium text-muted-foreground data-active:text-foreground data-active:font-semibold data-active:after:bg-primary cursor-pointer"
          >
            <span>Data tags</span>
            <Badge
              variant="outline"
              className="ml-2 h-4.5 min-w-4.5 px-1.5 rounded-full font-mono text-[10px] text-muted-foreground bg-muted/60 border-border/60"
            >
              {tagsCount}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW — Thẻ Profile Card thống nhất cao cấp */}
        <TabsContent value="overview" className="space-y-6 outline-none">
          <Panel className="p-6 bg-card border border-border/80 rounded-xl shadow-xs space-y-6">
            {/* Header của thẻ Recipient Specification */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Fingerprint className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-foreground">
                      Thông số người nhận (Recipient Specification)
                    </h2>
                    {user.identified ? (
                      <Badge
                        variant="outline"
                        className="text-[11px] font-normal text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 gap-1 px-2 py-0.5"
                      >
                        <CheckCircle2 className="size-3" />
                        <span>Đã định danh</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[11px] font-normal text-amber-600 border-amber-300">
                        Chưa định danh
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>Mã UUID:</span>
                    <span className="font-mono text-xs text-foreground select-all">{user.id}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bố cục Grid 4 cột thông tin kỹ thuật gọn gàng, rõ nét */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Email chính */}
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Mail className="size-3.5 text-muted-foreground" />
                  <span>Email nhận tin</span>
                </div>
                <div className="text-sm font-mono font-medium text-foreground">
                  {user.email || '—'}
                </div>
              </div>

              {/* Số điện thoại */}
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Phone className="size-3.5 text-muted-foreground" />
                  <span>Số điện thoại</span>
                </div>
                <div className="text-sm font-mono font-medium text-foreground">
                  {user.phone || '—'}
                </div>
              </div>

              {/* External ID */}
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Fingerprint className="size-3.5 text-muted-foreground" />
                  <span>External ID</span>
                </div>
                <div className="text-sm font-mono font-semibold text-foreground">
                  {user.external_id || '—'}
                </div>
              </div>

              {/* Mã khách hàng */}
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Shield className="size-3.5 text-muted-foreground" />
                  <span>Mã khách hàng</span>
                </div>
                <div className="text-sm font-mono font-semibold text-foreground">
                  {user.customer_code || '—'}
                </div>
              </div>

              {/* Ngày đăng ký */}
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  <span>Ngày đăng ký</span>
                </div>
                <div className="text-sm font-mono text-foreground">
                  {user.created_at}
                </div>
              </div>

              {/* Hoạt động cuối */}
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span>Hoạt động cuối</span>
                </div>
                <div className="text-sm text-foreground">
                  {user.last_seen}
                </div>
              </div>

              {/* Kênh nhận tin */}
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <RadioTower className="size-3.5 text-muted-foreground" />
                  <span>Kênh nhận tin</span>
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {subCount} kênh (subscriptions)
                </div>
              </div>

              {/* Data tags */}
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Tag className="size-3.5 text-muted-foreground" />
                  <span>Thuộc tính dữ liệu</span>
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {tagsCount} data tags
                </div>
              </div>
            </div>
          </Panel>
        </TabsContent>

        {/* TAB 2: EVENT LOG */}
        <TabsContent value="logs" className="outline-none">
          <Panel className="p-6">
            <EventLogPanel userId={user.id} />
          </Panel>
        </TabsContent>

        {/* TAB 3: SUBSCRIPTIONS */}
        <TabsContent value="subscriptions" className="outline-none">
          <Panel className="p-6">
            <SubscriptionsPanel userId={user.id} />
          </Panel>
        </TabsContent>

        {/* TAB 4: DATA TAGS */}
        <TabsContent value="tags" className="outline-none">
          <Panel className="p-6">
            <DataTagsPanel userId={user.id} onTagsCountChange={setTagsCount} />
          </Panel>
        </TabsContent>
      </Tabs>

      {/* Modal Thêm Email / Thêm SĐT từ Action Header */}
      <Dialog
        open={Boolean(addingChannel)}
        onOpenChange={(open) => !open && setAddingChannel(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              {addingChannel === 'email' ? 'Thêm địa chỉ Email' : 'Thêm số điện thoại'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveNewChannel} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {addingChannel === 'email' ? 'Địa chỉ Email' : 'Số điện thoại'}
              </label>
              <Input
                type={addingChannel === 'email' ? 'email' : 'tel'}
                value={channelValue}
                onChange={(e) => setChannelValue(e.target.value)}
                placeholder={
                  addingChannel === 'email'
                    ? 'user.support@enterprise.vn'
                    : '0987654321'
                }
                className="h-9 text-xs"
                autoFocus
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Điểm nhận mới sẽ được tự động liên kết thành kênh nhận thông báo (subscription) cho người dùng này.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAddingChannel(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!channelValue.trim()}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Lưu điểm nhận
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Hộp thoại xác nhận xóa User (chỉ mở khi click vào Menu Thao tác) */}
      <ConfirmDialog
        open={deleting}
        tone="blocking"
        title="Xoá user khỏi app?"
        description={`Xoá hồ sơ người dùng ${user.name || user.id} cùng toàn bộ ${subCount} điểm nhận tin liên quan. Hành động này không thể hoàn tác.`}
        facts={[
          ['User ID', user.id],
          ['Email', user.email || '—'],
          ['Subscriptions', `${subCount}`],
        ]}
        confirmLabel={`Xoá ${user.id}`}
        onConfirm={() => {
          setDeleting(false)
          toast.success('Đã xoá user khỏi app', {
            description: `${user.id} — delivery log cũ vẫn được bảo lưu.`,
          })
        }}
        onCancel={() => setDeleting(false)}
      >
        <p className="text-xs text-[var(--text-secondary)]">
          Lịch sử delivery log cũ vẫn được bảo lưu phục vụ kiểm toán.
        </p>
      </ConfirmDialog>
    </div>
  )
}
