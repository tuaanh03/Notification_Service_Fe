'use server'

import {
  createIncomingHook,
  deleteIncomingHook,
  listIncomingCalls,
  listIncomingHooks,
  previewIncomingHook,
  rotateIncomingHookToken,
  updateIncomingHook,
} from '@/lib/api/incoming'
import { toResult, type ActionResult } from '@/lib/api/result'
import { getTemplate, listTemplates } from '@/lib/api/templates'
import { listTopics } from '@/lib/api/topics'
import type {
  HookPreviewDto,
  IncomingCallDto,
  IncomingHookConfigInput,
  IncomingHookDto,
  IncomingHookListDto,
  IssuedHookUrlDto,
  TemplateSummaryDto,
  TopicDto,
  IssuedWebhookSecretDto,
  WebhookDeliveryDto,
  WebhookEndpointDto,
  WebhookEventType,
  WebhookListDto,
} from '@/lib/api/types'
import {
  createWebhook,
  deleteWebhook,
  listWebhookDeliveries,
  listWebhooks,
  rotateWebhookSecret,
  testWebhook,
  updateWebhook,
} from '@/lib/api/webhooks'

/**
 * BFF của màn Webhooks (ADR-0029 của backend). Như `/settings/credentials`: app đang chọn nằm ở
 * `?app=` phía client nên dùng Server Action, token phiên không rời phía server (CLAUDE.md mục 2.2).
 *
 * Secret `whsec_…` chỉ đi qua đúng response của `createWebhookAction` / `rotateWebhookSecretAction`
 * — không ghi log, không lưu lại.
 */

export async function loadWebhooksAction(appId: string): Promise<ActionResult<WebhookListDto>> {
  return toResult(() => listWebhooks(appId))
}

export async function createWebhookAction(
  appId: string,
  input: { url: string; events: WebhookEventType[] },
): Promise<ActionResult<IssuedWebhookSecretDto>> {
  return toResult(() => createWebhook(appId, input))
}

export async function updateWebhookAction(
  appId: string,
  endpointId: string,
  input: { events?: WebhookEventType[]; status?: 'active' | 'disabled' },
): Promise<ActionResult<WebhookEndpointDto>> {
  return toResult(() => updateWebhook(appId, endpointId, input))
}

export async function rotateWebhookSecretAction(
  appId: string,
  endpointId: string,
): Promise<ActionResult<IssuedWebhookSecretDto>> {
  return toResult(() => rotateWebhookSecret(appId, endpointId))
}

export async function deleteWebhookAction(appId: string, endpointId: string): Promise<ActionResult<null>> {
  return toResult(async () => {
    await deleteWebhook(appId, endpointId)
    return null
  })
}

export async function testWebhookAction(appId: string, endpointId: string): Promise<ActionResult<WebhookDeliveryDto>> {
  return toResult(() => testWebhook(appId, endpointId))
}

export async function loadWebhookDeliveriesAction(
  appId: string,
  endpointId: string,
): Promise<ActionResult<WebhookDeliveryDto[]>> {
  return toResult(() => listWebhookDeliveries(appId, endpointId))
}

// --- Incoming webhook (ADR-0030): công cụ ngoài gọi vào URL bí mật để phát vào topic. ---

/** Danh sách hook + chọn lựa cho hộp thêm / sửa (topic, template của app). */
export async function loadIncomingAction(appId: string): Promise<
  ActionResult<{ list: IncomingHookListDto; topics: TopicDto[]; templates: TemplateSummaryDto[] }>
> {
  return toResult(async () => {
    const [list, topics, templates] = await Promise.all([listIncomingHooks(appId), listTopics(appId), listTemplates(appId)])
    return { list, topics, templates }
  })
}

/** Biến của bản ĐANG XUẤT BẢN — mỗi biến `payload.*` một dòng ánh xạ. Chưa xuất bản -> `version: null`. */
export async function loadTemplateVariablesAction(
  appId: string,
  templateId: string,
): Promise<ActionResult<{ version: number | null; variables: { name: string; required: boolean }[] }>> {
  return toResult(async () => {
    const detail = await getTemplate(appId, templateId)
    const published = detail.versions.find((v) => v.status === 'published') ?? null
    return {
      version: published?.version ?? null,
      variables: (published?.variables ?? [])
        .filter((v) => v.name.startsWith('payload.'))
        .map((v) => ({ name: v.name, required: v.required })),
    }
  })
}

export async function createIncomingHookAction(appId: string, config: IncomingHookConfigInput): Promise<ActionResult<IssuedHookUrlDto>> {
  return toResult(() => createIncomingHook(appId, config))
}

export async function updateIncomingHookAction(
  appId: string,
  hookId: string,
  input: { config?: IncomingHookConfigInput; status?: 'active' | 'disabled' },
): Promise<ActionResult<IncomingHookDto>> {
  return toResult(() => updateIncomingHook(appId, hookId, input))
}

export async function rotateIncomingHookTokenAction(appId: string, hookId: string): Promise<ActionResult<IssuedHookUrlDto>> {
  return toResult(() => rotateIncomingHookToken(appId, hookId))
}

export async function deleteIncomingHookAction(appId: string, hookId: string): Promise<ActionResult<null>> {
  return toResult(async () => {
    await deleteIncomingHook(appId, hookId)
    return null
  })
}

export async function previewIncomingHookAction(
  appId: string,
  input: { config: IncomingHookConfigInput; sample: unknown; idempotencyKey?: string },
): Promise<ActionResult<HookPreviewDto>> {
  return toResult(() => previewIncomingHook(appId, input))
}

export async function loadIncomingCallsAction(appId: string, hookId: string): Promise<ActionResult<IncomingCallDto[]>> {
  return toResult(() => listIncomingCalls(appId, hookId))
}
