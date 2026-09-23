/**
 * Lỗi backend theo RFC 9457 (`application/problem+json`) — xem
 * `ews-astrolink-api/src/shared/http/problem.ts`. `code` là hợp đồng ổn định giữa
 * hai bên: UI map `code` sang câu tiếng Việt, KHÔNG parse `detail` (chuỗi kỹ thuật,
 * có thể đổi bất cứ lúc nào).
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

const MESSAGES: Readonly<Record<string, string>> = {
  API_UNREACHABLE: 'Không kết nối được tới API. Kiểm tra service `ews-astrolink-api` đã chạy chưa.',
  API_NOT_CONFIGURED: 'Console chưa được cấu hình để gọi API. Kiểm tra biến môi trường EWS_*.',
  // Backend cố tình trả CÙNG mã cho email lạ và mật khẩu sai — câu này cũng chỉ nói đúng chừng
  // đó, không đoán thêm "email không tồn tại", vì đó là xác nhận hộ người dò.
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
  INVALID_ADMIN_SESSION: 'Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.',
  ADMIN_CALLER_REQUIRED: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
  PASSWORD_TOO_SHORT: 'Mật khẩu phải có ít nhất 12 ký tự.',
  PASSWORD_TOO_LONG: 'Mật khẩu quá dài (tối đa 200 ký tự).',
  NOT_FOUND: 'Không tìm thấy dữ liệu.',
  VALIDATION: 'Dữ liệu nhập không hợp lệ.',
  TOPIC_KEY_TAKEN: 'Mã chủ đề này đã có trong app. Chọn mã khác.',
  INVALID_TRANSITION: 'Không chuyển được trạng thái này. Tải lại trang để xem trạng thái mới nhất.',
  CONCURRENT_TRANSITION: 'Người khác vừa đổi trạng thái trước bạn. Tải lại trang rồi thử lại.',
  ACTIVE_SECRET_LIMIT: 'App đã đủ số khoá active cho phép. Thu hồi một khoá cũ rồi cấp lại.',
  APP_REVOKED: 'App đã bị thu hồi nên không cấp khoá mới được.',
  APP_SLUG_TAKEN: 'Mã app (slug) này đã có trong tổ chức. Chọn mã khác.',
  APP_NAMESPACE_TAKEN: 'Namespace này đã thuộc app khác trong tổ chức. Chọn namespace khác.',
}

/** Câu hiển thị cho người vận hành. Chưa có bản dịch thì trả `detail` của backend. */
export function messageOf(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Đã có lỗi không xác định.'
  if (MESSAGES[err.code]) return MESSAGES[err.code]!
  if (err.status === 401 || err.status === 403) return 'Không đủ quyền thực hiện thao tác này.'
  return err.message || 'Đã có lỗi không xác định.'
}
