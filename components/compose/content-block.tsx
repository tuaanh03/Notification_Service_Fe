'use client'
import { useEffect, useState } from 'react'
import { Bold, Italic, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { Panel } from '@/components/panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { appVariableSchema, boundEmailTemplates, templateLabel } from '@/lib/mock-data'
import { useApp } from '@/components/app-context'
import { cn } from '@/lib/utils'

export type ContentSelection = {
  mode: 'template' | 'quick'
  /** label `vm_high_load v2` — rỗng khi chưa chọn */
  template: string
  /** giá trị biến đang nhập — Preview render thật từ đây */
  values: Record<string, string>
  quickSubject: string
  quickBody: string
}
export const emptyContent: ContentSelection = { mode: 'template', template: '', values: {}, quickSubject: '', quickBody: '' }

/**
 * Block 2. Validity (`onValid`) là nguồn duy nhất để mở nút Gửi — Composer không tự suy.
 * Composer remount block này bằng `key={topic}` nên đổi topic là state reset sạch.
 */
export function ContentBlock({
  topic,
  onValid,
  onSelect,
}: {
  topic: string
  onValid: (valid: boolean) => void
  onSelect: (value: ContentSelection) => void
}) {
  const [mode, setMode] = useState<'template' | 'quick'>('template')
  const [template, setTemplate] = useState('')
  const [values, setValues] = useState<Record<string, string>>({
    current_usage: '82',
    threshold: '75',
    action_url: appVariableSchema.find((v) => v.name === 'action_url')?.sample ?? '',
  })
  const [quick, setQuick] = useState('')
  const [quickSubject, setQuickSubject] = useState('')
  // UC-008 BR-3: chỉ template đã bind cho topic, kênh email, published
  const bound = boundEmailTemplates(topic)
  const { app } = useApp()

  // allowed_origins của app đang chọn (UC-008 §C) — từ mock, không hard-code
  const allowedOrigins = app.allowed_origins ?? []
  const missing = (name: string) => !values[name]?.trim()
  const notNumber = (name: string) => Boolean(values[name]) && Number.isNaN(Number(values[name]))
  const urlOutside = (name: string) => {
    if (name !== 'action_url' || !values[name]) return false
    try {
      return !allowedOrigins.includes(new URL(values[name]).origin)
    } catch {
      return true
    }
  }
  const templateValid =
    Boolean(template) &&
    appVariableSchema.every(
      (v) =>
        !(v.required && missing(v.name)) &&
        !(v.type === 'number' && notNumber(v.name)) &&
        !urlOutside(v.name),
    ) &&
    !Object.values(values).some((v) => v.includes('{{'))
  const valid = mode === 'quick' ? quick.trim().length > 0 : templateValid

  // báo lên Composer mỗi khi validity đổi — derive từ state, không có nút tay
  useEffect(() => onValid(valid), [onValid, valid])
  // đẩy nội dung hiện tại lên để Preview render thật (biến, subject, body)
  useEffect(
    () => onSelect({ mode, template, values, quickSubject, quickBody: quick }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, template, values, quickSubject, quick],
  )

  return (
    <Panel className={cn('p-5', valid && 'border-[var(--starlight)]/30 shadow-[var(--glow-starlight)]')}>
      <div className="flex gap-4">
        <Badge
          variant="outline"
          className="size-7 shrink-0 rounded-full border-[var(--starlight)]/60 px-0 font-mono text-sm text-[var(--starlight)]"
        >
          2
        </Badge>
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[var(--starlight)]">
              block 02
            </p>
            <h2 className="font-heading text-lg font-semibold">Nội dung</h2>
          </div>
          <ToggleGroup
            variant="outline"
            value={[mode]}
            onValueChange={(v) => setMode((v[0] as 'template' | 'quick' | undefined) ?? mode)}
          >
            <ToggleGroupItem value="template">Dùng template</ToggleGroupItem>
            <ToggleGroupItem value="quick">Soạn nhanh</ToggleGroupItem>
          </ToggleGroup>
          {mode === 'template' ? (
            <>
              <NativeSelect
                aria-label="Template"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full font-mono"
              >
                <NativeSelectOption value="">
                  {bound.length ? 'Chọn template email đã bind' : 'Topic chưa bind template email nào'}
                </NativeSelectOption>
                {bound.map((t) => (
                  <NativeSelectOption key={t.key} value={templateLabel(t)}>
                    {templateLabel(t)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {template && (
                <div className="grid gap-3 md:grid-cols-2">
                  {appVariableSchema.map(({ name, type, required, description }) => (
                    <div key={name} className="space-y-1 text-xs">
                      <Label htmlFor={`var-${name}`} className="font-mono">
                        {name} {required && <span className="text-[var(--supernova)]">*</span>}
                      </Label>
                      <p className="text-[var(--text-muted)]">{description}</p>
                      <Input
                        id={`var-${name}`}
                        type={type === 'number' ? 'number' : type === 'url' ? 'url' : 'text'}
                        value={values[name] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                        className="font-mono"
                      />
                      {required && missing(name) && (
                        <p className="text-[var(--supernova)]">Thiếu biến bắt buộc {name}</p>
                      )}
                      {type === 'number' && notNumber(name) && (
                        <p className="text-[var(--supernova)]">{name} phải là number</p>
                      )}
                      {urlOutside(name) && (
                        <p className="text-[var(--supernova)]">
                          Domain không thuộc allowed_origins ({allowedOrigins.join(', ')})
                        </p>
                      )}
                      {name === 'action_url' && !urlOutside(name) && (
                        <p className="font-mono text-[var(--text-muted)]">
                          allowed_origins: {allowedOrigins.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <Input
                aria-label="Subject"
                placeholder="Subject"
                value={quickSubject}
                onChange={(e) => setQuickSubject(e.target.value)}
              />
              <div className="flex gap-1">
                <Button type="button" variant="outline" size="icon-sm" aria-label="Đậm">
                  <Bold />
                </Button>
                <Button type="button" variant="outline" size="icon-sm" aria-label="Nghiêng">
                  <Italic />
                </Button>
                <Button type="button" variant="outline" size="icon-sm" aria-label="Chèn link">
                  <Link2 />
                </Button>
              </div>
              <Textarea
                aria-label="Nội dung"
                value={quick}
                onChange={(e) => setQuick(e.target.value.replace(/<[^>]*>/g, ''))}
                onPaste={(e) => {
                  // UC-008 BR-7: Soạn nhanh chặt hơn — HTML thô bị từ chối, báo bằng toast
                  if (e.clipboardData.getData('text/html')) {
                    e.preventDefault()
                    toast.error('Soạn nhanh không nhận HTML thô', {
                      description: 'Chế độ này cố ý chặt hơn. Cần cá nhân hoá thì dùng template.',
                    })
                  }
                }}
                placeholder="Nội dung giống nhau cho mọi người nhận..."
                className="min-h-32"
              />
              <p className="text-xs text-[var(--text-muted)]">
                Nội dung giống nhau cho mọi người nhận. Cần cá nhân hoá thì dùng template.
              </p>
            </div>
          )}
          <p className="text-xs text-[var(--text-muted)]">
            Template chỉ hiện khi đã bind cho topic, kênh email và trạng thái published.
          </p>
        </div>
      </div>
    </Panel>
  )
}
