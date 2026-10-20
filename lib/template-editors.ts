/**
 * Kiểu soạn của một template version — sao `TEMPLATE_EDITORS` của backend (ADR-0036, ADR-0037).
 * `visual` = bộ soạn trực quan GrapesJS (`lib/visual-design.ts`), `html` = tự viết HTML. `blocks` = trình kéo-thả
 * CŨ đã ngừng: không tạo / lưu được nữa, dòng còn sót chỉ ĐỌC (hiện HTML đã lưu) tới khi được dọn.
 */
export const TEMPLATE_EDITORS = ['visual', 'html', 'blocks'] as const
export type TemplateEditor = (typeof TEMPLATE_EDITORS)[number]

/** Kiểu tạo mới được — màn Tạo template hiện đúng hai thẻ này, Trực quan mặc định. */
export const CREATABLE_EDITORS = ['visual', 'html'] as const satisfies readonly TemplateEditor[]
export type CreatableEditor = (typeof CREATABLE_EDITORS)[number]
