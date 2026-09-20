'use client'

import { useState } from 'react'
import { Plus, Trash2, Tag, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { tagsOf, type UserTag } from '@/lib/mock-data'

interface Props {
  userId: string
  onTagsCountChange?: (count: number) => void
}

export function DataTagsPanel({ userId, onTagsCountChange }: Props) {
  const [tags, setTags] = useState<UserTag[]>(() => tagsOf(userId))
  const [isAdding, setIsAdding] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newType, setNewType] = useState<'string' | 'number' | 'boolean'>('string')

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKey.trim() || !newValue.trim()) {
      toast.error('Vui lòng nhập cả Tag key và Value')
      return
    }

    const createdTag: UserTag = {
      id: `ut-${Date.now()}`,
      user_id: userId,
      key: newKey.trim(),
      value: newValue.trim(),
      type: newType,
      updated_at: new Date().toISOString().slice(0, 10),
    }

    setTags((prev) => {
      const updated = [createdTag, ...prev.filter((t) => t.key !== createdTag.key)]
      onTagsCountChange?.(updated.length)
      return updated
    })

    toast.success(`Đã thêm tag "${createdTag.key}"`)
    setNewKey('')
    setNewValue('')
    setIsAdding(false)
  }

  const handleDeleteTag = (tagId: string, tagKey: string) => {
    setTags((prev) => {
      const updated = prev.filter((t) => t.id !== tagId)
      onTagsCountChange?.(updated.length)
      return updated
    })
    toast.success(`Đã xóa tag "${tagKey}"`)
  }

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-foreground">User Data Tags</h3>
          <p className="text-xs text-muted-foreground">
            Các thuộc tính tuỳ chỉnh dùng để lọc người nhận theo phân khúc động (Topic Segment).
          </p>
        </div>

        {!isAdding && (
          <Button
            size="sm"
            onClick={() => setIsAdding(true)}
            className="gap-1.5"
          >
            <Plus className="size-3.5" />
            <span>Thêm tag</span>
          </Button>
        )}
      </div>

      {/* Form Thêm tag mới */}
      {isAdding && (
        <form
          onSubmit={handleAddTag}
          className="rounded-lg border border-border/80 bg-slate-50/50 dark:bg-muted/20 p-4 space-y-3"
        >
          <div className="text-xs font-semibold text-foreground">Thêm thuộc tính mới</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Tag Key</label>
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="e.g. role, tier, vip"
                className="h-8 text-xs font-mono"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Kiểu dữ liệu</label>
              <NativeSelect
                value={newType}
                onChange={(e) =>
                  setNewType(e.target.value as 'string' | 'number' | 'boolean')
                }
                className="h-8 text-xs font-mono"
              >
                <option value="string">string (văn bản)</option>
                <option value="number">number (số)</option>
                <option value="boolean">boolean (true/false)</option>
              </NativeSelect>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Giá trị</label>
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="e.g. devops, 5, true"
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              className="gap-1"
            >
              <Check className="size-3" />
              <span>Lưu tag</span>
            </Button>
          </div>
        </form>
      )}

      {/* Bảng danh sách Data tags */}
      <div className="rounded-lg border border-border/70 overflow-hidden bg-background">
        <Table className="text-xs">
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-48 font-semibold text-foreground">Tag Key</TableHead>
              <TableHead className="font-semibold text-foreground">Value</TableHead>
              <TableHead className="w-28 font-semibold text-foreground">Type</TableHead>
              <TableHead className="w-36 font-semibold text-foreground">Cập nhật</TableHead>
              <TableHead className="w-16 text-right font-semibold text-foreground">Xóa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Tag className="size-5 text-muted-foreground/60" />
                    <span>Chưa có data tag nào cho người dùng này.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tags.map((tag) => (
                <TableRow key={tag.id} className="hover:bg-muted/20">
                  <TableCell className="font-mono font-semibold text-[var(--starlight)]">
                    {tag.key}
                  </TableCell>
                  <TableCell className="font-mono text-foreground font-medium">
                    {tag.value}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                      {tag.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-[11px]">
                    {tag.updated_at}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDeleteTag(tag.id, tag.key)}
                      title="Xóa tag"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
