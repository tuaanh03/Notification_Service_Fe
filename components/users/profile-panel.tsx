'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { SourceBadge } from '@/components/source-badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { User } from '@/lib/mock-data'

/** UC-002 §B1 — hồ sơ; thêm định danh → note "sinh thêm 1 subscription. User vẫn là 1." trước khi lưu. */
export function ProfilePanel({ user, onAdded }: { user: User; onAdded: (channel: 'email' | 'sms', value: string) => void }) {
  const [adding, setAdding] = useState(false)
  const [channel, setChannel] = useState<'email' | 'sms'>('email')
  const [value, setValue] = useState('')
  const fields: Array<[string, string | undefined, boolean?]> = [
    ['external_id', user.external_id, true],
    ['customer_code', user.customer_code, true],
    ['email', user.email, true],
    ['phone', user.phone, true],
    ['source', undefined],
    ['created', user.created_at, true],
    ['last seen', user.last_seen],
  ]
  return (
    <div className="space-y-4">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {fields.map(([k, v, mono]) => (
          <div key={k}>
            <dt className="text-xs text-[var(--text-muted)]">{k}</dt>
            <dd className={mono ? 'mt-0.5 font-mono text-xs' : 'mt-0.5 text-xs'}>{k === 'source' ? <SourceBadge source={user.source} /> : v || '—'}</dd>
          </div>
        ))}
      </dl>
      {!adding ? (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus /> Thêm định danh
        </Button>
      ) : (
        <form
          className="space-y-3 rounded-lg border border-[var(--orbit)] p-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!value.trim()) return
            onAdded(channel, value.trim())
            toast.success('Đã thêm định danh', { description: `${channel} · sinh thêm 1 subscription` })
            setValue('')
            setAdding(false)
          }}
        >
          <div className="flex flex-wrap gap-2">
            <div className="space-y-1">
              <Label htmlFor="id-channel" className="text-xs">Loại</Label>
              <NativeSelect id="id-channel" value={channel} onChange={(e) => setChannel(e.target.value as 'email' | 'sms')} className="font-mono">
                <NativeSelectOption value="email">email</NativeSelectOption>
                <NativeSelectOption value="sms">phone</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <Label htmlFor="id-value" className="text-xs">Giá trị</Label>
              <Input id="id-value" value={value} onChange={(e) => setValue(e.target.value)} className="font-mono" />
            </div>
          </div>
          <Alert className="border-[var(--starlight)]/30 bg-[var(--starlight)]/[.06]" data-testid="add-identifier-note">
            <AlertDescription className="text-[var(--text-secondary)]">
              Định danh mới sẽ được tự động kích hoạt thành kênh nhận tin (subscription) cho người dùng này.
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Hủy
            </Button>
            <Button type="submit" size="sm" disabled={!value.trim()}>
              Lưu định danh
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
