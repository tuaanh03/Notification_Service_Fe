import 'server-only'
import { cookies } from 'next/headers'
import { ApiError, type ProblemDetails } from './problem'

/**
 * Lớp gọi `ews-astrolink-api` từ PHÍA SERVER của Next (BFF).
 *
 * Browser không bao giờ gọi thẳng backend. Token phiên nằm trong cookie `httpOnly`, chỉ máy chủ
 * Next đọc được và gắn vào header `Authorization` — JavaScript trong trình duyệt không chạm tới.
 * `server-only` ở trên làm build fail ngay nếu có component client lỡ import file này.
 *
 * Nhờ đó backend cũng không cần CORS — mọi request tới nó đều là server-to-server
 * trong network `ews-net`.
 *
 * KHÔNG còn token dùng chung trong biến môi trường: mỗi request mang phiên của đúng người đang
 * đăng nhập, nên audit ghi được ai làm gì và đăng xuất cắt quyền ngay lập tức.
 */

const TIMEOUT_MS = 10_000

/** Tên cookie giữ token phiên. Đặt ở đây vì đây là nơi duy nhất đọc nó khi gọi backend. */
export const SESSION_COOKIE = 'ews_session'

/**
 * Không còn `EWS_ORG_ID`: org nào xem được do backend trả theo vai của người đăng nhập
 * (`GET /admin/me`, ADR-0022) — một console phục vụ mọi org.
 */
function config(): { baseUrl: string } {
  const baseUrl = process.env.EWS_API_URL
  if (!baseUrl) {
    throw new ApiError({ status: 0, code: 'API_NOT_CONFIGURED', detail: 'thiếu biến môi trường: EWS_API_URL' })
  }
  return { baseUrl: baseUrl.replace(/\/+$/, '') }
}

/** Token phiên của người đang xem, hoặc `null` nếu chưa đăng nhập. */
export async function sessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null
}

/**
 * Chưa đăng nhập. Mã trùng với `INVALID_ADMIN_SESSION` của backend là CÓ CHỦ ĐÍCH: nơi xử lý chỉ
 * cần phân biệt "phải đăng nhập lại" với mọi lỗi khác, không cần biết ai phát hiện ra trước.
 */
export const SESSION_REQUIRED_CODE = 'INVALID_ADMIN_SESSION'

/** Lỗi này nghĩa là ĐƯA NGƯỜI DÙNG VỀ TRANG ĐĂNG NHẬP, không phải hiện màn báo lỗi. */
export function isSessionExpired(err: unknown): boolean {
  return err instanceof ApiError && err.code === SESSION_REQUIRED_CODE
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

interface RequestInit_ {
  method?: string
  body?: unknown
  query?: Record<string, string | undefined>
  /** `null` = không gửi header Authorization (dùng cho `/auth/login`). */
  token?: string | null
  /** Mặc định 10 giây. Chỉ lời gọi chờ dịch vụ ngoài (AI soạn template) mới cần dài hơn. */
  timeoutMs?: number
  /** Header thêm — hiện chỉ `/auth/login` dùng để chuyển IP thật của trình duyệt (ADR-0039 của backend). */
  headers?: Record<string, string>
}

async function request<T>(path: string, init: RequestInit_): Promise<T> {
  const { baseUrl } = config()
  const url = new URL(`${baseUrl}${path}`)
  for (const [key, value] of Object.entries(init.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, value)
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: init.method ?? 'GET',
      headers: {
        ...init.headers,
        ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
        ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: 'no-store',
      signal: AbortSignal.timeout(init.timeoutMs ?? TIMEOUT_MS),
    })
  } catch (cause) {
    throw ApiError.unreachable(cause)
  }

  if (!response.ok) throw await toApiError(response)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/**
 * Gọi một endpoint `/admin/*` bằng phiên của người đang xem. `path` tính từ gốc bề mặt admin.
 * Không cache: console quản trị phải đọc trạng thái thật ở mỗi lần xem.
 *
 * Chưa có cookie thì KHÔNG gọi backend — ném luôn cùng mã lỗi mà backend sẽ trả, để mọi nơi xử
 * lý một cách duy nhất.
 */
export async function adminFetch<T>(
  path: string,
  init: { method?: string; body?: unknown; query?: Record<string, string | undefined>; timeoutMs?: number } = {},
): Promise<T> {
  const token = await sessionToken()
  if (token === null) {
    throw new ApiError({ status: 401, code: SESSION_REQUIRED_CODE, detail: 'chưa đăng nhập' })
  }
  return request<T>(`/admin${path}`, { ...init, token })
}

/** Gọi bề mặt PUBLIC `/auth/*` — nơi lấy và huỷ phiên, nên tự truyền token (hoặc không có). */
export async function authFetch<T>(
  path: string,
  init: { method?: string; body?: unknown; token?: string | null; headers?: Record<string, string> } = {},
): Promise<T> {
  return request<T>(`/auth${path}`, { ...init, token: init.token ?? null })
}
