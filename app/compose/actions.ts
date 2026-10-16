'use server'

import { toResult, type ActionResult } from '@/lib/api/result'
import { renderTemplate, sendToPeople, sendToTopic } from '@/lib/api/send'
import { getTemplate, listTemplates } from '@/lib/api/templates'
import { listTopics } from '@/lib/api/topics'
import type {
  ConsolePublicationDto,
  ConsoleSendContent,
  ConsoleSendResultDto,
  RenderedTemplateDto,
  TemplateVariableDto,
} from '@/lib/api/types'

/** BFF của màn Soạn thông báo — app đang chọn ở `?app=` phía client (CLAUDE.md mục 2.2). */

export type ComposeOptions = {
  topics: { key: string; name: string; mandatory: boolean }[]
  templates: { id: string; name: string; version: number }[]
}

/** Chủ đề đang hoạt động + template đã xuất bản — chỉ những thứ gửi được. */
export async function loadComposeOptionsAction(appId: string): Promise<ActionResult<ComposeOptions>> {
  return toResult(async () => {
    const [topics, templates] = await Promise.all([listTopics(appId), listTemplates(appId)])
    return {
      topics: topics.filter((t) => t.status === 'active').map((t) => ({ key: t.key, name: t.name, mandatory: t.mandatory })),
      templates: templates
        .filter((t) => t.status === 'active' && t.publishedVersion !== null)
        .map((t) => ({ id: t.id, name: t.name, version: t.publishedVersion as number })),
    }
  })
}

/** Biến `payload.*` của bản đang xuất bản — mỗi biến một ô nhập ở bước Nội dung. */
export async function loadPayloadVariablesAction(appId: string, templateId: string): Promise<ActionResult<TemplateVariableDto[]>> {
  return toResult(async () => {
    const detail = await getTemplate(appId, templateId)
    const published = detail.versions.find((v) => v.status === 'published')
    return (published?.variables ?? []).filter((v) => v.source === 'payload')
  })
}

export async function renderPreviewAction(
  appId: string,
  templateId: string,
  input: { payload: Record<string, unknown>; externalId?: string },
): Promise<ActionResult<RenderedTemplateDto>> {
  return toResult(() => renderTemplate(appId, templateId, input))
}

export async function sendToPeopleAction(
  appId: string,
  input: ConsoleSendContent & { topic: string; externalIds: string[]; requestId: string },
): Promise<ActionResult<ConsoleSendResultDto>> {
  return toResult(() => sendToPeople(appId, input))
}

export async function sendToTopicAction(
  appId: string,
  input: ConsoleSendContent & { topic: string; requestId: string },
): Promise<ActionResult<ConsolePublicationDto>> {
  return toResult(() => sendToTopic(appId, input))
}
