import 'server-only'
import { ApiError, type ProblemDetails } from './problem'

/**
 * Lớp gọi `ews-astrolink-api` từ PHÍA SERVER của Next (BFF).
 *
 * Browser không bao giờ gọi thẳng backend: `EWS_ADMIN_TOKEN` là bootstrap token
 * cấp toàn quyền `/admin/*` (ADR-0015), lộ ra client là mất hệ thống. `server-only`
 * ở trên làm build fail ngay nếu có component client lỡ import file này.
 *
 * Nhờ đó backend cũng không cần CORS — mọi request tới nó đều là server-to-server
 * trong network `ews-net`.
 */

const TIMEOUT_MS = 10_000

function config(): { baseUrl: string; token: string; orgId: string } {
  const baseUrl = process.env.EWS_API_URL
  const token = process.env.EWS_ADMIN_TOKEN
  const orgId = process.env.EWS_ORG_ID
  if (!baseUrl || !token || !orgId) {
    const missing = [
      !baseUrl && 'EWS_API_URL',
      !token && 'EWS_ADMIN_TOKEN',
      !orgId && 'EWS_ORG_ID',
    ].filter(Boolean)
    throw new ApiError({
      status: 0,
      code: 'API_NOT_CONFIGURED',
      detail: `thiếu biến môi trường: ${missing.join(', ')}`,
    })
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ''), token, orgId }
}

/** Org mà console đang quản trị — `GET /admin/apps` bắt buộc query `orgId`. */
export function orgId(): string {
  return config().orgId
}

async function toApiError(response: Response): Promise<ApiError> {
  // Backend trả problem+json cho MỌI lỗi; phòng trường hợp chết trước error handler
  // (502 từ proxy, body rỗng) thì vẫn dựng được lỗi có mã.
  try {
    const body = (await response.json()) as Partial<ProblemDetails>
    if (typeof body?.code === 'string') {
      return new ApiError({
        status: body.status ?? response.status,
        code: body.code,
        detail: body.detail ?? response.statusText,
        issues: body.issues,
      })
    }
  } catch {
    /* body không phải JSON — rơi xuống dưới */
  }
  return new ApiError({ status: response.status, code: `HTTP_${response.status}`, detail: response.statusText })
}

/**
 * Gọi một endpoint `/admin/*`. `path` tính từ gốc bề mặt admin, ví dụ `/apps`.
 * Không cache: console quản trị phải đọc trạng thái thật ở mỗi lần xem.
 */
export async function adminFetch<T>(
  path: string,
  init: { method?: string; body?: unknown; query?: Record<string, string | undefined> } = {},
): Promise<T> {
  const { baseUrl, token } = config()
  const url = new URL(`${baseUrl}/admin${path}`)
  for (const [key, value] of Object.entries(init.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, value)
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: init.method ?? 'GET',
      headers: {
        authorization: `Bearer ${token}`,
        ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (cause) {
    throw ApiError.unreachable(cause)
  }

  if (!response.ok) throw await toApiError(response)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
