'use client'

import { useTranslations } from 'next-intl'
import { tOr } from '@/i18n/dynamic'
import type { Issue } from '@/lib/api/problem'

/**
 * Câu cho từng vi phạm lúc XUẤT BẢN / AI soạn template (`issues[].code`, backend
 * `template-variables.ts` + `template-version.ts`), theo ngôn ngữ đang chọn (`messages/*.json`
 * nhóm `templateIssues`). Mã chưa có câu dịch thì dùng `message` của backend, rồi tới chính mã.
 * `path` là biến / ô bị sai, màn hình tự ghép vào.
 */
export function useIssueText(): (issue: Issue) => string {
  const t = useTranslations('templateIssues')
  return (issue) => tOr(t, issue.code, issue.message ?? issue.code)
}
