/**
 * Mã lỗi mà `/v1/*` của backend THẬT SỰ trả ra — hợp đồng với đội app, không phải dữ liệu mẫu.
 *
 * Sao đúng mã nguồn `ews-astrolink-api` và bảng ở mục 8 của
 * `../ews-astrolink-api/docs/huong-dan-tich-hop-cho-doi-app.md`. Backend thêm / đổi mã thì sửa CẢ
 * HAI chỗ. Không `server-only`: component client import trực tiếp.
 *
 * Lỗi 422 mang mã cụ thể trong `issues[].code`; `code` ở ngoài chỉ là `VALIDATION`.
 */
export type V1ErrorCode = {
  status: number
  code: string
  /** Những đường nào trả mã này. */
  where: string
  meaning: string
  action: string
}

export const V1_ERROR_CODES: readonly V1ErrorCode[] = [
  { status: 401, code: 'API_KEY_REQUIRED', where: 'mọi /v1', meaning: 'Thiếu header Authorization', action: 'Gửi Authorization: Bearer <khoá>' },
  { status: 401, code: 'INVALID_API_KEY', where: 'mọi /v1', meaning: 'Khoá sai hoặc đã thu hồi', action: 'Không thử lại — xin khoá mới' },
  { status: 403, code: 'APP_NOT_ACTIVE', where: 'mọi /v1', meaning: 'App đang tạm ngưng hoặc đã thu hồi', action: 'Liên hệ EWS' },
  { status: 403, code: 'IP_NOT_ALLOWED', where: 'mọi /v1', meaning: 'IP gọi tới không có trong danh sách (so khớp đúng từng địa chỉ, chưa hỗ trợ dải)', action: 'Gọi từ IP đã khai, hoặc nhờ EWS thêm IP' },
  { status: 403, code: 'ORIGIN_NOT_ALLOWED', where: 'mọi /v1', meaning: 'Header Origin không có trong danh sách', action: 'Gọi từ máy chủ, hoặc nhờ EWS thêm Origin' },
  { status: 422, code: 'RECIPIENT_NOT_FOUND', where: 'POST /v1/notifications', meaning: 'Chưa khai người nhận này', action: 'PUT /v1/users/:externalId rồi gọi lại' },
  { status: 422, code: 'TOPIC_NOT_FOUND', where: 'gửi, preferences', meaning: 'Sai key, chủ đề của app khác, hoặc (ở preferences) chưa kích hoạt', action: 'Sửa key — đối chiếu GET /v1/topics' },
  { status: 422, code: 'TOPIC_NOT_ACTIVE', where: 'POST /v1/notifications', meaning: 'Chủ đề còn nháp hoặc đang tạm ngưng', action: 'Liên hệ EWS' },
  { status: 422, code: 'CHANNEL_NOT_GRANTED', where: 'POST /v1/notifications', meaning: 'App chưa được cấp kênh email lúc duyệt', action: 'Liên hệ EWS' },
  { status: 422, code: 'EMAIL_SUBJECT_REQUIRED', where: 'POST /v1/notifications', meaning: 'Tiêu đề trống', action: 'Sửa nội dung' },
  { status: 422, code: 'EMAIL_SUBJECT_TOO_LONG', where: 'POST /v1/notifications', meaning: 'Tiêu đề quá 998 ký tự', action: 'Sửa nội dung' },
  { status: 422, code: 'EMAIL_SUBJECT_INVALID', where: 'POST /v1/notifications', meaning: 'Tiêu đề có xuống dòng', action: 'Sửa nội dung' },
  { status: 422, code: 'EMAIL_HTML_REQUIRED', where: 'POST /v1/notifications', meaning: 'Thiếu html', action: 'Sửa nội dung' },
  { status: 422, code: 'EMAIL_BODY_TOO_LARGE', where: 'POST /v1/notifications', meaning: 'html hoặc text quá 256 KB', action: 'Rút gọn nội dung' },
  { status: 422, code: 'TOPIC_MANDATORY', where: 'PUT …/preferences', meaning: 'Cố tắt chủ đề bắt buộc — cả request không được lưu', action: 'Khoá công tắc của chủ đề bắt buộc trên màn cài đặt' },
  { status: 422, code: 'EMAIL_NOT_SET', where: 'PUT …/preferences', meaning: 'Đặt optedOutOptional cho người chưa có email', action: 'Khai email trước' },
  { status: 422, code: 'EMAIL_INVALID', where: 'PUT /v1/users/:externalId', meaning: 'Email sai định dạng', action: 'Sửa dữ liệu' },
  { status: 422, code: 'INVALID_FIELD', where: 'mọi /v1', meaning: 'Sai kiểu, thừa trường, hoặc mã nhân viên có ký tự lạ', action: 'Xem path trong issues' },
  { status: 409, code: 'EMAIL_TAKEN', where: 'PUT /v1/users/:externalId', meaning: 'Địa chỉ đã thuộc người khác trong app', action: 'Kiểm lại dữ liệu nhân sự' },
  { status: 404, code: 'NOT_FOUND', where: 'đọc người, preferences, ngắt email, đọc thư', meaning: 'Không có, hoặc thuộc app khác', action: 'Kiểm lại mã' },
  { status: 400, code: 'MALFORMED_JSON', where: 'mọi /v1', meaning: 'Body không phải JSON hợp lệ', action: 'Sửa request' },
  { status: 413, code: 'PAYLOAD_TOO_LARGE', where: 'mọi /v1', meaning: 'Request quá lớn (gửi thư 512 KB, còn lại 64 KB)', action: 'Rút gọn' },
  { status: 500, code: 'INTERNAL', where: 'mọi /v1', meaning: 'Lỗi phía EWS', action: 'Thử lại có giãn cách, giữ nguyên idempotencyKey' },
]
