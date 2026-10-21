'use client'
import { Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { TemplateEditorState } from '@/hooks/use-template-editor'
import { humanizeKey } from '@/lib/variable-labels'

const HEADERS = ['colLabel', 'colRequired', 'colSample', null] as const

/** Tên dài hơn thế này thì chip trong thư bị cắt "…" — báo nhẹ, không chặn (backend cho tới 500 ký tự). */
const LABEL_SOFT_MAX = 24

/**
 * Bảng biến của bản đang soạn — sao đúng `VariableSpec` của backend: tên, bắt buộc, mẫu, mô tả.
 * Cột chính là "Tên dễ đọc" (UX-5B, bản phác ChenBien / TichHop) = `description`: hiện trên chip trong thư và ở tab
 * Tích hợp; mã `payload.x` chỉ là dòng mờ bên dưới. Không có cột "Kiểu" (backend không có) và "Mặc định" (mặc định viết
 * ngay trong nội dung — kiểu trực quan đặt lúc chèn biến, nên ở đây không nhắc cú pháp `| default:`).
 * Tên biến lấy từ nội dung, không gõ tay: dùng trong nội dung mà chưa khai thì hiện dòng đỏ có nút Khai báo.
 */
export function SchemaPane({ ed, locked }: { ed: TemplateEditorState; locked: boolean }) {
  const t = useTranslations('schema')
  const mono = (chunks: React.ReactNode) => <span className="font-mono">{chunks}</span>
  return (
    <div className="space-y-3" data-testid="schema-pane">
      {ed.missingSource.length > 0 && (
        <Alert variant="destructive" className="bg-[var(--supernova)]/10" data-testid="missing-source">
          <AlertDescription className="text-[var(--supernova)]">
            {t.rich('missingSource', { vars: ed.missingSource.map((v) => `{{ ${v} }}`).join(' '), mono })}
          </AlertDescription>
        </Alert>
      )}
      <div className="overflow-x-auto">
        <Table className="text-[12px]">
          <TableHeader className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            <TableRow className="hover:bg-transparent">
              {HEADERS.map((h, i) => (
                <TableHead key={i} className="px-2">{h && t(h)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ed.undeclared.map((v) => (
              <TableRow key={`u-${v}`} className="h-11 bg-[var(--supernova)]/[.06]" data-undeclared={v}>
                <TableCell className="px-2 font-mono text-[var(--supernova)]">{v}</TableCell>
                <TableCell colSpan={2} className="px-2 text-[var(--supernova)]">{t('undeclared')}</TableCell>
                <TableCell className="px-2 text-right">
                  <Button variant="outline" size="xs" onClick={() => ed.declareVar(v)} disabled={locked}>
                    <Plus /> {t('declare')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {ed.variables.map((v) => {
              const unused = ed.unused.includes(v.name)
              return (
                <TableRow key={v.name} className="align-top" data-var={v.name}>
                  <TableCell className="min-w-56 px-2 py-2">
                    <Input
                      value={v.description ?? ''}
                      onChange={(e) => ed.updateVar(v.name, { description: e.target.value || undefined })}
                      placeholder={humanizeKey(v.name)}
                      className="h-8 text-sm font-medium"
                      disabled={locked}
                      aria-label={t('labelAria', { name: v.name })}
                    />
                    <p className="mt-1 flex flex-wrap items-center gap-1 font-mono text-[11px] text-[var(--text-muted)]">
                      {v.name}
                      {unused && (
                        <Badge variant="outline" className="font-mono text-[10px] text-[var(--solar)]">{t('unused')}</Badge>
                      )}
                    </p>
                    {(v.description?.trim().length ?? 0) > LABEL_SOFT_MAX && (
                      <p className="mt-0.5 text-[11px] text-[var(--solar)]" data-testid="label-long">{t('labelLong')}</p>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-3">
                    <Switch
                      checked={v.required}
                      onCheckedChange={(c) => ed.updateVar(v.name, { required: c })}
                      disabled={locked || v.source === 'user'}
                      aria-label={t('requiredAria', { name: v.name })}
                    />
                  </TableCell>
                  <TableCell className="min-w-44 px-2 py-2">
                    <Input
                      value={v.sample ?? ''}
                      onChange={(e) => ed.updateVar(v.name, { sample: e.target.value || undefined })}
                      className="h-8 text-sm"
                      disabled={locked}
                      aria-label={t('sampleAria', { name: v.name })}
                    />
                  </TableCell>
                  <TableCell className="px-2 py-2 text-right">
                    {unused && (
                      <Button variant="ghost" size="icon-xs" aria-label={t('removeAria', { name: v.name })} onClick={() => ed.removeVar(v.name)} disabled={locked}>
                        <Trash2 />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {ed.variables.length === 0 && ed.undeclared.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="px-2 py-4 text-center text-xs text-[var(--text-muted)]">
                  {t.rich('none', { mono })}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-[var(--text-muted)]">{t('labelHint')}</p>
      {/* Kiểu HTML tự gõ Liquid nên cần cú pháp; kiểu trực quan đặt "khi app không gửi thì hiện" lúc chèn biến. */}
      <p className="text-xs text-[var(--text-muted)]">
        {ed.editor === 'visual' ? t('defaultHintVisual') : t.rich('defaultHint', { mono })}
      </p>
    </div>
  )
}
