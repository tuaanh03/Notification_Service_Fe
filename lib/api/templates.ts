import 'server-only'
import { adminFetch } from './client'
import type { AiComposeResultDto, TemplateDetailDto, TemplateSummaryDto, TemplateVariableDto } from './types'

export type { TemplateDetailDto, TemplateSummaryDto }

/**
 * Template nằm dưới app (`ews-astrolink-api/src/modules/templates/interface/http/admin-templates.routes.ts`,
 * ADR-0020). Định danh bằng `id` (UUID) — app service gửi thư bằng chính id này.
 * Mọi lệnh ghi trả lại chi tiết đầy đủ để màn hình vẽ lại mà không phải đọc thêm.
 */
const base = (appId: string) => `/apps/${encodeURIComponent(appId)}/templates`
const one = (appId: string, id: string) => `${base(appId)}/${encodeURIComponent(id)}`

/** Nội dung soạn được của một bản nháp — đúng body `PUT .../draft`. */
export type TemplateContentInput = {
  subject: string
  html: string
  text: string
  variables: TemplateVariableDto[]
}

/** GET /admin/apps/:appId/templates */
export async function listTemplates(appId: string): Promise<TemplateSummaryDto[]> {
  return adminFetch<TemplateSummaryDto[]>(base(appId))
}

/** GET /admin/apps/:appId/templates/:id — template của app khác -> 404. */
export async function getTemplate(appId: string, id: string): Promise<TemplateDetailDto> {
  return adminFetch<TemplateDetailDto>(one(appId, id))
}

/** POST /admin/apps/:appId/templates — tạo kèm nháp v1. Trùng tên trong app -> 409 TEMPLATE_NAME_TAKEN. */
export async function createTemplate(
  appId: string,
  input: { name: string } & Partial<TemplateContentInput>,
): Promise<TemplateDetailDto> {
  return adminFetch<TemplateDetailDto>(base(appId), { method: 'POST', body: input })
}

/** PATCH /admin/apps/:appId/templates/:id — đổi tên; app gửi bằng id nên không ảnh hưởng việc gửi. */
export async function renameTemplate(appId: string, id: string, name: string): Promise<TemplateDetailDto> {
  return adminFetch<TemplateDetailDto>(one(appId, id), { method: 'PATCH', body: { name } })
}

/** PUT .../draft — có nháp thì ghi đè, chưa có thì tạo nháp số kế tiếp. Lưu được cả khi còn lỗi. */
export async function saveDraft(appId: string, id: string, content: TemplateContentInput): Promise<TemplateDetailDto> {
  return adminFetch<TemplateDetailDto>(`${one(appId, id)}/draft`, { method: 'PUT', body: content })
}

/** POST .../draft/from/:version — "Sửa bản đang xuất bản" và "tạo nháp từ bản cũ". Đã có nháp -> 409 DRAFT_EXISTS. */
export async function draftFromVersion(appId: string, id: string, version: number): Promise<TemplateDetailDto> {
  return adminFetch<TemplateDetailDto>(`${one(appId, id)}/draft/from/${version}`, { method: 'POST' })
}

/** POST .../publish — kiểm tra đầy đủ; lỗi -> 422 kèm `issues` (code + path). */
export async function publishTemplate(appId: string, id: string): Promise<TemplateDetailDto> {
  return adminFetch<TemplateDetailDto>(`${one(appId, id)}/publish`, { method: 'POST' })
}

/** POST .../archive — không sửa / xuất bản / gửi được nữa. Không có đường bỏ lưu trữ. */
export async function archiveTemplate(appId: string, id: string): Promise<TemplateDetailDto> {
  return adminFetch<TemplateDetailDto>(`${one(appId, id)}/archive`, { method: 'POST' })
}

/** Body "Nhờ AI soạn": trạng thái ĐANG SOẠN (có thể chưa lưu). Biến chỉ có tên / bắt buộc / mô tả — không giá trị mẫu. */
export type AiComposeInput = {
  instruction: string
  mode: 'new' | 'revise'
  variables: { name: string; required: boolean; description?: string }[]
  current?: { subject: string; html: string; text: string }
}

/** Backend chờ nhà cung cấp AI tối đa 60 giây — console chờ lâu hơn một chút để nhận được lỗi thật của backend. */
const AI_COMPOSE_TIMEOUT_MS = 70_000

/** POST .../ai-compose — trả ĐỀ XUẤT, không ghi gì (ADR-0020 §7 của backend). */
export async function aiComposeTemplate(appId: string, id: string, input: AiComposeInput): Promise<AiComposeResultDto> {
  return adminFetch<AiComposeResultDto>(`${one(appId, id)}/ai-compose`, {
    method: 'POST',
    body: input,
    timeoutMs: AI_COMPOSE_TIMEOUT_MS,
  })
}
