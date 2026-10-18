import 'server-only'
import { adminFetch } from './client'
import type { AiComposeResultDto, TemplateDetailDto, TemplateSummaryDto, TemplateVariableDto } from './types'
import type { EmailDesign, TemplateEditor } from '@/lib/email-design'
import type { TemplateCategory } from '@/lib/template-categories'

export type { TemplateDetailDto, TemplateSummaryDto }

/**
 * Template nằm dưới app (`ews-astrolink-api/src/modules/templates/interface/http/admin-templates.routes.ts`,
 * ADR-0020). Định danh bằng `id` (UUID) — app service gửi thư bằng chính id này.
 * Mọi lệnh ghi trả lại chi tiết đầy đủ để màn hình vẽ lại mà không phải đọc thêm.
 */
const base = (appId: string) => `/apps/${encodeURIComponent(appId)}/templates`
const one = (appId: string, id: string) => `${base(appId)}/${encodeURIComponent(id)}`

/**
 * Nội dung soạn được của một bản nháp — đúng body `PUT .../draft`. Kiểu `blocks` KHÔNG gửi `html` / `text`:
 * backend sinh từ `design` (ADR-0034). Nháp đang khác kiểu -> 409 EDITOR_MISMATCH.
 */
export type TemplateContentInput =
  | { editor: 'html'; subject: string; html: string; text: string; variables: TemplateVariableDto[] }
  | { editor: 'blocks'; subject: string; design: EmailDesign; variables: TemplateVariableDto[] }

/** Lọc danh sách: `search` khớp một phần tên, không phân biệt hoa thường và dấu (backend so theo collation). */
export type TemplateListFilter = { category?: TemplateCategory; search?: string }

/** GET /admin/apps/:appId/templates?category=&q= */
export async function listTemplates(appId: string, filter: TemplateListFilter = {}): Promise<TemplateSummaryDto[]> {
  const query = new URLSearchParams()
  if (filter.category) query.set('category', filter.category)
  if (filter.search?.trim()) query.set('q', filter.search.trim())
  const qs = query.toString()
  return adminFetch<TemplateSummaryDto[]>(qs ? `${base(appId)}?${qs}` : base(appId))
}

/** GET /admin/apps/:appId/templates/:id — template của app khác -> 404. */
export async function getTemplate(appId: string, id: string): Promise<TemplateDetailDto> {
  return adminFetch<TemplateDetailDto>(one(appId, id))
}

/** POST /admin/apps/:appId/templates — tạo kèm nháp v1. Trùng tên trong app -> 409 TEMPLATE_NAME_TAKEN. */
export async function createTemplate(
  appId: string,
  input: { name: string; category?: TemplateCategory; editor?: TemplateEditor },
): Promise<TemplateDetailDto> {
  return adminFetch<TemplateDetailDto>(base(appId), { method: 'POST', body: input })
}

/**
 * POST .../design-preview — HTML + chữ thường sinh từ thiết kế ĐANG SOẠN (chưa lưu), không ghi gì.
 * Nguồn sinh HTML duy nhất là backend — console không giữ bản sao hàm sinh.
 */
export async function previewDesign(appId: string, design: EmailDesign): Promise<{ html: string; text: string }> {
  return adminFetch<{ html: string; text: string }>(`${base(appId)}/design-preview`, { method: 'POST', body: { design } })
}

/** POST .../draft/convert-to-html — nháp kéo-thả thành nháp HTML, giữ HTML đã sinh. Một chiều; bản đã xuất bản không đổi. */
export async function convertDraftToHtml(appId: string, id: string): Promise<TemplateDetailDto> {
  return adminFetch<TemplateDetailDto>(`${one(appId, id)}/draft/convert-to-html`, { method: 'POST' })
}

/** PATCH /admin/apps/:appId/templates/:id — đổi tên và / hoặc nhóm; app gửi bằng id nên không ảnh hưởng việc gửi. */
export async function updateTemplate(
  appId: string,
  id: string,
  patch: { name?: string; category?: TemplateCategory },
): Promise<TemplateDetailDto> {
  return adminFetch<TemplateDetailDto>(one(appId, id), { method: 'PATCH', body: patch })
}

/**
 * POST .../duplicate — template MỚI (id mới) cùng app, chỉ có nháp v1 chép từ nháp (không có thì bản
 * đang xuất bản). `name` bắt buộc — backend không tự đặt tên, hậu tố "(bản sao)" / "(copy)" do console
 * ghép theo ngôn ngữ đang dùng. Thiếu tên -> 422; trùng tên -> 409 TEMPLATE_NAME_TAKEN.
 */
export async function duplicateTemplate(appId: string, id: string, name: string): Promise<TemplateDetailDto> {
  return adminFetch<TemplateDetailDto>(`${one(appId, id)}/duplicate`, { method: 'POST', body: { name } })
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
