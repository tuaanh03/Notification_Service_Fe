import 'server-only'
import { adminFetch } from './client'
import type { OpenApiDoc } from '@/lib/openapi'

/**
 * Spec OpenAPI 3.1 của backend (ADR-0042) — sinh lúc chạy từ chính route + schema zod, nên luôn khớp code. Đọc bằng
 * phiên qua `/admin/openapi.json` (quyền `catalog.read`, ai đăng nhập cũng có). Spec không chứa bí mật.
 */
export async function getOpenApi(): Promise<OpenApiDoc> {
  return adminFetch<OpenApiDoc>('/openapi.json')
}
