'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PlugZap, UserX } from 'lucide-react'
import { loadPreferencesAction, loadRecipientAction } from '@/app/users/actions'
import { useApp } from '@/components/app-context'
import { EmptyState } from '@/components/empty-state'
import { NotificationsTable } from '@/components/notifications/notifications-table'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import type { RecipientDto, UserPreferencesDto } from '@/lib/api/types'
import { fmtIso } from '@/lib/mock-data'
import { RecipientPreferences, SUPPRESSED_LABEL } from './recipient-preferences'

type Failure = { message: string; code: string }

/**
 * Trang chi tiết MỘT người nhận — trả lời cả hai câu hỏi hỗ trợ trên một màn:
 * "có bị chặn không" (cài đặt nhận tin) và "thư đã ra sao" (các lần gửi).
 *
 * CHỈ ĐỌC, như `/users` và `/notifications` — không công tắc chủ đề, không Gửi lại / Huỷ.
 *
 * App lấy từ `?app=` (xem `recipientHref`), không lấy từ app đang chọn: link mở ở tab mới hoặc
 * gửi cho đồng nghiệp phải ra đúng người. Mở trang là chuyển ô chọn app theo link; SAU ĐÓ người
 * dùng tự đổi app thì về `/users` — cùng mã ở app khác là người khác.
 */
export function RecipientDetail({ externalId, appSlug }: { externalId: string; appSlug: string | null }) {
  const router = useRouter()
  const { app, apps, setApp } = useApp()
  /** App trang này gắn vào; `null` = chưa đồng bộ với ô chọn app. */
  const [bound, setBound] = useState<string | null>(null)

  // Không đặt state của `<AppProvider>` trong lúc render được (component khác) -> phải là effect.
  useEffect(() => {
    if (bound === null) {
      // `?app=` sai hoặc app đã bị thu hồi -> ở lại app đang chọn; không tìm thấy thì màn nói rõ app nào.
      const slug = apps.some((a) => a.slug === appSlug) ? (appSlug as string) : app.slug
      if (slug !== app.slug) setApp(slug)
      setBound(slug)
      return
    }
    if (app.slug !== bound) router.push('/users')
  }, [bound, app.slug, apps, appSlug, setApp, router])

  const ready = bound !== null && app.slug === bound
  const appId = app.app_id

  const [recipient, setRecipient] = useState<RecipientDto | null>(null)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [preferences, setPreferences] = useState<UserPreferencesDto | null>(null)
  const [preferencesError, setPreferencesError] = useState<string | null>(null)

  useEffect(() => {
    if (!ready) return
    let live = true
    Promise.all([loadRecipientAction(appId, externalId), loadPreferencesAction(appId, externalId)]).then(
      ([person, prefs]) => {
        if (!live) return
        if (person.ok) setRecipient(person.data)
        else setFailure({ message: person.message, code: person.code })
        if (prefs.ok) setPreferences(prefs.data)
        else setPreferencesError(`${prefs.message} (mã: ${prefs.code})`)
      },
    )
    return () => {
      live = false
    }
  }, [ready, appId, externalId])

  const breadcrumb = [{ label: 'Người nhận', href: '/users' }, { label: externalId }]
  const back = (
    <Button variant="outline" render={<Link href="/users" />}>
      Về danh sách Người nhận
    </Button>
  )

  if (failure) {
    return (
      <>
        <PageHeader title={externalId} breadcrumb={breadcrumb} />
        <Panel className="overflow-hidden">
          {failure.code === 'NOT_FOUND' ? (
            <EmptyState
              icon={UserX}
              title={`Không có «${externalId}» trong ${app.name}`}
              description="Mã phải khớp đúng từng ký tự. Cùng một mã ở hai app là hai người khác nhau — kiểm tra ô chọn app."
              action={back}
            />
          ) : (
            <EmptyState
              icon={PlugZap}
              title="Không đọc được dữ liệu từ API"
              description={`${failure.message} (mã: ${failure.code})`}
              action={back}
            />
          )}
        </Panel>
      </>
    )
  }

  if (!recipient) {
    return (
      <>
        <PageHeader title={externalId} breadcrumb={breadcrumb} />
        <p className="py-10 text-center text-xs text-[var(--text-muted)]">Đang tải…</p>
      </>
    )
  }

  const email = recipient.email

  return (
    <div className="space-y-5">
      <PageHeader
        title={recipient.externalId}
        subtitle={`Người nhận của ${app.name}, khai báo lúc ${fmtIso(recipient.createdAt)}. Màn này chỉ đọc.`}
        breadcrumb={breadcrumb}
        actions={
          email ? (
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="break-all font-mono text-xs">{email.address}</span>
              <StatusPill status={email.status} />
              {email.suppressedReason && (
                <span className="text-[11px] text-[var(--text-muted)]">
                  {SUPPRESSED_LABEL[email.suppressedReason] ?? email.suppressedReason}
                </span>
              )}
            </span>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">chưa khai email</span>
          )
        }
      />

      <RecipientPreferences
        recipient={recipient}
        preferences={preferences}
        error={preferencesError}
        loading={preferences === null && preferencesError === null}
      />

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Các lần gửi</h2>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            Kết cục mỗi lần gửi được ghi lúc gửi. Cài đặt nhận tin ở trên là hiện tại — có thể đã khác
            lúc đó.
          </p>
        </div>
        <NotificationsTable recipient={recipient.externalId} />
      </section>
    </div>
  )
}
