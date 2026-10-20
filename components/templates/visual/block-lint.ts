import type { Component, Editor } from 'grapesjs'
import type { TemplateVariableDto } from '@/lib/api/types'
import { hasSource, parseVariables, SUPPORTED_USER_VARIABLES } from '@/lib/template-syntax'
import { CHIP_TYPE } from './chip-plugin'

/**
 * Kiểm phía trình duyệt TỪNG KHỐI của bộ soạn trực quan (UX-3) — để chỉ đúng khối sai, thay cho danh sách lỗi
 * chung lúc xuất bản. Chỉ là bản sao luật để báo sớm (`lib/template-syntax.ts`); backend vẫn là cổng chặn:
 * lỗi 422 lúc lưu / xuất bản vẫn hiện như cũ.
 */
export type BlockIssueCode =
  | 'VARIABLE_NOT_DECLARED'
  | 'VARIABLE_MISSING_SOURCE'
  | 'USER_VARIABLE_NOT_SUPPORTED'
  | 'OPTIONAL_VARIABLE_WITHOUT_DEFAULT'
  | 'LINK_EMPTY'
  | 'LINK_SCHEME_NOT_ALLOWED'
  | 'IMAGE_EMPTY'
  | 'IMAGE_URL_NOT_ALLOWED'

export type BlockIssue = { component: Component; code: BlockIssueCode; detail: string }

const HTTPS_IMAGE_RE = /^https:\/\/[^\s"'<>{}]+$/i
const LINK_RE = /^(https:\/\/|mailto:)/i

/** Biến dùng: chip (đường + có giá trị mặc định không) hoặc Liquid trong thuộc tính. */
function variableIssues(component: Component, path: string, hasDefault: boolean, variables: readonly TemplateVariableDto[]): BlockIssue[] {
  if (!hasSource(path)) return [{ component, code: 'VARIABLE_MISSING_SOURCE', detail: path }]
  if (path.startsWith('user.') && !SUPPORTED_USER_VARIABLES.includes(path)) return [{ component, code: 'USER_VARIABLE_NOT_SUPPORTED', detail: path }]
  const spec = variables.find((v) => v.name === path)
  if (!spec) return [{ component, code: 'VARIABLE_NOT_DECLARED', detail: path }]
  if (!spec.required && !hasDefault) return [{ component, code: 'OPTIONAL_VARIABLE_WITHOUT_DEFAULT', detail: path }]
  return []
}

function linkIssues(component: Component, href: string, variables: readonly TemplateVariableDto[]): BlockIssue[] {
  const value = href.trim()
  if (!value) return [{ component, code: 'LINK_EMPTY', detail: '' }]
  if (value.startsWith('{{')) {
    const v = parseVariables(value)[0]
    return v ? variableIssues(component, v.path, v.defaultValue !== null, variables) : []
  }
  return LINK_RE.test(value) ? [] : [{ component, code: 'LINK_SCHEME_NOT_ALLOWED', detail: value }]
}

export function lintBlocks(editor: Editor, variables: readonly TemplateVariableDto[]): BlockIssue[] {
  const issues: BlockIssue[] = []
  const visit = (c: Component) => {
    const type = String(c.get('type'))
    const attrs = c.getAttributes() as Record<string, string | undefined>
    if (type === CHIP_TYPE) {
      // Lỗi của chip báo trên khối chữ chứa nó — chip quá nhỏ để thấy viền.
      const owner = c.closestType('mj-text') ?? c.closestType('mj-button') ?? c
      issues.push(...variableIssues(owner, String(c.get('varPath') ?? ''), !!c.get('varDefault'), variables))
      return
    }
    if (type === 'mj-button') issues.push(...linkIssues(c, attrs.href ?? '', variables))
    if (type === 'mj-image') {
      const src = String(c.get('src') ?? attrs.src ?? '').trim()
      if (!src) issues.push({ component: c, code: 'IMAGE_EMPTY', detail: '' })
      else if (!HTTPS_IMAGE_RE.test(src)) issues.push({ component: c, code: 'IMAGE_URL_NOT_ALLOWED', detail: src })
      if (attrs.href?.trim()) issues.push(...linkIssues(c, attrs.href, variables))
    }
    if (type === 'textnode') {
      // `{{ … }}` còn ở dạng chữ (chưa thành chip) — vẫn kiểm.
      const owner = c.parent() ?? c
      for (const v of parseVariables(String(c.get('content') ?? ''))) issues.push(...variableIssues(owner, v.path, v.defaultValue !== null, variables))
      return
    }
    c.components().forEach(visit)
  }
  editor.getWrapper()?.components().forEach(visit)
  return issues
}

/**
 * Tô viền đỏ khối có lỗi trên KHUNG SOẠN (sửa thẳng `style` của phần tử trong khung, không đụng model — không
 * vào MJML / HTML). Trả hàm gỡ viền của lần trước.
 */
export function markBlocks(issues: readonly BlockIssue[], color: string): () => void {
  const els = [...new Set(issues.map((i) => i.component.getEl()).filter((el): el is HTMLElement => !!el))]
  const previous = els.map((el) => [el, el.style.outline, el.style.outlineOffset] as const)
  for (const el of els) {
    el.style.outline = `2px dashed ${color}`
    el.style.outlineOffset = '-2px'
  }
  return () => {
    for (const [el, outline, offset] of previous) {
      el.style.outline = outline
      el.style.outlineOffset = offset
    }
  }
}
