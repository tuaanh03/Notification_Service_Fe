'use server'

import {
  aiComposeTemplate,
  archiveTemplate,
  createTemplate,
  draftFromVersion,
  getTemplate,
  listTemplates,
  publishTemplate,
  renameTemplate,
  saveDraft,
  type AiComposeInput,
  type TemplateContentInput,
} from '@/lib/api/templates'
import { toResult, type ActionResult } from '@/lib/api/result'
import type { AiComposeResultDto, TemplateDetailDto, TemplateSummaryDto } from '@/lib/api/types'

/**
 * Lớp BFF của màn Templates. Server Action vì dữ liệu thuộc app đang chọn (`?app=`, CLAUDE.md mục 2.2).
 *
 * "Xuất bản" = LƯU NHÁP rồi mới xuất bản, trong cùng một action: backend xuất bản bản nháp ĐANG NẰM
 * trên server, nên bỏ bước lưu là xuất bản nhầm bản cũ trong khi màn hình đang hiện bản mới.
 */

export async function loadTemplatesAction(appId: string): Promise<ActionResult<TemplateSummaryDto[]>> {
  return toResult(() => listTemplates(appId))
}

export async function loadTemplateAction(appId: string, id: string): Promise<ActionResult<TemplateDetailDto>> {
  return toResult(() => getTemplate(appId, id))
}

export async function createTemplateAction(
  appId: string,
  input: { name: string } & Partial<TemplateContentInput>,
): Promise<ActionResult<TemplateDetailDto>> {
  return toResult(() => createTemplate(appId, input))
}

export async function renameTemplateAction(appId: string, id: string, name: string): Promise<ActionResult<TemplateDetailDto>> {
  return toResult(() => renameTemplate(appId, id, name))
}

export async function saveDraftAction(
  appId: string,
  id: string,
  content: TemplateContentInput,
): Promise<ActionResult<TemplateDetailDto>> {
  return toResult(() => saveDraft(appId, id, content))
}

export async function saveAndPublishAction(
  appId: string,
  id: string,
  content: TemplateContentInput,
): Promise<ActionResult<TemplateDetailDto>> {
  return toResult(async () => {
    await saveDraft(appId, id, content)
    return publishTemplate(appId, id)
  })
}

export async function draftFromVersionAction(
  appId: string,
  id: string,
  version: number,
): Promise<ActionResult<TemplateDetailDto>> {
  return toResult(() => draftFromVersion(appId, id, version))
}

export async function archiveTemplateAction(appId: string, id: string): Promise<ActionResult<TemplateDetailDto>> {
  return toResult(() => archiveTemplate(appId, id))
}

/** "Nhờ AI soạn" — chỉ lấy đề xuất, không lưu. Khoá AI nằm ở backend, console không biết nhà cung cấp là ai. */
export async function aiComposeAction(
  appId: string,
  id: string,
  input: AiComposeInput,
): Promise<ActionResult<AiComposeResultDto>> {
  return toResult(() => aiComposeTemplate(appId, id, input))
}
