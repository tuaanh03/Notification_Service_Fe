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
  /**
   * Bản tiếng Anh của ba cột chữ. Để NGAY TRONG dòng (không ở `messages/*.json`) vì bảng này là
   * hợp đồng: thêm / đổi một mã chỉ sửa một chỗ, không có dòng nào thiếu bản dịch mà không ai thấy.
   */
  en: { where: string; meaning: string; action: string }
}

/** Ba cột chữ theo ngôn ngữ đang chọn. Tiếng Việt là bản gốc. */
export function v1ErrorText(e: V1ErrorCode, locale: string): { where: string; meaning: string; action: string } {
  return locale === 'en' ? e.en : { where: e.where, meaning: e.meaning, action: e.action }
}

export const V1_ERROR_CODES: readonly V1ErrorCode[] = [
  { status: 401, code: 'API_KEY_REQUIRED', where: 'mọi /v1', meaning: 'Thiếu header Authorization', action: 'Gửi Authorization: Bearer <khoá>', en: { where: 'every /v1', meaning: 'Missing Authorization header', action: 'Send Authorization: Bearer <key>' } },
  { status: 401, code: 'INVALID_API_KEY', where: 'mọi /v1', meaning: 'Khoá sai hoặc đã thu hồi', action: 'Không thử lại — xin khoá mới', en: { where: 'every /v1', meaning: 'Key is wrong or revoked', action: 'Do not retry — request a new key' } },
  { status: 403, code: 'APP_NOT_ACTIVE', where: 'mọi /v1', meaning: 'App đang tạm ngưng hoặc đã thu hồi', action: 'Liên hệ EWS', en: { where: 'every /v1', meaning: 'The app is suspended or revoked', action: 'Contact EWS' } },
  { status: 403, code: 'IP_NOT_ALLOWED', where: 'mọi /v1', meaning: 'IP gọi tới không có trong danh sách (so khớp đúng từng địa chỉ, chưa hỗ trợ dải)', action: 'Gọi từ IP đã khai, hoặc nhờ đội EWS thêm IP', en: { where: 'every /v1', meaning: 'The calling IP is not on the list (exact address match, ranges not supported yet)', action: 'Call from a registered IP, or ask EWS to add the IP' } },
  { status: 422, code: 'RECIPIENT_NOT_FOUND', where: 'POST /v1/notifications', meaning: 'Chưa khai người nhận này', action: 'PUT /v1/users/:externalId rồi gọi lại', en: { where: 'POST /v1/notifications', meaning: 'This recipient has not been registered', action: 'PUT /v1/users/:externalId, then call again' } },
  { status: 422, code: 'IDEMPOTENCY_KEY_REQUIRED', where: 'POST /v1/publications', meaning: 'Lần phát vào chủ đề thiếu idempotencyKey', action: 'Gửi kèm khoá đại diện cho lần phát này', en: { where: 'POST /v1/publications', meaning: 'A topic publication is missing idempotencyKey', action: 'Send a key that identifies this publication' } },
  { status: 422, code: 'PUBLICATION_TOO_LARGE', where: 'POST /v1/publications', meaning: 'Chủ đề có quá 100 người theo dõi — không ai nhận thư', action: 'Gửi lẻ từng người qua POST /v1/notifications', en: { where: 'POST /v1/publications', meaning: 'The topic has more than 100 subscribers — nobody was sent anything', action: 'Send one by one with POST /v1/notifications' } },
  { status: 422, code: 'TOPIC_NOT_FOUND', where: 'gửi, phát, preferences', meaning: 'Sai key, chủ đề của app khác, hoặc (ở preferences) chưa kích hoạt', action: 'Sửa key — đối chiếu GET /v1/topics', en: { where: 'send, publish, preferences', meaning: 'Wrong key, another app\'s topic, or (for preferences) not activated yet', action: 'Fix the key — compare with GET /v1/topics' } },
  { status: 422, code: 'TOPIC_NOT_ACTIVE', where: 'POST /v1/notifications, /v1/publications', meaning: 'Chủ đề còn nháp hoặc đang tạm ngưng', action: 'Liên hệ EWS', en: { where: 'POST /v1/notifications, /v1/publications', meaning: 'The topic is still a draft or is suspended', action: 'Contact EWS' } },
  { status: 422, code: 'CHANNEL_NOT_GRANTED', where: 'POST /v1/notifications, /v1/publications', meaning: 'App chưa được cấp kênh email (chỉ gặp ở app tạo trước khi bỏ bước duyệt)', action: 'Liên hệ EWS', en: { where: 'POST /v1/notifications, /v1/publications', meaning: 'The app was not granted the email channel (only apps created before review was removed)', action: 'Contact EWS' } },
  { status: 422, code: 'EMAIL_SUBJECT_REQUIRED', where: 'POST /v1/notifications, /v1/publications', meaning: 'Tiêu đề trống', action: 'Sửa nội dung', en: { where: 'POST /v1/notifications, /v1/publications', meaning: 'Empty subject', action: 'Fix the content' } },
  { status: 422, code: 'EMAIL_SUBJECT_TOO_LONG', where: 'POST /v1/notifications, /v1/publications', meaning: 'Tiêu đề quá 998 ký tự', action: 'Sửa nội dung', en: { where: 'POST /v1/notifications, /v1/publications', meaning: 'Subject longer than 998 characters', action: 'Fix the content' } },
  { status: 422, code: 'EMAIL_SUBJECT_INVALID', where: 'POST /v1/notifications, /v1/publications', meaning: 'Tiêu đề có xuống dòng', action: 'Sửa nội dung', en: { where: 'POST /v1/notifications, /v1/publications', meaning: 'Subject contains a line break', action: 'Fix the content' } },
  { status: 422, code: 'EMAIL_HTML_REQUIRED', where: 'POST /v1/notifications, /v1/publications', meaning: 'Thiếu html', action: 'Sửa nội dung', en: { where: 'POST /v1/notifications, /v1/publications', meaning: 'Missing html', action: 'Fix the content' } },
  { status: 422, code: 'EMAIL_BODY_TOO_LARGE', where: 'POST /v1/notifications, /v1/publications', meaning: 'html hoặc text quá 256 KB (gửi bằng template: tính trên nội dung đã đổ biến)', action: 'Rút gọn nội dung', en: { where: 'POST /v1/notifications, /v1/publications', meaning: 'html or text over 256 KB (with a template: measured on the rendered content)', action: 'Shorten the content' } },
  { status: 422, code: 'CONTENT_AND_TEMPLATE_CONFLICT', where: 'POST /v1/notifications, /v1/publications', meaning: 'Gửi cả templateId lẫn subject / html / text', action: 'Chọn một cách gửi', en: { where: 'POST /v1/notifications, /v1/publications', meaning: 'Sent both templateId and subject / html / text', action: 'Pick one way of sending' } },
  { status: 422, code: 'PAYLOAD_REQUIRES_TEMPLATE', where: 'POST /v1/notifications, /v1/publications', meaning: 'Có payload mà không có templateId', action: 'Thêm templateId, hoặc bỏ payload', en: { where: 'POST /v1/notifications, /v1/publications', meaning: 'payload given without templateId', action: 'Add templateId, or drop payload' } },
  { status: 422, code: 'TEMPLATE_NOT_FOUND', where: 'POST /v1/notifications, /v1/publications', meaning: 'Sai templateId, mã của môi trường khác, hoặc template của app khác', action: 'Kiểm lại mã template trong cấu hình của môi trường này', en: { where: 'POST /v1/notifications, /v1/publications', meaning: 'Wrong templateId, an ID from another environment, or another app\'s template', action: 'Check the template ID in this environment\'s configuration' } },
  { status: 422, code: 'TEMPLATE_NOT_PUBLISHED', where: 'POST /v1/notifications, /v1/publications', meaning: 'Template chưa được xuất bản lần nào', action: 'Nhờ người soạn xuất bản', en: { where: 'POST /v1/notifications, /v1/publications', meaning: 'The template has never been published', action: 'Ask the author to publish it' } },
  { status: 422, code: 'TEMPLATE_ARCHIVED', where: 'POST /v1/notifications, /v1/publications', meaning: 'Template đã lưu trữ', action: 'Hỏi người soạn mã template mới', en: { where: 'POST /v1/notifications, /v1/publications', meaning: 'The template is archived', action: 'Ask the author for the new template ID' } },
  { status: 422, code: 'MISSING_VARIABLE', where: 'POST /v1/notifications, /v1/publications', meaning: 'payload thiếu biến bắt buộc — issues liệt kê đủ', action: 'Gửi thêm biến theo path trong issues', en: { where: 'POST /v1/notifications, /v1/publications', meaning: 'payload is missing required variables — issues lists them all', action: 'Send the missing variables per the paths in issues' } },
  { status: 422, code: 'INVALID_PAYLOAD_VALUE', where: 'POST /v1/notifications, /v1/publications', meaning: 'Giá trị trong payload là object, mảng hoặc null', action: 'Gửi chữ, số hoặc true / false', en: { where: 'POST /v1/notifications, /v1/publications', meaning: 'A payload value is an object, array or null', action: 'Send text, a number or true / false' } },
  { status: 422, code: 'LINK_SCHEME_NOT_ALLOWED', where: 'POST /v1/notifications, /v1/publications', meaning: 'Biến làm link ra địa chỉ không phải https:// / mailto:', action: 'Sửa dữ liệu link', en: { where: 'POST /v1/notifications, /v1/publications', meaning: 'A variable produces a link that is not https:// / mailto:', action: 'Fix the link data' } },
  { status: 422, code: 'PAYLOAD_TOO_LARGE', where: 'POST /v1/notifications, /v1/publications', meaning: 'payload quá 2 KB (nằm trong issues, khác mã 413 cùng tên)', action: 'Rút gọn payload', en: { where: 'POST /v1/notifications, /v1/publications', meaning: 'payload over 2 KB (inside issues, different from the 413 code with the same name)', action: 'Shorten the payload' } },
  { status: 422, code: 'TOPIC_MANDATORY', where: 'PUT …/preferences', meaning: 'Cố tắt chủ đề bắt buộc — cả request không được lưu', action: 'Khoá công tắc của chủ đề bắt buộc trên màn cài đặt', en: { where: 'PUT …/preferences', meaning: 'Tried to turn off a mandatory topic — the whole request is not saved', action: 'Lock the mandatory topic\'s switch on the settings screen' } },
  { status: 422, code: 'EMAIL_NOT_SET', where: 'PUT …/preferences', meaning: 'Đặt optedOutOptional cho người chưa có email', action: 'Khai email trước', en: { where: 'PUT …/preferences', meaning: 'Set optedOutOptional for a person without an email', action: 'Register the email first' } },
  { status: 422, code: 'EMAIL_INVALID', where: 'PUT /v1/users/:externalId', meaning: 'Email sai định dạng', action: 'Sửa dữ liệu', en: { where: 'PUT /v1/users/:externalId', meaning: 'Malformed email', action: 'Fix the data' } },
  { status: 422, code: 'INVALID_FIELD', where: 'mọi /v1', meaning: 'Sai kiểu, thừa trường, hoặc mã nhân viên có ký tự lạ', action: 'Xem path trong issues', en: { where: 'every /v1', meaning: 'Wrong type, extra field, or an employee ID with odd characters', action: 'See path in issues' } },
  { status: 409, code: 'EMAIL_TAKEN', where: 'PUT /v1/users/:externalId', meaning: 'Địa chỉ đã thuộc người khác trong app', action: 'Kiểm lại dữ liệu nhân sự', en: { where: 'PUT /v1/users/:externalId', meaning: 'The address already belongs to someone else in the app', action: 'Check the HR data' } },
  { status: 404, code: 'NOT_FOUND', where: 'đọc người, preferences, ngắt email, đọc thư, đọc lần phát', meaning: 'Không có, hoặc thuộc app khác', action: 'Kiểm lại mã', en: { where: 'read person, preferences, unsubscribe, read message, read publication', meaning: 'Does not exist, or belongs to another app', action: 'Check the ID' } },
  { status: 400, code: 'MALFORMED_JSON', where: 'mọi /v1', meaning: 'Body không phải JSON hợp lệ', action: 'Sửa request', en: { where: 'every /v1', meaning: 'Body is not valid JSON', action: 'Fix the request' } },
  { status: 413, code: 'PAYLOAD_TOO_LARGE', where: 'mọi /v1', meaning: 'Request quá lớn (gửi thư, phát 512 KB, còn lại 64 KB)', action: 'Rút gọn', en: { where: 'every /v1', meaning: 'Request too large (send email, publish 512 KB, others 64 KB)', action: 'Shorten it' } },
  { status: 500, code: 'INTERNAL', where: 'mọi /v1', meaning: 'Lỗi phía EWS', action: 'Thử lại có giãn cách, giữ nguyên idempotencyKey', en: { where: 'every /v1', meaning: 'Error on the EWS side', action: 'Retry with backoff, keep the same idempotencyKey' } },
]
