'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { useRole } from '@/components/role-context'
import type { CreateTopicInput } from '@/lib/api/topics'

/** Sao đúng `TOPIC_KEY` của backend (`admin-topics.routes.ts`) để báo lỗi tại chỗ, không đợi 422. */
const TOPIC_KEY = /^[a-z][a-z0-9_.-]{1,127}$/

const EMPTY: CreateTopicInput = { key: '', name: '', mandatory: false, defaultMode: 'opt_out' }

/**
 * Tạo chủ đề. Dùng `<ConfirmDialog children>` — dialog xác nhận duy nhất của app
 * (CLAUDE.md mục 1), không dựng `<Dialog>` song song.
 */
export function CreateTopicDialog({
  open,
  appName,
  pending,
  onCancel,
  onSubmit,
}: {
  open: boolean
  appName: string
  pending: boolean
  onCancel: () => void
  onSubmit: (input: CreateTopicInput) => void
}) {
  const t = useTranslations('createTopic')
  // Topic bắt buộc chỉ Super Admin đặt được (ADR-0022) — người khác thấy ô khoá kèm lý do.
  const { isSuperAdmin } = useRole()
  const [form, setForm] = useState<CreateTopicInput>(EMPTY)
  const keyValid = TOPIC_KEY.test(form.key)
  const valid = keyValid && form.name.trim().length > 0

  const close = () => {
    setForm(EMPTY)
    onCancel()
  }

  return (
    <ConfirmDialog
      open={open}
      title={t('title')}
      description={t('body', { app: appName })}
      confirmLabel={pending ? t('creating') : t('create')}
      confirmDisabled={!valid || pending}
      onConfirm={() => onSubmit({ ...form, name: form.name.trim() })}
      onCancel={close}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="topic-key">{t('key')}</Label>
          <Input
            id="topic-key"
            value={form.key}
            onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
            placeholder="order_updates"
            className="font-mono"
            aria-invalid={form.key.length > 0 && !keyValid}
          />
          <p className="text-xs text-[var(--text-muted)]">
            {t.rich('keyHint', { code: (chunks) => <code className="font-mono">{chunks}</code> })}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="topic-name">{t('name')}</Label>
          <Input
            id="topic-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={t('namePlaceholder')}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="topic-default-mode">{t('defaultMode')}</Label>
          <NativeSelect
            id="topic-default-mode"
            className="w-full"
            value={form.defaultMode}
            onChange={(e) =>
              setForm((f) => ({ ...f, defaultMode: e.target.value as CreateTopicInput['defaultMode'] }))
            }
          >
            <NativeSelectOption value="opt_out">{t('optOut')}</NativeSelectOption>
            <NativeSelectOption value="opt_in">{t('optIn')}</NativeSelectOption>
          </NativeSelect>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border border-[var(--orbit)] p-3">
          <div>
            <Label htmlFor="topic-mandatory">{t('mandatory')}</Label>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {isSuperAdmin ? t('mandatoryHint') : t('mandatorySuperAdminOnly')}
            </p>
          </div>
          <Switch
            id="topic-mandatory"
            checked={form.mandatory}
            onCheckedChange={(v) => setForm((f) => ({ ...f, mandatory: v }))}
            disabled={!isSuperAdmin}
          />
        </div>
      </div>
    </ConfirmDialog>
  )
}
