'use client'

import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { App } from '@/lib/mock-data'
import type { AppRole, OrgAppRoleDto, OrgMemberDto, OrgRole } from '@/lib/api/types'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

/**
 * Hộp thoại của màn Thành viên (ADR-0026 của backend) — đều bọc `<ConfirmDialog children>`, dialog
 * xác nhận duy nhất của app (CLAUDE.md mục 1). Vai Owner chỉ có trong danh sách khi người đang
 * thao tác là Owner / Super Admin (`allowOwner`).
 */

/** Sơ bộ cho nút bấm — backend mới là nơi kiểm thật. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function ErrorAlert({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <Alert variant="destructive">
      <TriangleAlert />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  )
}

function RoleSelect({
  id,
  value,
  allowOwner,
  onChange,
}: {
  id: string
  value: OrgRole
  allowOwner: boolean
  onChange: (role: OrgRole) => void
}) {
  const tr = useTranslations('roles')
  const roles: OrgRole[] = allowOwner ? ['member', 'org_admin', 'owner'] : ['member', 'org_admin']
  return (
    <NativeSelect id={id} className="w-full" value={value} onChange={(e) => onChange(e.target.value as OrgRole)}>
      {roles.map((r) => (
        <NativeSelectOption key={r} value={r}>
          {tr(r)}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}

export function AddMemberDialog({
  open,
  allowOwner,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  open: boolean
  allowOwner: boolean
  pending: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (email: string, role: OrgRole) => void
}) {
  const t = useTranslations('members')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrgRole>('member')
  const trimmed = email.trim()
  const close = () => {
    setEmail('')
    setRole('member')
    onCancel()
  }
  return (
    <ConfirmDialog
      open={open}
      title={t('addTitle')}
      description={t('addBody')}
      confirmLabel={pending ? t('saving') : t('add')}
      confirmDisabled={!EMAIL.test(trimmed) || pending}
      onConfirm={() => onSubmit(trimmed, role)}
      onCancel={close}
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="member-email">{t('email')}</Label>
          <Input
            id="member-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ten@congty.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="member-role">{t('role')}</Label>
          <RoleSelect id="member-role" value={role} allowOwner={allowOwner} onChange={setRole} />
        </div>
        <ErrorAlert error={error} />
      </div>
    </ConfirmDialog>
  )
}

export function ChangeRoleDialog({
  member,
  allowOwner,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  member: OrgMemberDto | null
  allowOwner: boolean
  pending: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (member: OrgMemberDto, role: OrgRole) => void
}) {
  const t = useTranslations('members')
  // `key` theo người đang sửa: mở cho người khác thì state chọn vai bắt đầu lại từ vai hiện tại.
  return (
    <ChangeRoleBody
      key={member?.adminId ?? 'closed'}
      member={member}
      // Đang là Owner thì phải giữ lựa chọn Owner trong danh sách, kể cả khi người sửa không được trao Owner.
      allowOwner={allowOwner || member?.role === 'owner'}
      pending={pending}
      error={error}
      title={t('changeRoleTitle')}
      onCancel={onCancel}
      onSubmit={onSubmit}
    />
  )
}

function ChangeRoleBody({
  member,
  allowOwner,
  pending,
  error,
  title,
  onCancel,
  onSubmit,
}: {
  member: OrgMemberDto | null
  allowOwner: boolean
  pending: boolean
  error: string | null
  title: string
  onCancel: () => void
  onSubmit: (member: OrgMemberDto, role: OrgRole) => void
}) {
  const t = useTranslations('members')
  const [role, setRole] = useState<OrgRole>(member?.role ?? 'member')
  return (
    <ConfirmDialog
      open={member !== null}
      title={title}
      description={t('changeRoleBody', { email: member?.email ?? '' })}
      confirmLabel={pending ? t('saving') : t('save')}
      confirmDisabled={member === null || role === member.role || pending}
      onConfirm={() => member && onSubmit(member, role)}
      onCancel={onCancel}
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="member-new-role">{t('role')}</Label>
          <RoleSelect id="member-new-role" value={role} allowOwner={allowOwner} onChange={setRole} />
        </div>
        <ErrorAlert error={error} />
      </div>
    </ConfirmDialog>
  )
}

type Choice = AppRole | 'none'

export function AppRolesDialog({
  member,
  apps,
  current,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  member: OrgMemberDto | null
  apps: App[]
  current: OrgAppRoleDto[]
  pending: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (member: OrgMemberDto, changes: { appId: string; role: AppRole | null }[]) => void
}) {
  return (
    <AppRolesBody
      key={member?.adminId ?? 'closed'}
      member={member}
      apps={apps}
      current={current}
      pending={pending}
      error={error}
      onCancel={onCancel}
      onSubmit={onSubmit}
    />
  )
}

function AppRolesBody({
  member,
  apps,
  current,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  member: OrgMemberDto | null
  apps: App[]
  current: OrgAppRoleDto[]
  pending: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (member: OrgMemberDto, changes: { appId: string; role: AppRole | null }[]) => void
}) {
  const t = useTranslations('members')
  const before = new Map<string, Choice>(
    apps.map((a) => [a.app_id, current.find((r) => r.adminId === member?.adminId && r.appId === a.app_id)?.role ?? 'none']),
  )
  const [choice, setChoice] = useState<Map<string, Choice>>(before)
  const changes = apps
    .filter((a) => choice.get(a.app_id) !== before.get(a.app_id))
    .map((a) => {
      const c = choice.get(a.app_id) ?? 'none'
      return { appId: a.app_id, role: c === 'none' ? null : c }
    })

  return (
    <ConfirmDialog
      open={member !== null}
      title={t('appAccessTitle')}
      description={t('appAccessBody', { email: member?.email ?? '' })}
      confirmLabel={pending ? t('saving') : t('save')}
      confirmDisabled={member === null || changes.length === 0 || pending}
      onConfirm={() => member && onSubmit(member, changes)}
      onCancel={onCancel}
    >
      <div className="space-y-3">
        {apps.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">{t('noApps')}</p>
        ) : (
          <div className="divide-y divide-[var(--orbit)] rounded-lg border border-[var(--orbit)]">
            {apps.map((a) => (
              <div key={a.app_id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="truncate font-mono text-[11px] text-[var(--text-muted)]">{a.slug}</p>
                </div>
                <NativeSelect
                  aria-label={t('appAccessFor', { app: a.name })}
                  value={choice.get(a.app_id) ?? 'none'}
                  onChange={(e) => setChoice((m) => new Map(m).set(a.app_id, e.target.value as Choice))}
                >
                  <NativeSelectOption value="none">{t('noAccess')}</NativeSelectOption>
                  <NativeSelectOption value="app_viewer">App Viewer</NativeSelectOption>
                  <NativeSelectOption value="app_admin">App Admin</NativeSelectOption>
                </NativeSelect>
              </div>
            ))}
          </div>
        )}
        <ErrorAlert error={error} />
      </div>
    </ConfirmDialog>
  )
}

export function RemoveMemberDialog({
  member,
  orgName,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  member: OrgMemberDto | null
  orgName: string
  pending: boolean
  error: string | null
  onCancel: () => void
  onConfirm: (member: OrgMemberDto) => void
}) {
  const t = useTranslations('members')
  return (
    <ConfirmDialog
      open={member !== null}
      tone="blocking"
      title={t('removeTitle')}
      description={t('removeBody', { email: member?.email ?? '', org: orgName })}
      confirmLabel={pending ? t('saving') : t('remove')}
      confirmDisabled={pending}
      onConfirm={() => member && onConfirm(member)}
      onCancel={onCancel}
    >
      <ErrorAlert error={error} />
    </ConfirmDialog>
  )
}
