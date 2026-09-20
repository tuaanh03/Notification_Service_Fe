'use client'
import { Plus, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { TemplateEditorState } from '@/hooks/use-template-editor'
import { cn } from '@/lib/utils'

const TYPES = ['string', 'number', 'url', 'datetime', 'html'] as const
const HEADERS = ['Tên biến', 'Kiểu', 'Bắt buộc', 'Mặc định', 'Giá trị mẫu', 'Mô tả ngắn', '']

/** 05 §B Right pane — Variable Schema: tên từ HTML (read-only); chưa khai = dòng rose chặn lưu; thừa = amber. */
export function SchemaPane({ ed, locked }: { ed: TemplateEditorState; locked: boolean }) {
  return (
    <div className="space-y-3" data-testid="schema-pane">
      {ed.undeclared.length > 0 && (
        <Alert variant="destructive" className="border-[var(--supernova)]/40 bg-[var(--supernova)]/10" data-testid="undeclared-error">
          <AlertDescription className="space-y-1 text-[var(--supernova)]">
            {ed.undeclared.map((v) => (
              <p key={v}>
                Biến <span className="font-mono">{v}</span> dùng trong body nhưng chưa khai schema.
                <Button variant="link" size="xs" className="h-auto px-1 text-[var(--starlight)]" onClick={() => document.querySelector<HTMLElement>(`[data-token="${v}"]`)?.scrollIntoView({ block: 'center' })}>
                  → vị trí
                </Button>
              </p>
            ))}
          </AlertDescription>
        </Alert>
      )}
      <div className="overflow-x-auto">
        <Table className="text-[12px]">
          <TableHeader className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            <TableRow className="hover:bg-transparent">
              {HEADERS.map((h, i) => (
                <TableHead key={i} className="px-2">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* biến chưa khai — dòng rose ở đầu bảng, có nút khai */}
            {ed.undeclared.map((v) => (
              <TableRow key={`u-${v}`} className="h-11 border-[var(--supernova)]/40 bg-[var(--supernova)]/[.06]" data-undeclared={v}>
                <TableCell className="px-2 font-mono text-[var(--supernova)]">{v}</TableCell>
                <TableCell colSpan={5} className="px-2 text-[var(--supernova)]">chưa khai schema</TableCell>
                <TableCell className="px-2 text-right">
                  <Button variant="outline" size="xs" onClick={() => ed.declareVar(v)} disabled={locked}>
                    <Plus /> Khai báo
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {ed.schema.map((v) => {
              const unused = ed.unused.includes(v.name)
              const urlMissing = v.type === 'url' && !(v.sample ?? '').trim()
              return (
                <TableRow key={v.name} className="h-11 border-[var(--orbit)] align-top" data-var={v.name}>
                  <TableCell className="px-2 font-mono">
                    {v.name}
                    {unused && (
                      <Badge variant="outline" className="ml-1 border-[var(--solar)]/40 font-mono text-[10px] text-[var(--solar)]">thừa</Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-2">
                    <NativeSelect value={v.type} onChange={(e) => ed.updateVar(v.name, { type: e.target.value as (typeof TYPES)[number] })} className="h-7 font-mono text-xs" disabled={locked} aria-label={`Kiểu ${v.name}`}>
                      {TYPES.map((t) => (
                        <NativeSelectOption key={t} value={t}>{t}</NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </TableCell>
                  <TableCell className="px-2">
                    <Switch checked={v.required} onCheckedChange={(c) => ed.updateVar(v.name, { required: c })} disabled={locked} aria-label={`Bắt buộc ${v.name}`} />
                  </TableCell>
                  <TableCell className="px-2">
                    <Input value={v.defaultValue ?? ''} onChange={(e) => ed.updateVar(v.name, { defaultValue: e.target.value })} className="h-7 font-mono text-xs" disabled={locked} aria-label={`Mặc định ${v.name}`} />
                  </TableCell>
                  <TableCell className="px-2">
                    <Input
                      value={v.sample ?? ''}
                      onChange={(e) => ed.updateVar(v.name, { sample: e.target.value })}
                      className={cn('h-7 font-mono text-xs', urlMissing && 'border-[var(--supernova)]')}
                      aria-invalid={urlMissing}
                      placeholder={v.type === 'url' ? 'bắt buộc để preview' : ed.values[v.name]}
                      disabled={locked}
                      aria-label={`Giá trị mẫu ${v.name}`}
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <Input value={v.description ?? ''} onChange={(e) => ed.updateVar(v.name, { description: e.target.value })} className="h-7 text-xs" disabled={locked} aria-label={`Mô tả ${v.name}`} />
                  </TableCell>
                  <TableCell className="px-2 text-right">
                    {unused && (
                      <Button variant="ghost" size="icon-xs" aria-label={`Xoá ${v.name}`} onClick={() => ed.removeVar(v.name)} disabled={locked}>
                        <Trash2 />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {ed.htmlVars.length > 0 && (
        <Alert variant="destructive" className="border-[var(--supernova)]/40 bg-[var(--supernova)]/10" data-testid="html-warning">
          <AlertDescription className="text-[var(--supernova)]">
            Biến kiểu <span className="font-mono">html</span> chèn thô, cần Super Admin duyệt: <span className="font-mono">{ed.htmlVars.join(', ')}</span>.
          </AlertDescription>
        </Alert>
      )}
      {ed.urlMissingSample.length > 0 && (
        <p className="text-xs text-[var(--supernova)]">
          <span className="font-mono">type: url</span> cần Giá trị mẫu để preview: <span className="font-mono">{ed.urlMissingSample.join(', ')}</span>.
        </p>
      )}
      <p className="text-xs text-[var(--text-muted)]">Mọi kiểu khác <span className="font-mono">html</span> được escape như data, không phải markup.</p>
    </div>
  )
}
