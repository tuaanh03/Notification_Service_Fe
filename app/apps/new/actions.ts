'use server'

import {
  addNetworkRule,
  approveApp,
  createApp,
  issueSecret,
  submitApp,
  toApp,
  type ApproveAppInput,
  type CreateAppInput,
} from '@/lib/api/apps'
import { createTopic, type CreateTopicInput } from '@/lib/api/topics'
import { toResult, type ActionResult } from '@/lib/api/result'
import { ApiError, messageOf } from '@/lib/api/problem'
import type { IssuedAppSecretDto, NetworkRuleDto } from '@/lib/api/types'
import type { App } from '@/lib/mock-data'

/**
 * Lớp BFF của wizard đăng ký app (UC-001).
 *
 * Server Action chứ không phải Server Component: wizard là form nhiều bước, dữ liệu chỉ có
 * lúc người dùng bấm, không có lúc render (CLAUDE.md mục 2.2).
 *
 * Backend KHÔNG có lệnh gộp "đăng ký app": tạo app, thêm allowlist, tạo topic và gửi duyệt là
 * bốn lời gọi riêng, KHÔNG nằm chung một transaction. Nên chuỗi này có thể dừng giữa chừng —
 * xem `RegisterResult`.
 */

/** Chỗ chuỗi dừng lại, kèm lý do đã dịch sang tiếng Việt. `null` = chạy hết. */
export type RegisterStop = { step: string; message: string; code: string }

export type RegisterResult = {
  /** View model `App` (qua `toApp`) — cùng model mà app switcher và `<CredentialDialog>` đang đọc. */
  app: App
  rulesAdded: number
  topicsCreated: number
  /** `null` = app đã ở `pending_approval`. Khác `null` = app còn `draft`, làm nốt bằng tay. */
  stoppedAt: RegisterStop | null
}

export type RegisterAppInput = {
  profile: CreateAppInput
  rules: readonly NetworkRuleDto[]
  topics: readonly CreateTopicInput[]
}

/**
 * Tạo app -> allowlist -> topic -> gửi duyệt.
 *
 * Quy ước quan trọng: CHỈ lỗi ở lời gọi đầu (tạo app) mới trả `ok: false` — lúc đó chưa có gì
 * trong hệ thống. Sau khi app đã tồn tại, mọi lỗi đều trả `ok: true` kèm `stoppedAt`, vì nói
 * "thất bại" trong khi app đã nằm trong cơ sở dữ liệu là nói sai: người dùng cần biết app id
 * để vào sửa nốt, không phải bấm tạo lại rồi dính trùng slug.
 */
export async function registerAppAction(input: RegisterAppInput): Promise<ActionResult<RegisterResult>> {
  const created = await toResult(() => createApp(input.profile))
  if (!created.ok) return created
  const app = toApp(created.data)

  let rulesAdded = 0
  let topicsCreated = 0
  const stop = async (step: string, run: () => Promise<unknown>): Promise<RegisterStop | null> => {
    try {
      await run()
      return null
    } catch (err) {
      if (!(err instanceof ApiError)) throw err
      return { step, message: messageOf(err), code: err.code }
    }
  }

  for (const rule of input.rules) {
    const failed = await stop(`Thêm allowlist ${rule.value}`, () => addNetworkRule(app.app_id, rule))
    if (failed) return { ok: true, data: { app, rulesAdded, topicsCreated, stoppedAt: failed } }
    rulesAdded += 1
  }
  for (const topic of input.topics) {
    const failed = await stop(`Tạo chủ đề ${topic.key}`, () => createTopic(app.app_id, topic))
    if (failed) return { ok: true, data: { app, rulesAdded, topicsCreated, stoppedAt: failed } }
    topicsCreated += 1
  }

  const failed = await stop('Gửi duyệt', () => submitApp(app.app_id))
  if (failed) return { ok: true, data: { app, rulesAdded, topicsCreated, stoppedAt: failed } }
  return { ok: true, data: { app: { ...app, status: 'pending_approval' }, rulesAdded, topicsCreated, stoppedAt: null } }
}

export type ApproveResult = {
  app: App
  /** `null` = đã duyệt nhưng chưa cấp được khoá; vào `/settings/credentials` cấp sau. */
  secret: IssuedAppSecretDto | null
  stoppedAt: RegisterStop | null
}

/**
 * Duyệt app rồi cấp khoá đầu tiên — hai lời gọi, cũng không chung transaction.
 *
 * Duyệt xong mà cấp khoá hỏng thì app VẪN active: trả `secret: null` + `stoppedAt`, không
 * báo thất bại, vì việc duyệt đã có hiệu lực thật.
 */
export async function approveAndIssueKeyAction(
  appId: string,
  grant: ApproveAppInput,
): Promise<ActionResult<ApproveResult>> {
  const approved = await toResult(() => approveApp(appId, grant))
  if (!approved.ok) return approved
  const app = toApp(approved.data)
  const issued = await toResult(() => issueSecret(appId))
  return issued.ok
    ? { ok: true, data: { app, secret: issued.data, stoppedAt: null } }
    : {
        ok: true,
        data: {
          app,
          secret: null,
          stoppedAt: { step: 'Cấp khoá API', message: issued.message, code: issued.code },
        },
      }
}
