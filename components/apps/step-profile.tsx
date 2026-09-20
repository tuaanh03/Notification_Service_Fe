'use client'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { RepeatableInput } from '@/components/repeatable-input'
import { APP_SLUG, APP_SLUG_TEXT, validateCidr, validateOrigin, type ProfileDraft } from './wizard-types'

/** Bước 1 — hồ sơ app: đúng 4 field của `POST /admin/apps` + allowlist đi kèm. */
export function StepProfile({ draft, onChange }: { draft: ProfileDraft; onChange: (next: ProfileDraft) => void }) {
  const slugInvalid = draft.slug.length > 0 && !APP_SLUG.test(draft.slug)
  const nsInvalid = draft.namespace.length > 0 && !APP_SLUG.test(draft.namespace)
  const external = draft.origin === 'external'

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Hồ sơ app</h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          App được tạo ở trạng thái <span className="font-mono">draft</span> — chưa gửi được gì cho tới khi duyệt.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="wz-name">Tên hiển thị</Label>
          <Input
            id="wz-name"
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
            placeholder="Hệ thống Đơn hàng"
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
          {slugInvalid && <p className="font-mono text-xs text-[var(--supernova)]">Phải khớp /{APP_SLUG_TEXT}/</p>}
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
        {nsInvalid && <p className="font-mono text-xs text-[var(--supernova)]">Phải khớp /{APP_SLUG_TEXT}/</p>}
        <Alert className="border-[var(--solar)]/30 bg-[var(--solar)]/[.06]">
          <AlertTriangle />
          <AlertDescription className="text-[var(--solar)]">
            Namespace là quyền sở hữu của app trong tổ chức, mỗi tổ chức chỉ một app giữ. Đặt xong nên
            coi như cố định.
          </AlertDescription>
        </Alert>
      </div>

      <div className="space-y-1">
        <Label>Nguồn gọi</Label>
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
        <p className="text-xs text-[var(--text-secondary)]">
          <span className="font-mono">internal</span> = dịch vụ chạy trong mạng công ty.{' '}
          <span className="font-mono">external</span> = gọi từ ngoài, bắt buộc khai dải IP.
        </p>
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
            placeholder="10.20.0.0/16"
            validate={validateCidr}
            invalid={external && draft.ipAllowlist.length === 0}
          />
          {external && draft.ipAllowlist.length === 0 && (
            <p className="text-xs text-[var(--supernova)]">
              App ngoài mạng bắt buộc ≥ 1 CIDR — nếu không, ai cầm được khoá cũng gọi được.
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Kênh được dùng và hạn mức không khai ở đây — chúng là <strong>quyền cấp lúc duyệt</strong>, hỏi ở bước 4.
      </p>
    </div>
  )
}
