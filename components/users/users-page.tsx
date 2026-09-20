'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { users } from '@/lib/mock-data'
import { AddUserDialog } from './add-user-dialog'
import { UsersTable } from './users-table'

/** UC-002 §A — bảng user (con người); layout chuẩn SaaS hiện đại. */
export function UsersPage() {
  const [adding, setAdding] = useState(false)

  return (
    <div className="space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Người nhận</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Danh sách người nhận và điểm nhận tin trong hệ thống
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1 sm:pt-0">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs" render={<Link href="/users/import" />}>
            <Upload className="size-3.5" /> Import CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-lg text-xs"
            onClick={() => toast.success('Đang xuất CSV', { description: `${users.length} người nhận` })}
          >
            <Download className="size-3.5" /> Xuất CSV
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 rounded-lg text-xs font-medium shadow-xs"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-3.5" /> Thêm user
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <UsersTable />

      <AddUserDialog open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}
