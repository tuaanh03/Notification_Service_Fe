'use client'
import { Plus, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { TemplateEditorState } from '@/hooks/use-template-editor'

const HEADERS = ['Tên biến', 'Bắt buộc', 'Giá trị mẫu (chỉ để xem thử)', 'Mô tả cho đội app', '']

/**
 * Bảng biến của bản đang soạn — sao đúng `VariableSpec` của backend: tên đầy đủ, bắt buộc, mẫu, mô tả.
 * Không có cột "Kiểu" (backend không có) và "Mặc định" (mặc định viết ngay trong nội dung bằng `| default:`).
 * Tên biến lấy từ nội dung, không gõ tay: dùng trong nội dung mà chưa khai thì hiện dòng đỏ có nút Khai báo.
 */
export function SchemaPane({ ed, locked }: { ed: TemplateEditorState; locked: boolean }) {
  return (
    <div className="space-y-3" data-testid="schema-pane">
      {ed.missingSource.length > 0 && (
        <Alert variant="destructive" className="bg-[var(--supernova)]/10" data-testid="missing-source">
          <AlertDescription className="text-[var(--supernova)]">
            Biến thiếu nguồn: <span className="font-mono">{ed.missingSource.map((v) => `{{ ${v} }}`).join(' ')}</span>. Viết{' '}
            <span className="font-mono">{'{{ payload.<tên> }}'}</span> cho dữ liệu app gửi, hoặc{' '}
            <span className="font-mono">{'{{ user.external_id }}'}</span> cho mã người nhận — không thì không xuất bản được.
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
            {ed.undeclared.map((v) => (
              <TableRow key={`u-${v}`} className="h-11 bg-[var(--supernova)]/[.06]" data-undeclared={v}>
                <TableCell className="px-2 font-mono text-[var(--supernova)]">{v}</TableCell>
                <TableCell colSpan={3} className="px-2 text-[var(--supernova)]">dùng trong nội dung nhưng chưa khai</TableCell>
                <TableCell className="px-2 text-right">
                  <Button variant="outline" size="xs" onClick={() => ed.declareVar(v)} disabled={locked}>
                    <Plus /> Khai báo
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
                      <Badge variant="outline" className="ml-1 font-mono text-[10px] text-[var(--solar)]">không dùng</Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-2">
                    <Switch
                      checked={v.required}
                      onCheckedChange={(c) => ed.updateVar(v.name, { required: c })}
                      disabled={locked || v.source === 'user'}
                      aria-label={`Bắt buộc ${v.name}`}
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <Input
                      value={v.sample ?? ''}
                      onChange={(e) => ed.updateVar(v.name, { sample: e.target.value || undefined })}
                      className="h-7 font-mono text-xs"
                      disabled={locked}
                      aria-label={`Giá trị mẫu ${v.name}`}
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <Input
                      value={v.description ?? ''}
                      onChange={(e) => ed.updateVar(v.name, { description: e.target.value || undefined })}
                      className="h-7 text-xs"
                      disabled={locked}
                      aria-label={`Mô tả ${v.name}`}
                    />
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
            {ed.variables.length === 0 && ed.undeclared.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="px-2 py-4 text-center text-xs text-[var(--text-muted)]">
                  Chưa có biến. Gõ <span className="font-mono">{'{{ payload.<tên> }}'}</span> vào tiêu đề hoặc nội dung rồi bấm Khai báo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Biến không bắt buộc phải có giá trị mặc định viết ngay trong nội dung:{' '}
        <span className="font-mono">{'{{ payload.owner | default: "chưa rõ" }}'}</span>. Giá trị đổ vào HTML luôn được escape —
        dữ liệu của app hiện ra như chữ, không thành thẻ HTML.
      </p>
    </div>
  )
}
