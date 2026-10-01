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

/**
 * Câu tiếng Việt cho từng vi phạm lúc XUẤT BẢN template (`issues[].code`, backend
 * `template-variables.ts` + `template-version.ts`). `path` là biến / ô bị sai, màn hình tự ghép vào.
 */
export const TEMPLATE_ISSUE_MESSAGES: Readonly<Record<string, string>> = {
  SUBJECT_REQUIRED: 'Tiêu đề đang trống.',
  HTML_REQUIRED: 'Nội dung HTML đang trống.',
  VARIABLE_MISSING_SOURCE: 'Biến thiếu nguồn — phải viết {{ payload.… }} hoặc {{ user.… }}.',
  VARIABLE_NOT_IN_SCHEMA: 'Biến dùng trong nội dung nhưng chưa khai trong bảng biến.',
  OPTIONAL_VARIABLE_WITHOUT_DEFAULT: 'Biến không bắt buộc phải có giá trị mặc định: {{ … | default: "…" }}.',
  FOOTER_NOT_ALLOWED: 'Không tự viết {{ footer }} — hệ thống tự chèn chân thư.',
  UNSUBSCRIBE_LINK_NOT_ALLOWED: 'Không tự viết link huỷ đăng ký (kể cả chữ "unsubscribe") — hệ thống tự chèn.',
  LINK_SCHEME_NOT_ALLOWED: 'Link chỉ được là https:// hoặc mailto:.',
  USER_VARIABLE_NOT_SUPPORTED: 'Biến user.* này chưa hỗ trợ — hiện chỉ có {{ user.external_id }}.',
  INVALID_VARIABLE_NAME: 'Tên biến phải là payload.<tên>, chỉ gồm chữ, số và dấu gạch dưới.',
  VARIABLE_SOURCE_MISMATCH: 'Tên biến không khớp nguồn của nó.',
  DUPLICATE_VARIABLE: 'Biến khai trùng hai lần.',
  VERSION_SUPERSEDED: 'Bản này đã bị thay thế — tạo bản nháp mới thay vì xuất bản lại.',
}
