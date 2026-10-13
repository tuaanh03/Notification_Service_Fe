'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { signInAction, startMicrosoftSignInAction } from '@/app/login/actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BRAND_LOGO_SRC } from '@/lib/brand'
import { safeNext } from '@/lib/safe-next'

/**
 * Hai cửa đăng nhập, mỗi cửa một trang:
 *   - `/login` — CHỈ Microsoft 365. Đây là cửa của mọi người dùng console.
 *   - `/login/password` — email + mật khẩu, cho tài khoản do `admin-cli` cấp mật khẩu riêng.
 *     Trang `/login` cố ý KHÔNG trỏ sang đây; ai cần thì được đưa địa chỉ.
 *
 * Ẩn địa chỉ KHÔNG phải lớp bảo mật — mật khẩu và phiên ở backend mới là chốt.
 */

function LoginHeader() {
  const t = useTranslations('login')
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <img src={BRAND_LOGO_SRC} alt="" className="size-14 rounded-full" />
      <h1 className="text-lg font-semibold">EWS Notification Service</h1>
      <p className="text-xs text-[var(--text-secondary)]">{t('subtitle')}</p>
    </div>
  )
}

/**
 * Đăng nhập Microsoft. `initialError`: câu đã dịch khi lượt đăng nhập Microsoft vừa hỏng (trang
 * callback đưa về kèm `?error=`).
 */
export function MicrosoftSignIn({ initialError }: { initialError: string | null }) {
  const t = useTranslations('login')
  // `middleware.ts` gắn `?next=` khi đá người dùng về đây — đăng nhập xong quay lại đúng chỗ.
  const next = safeNext(useSearchParams().get('next'))
  const [error, setError] = useState<string | null>(initialError)
  const [redirecting, startRedirect] = useTransition()

  // Thành công thì action chuyển trang sang Microsoft (không trả về); chỉ lỗi mới quay lại đây.
  const signInWithMicrosoft = () => {
    startRedirect(async () => {
      setError(null)
      const result = await startMicrosoftSignInAction(next)
      if (!result.ok) setError(result.message)
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <LoginHeader />
      <Button type="button" variant="outline" onClick={signInWithMicrosoft} disabled={redirecting}>
        <MicrosoftLogo />
        {redirecting ? t('microsoftRedirecting') : t('microsoft')}
      </Button>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

/**
 * Form mật khẩu. Mật khẩu chỉ đi trong Server Action — không nằm trong URL, không vào state nào
 * sống lâu hơn lần bấm, và không bao giờ xuống log.
 *
 * `router.refresh()` sau khi đăng nhập: cookie vừa được đặt ở phía server, cây server component
 * đang hiển thị vẫn là cây dựng lúc CHƯA có phiên. Không nạp lại thì console hiện dữ liệu rỗng.
 *
 * `microsoftEnabled`: có thì hiện link quay về `/login` (giữ `?next=`).
 */
export function PasswordSignInForm({ microsoftEnabled }: { microsoftEnabled: boolean }) {
  const t = useTranslations('login')
  const router = useRouter()
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
      <LoginHeader />

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t('email')}</Label>
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

      <Button type="submit" disabled={pending || email === '' || password === ''}>
        {pending ? t('submitting') : t('submit')}
      </Button>

      {microsoftEnabled && (
        <Link
          href={next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`}
          className="text-center text-xs text-[var(--text-secondary)] hover:underline"
        >
          {t('backToMicrosoft')}
        </Link>
      )}
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
