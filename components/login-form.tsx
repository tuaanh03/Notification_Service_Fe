'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInAction } from '@/app/login/actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BRAND_LOGO_SRC } from '@/lib/brand'

/**
 * Form đăng nhập. Mật khẩu chỉ đi trong Server Action — không nằm trong URL, không vào state
 * nào sống lâu hơn lần bấm, và không bao giờ xuống log.
 *
 * `router.refresh()` sau khi đăng nhập: cookie vừa được đặt ở phía server, cây server component
 * đang hiển thị vẫn là cây dựng lúc CHƯA có phiên. Không nạp lại thì console hiện dữ liệu rỗng.
 */
/**
 * Chỉ nhận đường dẫn NỘI BỘ từ `?next=`. Không kiểm thì `?next=https://kẻ-xấu` biến trang đăng
 * nhập thành bàn đạp chuyển hướng sang site khác — lừa được người dùng vì link xuất phát từ
 * đúng domain thật.
 */
function safeNext(raw: string | null): string {
  if (raw === null) return '/'
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
}

export function LoginForm() {
  const router = useRouter()
  // `middleware.ts` gắn `?next=` khi đá người dùng về đây — đăng nhập xong quay lại đúng chỗ.
  const next = safeNext(useSearchParams().get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    startTransition(async () => {
      setError(null)
      const result = await signInAction({ email: email.trim(), password })
      if (!result.ok) return setError(result.message)
      setPassword('')
      router.replace(next)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <img src={BRAND_LOGO_SRC} alt="" className="size-14 rounded-full" />
        <h1 className="text-lg font-semibold">EWS Notification Service</h1>
        <p className="text-xs text-[var(--text-secondary)]">Đăng nhập để quản trị</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Mật khẩu</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={pending || email === '' || password === ''}>
        {pending ? 'Đang kiểm tra…' : 'Đăng nhập'}
      </Button>

      <p className="text-center text-[11px] leading-5 text-[var(--text-muted)]">
        Quên mật khẩu thì nhờ người quản trị máy chủ đặt lại bằng <code className="font-mono">admin-cli</code> — không có
        đường tự đặt lại qua email.
      </p>
    </form>
  )
}
