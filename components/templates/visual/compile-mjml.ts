import type { Editor } from 'grapesjs'
import { imageDefaultsPlugin } from './blocks'
import { DEFAULT_EMAIL_SETTINGS, SETTINGS_KEY, type EmailSettings } from './email-settings'

/** Đúng thứ bộ soạn trực quan gửi lên khi lưu (`snapshot()` của `visual-editor.tsx`). */
export type CompiledMjml = { html: string; mjml: string; project: Record<string, unknown> }

/**
 * Biên dịch MJML -> HTML + JSON dự án NGOÀI màn soạn — "Dùng mẫu" (ADR-0037 của backend): thư viện mẫu trả MJML
 * (`designToMjml`), backend không có trình biên dịch MJML, nên trình duyệt dựng một GrapesJS KHÔNG giao diện
 * (`headless`) với đúng plugin + cấu hình của bộ soạn (grapesjs-mjml không font ngoài, ảnh trống không có ảnh giả),
 * nạp MJML rồi lấy ra như lúc bấm Lưu: MJML (`getHtml`), HTML (`mjml-code-to-html`), dự án (`getProjectData`).
 * Mở template này trong bộ soạn thì ra đúng các khối; biến `{{ }}` thô tự thành chip lúc mở (như thư cũ).
 *
 * Nạp ĐỘNG GrapesJS + grapesjs-mjml (~650 KB nén, cùng gói với bộ soạn) — chỉ khi gọi, không vào gói trang.
 * Không đụng DOM của trang (headless), không gọi mạng. Backend vẫn kiểm HTML như mọi lần lưu.
 */
export async function compileMjml(mjml: string, settings: EmailSettings = DEFAULT_EMAIL_SETTINGS): Promise<CompiledMjml> {
  const [{ default: grapesjs }, { default: mjmlPlugin }] = await Promise.all([import('grapesjs'), import('grapesjs-mjml')])
  const editor = grapesjs.init({
    headless: true,
    storageManager: false,
    telemetry: false,
    cssIcons: '',
    panels: { defaults: [] },
    assetManager: { upload: false, dropzone: false, embedAsBase64: false },
    plugins: [(e: Editor) => mjmlPlugin(e, { blocks: [], fonts: {} }), imageDefaultsPlugin],
    components: mjml,
  })
  try {
    const out = editor.runCommand('mjml-code-to-html', { fonts: {} }) as { html?: string } | undefined
    const html = out?.html ?? ''
    if (!html.trim()) throw new Error('MJML compiled to an empty email')
    const projectData = editor.getProjectData() as unknown as Record<string, unknown>
    return { html, mjml: editor.getHtml(), project: { ...projectData, [SETTINGS_KEY]: settings } }
  } finally {
    editor.destroy()
  }
}
