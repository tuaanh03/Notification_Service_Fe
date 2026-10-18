'use server'

import {
  aiComposeTemplate,
  archiveTemplate,
  convertDraftToHtml,
  createTemplate,
  draftFromVersion,
  duplicateTemplate,
  getTemplate,
  listTemplates,
  previewDesign,
  publishTemplate,
  saveDraft,
  updateTemplate,
  type AiComposeInput,
  type TemplateContentInput,
  type TemplateListFilter,
} from '@/lib/api/templates'
import type { EmailDesign, TemplateEditor } from '@/lib/email-design'
import type { TemplateCategory } from '@/lib/template-categories'
import { toResult, type ActionResult } from '@/lib/api/result'
import type { AiComposeResultDto, TemplateDetailDto, TemplateSummaryDto } from '@/lib/api/types'

/**
 * Lớp BFF của màn Templates. Server Action vì dữ liệu thuộc app đang chọn (`?app=`, CLAUDE.md mục 2.2).
 *
 * "Xuất bản" = LƯU NHÁP rồi mới xuất bản, trong cùng một action: backend xuất bản bản nháp ĐANG NẰM
 * trên server, nên bỏ bước lưu là xuất bản nhầm bản cũ trong khi màn hình đang hiện bản mới.
 */

export async function loadTemplatesAction(
  appId: string,
  filter: TemplateListFilter = {},
): Promise<ActionResult<TemplateSummaryDto[]>> {
  return toResult(() => listTemplates(appId, filter))
}

export async function loadTemplateAction(appId: string, id: string): Promise<ActionResult<TemplateDetailDto>> {
  return toResult(() => getTemplate(appId, id))
}

export async function createTemplateAction(
  appId: string,
  input: { name: string; category?: TemplateCategory; editor?: TemplateEditor },
): Promise<ActionResult<TemplateDetailDto>> {
  return toResult(() => createTemplate(appId, input))
}

/** Xem trước thiết kế kéo-thả đang soạn — backend sinh HTML, không lưu. */
export async function previewDesignAction(appId: string, design: EmailDesign): Promise<ActionResult<{ html: string; text: string }>> {
  return toResult(() => previewDesign(appId, design))
}

/** "Chuyển sang HTML" — chỉ nháp; bản đã xuất bản giữ nguyên. Console LƯU NHÁP trước rồi mới gọi. */
export async function convertToHtmlAction(
  appId: string,
  id: string,
  content: TemplateContentInput,
): Promise<ActionResult<TemplateDetailDto>> {
  return toResult(async () => {
    await saveDraft(appId, id, content)
    return convertDraftToHtml(appId, id)
  })
}

/** Đổi tên và / hoặc nhóm — không đụng nội dung đang soạn. */
export async function updateTemplateAction(
  appId: string,
  id: string,
  patch: { name?: string; category?: TemplateCategory },
): Promise<ActionResult<TemplateDetailDto>> {
  return toResult(() => updateTemplate(appId, id, patch))
}

export async function duplicateTemplateAction(appId: string, id: string, name: string): Promise<ActionResult<TemplateDetailDto>> {
  return toResult(() => duplicateTemplate(appId, id, name))
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
