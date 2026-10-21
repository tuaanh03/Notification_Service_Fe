'use client'

import { useState } from 'react'
import { ListTree } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { InfoHint } from '@/components/info-hint'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import type { CreateTopicInput } from '@/lib/api/topics'
import { TOPIC_KEY_RE, topicKeyFrom } from '@/lib/topic-key'

type Form = Omit<CreateTopicInput, 'key'> & { customKey: string | null }
const EMPTY: Form = { name: '', mandatory: false, defaultMode: 'opt_out', customKey: null }

/**
 * Tạo chủ đề (UX-11). Người dùng chỉ đặt TÊN; mã cho đội app tự sinh từ tên (`topicKeyFrom`, tránh mã đã có trong
 * app), hiện mờ dưới ô tên — "Sửa" mới mở ô nhập mã. Dùng `<ConfirmDialog children>` — dialog xác nhận duy nhất của app.
 */
export function CreateTopicDialog({
  open,
  appName,
  existingKeys,
  pending,
  onCancel,
  onSubmit,
}: {
  open: boolean
  appName: string
  /** Mã chủ đề đã có trong app — để mã tự sinh không trùng. */
  existingKeys: readonly string[]
  pending: boolean
  onCancel: () => void
  onSubmit: (input: CreateTopicInput) => void
}) {
  const t = useTranslations('createTopic')
  const [form, setForm] = useState<Form>(EMPTY)
  const taken = new Set(existingKeys)
  const key = form.customKey ?? topicKeyFrom(form.name, taken)
  const keyError = key === '' ? null : !TOPIC_KEY_RE.test(key) ? t('keyInvalid') : taken.has(key) ? t('keyTaken') : null
  const valid = form.name.trim().length > 0 && key !== '' && keyError === null

  const close = () => {
    setForm(EMPTY)
    onCancel()
  }

  return (
    <ConfirmDialog
      icon={ListTree}
      open={open}
      title={t('title')}
      description={t('body', { app: appName })}
      confirmLabel={pending ? t('creating') : t('create')}
      confirmDisabled={!valid || pending}
      onConfirm={() => {
        const { customKey: _, ...rest } = form
        onSubmit({ ...rest, key, name: form.name.trim() })
      }}
      onCancel={close}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="topic-name">{t('name')}</Label>
          <Input
            id="topic-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={t('namePlaceholder')}
            maxLength={200}
          />
          {form.customKey === null ? (
            <div className="flex min-h-6 flex-wrap items-center gap-x-1.5 text-xs text-[var(--text-secondary)]">
              <span>{t('keyAuto')}</span>
              <code className="break-all font-mono text-foreground">{key || '—'}</code>
              <InfoHint label={t('key')} summary={t('keyInfo')} />
              <Button
                type="button"
                variant="link"
                className="h-auto min-h-6 px-1 text-xs max-md:min-h-11"
                onClick={() => setForm((f) => ({ ...f, customKey: key }))}
              >
                {t('keyEdit')}
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="topic-key" className="text-xs">
                {t('key')}
              </Label>
              <Input
                id="topic-key"
                value={form.customKey}
                onChange={(e) => setForm((f) => ({ ...f, customKey: e.target.value.trim().toLowerCase() }))}
                className="font-mono"
                aria-invalid={keyError !== null}
                aria-describedby={keyError ? 'topic-key-error' : undefined}
              />
              {keyError && (
                <p id="topic-key-error" className="text-xs text-[var(--supernova)]">
                  {keyError}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="topic-default-mode">{t('defaultMode')}</Label>
          <NativeSelect
            id="topic-default-mode"
            className="w-full"
            value={form.defaultMode}
            onChange={(e) => setForm((f) => ({ ...f, defaultMode: e.target.value as CreateTopicInput['defaultMode'] }))}
          >
            <NativeSelectOption value="opt_out">{t('optOut')}</NativeSelectOption>
            <NativeSelectOption value="opt_in">{t('optIn')}</NativeSelectOption>
          </NativeSelect>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--orbit)] p-3">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="topic-mandatory">{t('mandatory')}</Label>
            <InfoHint label={t('mandatory')} summary={t('mandatoryHint')} />
          </div>
          <Switch id="topic-mandatory" checked={form.mandatory} onCheckedChange={(v) => setForm((f) => ({ ...f, mandatory: v }))} />
        </div>
      </div>
    </ConfirmDialog>
  )
}
