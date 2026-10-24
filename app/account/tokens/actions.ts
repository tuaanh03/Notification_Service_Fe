'use server'

import { ApiError } from '@/lib/api/problem'
import { toResult, type ActionResult } from '@/lib/api/result'
import { createMyToken, listAllTokens, listMyTokens, revokeAnyToken, revokeMyToken } from '@/lib/api/tokens'
import type { AdminPersonalAccessTokenDto, IssuedPersonalAccessTokenDto, PatScope, PersonalAccessTokenDto } from '@/lib/api/types'

/**
 * BFF của khoá truy cập cá nhân (ADR-0041 của backend). Token gốc `ewspat_…` chỉ đi qua đúng response của
 * `createTokenAction` — không ghi log, không lưu lại. Tạo xong màn gọi `router.refresh()`; thu hồi trả luôn danh sách mới.
 */

export async function createTokenAction(input: {
  name: string
  scope: PatScope
  expiresInDays: number
}): Promise<ActionResult<IssuedPersonalAccessTokenDto>> {
  return toResult(() => createMyToken(input))
}

/**
 * Thu hồi khoá của chính mình rồi trả danh sách mới — màn cập nhật tại chỗ, không trông vào `router.refresh()`. 404
 * `NOT_FOUND` (khoá đã không còn) vẫn trả danh sách kèm `gone: true`.
 */
export async function revokeTokenAction(
  tokenId: string,
): Promise<ActionResult<{ tokens: PersonalAccessTokenDto[]; gone: boolean }>> {
  return toResult(async () => {
    let gone = false
    try {
      await revokeMyToken(tokenId)
    } catch (err) {
      if (!(err instanceof ApiError) || err.code !== 'NOT_FOUND') throw err
      gone = true
    }
    return { tokens: await listMyTokens(), gone }
  })
}

/**
 * Super Admin (`/admin/security`): thu hồi PAT của người khác rồi trả danh sách mới — một vòng gọi. 404 `NOT_FOUND`
 * (khoá đã không còn) vẫn trả danh sách mới kèm `gone: true` — màn chỉ báo nhẹ, không coi là lỗi.
 */
export async function revokeAnyTokenAction(
  tokenId: string,
): Promise<ActionResult<{ tokens: AdminPersonalAccessTokenDto[]; gone: boolean }>> {
  return toResult(async () => {
    let gone = false
    try {
      await revokeAnyToken(tokenId)
    } catch (err) {
      if (!(err instanceof ApiError) || err.code !== 'NOT_FOUND') throw err
      gone = true
    }
    return { tokens: await listAllTokens('active'), gone }
  })
}
