'use server'

import {
  createTopic,
  listTopics,
  transitionTopic,
  type CreateTopicInput,
  type TopicAction,
} from '@/lib/api/topics'
import { ApiError, messageOf } from '@/lib/api/problem'
import type { TopicDto } from '@/lib/api/types'

/**
 * Server Action là lớp BFF của màn Chủ đề.
 *
 * Vì sao không phải Server Component như `/admin/apps`: app đang chọn nằm trong state
 * client của `<AppProvider>` (app switcher), nên lúc server render chưa biết `appId`.
 * Server Action giữ nguyên tính chất quan trọng: `EWS_ADMIN_TOKEN` và địa chỉ backend
 * chỉ tồn tại phía server, browser không thấy (CLAUDE.md mục 2.2).
 *
 * Lỗi KHÔNG ném qua ranh giới server/client (Next nuốt message trong production build);
 * trả về `ActionResult` để màn hình dựng exception path thật, có mã lỗi.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; code: string }

async function run<T>(op: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await op() }
  } catch (err) {
    if (!(err instanceof ApiError)) throw err
    return { ok: false, message: messageOf(err), code: err.code }
  }
}

export async function loadTopicsAction(appId: string): Promise<ActionResult<TopicDto[]>> {
  return run(() => listTopics(appId))
}

export async function createTopicAction(
  appId: string,
  input: CreateTopicInput,
): Promise<ActionResult<TopicDto>> {
  return run(() => createTopic(appId, input))
}

export async function transitionTopicAction(
  appId: string,
  key: string,
  action: TopicAction,
): Promise<ActionResult<TopicDto>> {
  return run(() => transitionTopic(appId, key, action))
}
