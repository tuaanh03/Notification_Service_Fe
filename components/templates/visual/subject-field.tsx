'use client'
import { useEffect, useRef, useState } from 'react'
import { Braces } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import type { TemplateEditorState } from '@/hooks/use-template-editor'
import { parseVariable, VARIABLE_RE } from '@/lib/template-syntax'
import { cn } from '@/lib/utils'
import { variableLabel } from '@/lib/variable-labels'
import { InsertVariableDialog } from './insert-variable-dialog'
import { insertTarget } from './insert-target'

/** Lớp của chip — cùng dáng chip trong khung thư, nhưng ở đây là DOM của console nên dùng token. */
/** Tên dài cắt "…" như chip trong khung thư (`CHIP_MAX_CH`), rê chuột thấy đủ. */
const CHIP_CLASS =
  'mx-0.5 inline-block max-w-[22ch] truncate rounded-full border border-[var(--starlight)]/30 bg-[var(--nebula-indigo)] px-2 align-bottom text-[0.92em] leading-6 font-medium text-[var(--starlight)] select-all'
const CHIP_PROBLEM_CLASS =
  'mx-0.5 inline-block max-w-[22ch] truncate rounded-full bg-[var(--orbit)] px-2 align-bottom text-[0.92em] leading-6 font-medium text-[var(--supernova)] select-all'

function liquidOf(path: string, fallback: string | null): string {
  return fallback ? `{{ ${path} | default: "${fallback}" }}` : `{{ ${path} }}`
}

/** DOM của ô -> chuỗi tiêu đề (chip thành Liquid). */
function serialize(root: HTMLElement): string {
  let out = ''
  root.childNodes.forEach((node) => {
    if (node instanceof HTMLElement && node.dataset.var) out += liquidOf(node.dataset.var, node.dataset.default ?? null)
    else out += (node.textContent ?? '').replace(/\n/g, ' ')
  })
  // contenteditable chèn dấu cách không ngắt (U+00A0) quanh chip / cuối ô — lưu ra là dấu cách thường.
  return out.replace(/\u00a0/g, ' ')
}

/**
 * Ô "Tiêu đề thư" có chip biến (UX-3): một dòng `contenteditable`, biến hiện thành viên có nhãn và là một khối
 * nguyên (`contenteditable=false`) như trong khung thư; giá trị lưu vẫn là chuỗi Liquid. Enter không xuống dòng,
 * dán vào thành chữ thường (có `{{ }}` thì tự thành chip). Nút "Chèn biến" mở cùng hộp với khung thư.
 */
export function SubjectField({
  ed,
  placeholder,
  label,
  bare = false,
}: {
  ed: TemplateEditorState
  placeholder: string
  label: string
  /** Nằm trong thẻ "Tiêu đề thư" trên tờ thư (UX-5C): ô gõ không viền riêng, nút "Chèn biến" kiểu nhấn nhẹ. */
  bare?: boolean
}) {
  const t = useTranslations('visualEditor')
  const ref = useRef<HTMLDivElement>(null)
  /** Giá trị vừa phát ra từ chính ô này — để không vẽ lại DOM (mất con trỏ) khi giá trị quay về. */
  const emitted = useRef<string | null>(null)
  /**
   * Chỗ con trỏ nhớ bằng VỊ TRÍ (số đơn vị: mỗi ký tự 1, mỗi chip 1), không bằng Range: chọn biến chưa khai trong
   * hộp làm bảng biến đổi -> ô vẽ lại DOM -> Range cũ trỏ vào nút đã bị gỡ. null = chưa từng đặt con trỏ (chèn cuối).
   */
  const caret = useRef<number | null>(null)
  const remember = () => {
    const root = ref.current
    const sel = window.getSelection()
    if (root && sel?.rangeCount && root.contains(sel.getRangeAt(0).startContainer)) caret.current = caretIndex(root, sel.getRangeAt(0))
  }
  const [dialog, setDialog] = useState(false)
  const pending = useRef<{ path: string; fallback: string | null } | null>(null)
  const labelKey = ed.variables.map((v) => `${v.name}:${v.description ?? ''}`).join('|')

  const render = (value: string) => {
    const root = ref.current
    if (!root) return
    root.replaceChildren()
    let last = 0
    for (const m of value.matchAll(VARIABLE_RE)) {
      const index = m.index ?? 0
      if (index > last) root.append(value.slice(last, index))
      const v = parseVariable(m[1] ?? '')
      root.append(chipNode(v.path, v.defaultValue))
      last = index + m[0].length
    }
    if (last < value.length) root.append(value.slice(last))
  }

  const chipNode = (path: string, fallback: string | null) => {
    const span = document.createElement('span')
    const declared = ed.variables.find((v) => v.name === path)
    span.contentEditable = 'false'
    span.dataset.var = path
    if (fallback) span.dataset.default = fallback
    span.className = declared ? CHIP_CLASS : CHIP_PROBLEM_CLASS
    span.textContent = declared ? variableLabel(declared) : path
    span.title = declared ? `${variableLabel(declared)} — ${path}` : path
    return span
  }

  // Thanh dưới trên điện thoại mở được hộp chèn của ô này (nếu người soạn vừa ở đây).
  useEffect(() => {
    insertTarget.registerSubject(() => setDialog(true))
    return () => insertTarget.registerSubject(null)
  }, [])

  // Giá trị đổi từ ngoài (nạp, AI, hoàn tác) hoặc nhãn biến đổi -> vẽ lại.
  useEffect(() => {
    if (emitted.current !== ed.subject) render(ed.subject)
    emitted.current = ed.subject
    // eslint-disable-next-line react-hooks/exhaustive-deps -- render đọc ed.variables mới nhất
  }, [ed.subject])
  useEffect(() => {
    render(ed.subject)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ khi nhãn đổi
  }, [labelKey])

  const emit = () => {
    const root = ref.current
    if (!root) return
    const value = serialize(root)
    // Gõ / dán `{{ … }}` thô -> vẽ lại thành chip, con trỏ về cuối ô.
    if ([...root.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && /\{\{[^}]*\}\}/.test(n.textContent ?? ''))) {
      render(value)
      placeAtEnd(root)
    }
    emitted.current = value
    ed.setSubject(value)
  }

  const insertChip = (path: string, fallback: string | null) => {
    const root = ref.current
    if (!root) return
    // Đọc vị trí đã nhớ TRƯỚC khi focus: focus đặt con trỏ về đầu ô.
    const index = caret.current
    root.focus()
    const range = rangeAtIndex(root, index)
    const chip = chipNode(path, fallback)
    range.deleteContents()
    range.insertNode(chip)
    const after = document.createRange()
    after.setStartAfter(chip)
    after.collapse(true)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(after)
    emit()
    remember()
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div
        ref={ref}
        id="tpl-subject"
        role="textbox"
        aria-label={label}
        aria-disabled={ed.locked}
        contentEditable={!ed.locked}
        suppressContentEditableWarning
        // Tắt gạch đỏ kiểm chính tả / tự sửa của trình duyệt — tiếng Việt bị gạch oan.
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        data-placeholder={placeholder}
        onInput={() => {
          emit()
          remember()
        }}
        onKeyUp={remember}
        onMouseUp={remember}
        onFocus={() => insertTarget.mark('subject')}
        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        onPaste={(e) => {
          e.preventDefault()
          const text = e.clipboardData.getData('text/plain').replace(/[\r\n]+/g, ' ')
          document.execCommand('insertText', false, text)
        }}
        onBlur={remember}
        className={cn(
          'min-h-9 min-w-0 flex-1 rounded-lg px-3 py-1 text-sm leading-7 whitespace-nowrap outline-none overflow-x-auto',
          bare
            ? 'border-0 bg-transparent px-1 font-medium focus-visible:bg-[var(--void)]'
            : 'border border-[var(--orbit)] bg-[var(--deep)] focus-visible:border-[var(--starlight)] focus-visible:ring-2 focus-visible:ring-[var(--starlight)]/30',
          'empty:before:text-[var(--text-muted)] empty:before:content-[attr(data-placeholder)]',
          ed.locked && 'cursor-not-allowed opacity-60',
        )}
        data-testid="subject-field"
      />
      {!ed.locked && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialog(true)}
          className={cn(bare && 'bg-[var(--starlight)]/5 text-[var(--starlight)] hover:bg-[var(--starlight)]/10')}
          data-testid="subject-insert-variable"
        >
          <Braces /> <span className={bare ? 'hidden sm:inline' : 'hidden lg:inline'}>{t('insertVariable')}</span>
        </Button>
      )}
      <InsertVariableDialog
        open={dialog}
        ed={ed}
        onInsert={(path, fallback) => {
          pending.current = { path, fallback }
          setDialog(false)
        }}
        onClose={() => setDialog(false)}
        onClosed={() => {
          const next = pending.current
          pending.current = null
          if (next) insertChip(next.path, next.fallback)
          else if (ref.current) {
            // Huỷ: con trỏ về đúng chỗ cũ.
            const index = caret.current
            ref.current.focus()
            const sel = window.getSelection()
            sel?.removeAllRanges()
            sel?.addRange(rangeAtIndex(ref.current, index))
          }
        }}
      />
    </div>
  )
}

/** Vị trí con trỏ trong ô (ô chỉ có nút chữ và chip nằm phẳng): ký tự đếm 1, chip đếm 1. */
function caretIndex(root: HTMLElement, range: Range): number {
  const units = (node: ChildNode) => (node.nodeType === Node.TEXT_NODE ? (node.textContent ?? '').length : 1)
  let index = 0
  for (const node of root.childNodes) {
    if (range.startContainer === root) {
      if ([...root.childNodes].indexOf(node) >= range.startOffset) return index
    } else if (node === range.startContainer || node.contains(range.startContainer)) {
      return index + (node.nodeType === Node.TEXT_NODE ? range.startOffset : 1)
    }
    index += units(node)
  }
  return index
}

/** Range tại vị trí `index` (quá dài / null -> cuối ô); rơi đúng chỗ chip thì đặt sau chip. */
function rangeAtIndex(root: HTMLElement, index: number | null): Range {
  const range = document.createRange()
  let left = index ?? Number.POSITIVE_INFINITY
  for (const node of root.childNodes) {
    const isText = node.nodeType === Node.TEXT_NODE
    const length = isText ? (node.textContent ?? '').length : 1
    if (left <= length) {
      if (isText) range.setStart(node, left)
      else if (left === 0) range.setStartBefore(node)
      else range.setStartAfter(node)
      range.collapse(true)
      return range
    }
    left -= length
  }
  range.selectNodeContents(root)
  range.collapse(false)
  return range
}

function placeAtEnd(root: HTMLElement): void {
  const range = document.createRange()
  range.selectNodeContents(root)
  range.collapse(false)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}
