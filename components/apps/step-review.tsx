import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import type { ProfileDraft, TopicDraft } from './wizard-types'

/** Step 3 — Rà soát; Gửi duyệt disabled khi 0 topic (UC-001 BR-1). */
export function StepReview({ profile, topics, onSubmit }: { profile: ProfileDraft; topics: TopicDraft[]; onSubmit: () => void }) {
  const ok = topics.length > 0
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Rà soát</h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">Kiểm tra thông tin trước khi gửi Super Admin duyệt.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Panel className="p-4">
          <h3 className="mb-4 text-xs font-semibold text-[var(--starlight)]">Hồ sơ app</h3>
          <dl className="space-y-3 text-xs">
            <div>
              <dt className="text-[var(--text-muted)]">slug</dt>
              <dd className="font-mono">{profile.external ? 'partner_service' : profile.appSlug || '—'}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">topic_namespace</dt>
              <dd className="font-mono">{profile.namespace}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">channels</dt>
              <dd className="font-mono">{profile.channels.join(', ')}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">allowed_origins</dt>
              <dd className="font-mono">{profile.origins.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">ip_allowlist</dt>
              <dd className="font-mono">{profile.ipAllowlist.join(', ') || '—'}</dd>
            </div>
          </dl>
        </Panel>
        <Panel className="p-4">
          <h3 className="mb-4 text-xs font-semibold text-[var(--pulsar)]">Topics ({topics.length})</h3>
          {topics.map((t, i) => (
            <div key={`${t.suffix}-${i}`} className="mb-3 border-b border-[var(--orbit)] pb-3 last:border-0">
              <p className="font-mono text-xs">
                {profile.namespace}.{t.suffix}
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{t.name}</p>
            </div>
          ))}
        </Panel>
      </div>
      <Button size="lg" disabled={!ok} onClick={onSubmit} className="w-full">
        Gửi duyệt
      </Button>
      {!ok && <p className="text-center text-xs text-[var(--solar)]">Phải có ≥ 1 topic mới gửi duyệt được.</p>}
    </div>
  )
}
