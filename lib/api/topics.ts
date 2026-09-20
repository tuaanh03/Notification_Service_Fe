import 'server-only'
import { adminFetch } from './client'
import type { TopicDto } from './types'

export type { TopicDto }

/**
 * Chủ đề nằm dưới app: mọi endpoint đều mang `appId` trên đường dẫn
 * (`ews-astrolink-api/src/modules/topics/interface/http/admin-topics.routes.ts`).
 * Backend đã phân tách theo app — UI KHÔNG lọc lại theo namespace.
 */
const base = (appId: string) => `/apps/${encodeURIComponent(appId)}/topics`

/** GET /admin/apps/:appId/topics — mọi trạng thái (listForAdmin). */
export async function listTopics(appId: string): Promise<TopicDto[]> {
  return adminFetch<TopicDto[]>(base(appId))
}

export type CreateTopicInput = {
  key: string
  name: string
  mandatory: boolean
  defaultMode: 'opt_in' | 'opt_out'
}

/** POST /admin/apps/:appId/topics — topic sinh ra ở `draft`, chưa gửi được. */
export async function createTopic(appId: string, input: CreateTopicInput): Promise<TopicDto> {
  return adminFetch<TopicDto>(base(appId), { method: 'POST', body: input })
}

/** Đúng hai nhánh của TOPIC_TRANSITIONS: draft|suspended --activate--> active --suspend--> suspended. */
export type TopicAction = 'activate' | 'suspend'

/** POST /admin/apps/:appId/topics/:key/:action */
export async function transitionTopic(
  appId: string,
  key: string,
  action: TopicAction,
): Promise<TopicDto> {
  return adminFetch<TopicDto>(`${base(appId)}/${encodeURIComponent(key)}/${action}`, {
    method: 'POST',
  })
}
