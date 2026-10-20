'use server'

import { toResult, type ActionResult } from '@/lib/api/result'
import { updateSystemSettings } from '@/lib/api/system-settings'
import type { SystemSettingDto } from '@/lib/api/types'

/** Lưu Cài đặt hệ thống (chỉ Super Admin — backend chặn `platform.manage`). `null` = về mặc định. */
export async function updateSystemSettingsAction(
  values: Record<string, number | string | null>,
): Promise<ActionResult<SystemSettingDto[]>> {
  return toResult(() => updateSystemSettings(values))
}
