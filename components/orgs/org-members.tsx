'use client'

import { useState, useTransition } from 'react'
import { KeyRound, MoreHorizontal, Pencil, Plus, TriangleAlert, UserMinus, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { consoleOrgs } from '@/lib/access'
import type { AppRole, OrgAppRoleDto, OrgMemberDto, OrgRole } from '@/lib/api/types'
import { useAppSelection } from '@/components/app-context'
import { useAppRouter } from '@/components/app-link'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { useRole } from '@/components/role-context'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { removeMemberAction, setAppRolesAction, setMemberAction } from '@/app/orgs/actions'
import { AddMemberDialog, AppRolesDialog, ChangeRoleDialog, RemoveMemberDialog } from './member-dialogs'

type Row = OrgMemberDto & { access: string; apps: number }
type Open =
  | { kind: 'add' }
  | { kind: 'role'; member: OrgMemberDto }
  | { kind: 'apps'; member: OrgMemberDto }
  | { kind: 'remove'; member: OrgMemberDto }
  | null

/** Owner / Org Admin ngầm là App Admin trên mọi app của org (ADR-0022) — không cần cấp vai app. */
const MANAGERS: readonly OrgRole[] = ['owner', 'org_admin']

/**
 * Màn Thành viên của một org (ADR-0026 của backend). Mọi thành viên xem được; Owner / Org Admin
 * thêm người, đổi vai, cấp vai app, gỡ người. Chỉ Owner (hoặc Super Admin) thấy lựa chọn vai Owner —
 * backend vẫn chặn (`OWNER_REQUIRED`), đây chỉ để không bày nút bấm vào bị từ chối.
 */
export function OrgMembers({
  orgId,
  members,
  appRoles,
  error,
}: {
  orgId: string
  members: OrgMemberDto[]
  appRoles: OrgAppRoleDto[]
  error: string | null
}) {
  const t = useTranslations('members')
  const tr = useTranslations('roles')
  const router = useAppRouter()
  const { me, isSuperAdmin } = useRole()
  const { apps } = useAppSelection()
  const [open, setOpen] = useState<Open>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const org = consoleOrgs(me).find((o) => o.id === orgId) ?? null
  if (!org) return <EmptyState icon={Users} title={t('notFoundTitle')} description={t('notFoundBody')} />

  const canManage = isSuperAdmin || (org.role !== null && MANAGERS.includes(org.role))
  const isOwner = isSuperAdmin || org.role === 'owner'
  const orgApps = apps.filter((a) => a.org_id === orgId).sort((a, b) => a.name.localeCompare(b.name))

  const rows: Row[] = members.map((m) => {
    const apps = appRoles.filter((r) => r.adminId === m.adminId).length
    return { ...m, apps, access: MANAGERS.includes(m.role) ? t('allApps') : apps === 0 ? '—' : t('appCount', { count: apps }) }
  })

  /** Chạy một Server Action; xong thì đóng hộp, đọc lại dữ liệu (Server Component), báo thành công. */
  const run = (action: () => Promise<{ ok: true } | { ok: false; message: string }>, done: string) =>
    startTransition(async () => {
      setActionError(null)
      const res = await action()
      if (!res.ok) return setActionError(res.message)
      setOpen(null)
      toast.success(done)
      router.refresh()
    })

  const close = () => {
    setOpen(null)
    setActionError(null)
  }

  const columns: Column<Row>[] = [
    {
      key: 'email',
      label: t('colEmail'),
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.displayName ?? r.email}</p>
          {r.displayName && <p className="truncate text-[11px] text-[var(--text-muted)]">{r.email}</p>}
        </div>
      ),
    },
    { key: 'role', label: t('colRole'), render: (r) => tr(r.role) },
    { key: 'access', label: t('colApps') },
  ]
  if (canManage) {
    columns.push({
      key: 'adminId',
      label: t('colActions'),
      align: 'right',
      render: (r) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t('actionsFor', { email: r.email })}
                  className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-52 rounded-xl p-1 bg-popover border border-border shadow-md">
              <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setOpen({ kind: 'role', member: r })}>
                <Pencil className="size-3.5 mr-1.5" /> {t('changeRole')}
              </DropdownMenuItem>
              {/* Owner / Org Admin đã có quyền mọi app — không có gì để cấp. */}
              {!MANAGERS.includes(r.role) && (
                <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setOpen({ kind: 'apps', member: r })}>
                  <KeyRound className="size-3.5 mr-1.5" /> {t('appAccess')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="text-xs cursor-pointer"
                onClick={() => setOpen({ kind: 'remove', member: r })}
              >
                <UserMinus className="size-3.5 mr-1.5" /> {t('remove')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    })
  }

  return (
    <>
      <PageHeader
        title={t('title', { org: org.name })}
        subtitle={canManage ? t('subtitleManage') : t('subtitleRead')}
        actions={
          canManage ? (
            <Button onClick={() => setOpen({ kind: 'add' })}>
              <Plus />
              {t('add')}
            </Button>
          ) : undefined
        }
      />

      {error && (
        <Alert variant="destructive" className="mb-5">
          <TriangleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DataTable<Row>
        columns={columns}
        rows={rows}
        filterKey="role"
        empty={<EmptyState icon={Users} title={t('emptyTitle')} description={t('emptyBody')} />}
      />

      <AddMemberDialog
        // Dựng lại mỗi lần mở: đọc lại danh sách người, bỏ người vừa chọn lần trước.
        key={open?.kind === 'add' ? 'add-open' : 'add-closed'}
        orgId={orgId}
        open={open?.kind === 'add'}
        allowOwner={isOwner}
        pending={pending}
        error={actionError}
        onCancel={close}
        onSubmit={(person, role) =>
          run(() => setMemberAction(orgId, person.email, role), t('added', { email: person.displayName ?? person.email }))
        }
      />
      <ChangeRoleDialog
        member={open?.kind === 'role' ? open.member : null}
        allowOwner={isOwner}
        pending={pending}
        error={actionError}
        onCancel={close}
        onSubmit={(member, role) => run(() => setMemberAction(orgId, member.email, role), t('roleChanged', { email: member.email }))}
      />
      <AppRolesDialog
        member={open?.kind === 'apps' ? open.member : null}
        apps={orgApps}
        current={appRoles}
        pending={pending}
        error={actionError}
        onCancel={close}
        onSubmit={(member, changes: { appId: string; role: AppRole | null }[]) =>
          run(() => setAppRolesAction(member, changes), t('appAccessSaved', { email: member.email }))
        }
      />
      <RemoveMemberDialog
        member={open?.kind === 'remove' ? open.member : null}
        orgName={org.name}
        pending={pending}
        error={actionError}
        onCancel={close}
        onConfirm={(member) => run(() => removeMemberAction(orgId, member.adminId), t('removed', { email: member.email }))}
      />
    </>
  )
}
