'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { signInAction, startMicrosoftSignInAction } from '@/app/login/actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { BRAND_LOGO_SRC } from '@/lib/brand'
import { safeNext } from '@/lib/safe-next'

/**
 * Form đăng nhập. Mật khẩu chỉ đi trong Server Action — không nằm trong URL, không vào state
 * nào sống lâu hơn lần bấm, và không bao giờ xuống log.
 *
 * `router.refresh()` sau khi đăng nhập: cookie vừa được đặt ở phía server, cây server component
 * đang hiển thị vẫn là cây dựng lúc CHƯA có phiên. Không nạp lại thì console hiện dữ liệu rỗng.
 */
/**
 * `microsoftEnabled`: backend đã cấu hình M365 — hiện nút "Đăng nhập bằng Microsoft" lên đầu, form
 * mật khẩu giữ lại bên dưới làm đường dự phòng. `initialError`: câu đã dịch khi lượt đăng nhập
 * Microsoft vừa hỏng (trang callback đưa về kèm `?error=`).
 */
export function LoginForm({ microsoftEnabled, initialError }: { microsoftEnabled: boolean; initialError: string | null }) {
  const t = useTranslations('login')
  const router = useRouter()
  // `middleware.ts` gắn `?next=` khi đá người dùng về đây — đăng nhập xong quay lại đúng chỗ.
  const next = safeNext(useSearchParams().get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(initialError)
  const [pending, startTransition] = useTransition()
  const [redirecting, startRedirect] = useTransition()

  // Thành công thì action chuyển trang sang Microsoft (không trả về); chỉ lỗi mới quay lại đây.
  const signInWithMicrosoft = () => {
    startRedirect(async () => {
      setError(null)
      const result = await startMicrosoftSignInAction(next)
      if (!result.ok) setError(result.message)
    })
  }

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
        <p className="text-xs text-[var(--text-secondary)]">{t('subtitle')}</p>
      </div>

      {microsoftEnabled && (
        <>
          <Button type="button" variant="outline" onClick={signInWithMicrosoft} disabled={redirecting || pending}>
            <MicrosoftLogo />
            {redirecting ? t('microsoftRedirecting') : t('microsoft')}
          </Button>
          <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
            <Separator className="flex-1" />
            {t('or')}
            <Separator className="flex-1" />
          </div>
        </>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus={!microsoftEnabled}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t('password')}</Label>
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

      <Button type="submit" disabled={pending || redirecting || email === '' || password === ''}>
        {pending ? t('submitting') : t('submit')}
      </Button>

      <p className="text-center text-[11px] leading-5 text-[var(--text-muted)]">
        {t.rich('forgot', { code: (chunks) => <code className="font-mono">{chunks}</code> })}
      </p>
    </form>
  )
}

/** Logo Microsoft bốn ô — màu theo bộ nhận diện của Microsoft cho nút đăng nhập. */
function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 21 21" aria-hidden="true" className="size-4">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}
