'use client'
import { TriangleAlert } from 'lucide-react'
import { Panel } from '@/components/panel'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { ProfileDraft, TopicDraft } from './wizard-types'

/** Một dòng `dt/dd` — giá trị rỗng hiện `—`, không đoán hộ. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="font-mono break-all">{value || '—'}</dd>
    </div>
  )
}

/**
 * Bước 3 — rà soát rồi gửi. Nút nói rõ hậu quả: bấm là ghi thật vào hệ thống.
 */
export function StepReview({
  profile,
  topics,
  pending,
  error,
  onSubmit,
}: {
  profile: ProfileDraft
  topics: readonly TopicDraft[]
  pending: boolean
  error: string | null
  onSubmit: () => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Rà soát</h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Bấm gửi là tạo app thật trong hệ thống rồi chuyển sang chờ duyệt.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel className="p-4">
          <h3 className="mb-4 text-xs font-semibold text-[var(--starlight)]">Hồ sơ app</h3>
          <dl className="space-y-3 text-xs">
            <Fact label="name" value={profile.name.trim()} />
            <Fact label="slug" value={profile.slug} />
            <Fact label="namespace" value={profile.namespace} />
            <Fact label="origin" value={profile.origin} />
            <Fact label="allowed_origins" value={profile.origins.join(', ')} />
            <Fact label="ip_allowlist" value={profile.ipAllowlist.join(', ')} />
          </dl>
        </Panel>
        <Panel className="p-4">
          <h3 className="mb-4 text-xs font-semibold text-[var(--pulsar)]">Chủ đề ({topics.length})</h3>
          {topics.map((topic, index) => (
            <div key={`${topic.key}-${index}`} className="mb-3 border-b border-[var(--orbit)] pb-3 last:border-0">
              <p className="font-mono text-xs">{topic.key}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{topic.name}</p>
              <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
                {topic.mandatory ? 'mandatory' : topic.defaultMode}
              </p>
            </div>
          ))}
        </Panel>
      </div>

      {error && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Chưa tạo được app</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button size="lg" disabled={pending} onClick={onSubmit} className="w-full">
        {pending ? 'Đang tạo…' : `Tạo app và gửi duyệt (${topics.length} chủ đề)`}
      </Button>
    </div>
  )
}
