'use server'

import {
  createTopic,
  listTopics,
  transitionTopic,
  type CreateTopicInput,
  type TopicAction,
} from '@/lib/api/topics'
import { toResult, type ActionResult } from '@/lib/api/result'
import type { TopicDto } from '@/lib/api/types'

/**
 * Server Action là lớp BFF của màn Chủ đề.
 *
 * Vì sao không phải Server Component như `/admin/apps`: app đang chọn nằm trong state
 * client của `<AppProvider>` (app switcher), nên lúc server render chưa biết `appId`.
 * Server Action giữ nguyên tính chất quan trọng: token phiên và địa chỉ backend
 * chỉ tồn tại phía server, browser không thấy (CLAUDE.md mục 2.2).
 *
 * Lỗi trả về dưới dạng `ActionResult` (`lib/api/result.ts`), không ném qua ranh giới
 * server/client.
 */

export async function loadTopicsAction(appId: string): Promise<ActionResult<TopicDto[]>> {
  return toResult(() => listTopics(appId))
}

export async function createTopicAction(
  appId: string,
  input: CreateTopicInput,
): Promise<ActionResult<TopicDto>> {
  return toResult(() => createTopic(appId, input))
}

export async function transitionTopicAction(
  appId: string,
  key: string,
  action: TopicAction,
): Promise<ActionResult<TopicDto>> {
  return toResult(() => transitionTopic(appId, key, action))
}
