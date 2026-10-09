'use server'

import { createOrganization } from '@/lib/api/organizations'
import { toResult, type ActionResult } from '@/lib/api/result'
import type { OrganizationDto } from '@/lib/api/types'

/**
 * Tạo tổ chức — người đang đăng nhập thành Owner (ADR-0025 của backend). Server Action: token
 * phiên chỉ ở phía server. Lỗi trả về `ActionResult`, không ném qua ranh giới server/client.
 */
export async function createOrganizationAction(name: string): Promise<ActionResult<OrganizationDto>> {
  return toResult(() => createOrganization(name))
}
