/**
 * Bộ soạn trực quan (GrapesJS + grapesjs-mjml) — sao đúng KIỂU `VisualDesign` của backend
 * (`ews-astrolink-api/src/modules/templates/domain/types/visual-design.ts`, ADR-0036).
 *
 * Kiểu này là ngoại lệ của luật "HTML thư do BACKEND sinh": HTML do grapesjs-mjml sinh ở trình duyệt,
 * backend KIỂM rồi từ chối nếu không an toàn, và tự sinh bản chữ thường. Console không tự viết hàm sinh
 * HTML — chỉ gọi grapesjs-mjml. Màu trong thư là dữ liệu người soạn (hex), không phải token console.
 */
export const VISUAL_DESIGN_FORMAT = 'grapesjs-mjml'
export const VISUAL_DESIGN_VERSION = 1

export type VisualDesign = {
  format: typeof VISUAL_DESIGN_FORMAT
  version: typeof VISUAL_DESIGN_VERSION
  /** JSON dự án của GrapesJS — mở lại đúng như lúc soạn (kể cả chip biến). Rỗng = thư mới. */
  project: Record<string, unknown>
  /** MJML xuất ra — backend chỉ lưu, không dùng để gửi. */
  mjml: string
}

export const isVisualDesign = (design: unknown): design is VisualDesign =>
  typeof design === 'object' && design !== null && (design as { format?: unknown }).format === VISUAL_DESIGN_FORMAT

/** Giới hạn của backend (`VISUAL_DESIGN_LIMITS`) — chỉ để báo sớm; backend vẫn là cổng chặn. */
export const VISUAL_DESIGN_LIMITS = { projectJsonChars: 200_000, mjmlChars: 64_000 } as const

/** Font hệ thống — KHÔNG dùng font Google: backend chặn `<link>` / `@import` ngoài (ADR-0036). */
export const VISUAL_FONT_STACK = "Arial, 'Helvetica Neue', Helvetica, sans-serif"

/**
 * Thư mở đầu của template trực quan mới — không để trang trắng (người soạn thấy ngay thư thật để sửa).
 * Chữ theo ngôn ngữ màn hình; không có link / ảnh / biến để xuất bản không vướng luật link.
 */
export function starterMjml(text: { heading: string; body: string }): string {
  return (
    // Thẻ đóng đầy đủ: bộ đọc HTML của GrapesJS không hiểu `<mj-all />` tự đóng (lồng thẻ sau vào trong).
    `<mjml><mj-head><mj-attributes><mj-all font-family="${VISUAL_FONT_STACK}"></mj-all><mj-text font-size="15px" line-height="1.6" color="#1e293b"></mj-text></mj-attributes></mj-head>` +
    `<mj-body background-color="#f1f5f9"><mj-section background-color="#ffffff" padding="24px 0">` +
    `<mj-column><mj-text font-size="22px" font-weight="700">${escapeXml(text.heading)}</mj-text>` +
    `<mj-text>${escapeXml(text.body)}</mj-text></mj-column></mj-section></mj-body></mjml>`
  )
}

const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
