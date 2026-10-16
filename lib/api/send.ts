import 'server-only'
import { adminFetch } from './client'
import type { ConsolePublicationDto, ConsoleSendContent, ConsoleSendResultDto, RenderedTemplateDto } from './types'

/**
 * Màn Soạn thông báo — gửi đi đúng đường `/v1` của backend (origin `dashboard`). `requestId` = một lần
 * soạn: bấm Gửi lại cùng `requestId` không thành thư thứ hai.
 */
const app = (appId: string) => `/apps/${encodeURIComponent(appId)}`

export async function sendToPeople(
  appId: string,
  input: ConsoleSendContent & { topic: string; externalIds: string[]; requestId: string },
): Promise<ConsoleSendResultDto> {
  return adminFetch<ConsoleSendResultDto>(`${app(appId)}/notifications`, { method: 'POST', body: input })
}

export async function sendToTopic(
  appId: string,
  input: ConsoleSendContent & { topic: string; requestId: string },
): Promise<ConsolePublicationDto> {
  return adminFetch<ConsolePublicationDto>(`${app(appId)}/publications`, { method: 'POST', body: input })
}

/** Đổ biến vào bản đang xuất bản — đúng hàm backend dùng lúc gửi. */
export async function renderTemplate(
  appId: string,
  templateId: string,
  input: { payload: Record<string, unknown>; externalId?: string },
): Promise<RenderedTemplateDto> {
  return adminFetch<RenderedTemplateDto>(`${app(appId)}/templates/${encodeURIComponent(templateId)}/render`, {
    method: 'POST',
    body: input,
  })
}
