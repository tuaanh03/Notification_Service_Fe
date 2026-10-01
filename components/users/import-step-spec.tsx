'use client'
import { Download, FileWarning, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { CodeBlock } from '@/components/code-block'
import { Panel } from '@/components/panel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { IMPORT_COLUMNS, IMPORT_SAMPLE_CSV, topics } from '@/lib/mock-data'

/** Bước 1 — file mẫu + spec cột + tuỳ chọn gắn topic; upload → dry-run (bước 2) hoặc bị từ chối cả file. */
export function ImportStepSpec({
  attach,
  onAttach,
  onUpload,
}: {
  attach: { on: boolean; topic: string }
  onAttach: (next: { on: boolean; topic: string }) => void
  onUpload: (kind: 'ok' | 'missing_column') => void
}) {
  const t = useTranslations('import')
  const mono = (chunks: React.ReactNode) => <span className="font-mono">{chunks}</span>
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Panel className="min-w-0 p-4">
          <h3 className="text-sm font-semibold">{t('stepTemplate')}</h3>
          <div className="mt-3">
            <CodeBlock language="csv" value={IMPORT_SAMPLE_CSV} />
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => toast.success(t('downloadingTemplate'))}>
            <Download /> users-template.csv
          </Button>
        </Panel>
        <Panel className="min-w-0 overflow-hidden">
          <Table className="text-[13px]">
            <TableHeader className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-3">{t('colColumn')}</TableHead>
                <TableHead className="px-3">{t('colRequired')}</TableHead>
                <TableHead className="px-3">{t('colNote')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {IMPORT_COLUMNS.map((c) => (
                <TableRow key={c.name} className="h-11 border-[var(--orbit)]">
                  <TableCell className="px-3 font-mono text-xs text-[var(--starlight)]">{c.name}</TableCell>
                  <TableCell className="px-3 font-mono text-xs">{c.required ? t('yes') : '—'}</TableCell>
                  <TableCell className="px-3 text-xs text-[var(--text-secondary)]">{c.note || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </div>
      <Alert className="border-[var(--solar)]/30 bg-[var(--solar)]/[.06]">
        <AlertDescription className="text-[var(--solar)]">
          {t.rich('emailOrPhone', { mono })}
        </AlertDescription>
      </Alert>
      <div className="flex flex-wrap items-end gap-3">
        <Label className="flex items-center gap-2 pb-2 text-xs">
          <Checkbox checked={attach.on} onCheckedChange={(v) => onAttach({ ...attach, on: v === true })} />
          {t('attachTopic')}
        </Label>
        <div className="space-y-1">
          <Label htmlFor="imp-topic" className="text-xs">
            {t('topic')}
          </Label>
          <NativeSelect id="imp-topic" disabled={!attach.on} value={attach.topic} onChange={(e) => onAttach({ ...attach, topic: e.target.value })} className="font-mono">
            <NativeSelectOption value="">{t('chooseTopic')}</NativeSelectOption>
            {topics.map((t) => (
              <NativeSelectOption key={t.topic_key} value={t.topic_key}>
                {t.topic_key}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3 border-t border-[var(--orbit)] pt-4">
        <div className="space-y-1">
          <Label htmlFor="imp-file" className="text-xs">
            {t('chooseFile')}
          </Label>
          {/* mock: chọn file bất kỳ → chạy dry-run với fixture importPreview */}
          <Input id="imp-file" type="file" accept=".csv" className="max-w-xs" onChange={(e) => e.target.files?.length && onUpload('ok')} />
        </div>
        <Button variant="outline" onClick={() => onUpload('ok')}>
          <Upload /> {t('useSample')}
        </Button>
        <Button variant="ghost" onClick={() => onUpload('missing_column')}>
          <FileWarning /> {t('tryMissing')}
        </Button>
      </div>
    </div>
  )
}
