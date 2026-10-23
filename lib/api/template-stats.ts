import 'server-only'
import { adminFetch } from './client'
import type { TemplateRecipientPageDto, TemplateSendStatsListDto, TemplateStatsDto } from './types'

/**
 * Số liệu theo template (UX-24) — chỉ ĐỌC. "Đã chuyển đi" = Microsoft 365 đã nhận thư; "đã mở" là ước lượng
 * bằng ảnh theo dõi. Thư trả về và lượt bấm link không đo (ADR-0031 backend, bổ sung 2026-10-23).
 */

export type TemplateStatsDays = 7 | 30 | 90
export type RecipientBucket = 'sent' | 'opened' | 'unopened' | 'failed' | 'skipped'

const base = (appId: string, templateId: string) =>
  `/apps/${encodeURIComponent(appId)}/templates/${encodeURIComponent(templateId)}/stats`

/** GET /admin/apps/:appId/templates/:id/stats */
export async function getTemplateStats(
  appId: string,
  templateId: string,
  input: { days: TemplateStatsDays; version?: number },
): Promise<TemplateStatsDto> {
  const query: Record<string, string> = { days: String(input.days) }
  if (input.version !== undefined) query['version'] = String(input.version)
  return adminFetch<TemplateStatsDto>(base(appId, templateId), { query })
}

/** GET /admin/apps/:appId/templates/:id/stats/recipients — mới nhất trước. */
export async function listTemplateRecipients(
  appId: string,
  templateId: string,
  input: { days: TemplateStatsDays; version?: number; bucket: RecipientBucket; q?: string; limit: number; offset: number },
): Promise<TemplateRecipientPageDto> {
  const query: Record<string, string> = {
    days: String(input.days),
    bucket: input.bucket,
    limit: String(input.limit),
    offset: String(input.offset),
  }
  if (input.version !== undefined) query['version'] = String(input.version)
  if (input.q) query['q'] = input.q
  return adminFetch<TemplateRecipientPageDto>(`${base(appId, templateId)}/recipients`, { query })
}

/** GET /admin/apps/:appId/template-stats — hai cột ở màn danh sách template. */
export async function listTemplateSendStats(appId: string, days: TemplateStatsDays): Promise<TemplateSendStatsListDto> {
  return adminFetch<TemplateSendStatsListDto>(`/apps/${encodeURIComponent(appId)}/template-stats`, { query: { days: String(days) } })
}
