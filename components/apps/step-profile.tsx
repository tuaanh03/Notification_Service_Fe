'use client'
import { AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { RepeatableInput } from '@/components/repeatable-input'
import { useNetworkValidators } from './use-network-validators'
import { APP_SLUG, APP_SLUG_TEXT, type ProfileDraft } from './wizard-types'

/**
 * Bước 1 — hồ sơ app: các field của `POST /admin/apps` + allowlist đi kèm. `orgs` = org người này được
 * tạo app (ADR-0022); một org thì chỉ hiện tên, nhiều org thì bắt chọn.
 */
export function StepProfile({
  draft,
  orgs,
  onChange,
}: {
  draft: ProfileDraft
  orgs: { id: string; name: string }[]
  onChange: (next: ProfileDraft) => void
}) {
  const t = useTranslations('wizard')
  const mono = (chunks: React.ReactNode) => <span className="font-mono">{chunks}</span>
  const { validateIp, validateOrigin } = useNetworkValidators()
  const slugInvalid = draft.slug.length > 0 && !APP_SLUG.test(draft.slug)
  const nsInvalid = draft.namespace.length > 0 && !APP_SLUG.test(draft.namespace)
  const external = draft.origin === 'external'

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{t('stepProfile')}</h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{t.rich('profileDraftNote', { mono })}</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="wz-org">{t('org')}</Label>
        {orgs.length > 1 ? (
          <NativeSelect
            id="wz-org"
            value={draft.orgId}
            onChange={(e) => onChange({ ...draft, orgId: e.target.value })}
            className="w-full"
          >
            <NativeSelectOption value="">{t('orgPlaceholder')}</NativeSelectOption>
            {orgs.map((o) => (
              <NativeSelectOption key={o.id} value={o.id}>
                {o.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        ) : (
          <p id="wz-org" className="text-sm">{orgs[0]?.name ?? '—'}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="wz-name">{t('displayName')}</Label>
          <Input
            id="wz-name"
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
            placeholder={t('namePlaceholder')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="wz-slug" className="font-mono">slug</Label>
          <Input
            id="wz-slug"
            value={draft.slug}
            onChange={(e) => onChange({ ...draft, slug: e.target.value })}
            placeholder="don-hang"
            className="font-mono"
            aria-invalid={slugInvalid}
          />
          {slugInvalid && <p className="font-mono text-xs text-[var(--supernova)]">{t('mustMatch', { pattern: APP_SLUG_TEXT })}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wz-ns" className="font-mono">namespace</Label>
        <Input
          id="wz-ns"
          value={draft.namespace}
          onChange={(e) => onChange({ ...draft, namespace: e.target.value })}
          placeholder="don-hang"
          className="font-mono"
          aria-invalid={nsInvalid}
        />
        {nsInvalid && <p className="font-mono text-xs text-[var(--supernova)]">{t('mustMatch', { pattern: APP_SLUG_TEXT })}</p>}
        <Alert className="border-[var(--solar)]/30 bg-[var(--solar)]/[.06]">
          <AlertTriangle />
          <AlertDescription className="text-[var(--solar)]">{t('namespaceNote')}</AlertDescription>
        </Alert>
      </div>

      <div className="space-y-1">
        <Label>{t('callerSource')}</Label>
        <ToggleGroup
          variant="outline"
          size="sm"
          value={[draft.origin]}
          onValueChange={(v) => {
            const next = (v as string[])[0]
            if (next === 'internal' || next === 'external') onChange({ ...draft, origin: next })
          }}
        >
          <ToggleGroupItem value="internal" className="font-mono">internal</ToggleGroupItem>
          <ToggleGroupItem value="external" className="font-mono">external</ToggleGroupItem>
        </ToggleGroup>
        <p className="text-xs text-[var(--text-secondary)]">{t.rich('originNote', { mono })}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="wz-origins" className="font-mono text-xs">allowed_origins</Label>
          <RepeatableInput
            id="wz-origins"
            values={draft.origins}
            onChange={(origins) => onChange({ ...draft, origins })}
            placeholder="https://service.enterprise.vn"
            validate={validateOrigin}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="wz-ip" className="font-mono text-xs">
            ip_allowlist {external && <span className="text-[var(--supernova)]">*</span>}
          </Label>
          <RepeatableInput
            id="wz-ip"
            values={draft.ipAllowlist}
            onChange={(ipAllowlist) => onChange({ ...draft, ipAllowlist })}
            placeholder="10.20.0.15"
            validate={validateIp}
            invalid={external && draft.ipAllowlist.length === 0}
          />
          {external && draft.ipAllowlist.length === 0 && (
            <p className="text-xs text-[var(--supernova)]">{t('externalNeedsIp')}</p>
          )}
          <p className="text-xs text-[var(--text-muted)]">{t('ipNote')}</p>
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        {t.rich('grantLater', { b: (chunks) => <strong>{chunks}</strong> })}
      </p>
    </div>
  )
}
