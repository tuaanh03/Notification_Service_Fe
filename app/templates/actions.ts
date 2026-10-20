'use server'

import {
  aiComposeTemplate,
  archiveTemplate,
  createTemplate,
  createTemplateFromPreset,
  draftFromVersion,
  duplicateTemplate,
  getTemplate,
  listTemplatePresets,
  listTemplates,
  publishTemplate,
  saveDraft,
  updateTemplate,
  type AiComposeInput,
  type TemplateContentInput,
  type TemplateListFilter,
} from '@/lib/api/templates'
import type { Locale } from '@/i18n/locales'
import type { TemplateCategory } from '@/lib/template-categories'
import type { CreatableEditor } from '@/lib/template-editors'
import type { VisualDesign } from '@/lib/visual-design'
import { toResult, type ActionResult } from '@/lib/api/result'
import type { AiComposeResultDto, TemplateDetailDto, TemplatePresetDto, TemplateSummaryDto } from '@/lib/api/types'

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
  input: { name: string; category?: TemplateCategory; editor?: CreatableEditor },
): Promise<ActionResult<TemplateDetailDto>> {
  return toResult(() => createTemplate(appId, input))
}

/** Thư viện mẫu theo ngôn ngữ thư — không thuộc app nào, nhưng vẫn đi qua BFF (token nằm ở server). */
export async function loadTemplatePresetsAction(locale: Locale): Promise<ActionResult<TemplatePresetDto[]>> {
  return toResult(() => listTemplatePresets(locale))
}

/**
 * "Dùng mẫu" — template mới của app, kiểu trực quan: `html` + `design` do trình duyệt biên dịch từ MJML của mẫu
 * (`compileMjml`, ADR-0037 của backend).
 */
export async function createFromPresetAction(
  appId: string,
  input: { presetId: string; locale: Locale; name: string; html: string; design: VisualDesign },
): Promise<ActionResult<TemplateDetailDto>> {
  return toResult(() => createTemplateFromPreset(appId, input))
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
