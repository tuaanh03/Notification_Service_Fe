'use client'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { apps, appBySlug, type Channel } from '@/lib/mock-data'
import { RepeatableInput } from '@/components/repeatable-input'
import { NAMESPACE_RE, NAMESPACE_RE_TEXT, validateCidr, validateOrigin, type ProfileDraft } from './wizard-types'

const ALL_CHANNELS: Channel[] = ['in_app', 'email']

/** Step 1 — Hồ sơ app (UC-001 §B). */
export function StepProfile({ draft, onChange }: { draft: ProfileDraft; onChange: (next: ProfileDraft) => void }) {
  const app = draft.appSlug ? appBySlug(draft.appSlug) : undefined
  const namespaceOwner = apps.find((a) => a.namespace === draft.namespace && a.slug !== draft.appSlug)
  const nsInvalid = !NAMESPACE_RE.test(draft.namespace)
  const nsSystem = draft.namespace === 'system'
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Hồ sơ app</h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Chỉ app bạn quản trị và chưa có active registration mới xuất hiện trong danh sách.
        </p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="wz-app">Chọn app</Label>
        <NativeSelect
          id="wz-app"
          value={draft.external ? '' : draft.appSlug}
          disabled={draft.external}
          onChange={(e) => {
            const slug = e.target.value
            // namespace tự sinh từ slug: ews-hypervisor → hypervisor
            onChange({ ...draft, appSlug: slug, namespace: slug.replace(/^ews-/, '').replace(/-/g, '_') })
          }}
          className="w-full"
        >
          <NativeSelectOption value="">Chọn app chưa đăng ký</NativeSelectOption>
          {apps
            .filter((item) => item.status !== 'active')
            .map((item) => (
              <NativeSelectOption key={item.slug} value={item.slug}>
                {item.name} · {item.slug}
              </NativeSelectOption>
            ))}
        </NativeSelect>
      </div>
      <Button variant="link" className="px-0" onClick={() => onChange({ ...draft, external: !draft.external, appSlug: '' })}>
        {draft.external ? '← Chọn app nội bộ' : '+ App chưa có trong EWS'}
      </Button>
      {draft.external && (
        <Alert className="border-[var(--solar)]/30 bg-[var(--solar)]/[.05]">
          <AlertDescription className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="wz-slug" className="font-mono text-xs">slug</Label>
              <Input id="wz-slug" placeholder="partner_service" className="font-mono" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wz-ext-name" className="text-xs">Tên</Label>
              <Input id="wz-ext-name" placeholder="Partner Service" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wz-owner" className="text-xs">Người quản trị app</Label>
              <Input id="wz-owner" placeholder="owner@example.com" />
            </div>
            <p className="self-end text-xs text-[var(--solar)]">
              origin = external. App ngoài mạng bắt buộc khai ip_allowlist để giới hạn nguồn gọi.
            </p>
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="wz-name">Tên hiển thị</Label>
          <Input id="wz-name" defaultValue={app?.name} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="wz-contact">Người liên hệ kỹ thuật</Label>
          <Input id="wz-contact" defaultValue={app?.technical_contact} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="wz-desc">Mô tả</Label>
        <Textarea id="wz-desc" placeholder="Mục đích của app service" />
      </div>
      <div className="space-y-1">
        <Label>Kênh cần dùng</Label>
        <ToggleGroup
          multiple
          variant="outline"
          size="sm"
          value={draft.channels}
          onValueChange={(v) => onChange({ ...draft, channels: v as Channel[] })}
        >
          {ALL_CHANNELS.map((c) => (
            <ToggleGroupItem key={c} value={c} className="font-mono">
              {c}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="space-y-2">
        <Label htmlFor="wz-ns" className="font-mono">topic_namespace</Label>
        <Input
          id="wz-ns"
          value={draft.namespace}
          onChange={(e) => onChange({ ...draft, namespace: e.target.value })}
          aria-invalid={nsInvalid || nsSystem || Boolean(namespaceOwner)}
          className="font-mono"
        />
        {/* UC-001 BR-2: chỉ sửa được ở step này, cảnh báo khoá cứng luôn hiện */}
        <Alert className="border-[var(--solar)]/30 bg-[var(--solar)]/[.06]">
          <AlertTriangle />
          <AlertDescription className="text-[var(--solar)]">
            Namespace khoá cứng sau khi duyệt. Đổi namespace = đổi mọi topic_key đã lưu.
          </AlertDescription>
        </Alert>
        {nsSystem && (
          <p className="font-mono text-xs text-[var(--supernova)]">
            `system` dành riêng cho thông báo toàn hệ thống, chỉ Super Admin phát.
          </p>
        )}
        {!nsSystem && nsInvalid && (
          <p className="font-mono text-xs text-[var(--supernova)]">Namespace phải khớp /{NAMESPACE_RE_TEXT}/</p>
        )}
        {namespaceOwner && (
          <p className="text-xs text-[var(--supernova)]">
            Namespace <span className="font-mono">{draft.namespace}</span> đã thuộc app{' '}
            <span className="font-mono">{namespaceOwner.slug}</span> — liên hệ {namespaceOwner.technical_contact}.
          </p>
        )}
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
            ip_allowlist {draft.external && <span className="text-[var(--supernova)]">*</span>}
          </Label>
          <RepeatableInput
            id="wz-ip"
            values={draft.ipAllowlist}
            onChange={(ipAllowlist) => onChange({ ...draft, ipAllowlist })}
            placeholder="10.20.0.0/16"
            validate={validateCidr}
            invalid={draft.external && draft.ipAllowlist.length === 0}
          />
          {draft.external && draft.ipAllowlist.length === 0 && (
            <p className="text-xs text-[var(--supernova)]">
              App ngoài mạng bắt buộc ≥ 1 CIDR — EWS chỉ nhận request từ dải IP này.
            </p>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="wz-quota">Quota đề xuất (lần/phút)</Label>
        <Input id="wz-quota" type="number" defaultValue={60} className="max-w-40 font-mono" />
      </div>
    </div>
  )
}
