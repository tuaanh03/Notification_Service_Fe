'use server'

import { createApp, issueSecret, toApp, type CreateAppInput } from '@/lib/api/apps'
import { createTopic, type CreateTopicInput } from '@/lib/api/topics'
import { toResult, type ActionResult, type ActionStop } from '@/lib/api/result'
import { getTranslations } from 'next-intl/server'
import { messageOf } from '@/lib/api/error-message'
import { ApiError } from '@/lib/api/problem'
import type { IssuedAppSecretDto } from '@/lib/api/types'
import type { App } from '@/lib/mock-data'

/**
 * Lớp BFF của wizard đăng ký app (UC-001).
 *
 * Server Action chứ không phải Server Component: wizard là form nhiều bước, dữ liệu chỉ có
 * lúc người dùng bấm, không có lúc render (CLAUDE.md mục 2.2).
 *
 * Backend KHÔNG có lệnh gộp "đăng ký app": tạo app, thêm allowlist, tạo topic và cấp khoá là
 * bốn lời gọi riêng, KHÔNG nằm chung một transaction. Nên chuỗi này có thể dừng giữa chừng —
 * xem `RegisterResult` và `ActionStop`.
 *
 * Không còn bước duyệt (ADR-0023 của backend): app tạo xong là `active`, người tạo nhận khoá ngay.
 */

export type RegisterResult = {
  /** View model `App` (qua `toApp`) — cùng model mà app switcher và `<CredentialDialog>` đang đọc. */
  app: App
  topicsCreated: number
  /** Khoá API đầu tiên — plaintext CHỈ có ở đây, hiện đúng một lần. `null` = chưa cấp được. */
  secret: IssuedAppSecretDto | null
  /** Khác `null` = chuỗi dừng giữa chừng; app vẫn tồn tại và `active`, làm nốt bằng tay. */
  stoppedAt: ActionStop | null
}

export type RegisterAppInput = {
  profile: CreateAppInput
  topics: readonly CreateTopicInput[]
}

/**
 * Tạo app -> topic -> cấp khoá API đầu tiên.
 *
 * Quy ước quan trọng: CHỈ lỗi ở lời gọi đầu (tạo app) mới trả `ok: false` — lúc đó chưa có gì
 * trong hệ thống. Sau khi app đã tồn tại, mọi lỗi đều trả `ok: true` kèm `stoppedAt`, vì nói
 * "thất bại" trong khi app đã nằm trong cơ sở dữ liệu là nói sai: người dùng cần biết app id
 * để vào sửa nốt, không phải bấm tạo lại rồi dính trùng slug.
 */
export async function registerAppAction(input: RegisterAppInput): Promise<ActionResult<RegisterResult>> {
  const t = await getTranslations('wizard')
  const created = await toResult(() => createApp(input.profile))
  if (!created.ok) return created
  const app = toApp(created.data)

  let topicsCreated = 0
  const stop = async (step: string, run: () => Promise<unknown>): Promise<ActionStop | null> => {
    try {
      await run()
      return null
    } catch (err) {
      if (!(err instanceof ApiError)) throw err
      return { step, message: await messageOf(err), code: err.code }
    }
  }

  for (const topic of input.topics) {
    const failed = await stop(t('stopTopic', { key: topic.key }), () => createTopic(app.app_id, topic))
    if (failed) return { ok: true, data: { app, topicsCreated, secret: null, stoppedAt: failed } }
    topicsCreated += 1
  }

  let secret: IssuedAppSecretDto | null = null
  const failed = await stop(t('stopIssueKey'), async () => {
    secret = await issueSecret(app.app_id)
  })
  return { ok: true, data: { app, topicsCreated, secret, stoppedAt: failed } }
}
