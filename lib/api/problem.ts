/**
 * Lỗi backend theo RFC 9457 (`application/problem+json`) — xem
 * `ews-astrolink-api/src/shared/http/problem.ts`. `code` là hợp đồng ổn định giữa
 * hai bên: UI map `code` sang câu theo ngôn ngữ đang chọn (`messages/*.json` nhóm `errors`,
 * qua `lib/api/error-message.ts`), KHÔNG parse `detail` (chuỗi kỹ thuật, có thể đổi bất cứ lúc nào).
 */
export interface Issue {
  path?: string
  code: string
  message?: string
}

export interface ProblemDetails {
  type: string
  title: string
  status: number
  code: string
  detail: string
  issues?: readonly Issue[]
  instance?: string
}

/** Mọi lỗi của lời gọi backend — kể cả lỗi mạng (lúc đó `status` = 0). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly issues: readonly Issue[]

  constructor(problem: Pick<ProblemDetails, 'status' | 'code' | 'detail'> & { issues?: readonly Issue[] }) {
    super(problem.detail)
    this.name = 'ApiError'
    this.status = problem.status
    this.code = problem.code
    this.issues = problem.issues ?? []
  }

  /** Backend không tới được (DNS sai, container chưa lên, timeout). */
  static unreachable(cause: unknown): ApiError {
    return new ApiError({
      status: 0,
      code: 'API_UNREACHABLE',
      detail: cause instanceof Error ? cause.message : String(cause),
    })
  }
}
