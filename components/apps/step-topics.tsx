'use client'
import { Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { EMPTY_TOPIC, TOPIC_KEY, type TopicDraft } from './wizard-types'

/**
 * Bước 2 — chủ đề đầu tiên (≥ 1). Đúng 4 field của `POST /admin/apps/:appId/topics`.
 *
 * Mã chủ đề KHÔNG mang tiền tố namespace: backend đã giới hạn phạm vi bằng `appId` trên URL.
 */
export function StepTopics({ topics, onChange }: { topics: TopicDraft[]; onChange: (next: TopicDraft[]) => void }) {
  const t = useTranslations('wizard')
  const mono = (chunks: React.ReactNode) => <span className="font-mono">{chunks}</span>
  const update = (index: number, patch: Partial<TopicDraft>) =>
    onChange(topics.map((t, i) => (i === index ? { ...t, ...patch } : t)))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{t('stepTopics')}</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{t.rich('topicsDraftNote', { mono })}</p>
        </div>
        <Button variant="outline" onClick={() => onChange([...topics, { ...EMPTY_TOPIC }])}>
          <Plus /> {t('addTopic')}
        </Button>
      </div>

      {topics.map((topic, index) => {
        const keyInvalid = topic.key.length > 0 && !TOPIC_KEY.test(topic.key)
        const duplicate = topic.key.length > 0 && topics.some((t, i) => i !== index && t.key === topic.key)
        return (
          <div key={index} className="rounded-xl border border-[var(--orbit)] p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-[10px] tabular-nums text-[var(--text-muted)]">
                {t('topicNumber', { n: String(index + 1).padStart(2, '0') })}
              </span>
              {topics.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t('removeTopic', { n: index + 1 })}
                  onClick={() => onChange(topics.filter((_, i) => i !== index))}
                >
                  <Trash2 />
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`wz-topic-key-${index}`}>{t('topicKey')}</Label>
                <Input
                  id={`wz-topic-key-${index}`}
                  value={topic.key}
                  onChange={(e) => update(index, { key: e.target.value })}
                  placeholder="order_updates"
                  className="font-mono"
                  aria-invalid={keyInvalid || duplicate}
                />
                {keyInvalid && (
                  <p className="text-xs text-[var(--supernova)]">{t.rich('topicKeyRule', { mono })}</p>
                )}
                {duplicate && <p className="text-xs text-[var(--supernova)]">{t('topicKeyDuplicate')}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor={`wz-topic-name-${index}`}>{t('displayName')}</Label>
                <Input
                  id={`wz-topic-name-${index}`}
                  value={topic.name}
                  onChange={(e) => update(index, { name: e.target.value })}
                  placeholder={t('topicNamePlaceholder')}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`wz-topic-mode-${index}`}>{t('defaultMode')}</Label>
                <NativeSelect
                  id={`wz-topic-mode-${index}`}
                  value={topic.defaultMode}
                  onChange={(e) => update(index, { defaultMode: e.target.value as TopicDraft['defaultMode'] })}
                  className="w-full"
                  disabled={topic.mandatory}
                >
                  <NativeSelectOption value="opt_out">{t('optOut')}</NativeSelectOption>
                  <NativeSelectOption value="opt_in">{t('optIn')}</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="flex items-start gap-3 pt-6">
                <Switch
                  id={`wz-topic-mandatory-${index}`}
                  checked={topic.mandatory}
                  onCheckedChange={(v) => update(index, { mandatory: v })}
                />
                <div>
                  <Label htmlFor={`wz-topic-mandatory-${index}`}>{t('mandatory')}</Label>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{t('mandatoryHint')}</p>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
