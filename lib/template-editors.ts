/**
 * Kiểu soạn của một template version — sao `TEMPLATE_EDITORS` của backend (ADR-0036, ADR-0037).
 * `visual` = bộ soạn trực quan GrapesJS (`lib/visual-design.ts`, mặc định), `html` = tự viết HTML. Trình kéo-thả cũ
 * (`blocks`) đã gỡ hẳn ở migration 0027 của backend.
 */
export const TEMPLATE_EDITORS = ['visual', 'html'] as const
export type TemplateEditor = (typeof TEMPLATE_EDITORS)[number]
