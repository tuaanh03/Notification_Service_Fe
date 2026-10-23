'use server'

import {
  getTemplateStats,
  listTemplateRecipients,
  listTemplateSendStats,
  type RecipientBucket,
  type TemplateStatsDays,
} from '@/lib/api/template-stats'
import { toResult, type ActionResult } from '@/lib/api/result'
import type { TemplateRecipientPageDto, TemplateSendStatsListDto, TemplateStatsDto } from '@/lib/api/types'

/** BFF số liệu template (UX-24) — chỉ đọc, app đang chọn ở `?app=` phía client như mọi màn khác. */

export async function loadTemplateStatsAction(
  appId: string,
  templateId: string,
  input: { days: TemplateStatsDays; version?: number },
): Promise<ActionResult<TemplateStatsDto>> {
  return toResult(() => getTemplateStats(appId, templateId, input))
}

export async function loadTemplateRecipientsAction(
  appId: string,
  templateId: string,
  input: { days: TemplateStatsDays; version?: number; bucket: RecipientBucket; q?: string; limit: number; offset: number },
): Promise<ActionResult<TemplateRecipientPageDto>> {
  return toResult(() => listTemplateRecipients(appId, templateId, input))
}

export async function loadTemplateSendStatsAction(appId: string, days: TemplateStatsDays): Promise<ActionResult<TemplateSendStatsListDto>> {
  return toResult(() => listTemplateSendStats(appId, days))
}
