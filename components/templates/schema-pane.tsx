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

const HEADERS = ['colName', 'colRequired', 'colSample', 'colDescription', null] as const

/**
 * Bảng biến của bản đang soạn — sao đúng `VariableSpec` của backend: tên đầy đủ, bắt buộc, mẫu, mô tả.
 * Không có cột "Kiểu" (backend không có) và "Mặc định" (mặc định viết ngay trong nội dung bằng `| default:`).
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
                <TableCell colSpan={3} className="px-2 text-[var(--supernova)]">{t('undeclared')}</TableCell>
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
                <TableRow key={v.name} className="h-11 align-top" data-var={v.name}>
                  <TableCell className="px-2 font-mono">
                    {v.name}
                    {unused && (
                      <Badge variant="outline" className="ml-1 font-mono text-[10px] text-[var(--solar)]">{t('unused')}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-2">
                    <Switch
                      checked={v.required}
                      onCheckedChange={(c) => ed.updateVar(v.name, { required: c })}
                      disabled={locked || v.source === 'user'}
                      aria-label={t('requiredAria', { name: v.name })}
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <Input
                      value={v.sample ?? ''}
                      onChange={(e) => ed.updateVar(v.name, { sample: e.target.value || undefined })}
                      className="h-7 font-mono text-xs"
                      disabled={locked}
                      aria-label={t('sampleAria', { name: v.name })}
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <Input
                      value={v.description ?? ''}
                      onChange={(e) => ed.updateVar(v.name, { description: e.target.value || undefined })}
                      className="h-7 text-xs"
                      disabled={locked}
                      aria-label={t('descriptionAria', { name: v.name })}
                    />
                  </TableCell>
                  <TableCell className="px-2 text-right">
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
                <TableCell colSpan={5} className="px-2 py-4 text-center text-xs text-[var(--text-muted)]">
                  {t.rich('none', { mono })}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        {t.rich('defaultHint', { mono })}
      </p>
    </div>
  )
}
