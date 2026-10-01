'use client'

import { Lock, TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { tOr } from '@/i18n/dynamic'
import { Panel } from '@/components/panel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { RecipientDto, TopicPreferenceDto, UserPreferencesDto } from '@/lib/api/types'

/**
 * Vì sao địa chỉ không dùng được nữa — chữ cho người vận hành, không phải mã kỹ thuật
 * (`messages/*.json` nhóm `suppressed`). Lý do chưa có câu dịch thì hiện nguyên mã.
 */
export function useSuppressedLabel(): (reason: string) => string {
  const t = useTranslations('suppressed')
  return (reason) => tOr(t, reason)
}

/** Người này đã BẤM gì — khác với "rốt cuộc có nhận không". */
function Chosen({ topic }: { topic: TopicPreferenceDto }) {
  const t = useTranslations('prefs')
  if (topic.optedIn === null) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="text-xs text-[var(--text-muted)]" />}>{t('notChosen')}</TooltipTrigger>
        <TooltipContent>
          {t('defaultTip', { mode: topic.defaultMode === 'opt_out' ? t('receives') : t('notReceives') })}
        </TooltipContent>
      </Tooltip>
    )
  }
  return <span className="text-xs">{topic.optedIn ? t('on') : t('off')}</span>
}

/**
 * Cài đặt nhận tin của một người nhận (ĐX-0004) — một khối của trang chi tiết `/users/[id]`.
 * Mã, địa chỉ và tình trạng email nằm ở đầu trang, không lặp lại ở đây.
 *
 * CHỈ ĐỌC — không có công tắc. Consent là ý muốn của người dùng; admin sửa hộ là mất hết ý nghĩa
 * của cổng L0/L1/L3. App service tự ghi qua `PUT /v1/users/:id/preferences`.
 */
export function RecipientPreferences({
  recipient,
  preferences,
  error,
  loading,
}: {
  recipient: RecipientDto
  preferences: UserPreferencesDto | null
  error: string | null
  loading: boolean
}) {
  // L0 / L1 chặn thư BẤT KỂ từng chủ đề bật hay tắt — phải nói trước khi người trực đọc bảng dưới.
  const t = useTranslations('prefs')
  const blocked =
    recipient.email === null
      ? t('blockedNoEmail')
      : recipient.email.status !== 'active'
        ? t('blockedStatus', { status: recipient.email.status })
        : recipient.email.optedOutOptional
          ? t('blockedOptional')
          : null

  return (
    <Panel className="p-5">
      <h2 className="mb-4 text-sm font-semibold">{t('title')}</h2>

      {blocked && (
        <Alert className="mb-4 bg-[var(--solar)]/10">
          <TriangleAlert className="text-[var(--solar)]" />
          <AlertDescription>{blocked}</AlertDescription>
        </Alert>
      )}

      {error ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : loading ? (
        <p className="py-6 text-center text-xs text-[var(--text-muted)]">{t('loading')}</p>
      ) : preferences === null ? null : preferences.topics.length === 0 ? (
        <p className="py-6 text-center text-xs text-[var(--text-muted)]">
          {t('noTopics')}
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('colTopic')}</TableHead>
                <TableHead>{t('colChosen')}</TableHead>
                <TableHead>{t('colEffective')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preferences.topics.map((topic) => (
                <TableRow key={topic.key}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs">{topic.key}</span>
                      {topic.mandatory && (
                        <Tooltip>
                          <TooltipTrigger render={<Badge variant="outline" className="text-[9px]" />}>
                            <Lock />
                            {t('mandatory')}
                          </TooltipTrigger>
                          <TooltipContent>{t('mandatoryTip')}</TooltipContent>
                        </Tooltip>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">{topic.name}</span>
                  </TableCell>
                  <TableCell>
                    <Chosen topic={topic} />
                  </TableCell>
                  <TableCell>
                    <span className={topic.effectiveOptIn ? 'text-xs text-[var(--aurora)]' : 'text-xs text-[var(--text-muted)]'}>
                      {topic.effectiveOptIn ? t('yes') : t('no')}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-[11px] text-[var(--text-muted)]">
            {t.rich('note', { b: (chunks) => <strong>{chunks}</strong> })}
          </p>
        </>
      )}
    </Panel>
  )
}
