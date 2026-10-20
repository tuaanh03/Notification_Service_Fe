import type { Component, Editor } from 'grapesjs'
import { applySettingsTo, type EmailSettings } from './email-settings'

/**
 * Khối của bộ soạn trực quan — tự khai thay bộ khối mặc định của grapesjs-mjml (chữ mẫu tiếng Anh, có hero / mạng
 * xã hội / HTML thô). Khối mới có chữ mẫu theo ngôn ngữ màn để người soạn thấy ngay phải sửa gì. Không có khối
 * HTML tự viết (backend vẫn kiểm, nhưng người không biết code không cần).
 */
export const CONTENT_BLOCKS = ['heading', 'text', 'button', 'image', 'divider', 'spacer'] as const
export const LAYOUT_BLOCKS = ['col1', 'col2', 'col3', 'col12', 'col21'] as const
export type ContentBlock = (typeof CONTENT_BLOCKS)[number]
export type LayoutBlock = (typeof LAYOUT_BLOCKS)[number]
export type BlockKind = ContentBlock | LayoutBlock

/** Chữ mẫu của khối mới — màn truyền vào theo ngôn ngữ. */
export type BlockTexts = { heading: string; text: string; button: string; imageAlt: string; column: string }

const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function blockContent(kind: BlockKind, texts: BlockTexts): string {
  const column = (width?: string) =>
    `<mj-column${width ? ` width="${width}"` : ''}><mj-text>${escapeXml(texts.column)}</mj-text></mj-column>`
  switch (kind) {
    case 'heading':
      return `<mj-text font-size="22px" font-weight="700" line-height="1.3">${escapeXml(texts.heading)}</mj-text>`
    case 'text':
      return `<mj-text font-size="15px" line-height="1.6">${escapeXml(texts.text)}</mj-text>`
    case 'button':
      // Link để trống: khối báo "chưa có link" ở danh sách lỗi cho tới khi người soạn điền.
      return `<mj-button href="" border-radius="6px">${escapeXml(texts.button)}</mj-button>`
    case 'image':
      // Chưa có link ảnh: chừa chỗ cao 120px, chữ thay ảnh nói rõ phải làm gì. Không ảnh mẫu từ máy chủ ngoài.
      return `<mj-image src="" alt="${escapeXml(texts.imageAlt)}" height="120px" width="600px"></mj-image>`
    case 'divider':
      return `<mj-divider border-width="1px" border-color="#e2e8f0"></mj-divider>`
    case 'spacer':
      return `<mj-spacer height="24px"></mj-spacer>`
    case 'col1':
      return `<mj-section>${column()}</mj-section>`
    case 'col2':
      return `<mj-section>${column()}${column()}</mj-section>`
    case 'col3':
      return `<mj-section>${column()}${column()}${column()}</mj-section>`
    case 'col12':
      return `<mj-section>${column('33%')}${column('67%')}</mj-section>`
    case 'col21':
      return `<mj-section>${column('67%')}${column('33%')}</mj-section>`
  }
}

export const isLayout = (kind: BlockKind): kind is LayoutBlock => (LAYOUT_BLOCKS as readonly string[]).includes(kind)

/**
 * Ảnh chưa có link: kiểu `image` của GrapesJS mặc định gắn một ảnh SVG giả làm `src` — lọt ra MJML / HTML thành
 * `src="<svg …"` (backend chặn `IMAGE_URL_NOT_ALLOWED`). Đổi mặc định của `mj-image` thành rỗng.
 * Phải chạy SAU plugin grapesjs-mjml (nó khai `mj-image`).
 */
export function imageDefaultsPlugin(editor: Editor): void {
  const type = editor.Components.getType('mj-image')
  if (!type) return
  editor.Components.addType('mj-image', { model: { defaults: { src: '' } } })
}

/** Khai khối với GrapesJS để kéo-thả (`editor.Blocks.startDrag`). */
export function registerBlocks(editor: Editor, texts: BlockTexts, labels: Record<BlockKind, string>): void {
  for (const kind of [...CONTENT_BLOCKS, ...LAYOUT_BLOCKS]) {
    editor.Blocks.add(`ews-${kind}`, { label: labels[kind], content: blockContent(kind, texts), select: true })
  }
}

/**
 * Bấm khối = thêm (đường thay cho kéo): khối nội dung vào ngay sau khối đang chọn trong cùng cột, không có chỗ
 * nào đang chọn thì thành hàng mới cuối thư; bố cục luôn là hàng mới cuối thư. Chọn luôn khối vừa thêm.
 */
export function appendBlock(editor: Editor, kind: BlockKind, texts: BlockTexts, settings: EmailSettings): Component | null {
  const body = editor.getWrapper()?.findType('mj-body')[0]
  if (!body) return null
  let added: Component[] = []
  if (isLayout(kind)) {
    added = body.append(blockContent(kind, texts))
  } else {
    const selected = editor.getSelected()
    const column = selected?.get('type') === 'mj-column' ? selected : selected?.closestType('mj-column')
    if (column && selected && selected !== column) {
      // Khối đang chọn nằm trong cột: chèn ngay sau khối con trực tiếp của cột chứa nó.
      let child: Component = selected
      while (child.parent() && child.parent() !== column) child = child.parent()!
      added = column.append(blockContent(kind, texts), { at: child.index() + 1 })
    } else if (column) {
      added = column.append(blockContent(kind, texts))
    } else {
      added = body.append(`<mj-section><mj-column>${blockContent(kind, texts)}</mj-column></mj-section>`)
    }
  }
  const first = added[0] ?? null
  if (first) {
    applySettingsTo(first, settings)
    const target = isLayout(kind) || first.get('type') !== 'mj-section' ? first : (first.findType(kind === 'heading' || kind === 'text' ? 'mj-text' : `mj-${kind}`)[0] ?? first)
    editor.select(target)
    editor.Canvas.scrollTo(target, { behavior: 'smooth' })
  }
  return first
}
