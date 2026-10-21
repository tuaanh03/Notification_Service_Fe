'use server'

import { listLoginLocks, unlockLogin } from '@/lib/api/login-security'
import { toResult, type ActionResult } from '@/lib/api/result'
import type { LoginLockDto } from '@/lib/api/types'

/** Lớp BFF của màn "Theo dõi & Bảo mật" (chỉ Super Admin — backend kiểm `platform.manage`). */

export async function loadLoginLocksAction(): Promise<ActionResult<LoginLockDto[]>> {
  return toResult(() => listLoginLocks())
}

/** Mở khoá rồi trả danh sách mới — một vòng gọi, bảng không phải tải lại riêng. */
export async function unlockLoginAction(target: { email: string } | { ip: string }): Promise<ActionResult<LoginLockDto[]>> {
  return toResult(async () => {
    await unlockLogin(target)
    return listLoginLocks()
  })
}
