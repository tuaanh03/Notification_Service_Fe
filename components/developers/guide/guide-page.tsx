import { BookOpen, Code2, KeyRound } from 'lucide-react'
import { AppLink } from '@/components/app-link'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { ACCOUNT_TOKENS, DEVELOPERS } from '@/lib/app-routes'
import type { GuideDoc } from './parts'

/**
 * Trang Hướng dẫn tích hợp: mục lục dính bên trái (≥ lg), nội dung một cột bên phải. Đây là trang ĐỌC — luật chữ ngắn
 * của §2.18 (CLAUDE.md) không áp cho thân bài; tiêu đề / phụ đề vẫn theo luật. Server Component, không state.
 */
export function GuidePage({ doc, labels }: { doc: GuideDoc; labels: { reference: string; tokens: string } }) {
  return (
    <>
      <PageHeader
        title={doc.title}
        subtitle={doc.subtitle}
        actions={
          <>
            <Button variant="outline" nativeButton={false} render={<AppLink href={DEVELOPERS} />}>
              <Code2 /> {labels.reference}
            </Button>
            <Button variant="outline" nativeButton={false} render={<AppLink href={ACCOUNT_TOKENS} />}>
              <KeyRound /> {labels.tokens}
            </Button>
          </>
        }
      />
      <div className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav className="hidden lg:block" aria-label={doc.tocLabel}>
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
            <p className="mb-2 flex items-center gap-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <BookOpen className="size-3.5" /> {doc.tocLabel}
            </p>
            <ol className="space-y-0.5 text-xs">
              {doc.sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex gap-2 rounded-md px-2 py-1.5 text-[var(--text-secondary)] hover:bg-muted hover:text-[var(--text-primary)]">
                    <span className="font-mono tabular-nums text-[var(--text-muted)]">{i + 1}</span>
                    <span>{s.title}</span>
                  </a>
                  {s.sub && (
                    <ol className="mb-1 space-y-0.5">
                      {s.sub.map((x) => (
                        <li key={x.id}>
                          <a href={`#${x.id}`} className="block rounded-md py-1 pr-2 pl-7 text-[11px] text-[var(--text-muted)] hover:bg-muted hover:text-[var(--text-primary)]">
                            {x.title}
                          </a>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className="min-w-0 space-y-12">
          {doc.sections.map((s, i) => (
            <section key={s.id} id={s.id} className="min-w-0 scroll-mt-20 space-y-4">
              <h2 className="flex items-baseline gap-2.5 text-lg font-semibold text-[var(--text-primary)]">
                <span className="font-mono text-sm tabular-nums text-[var(--starlight)]">{String(i + 1).padStart(2, '0')}</span>
                {s.title}
              </h2>
              {s.body}
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
