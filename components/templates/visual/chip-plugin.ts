import type { Component, Editor } from 'grapesjs'

/**
 * "Chip biến" cho bộ soạn trực quan (ADR-0036 của backend; đã thử ở bản spike UX-2).
 *
 * Trên khung soạn, `{{ payload.name | default: "bạn" }}` hiện thành một viên có nhãn dễ đọc ("Tên người nhận")
 * và là MỘT khối nguyên (`contenteditable=false`): gõ / xoá / dán quanh nó không chui được vào giữa biến,
 * Backspace xoá cả viên. Dữ liệu chip (`varPath`, `varDefault`) nằm trong JSON dự án; MJML / HTML xuất ra luôn
 * là Liquid nguyên dạng (`toHTML`) — backend và lúc gửi không biết có chip.
 */

/** Liquid một biến: `{{ path }}` hoặc `{{ path | default: "x" }}` / `'x'`. */
const LIQUID_RE = /\{\{\s*([A-Za-z_][\w.]*)\s*(?:\|\s*default:\s*(?:"([^"]*)"|'([^']*)'))?\s*\}\}/g

export const CHIP_TYPE = 'var-chip'

export function chipLiquid(path: string, fallback?: string | null): string {
  return fallback ? `{{ ${path} | default: "${fallback}" }}` : `{{ ${path} }}`
}

export type VariableRequest = {
  insert: (path: string, fallback: string | null) => void
  cancel: () => void
}

export type ChipOptions = {
  /** Nhãn của biến; `null` = biến chưa khai (chip đỏ, hiện tên kỹ thuật). */
  labelOf: (path: string) => string | null
  /** Màu chip — lấy từ token console lúc chạy (khung thư là iframe, không đọc được biến CSS của console). */
  colors: { background: string; text: string; problemBackground: string; problemText: string }
  /**
   * Bấm nút "Chèn biến" trên thanh định dạng — console mở hộp chọn, rồi gọi `insert` (hoặc `cancel` khi huỷ).
   * Cả hai đều trả focus + con trỏ về khối chữ đang sửa; gọi SAU khi hộp đã đóng hẳn (hộp giữ focus lúc mở).
   */
  onRequestVariable: (actions: VariableRequest) => void
  /** Chữ của nút trên thanh định dạng. */
  insertTitle: string
  /** Con trỏ vừa đặt trong một khối chữ của thư (để "Chèn biến" ngoài khung biết chèn vào đâu). */
  onCaret?: (where: 'body') => void
}

export function chipPlugin(options: ChipOptions) {
  return (editor: Editor) => {
    editor.Components.addType(CHIP_TYPE, {
      isComponent: (el: HTMLElement) => (el.tagName === 'SPAN' && el.dataset?.var ? { type: CHIP_TYPE } : false),
      model: {
        defaults: {
          tagName: 'span',
          name: 'Biến',
          // Được nằm trong khối chữ và sống qua lúc sửa chữ; bản thân không sửa chữ được.
          textable: true,
          editable: false,
          droppable: false,
          draggable: true,
          layerable: false,
          copyable: true,
          attributes: { contenteditable: 'false' },
          traits: [],
        },
        init(this: Component) {
          const attrs = this.getAttributes()
          if (!this.get('varPath') && attrs['data-var']) this.set('varPath', attrs['data-var'])
          if (this.get('varDefault') === undefined && attrs['data-default'] !== undefined) this.set('varDefault', attrs['data-default'])
          // data-* trên phần tử: lúc thanh định dạng đọc lại DOM, GrapesJS vẫn nhận ra chip (`isComponent`).
          const next: Record<string, string> = { contenteditable: 'false', 'data-var': this.get('varPath') }
          if (this.get('varDefault')) next['data-default'] = this.get('varDefault')
          this.setAttributes(next)
        },
        toHTML(this: Component) {
          return chipLiquid(this.get('varPath'), this.get('varDefault'))
        },
      },
      view: {
        onRender(this: { el: HTMLElement; model: Component }) {
          paintChip(this.el, this.model, options.labelOf, options.colors)
        },
      },
    })

    // Chữ `{{ … }}` thô (dán vào, gõ tay, thư cũ) -> chip, sau mỗi lần sửa chữ xong.
    editor.on('rte:disable', (view: { model?: Component } | undefined) => {
      const model = view?.model
      if (model) setTimeout(() => chipifyText(model), 0)
    })

    // Biến trong link (ô Link của nút / liên kết): `"` trong `{{ }}` phá thuộc tính MJML -> đổi sang `'`.
    editor.on('component:update:attributes', (component: Component) => {
      const href = component.getAttributes().href
      if (typeof href !== 'string' || !href.includes('{{')) return
      const fixed = href.replace(/\{\{[^{}]*\}\}/g, (token) => token.replace(/"/g, "'"))
      if (fixed !== href) component.addAttributes({ href: fixed })
    })

    editor.onReady(() => {
      // Nhớ chỗ con trỏ trong khối đang sửa (theo số ký tự — khối vẽ lại khi tắt sửa chữ).
      const doc = editor.Canvas.getDocument()
      doc?.addEventListener('selectionchange', () => {
        const editing = editor.getEditing()
        const sel = doc.getSelection()
        const root = editing?.getEl()
        if (!editing || !root || !sel?.rangeCount) return
        const editable = root.querySelector<HTMLElement>('[contenteditable="true"]') ?? (root.isContentEditable ? root : null)
        const range = sel.getRangeAt(0)
        if (editable?.contains(range.startContainer)) {
          lastCaret.set(editor, { component: editing, offset: textOffset(doc, editable, range) })
          options.onCaret?.('body')
        }
      })
      // Nút có CHỮ "{ } Chèn biến" (bản phác Main) — `ews-rte-insert` để visual-editor.css tô nền màu nhấn cho nút.
      editor.RichTextEditor.add('insertVar', {
        icon: `<span class="ews-rte-insert">{ }</span> ${escapeHtml(options.insertTitle)}`,
        attributes: { title: options.insertTitle },
        result: () => {
          requestChipInsert(editor, options)
        },
      })
    })
  }
}

/** Chỗ con trỏ gần nhất trong khối chữ đang sửa — để "Chèn biến" từ nút NGOÀI khung (thanh dưới trên điện thoại). */
const lastCaret = new WeakMap<Editor, { component: Component; offset: number }>()

/**
 * Mở hộp "Chèn biến" cho khối chữ đang sửa (hoặc vừa sửa) rồi chèn chip đúng chỗ con trỏ. Trả false khi không có
 * khối chữ nào để chèn (màn báo cho người soạn chọn đoạn chữ trước). Dùng chung cho nút {x} trên thanh định dạng và
 * nút "Chèn biến" của thanh dưới trên điện thoại.
 */
export function requestChipInsert(editor: Editor, options: ChipOptions): boolean {
  const doc = editor.Canvas.getDocument()
  // Khối đang sửa chữ; không có (điện thoại: chạm nút ngoài khung đã tắt sửa chữ) thì khối vừa sửa gần nhất.
  const editing = editor.getEditing() ?? null
  const last = lastCaret.get(editor)
  const selected = editing ?? (last && last.component === editor.getSelected() ? last.component : null)
  const view = selected?.getView() as unknown as TextView | undefined
  if (!selected || !view?.insertComponent || !doc) return false
  const editableOf = (): HTMLElement | null => {
    const el = selected.getEl()
    return el?.querySelector<HTMLElement>('[contenteditable="true"]') ?? (el?.isContentEditable ? el : null)
  }
  // Hộp chọn biến lấy focus khỏi khung thư, và bấm chuột ra ngoài làm GrapesJS TẮT chế độ sửa chữ (vẽ lại
  // khối). Giữ chỗ con trỏ bằng cả vùng chọn lẫn số ký tự tính từ đầu khối — vùng chọn cũ có thể đã mất.
  const range = doc.getSelection()?.rangeCount ? doc.getSelection()!.getRangeAt(0).cloneRange() : null
  const startRoot = editableOf()
  const offset = range && startRoot?.contains(range.startContainer) ? textOffset(doc, startRoot, range) : (last?.component === selected ? last.offset : null)

  /** Bật lại chế độ sửa chữ của khối (nếu đã tắt), focus, đặt con trỏ về chỗ cũ. */
  const resume = async () => {
    if (editor.getEditing() !== selected) {
      await view.onActive?.()
      // Bật lại xong GrapesJS còn tự đặt con trỏ ở nhịp sau — chờ nó rồi mới đặt con trỏ của mình.
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    const root = editableOf()
    if (!root) return
    editor.Canvas.getWindow()?.focus()
    root.focus()
    // Ưu tiên số ký tự: Range cũ là "sống", GrapesJS ghi lại nội dung khi tắt sửa chữ thì nó tụt về đầu khối.
    const target = offset === null && range?.startContainer.isConnected && root.contains(range.startContainer) ? range : rangeAtOffset(doc, root, offset)
    placeCaret(doc, target)
  }
  options.onRequestVariable({
    insert: (path, fallback) =>
      void resume().then(() => {
        // useDomContent: chữ vừa gõ (chưa vào model) không bị mất khi tách nút chữ để chèn chip.
        const added = view.insertComponent({ type: CHIP_TYPE, varPath: path, varDefault: fallback ?? undefined }, { useDomContent: true })
        const chip = Array.isArray(added) ? added[0] : added
        const id = chip?.getId()
        // Con trỏ ngay sau chip để gõ tiếp liền (chèn xong GrapesJS vẽ lại khối chữ — chờ một nhịp).
        setTimeout(() => {
          const el = id ? doc.getElementById(id) : null
          const root = editableOf()
          if (!el || !root) return
          editor.Canvas.getWindow()?.focus()
          root.focus()
          const after = doc.createRange()
          after.setStartAfter(el)
          after.collapse(true)
          placeCaret(doc, after)
        }, 0)
      }),
    // Huỷ: con trỏ về đúng chỗ cũ để gõ tiếp.
    cancel: () => void resume(),
  })
  return true
}

/** View của khối chữ GrapesJS — chỉ phần dùng ở đây. */
type TextView = {
  insertComponent: (def: object, opts?: { useDomContent?: boolean }) => Component | Component[]
  /** Bật chế độ sửa chữ (như bấm đúp). */
  onActive?: (ev?: unknown) => Promise<void>
}

function placeCaret(doc: Document, range: Range): void {
  const sel = doc.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

/** Số ký tự từ đầu khối tới con trỏ (chip tính bằng chữ nhãn — vẽ lại vẫn ra cùng nhãn). */
function textOffset(doc: Document, root: HTMLElement, range: Range): number {
  const pre = doc.createRange()
  pre.selectNodeContents(root)
  pre.setEnd(range.startContainer, range.startOffset)
  return pre.toString().length
}

/** Vùng chọn tại `offset` ký tự trong khối; rơi vào giữa chip thì đặt sau chip; null / quá dài thì cuối khối. */
function rangeAtOffset(doc: Document, root: HTMLElement, offset: number | null): Range {
  const r = doc.createRange()
  if (offset !== null) {
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let left = offset
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const length = node.textContent?.length ?? 0
      if (left <= length) {
        const chip = node.parentElement?.closest('[contenteditable="false"]')
        if (chip && root.contains(chip)) r.setStartAfter(chip)
        else r.setStart(node, left)
        r.collapse(true)
        return r
      }
      left -= length
    }
  }
  r.selectNodeContents(root)
  r.collapse(false)
  return r
}

/** Vẽ lại mọi chip (vd sau khi bảng biến đổi nhãn). */
export function repaintChips(editor: Editor, labelOf: ChipOptions['labelOf'], colors: ChipOptions['colors']): void {
  for (const chip of editor.getWrapper()?.findType(CHIP_TYPE) ?? []) {
    const el = chip.getEl()
    if (el) paintChip(el, chip, labelOf, colors)
  }
}

/** Chip dài hơn thế này thì cắt "…" — một chip không bao giờ xuống dòng trong thư (bản phác Main: "Tổng số"). */
export const CHIP_MAX_CH = 22

function paintChip(el: HTMLElement, model: Component, labelOf: ChipOptions['labelOf'], colors: ChipOptions['colors']): void {
  const path = String(model.get('varPath') ?? '')
  const label = labelOf(path)
  el.textContent = label ?? path
  // Tên dài bị cắt "…" (UX-5B) — rê chuột thấy đủ tên + mã.
  el.title = label ? `${label} — ${path}` : path
  el.style.cssText = [
    'display:inline-block',
    `max-width:${CHIP_MAX_CH}ch`,
    'overflow:hidden',
    'text-overflow:ellipsis',
    'white-space:nowrap',
    'vertical-align:bottom',
    'border-radius:999px',
    'padding:0 8px',
    'font-size:0.95em',
    'line-height:1.5',
    'user-select:all',
    'cursor:default',
    `background:${label === null ? colors.problemBackground : colors.background}`,
    `color:${label === null ? colors.problemText : colors.text}`,
  ].join(';')
}

/** Đổi chữ `{{ … }}` trong các nút chữ con của `component` thành chip. */
export function chipifyText(component: Component): void {
  component.components().forEach((child: Component) => {
    if (child.get('type') !== 'textnode') {
      chipifyText(child)
      return
    }
    const text = String(child.get('content') ?? '')
    if (!text.includes('{{')) return
    const parts: object[] = []
    let last = 0
    for (const m of text.matchAll(LIQUID_RE)) {
      const index = m.index ?? 0
      if (index > last) parts.push({ type: 'textnode', content: text.slice(last, index) })
      parts.push({ type: CHIP_TYPE, varPath: m[1], varDefault: m[2] ?? m[3] })
      last = index + m[0].length
    }
    if (parts.length === 0) return
    if (last < text.length) parts.push({ type: 'textnode', content: text.slice(last) })
    const collection = child.collection
    const at = collection.indexOf(child)
    child.remove()
    collection.add(parts, { at })
  })
}

/** Chữ thường -> an toàn để ghép vào HTML (nhãn nút trên thanh định dạng). */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
