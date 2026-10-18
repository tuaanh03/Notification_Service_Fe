'use client'
import type { ReactNode } from 'react'
import { Code2, ImageOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { DesignBlock, DesignSettings } from '@/lib/email-design'

const HEADING_SIZE = { 1: 'text-[28px]', 2: 'text-[22px]', 3: 'text-[18px]' } as const
const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' } as const
const JUSTIFY = { left: 'justify-start', center: 'justify-center', right: 'justify-end' } as const

/** `**đậm**` và `[chữ](link)` vẽ bằng phần tử React — không bao giờ chèn HTML thô vào console. */
const INLINE_RE = /\*\*([^*\n]+)\*\*|\[([^\]\n]+)\]\(([^)\n]+)\)/g
function inline(text: string, linkColor: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(INLINE_RE)) {
    out.push(text.slice(last, m.index))
    out.push(
      m[1] !== undefined ? (
        <strong key={m.index}>{m[1]}</strong>
      ) : (
        <span key={m.index} className="underline" style={{ color: linkColor }} title={m[3]}>
          {m[2]}
        </span>
      ),
    )
    last = m.index + m[0].length
  }
  out.push(text.slice(last))
  return out
}

/** Một khối trên khung soạn — bản vẽ gần đúng để soạn; thư thật do backend sinh. */
export function BlockView({ block, settings }: { block: DesignBlock; settings: DesignSettings }) {
  const t = useTranslations('blockEditor')
  const placeholder = 'italic text-[var(--text-muted)]'
  switch (block.type) {
    case 'heading': {
      const Tag = `h${block.level}` as const
      return (
        <Tag className={`${HEADING_SIZE[block.level]} ${ALIGN[block.align]} px-1 py-1 leading-tight font-bold whitespace-pre-wrap`} style={{ color: block.color ?? settings.textColor }}>
          {block.text || <span className={placeholder}>{t('heading')}</span>}
        </Tag>
      )
    }
    case 'text':
      return (
        <p className={`${ALIGN[block.align]} px-1 py-1 text-[16px] leading-relaxed whitespace-pre-wrap`} style={{ color: block.color ?? settings.textColor }}>
          {block.text ? inline(block.text, settings.linkColor) : <span className={placeholder}>{t('emptyText')}</span>}
        </p>
      )
    case 'button':
      return (
        <div className={`flex ${JUSTIFY[block.align]} px-1 py-2`}>
          <span
            className="inline-block px-6 py-3 text-[16px] leading-tight font-semibold"
            style={{ backgroundColor: block.backgroundColor, color: block.textColor, borderRadius: block.borderRadius }}
          >
            {block.label || t('button')}
          </span>
        </div>
      )
    case 'image':
      return (
        <div className={`flex ${JUSTIFY[block.align]} px-1 py-2`}>
          {block.src.startsWith('https://') ? (
            // Ảnh ngoài do người soạn nhập (chỉ https) — không qua next/image.
            <img src={block.src} alt={block.alt} style={{ width: `${block.width}%` }} className="h-auto max-w-full" />
          ) : (
            <div className="flex h-24 items-center justify-center gap-2 rounded-md border border-dashed border-[var(--orbit)] bg-[var(--void)] text-xs text-[var(--text-muted)]" style={{ width: `${block.width}%` }}>
              <ImageOff className="size-4" /> {t('noImage')}
            </div>
          )}
        </div>
      )
    case 'divider':
      return (
        <div className="px-1 py-2">
          <div style={{ borderTop: `${block.thickness}px solid ${block.color}` }} />
        </div>
      )
    case 'spacer':
      return <div className="rounded-sm bg-[var(--starlight)]/5" style={{ height: block.height }} />
    case 'html':
      return (
        <div className="m-1 flex items-start gap-2 rounded-md bg-[var(--void)] p-2 font-mono text-[11px] text-[var(--text-secondary)]">
          <Code2 className="mt-0.5 size-3.5 shrink-0" />
          <span className="line-clamp-3 break-all">{block.html || t('htmlBlock')}</span>
        </div>
      )
  }
}
