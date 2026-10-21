'use client'

import { useState, useTransition } from 'react'
import { Crown, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { deleteOrganizationAction, renameOrganizationAction, transferOwnershipAction } from '@/app/orgs/actions'
import { useAppRouter } from '@/components/app-link'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { OrgMemberDto } from '@/lib/api/types'

type Open = 'rename' | 'transfer' | 'delete' | null

/**
 * Quản lý tổ chức (ADR-0040 của backend) — chỉ Owner / Super Admin thấy nút này: Đổi tên · Chuyển Owner · Xoá. Lỗi của
 * backend (tên trùng, `ORG_HAS_APPS`, `ORG_NAME_MISMATCH`…) hiện NGAY TRONG hộp, hộp không đóng.
 */
export function OrgSettingsMenu({ orgId, orgName, members }: { orgId: string; orgName: string; members: OrgMemberDto[] }) {
  const t = useTranslations('orgSettings')
  const router = useAppRouter()
  const [open, setOpen] = useState<Open>(null)
  const [name, setName] = useState(orgName)
  const [target, setTarget] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const candidates = members.filter((m) => m.role !== 'owner')

  const show = (kind: Exclude<Open, null>) => {
    setError(null)
    setName(orgName)
    setTarget(candidates[0]?.adminId ?? '')
    setConfirm('')
    setOpen(kind)
  }
  const close = () => setOpen(null)

  const run = (action: () => Promise<{ ok: true } | { ok: false; message: string }>, done: string, after: () => void) =>
    startTransition(async () => {
      setError(null)
      const res = await action()
      if (!res.ok) return setError(res.message)
      setOpen(null)
      toast.success(done)
      after()
    })

  const errorLine = error && <p className="text-xs text-[var(--supernova)]">{error}</p>

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="icon" aria-label={t('menu')} className="max-md:size-11">
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56 rounded-xl p-1 bg-popover border border-border shadow-md">
          <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => show('rename')}>
            <Pencil className="size-3.5 mr-1.5" /> {t('rename')}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs cursor-pointer" disabled={candidates.length === 0} onClick={() => show('transfer')}>
            <Crown className="size-3.5 mr-1.5" /> {t('transfer')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" className="text-xs cursor-pointer" onClick={() => show('delete')}>
            <Trash2 className="size-3.5 mr-1.5" /> {t('delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={open === 'rename'}
        icon={Pencil}
        title={t('renameTitle')}
        description={t('renameBody')}
        confirmLabel={pending ? t('saving') : t('save')}
        confirmDisabled={pending || name.trim() === '' || name.trim() === orgName}
        onConfirm={() => run(() => renameOrganizationAction(orgId, name.trim()), t('renamed'), () => router.refresh())}
        onCancel={close}
      >
        <div className="space-y-1.5">
          <Label htmlFor="org-name">{t('name')}</Label>
          <Input id="org-name" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
          {errorLine}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={open === 'transfer'}
        icon={Crown}
        title={t('transferTitle')}
        description={t('transferBody')}
        confirmLabel={pending ? t('saving') : t('transferConfirm')}
        confirmDisabled={pending || target === ''}
        onConfirm={() => run(() => transferOwnershipAction(orgId, target), t('transferred'), () => router.refresh())}
        onCancel={close}
      >
        <div className="space-y-1.5">
          <Label htmlFor="org-new-owner">{t('newOwner')}</Label>
          <NativeSelect id="org-new-owner" className="w-full" value={target} onChange={(e) => setTarget(e.target.value)}>
            {candidates.map((m) => (
              <NativeSelectOption key={m.adminId} value={m.adminId}>
                {m.displayName ? `${m.displayName} · ${m.email}` : m.email}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errorLine}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={open === 'delete'}
        tone="blocking"
        title={t('deleteTitle', { org: orgName })}
        description={t('deleteBody')}
        confirmLabel={pending ? t('deleting') : t('deleteConfirm')}
        confirmDisabled={pending || confirm.trim() !== orgName}
        onConfirm={() =>
          run(() => deleteOrganizationAction(orgId, confirm), t('deleted'), () => {
            // push TRƯỚC rồi mới refresh (cùng lý do với tạo org): refresh trước thì push đè mất.
            router.push('/orgs')
            router.refresh()
          })
        }
        onCancel={close}
      >
        <div className="space-y-1.5">
          <Label htmlFor="org-confirm">{t('typeName', { org: orgName })}</Label>
          <Input id="org-confirm" value={confirm} autoComplete="off" onChange={(e) => setConfirm(e.target.value)} />
          {errorLine}
        </div>
      </ConfirmDialog>
    </>
  )
}
