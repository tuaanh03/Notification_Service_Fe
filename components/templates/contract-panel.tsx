import { CodeBlock } from '@/components/code-block'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { contractErrors, contractPayloadFor, type Template, type VariableSchemaEntry } from '@/lib/mock-data'

/** 05 §E — Hợp đồng biến cho developer: required_vars + payload mẫu + lỗi thường gặp. Dùng ở editor và tab Template của topic. */
export function ContractPanel({ template, topicKey, schema }: { template: Template; topicKey: string; schema: VariableSchemaEntry[] }) {
  const required = schema.filter((v) => v.required).map((v) => v.name)
  return (
    <div className="space-y-3" data-testid="contract-panel">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">required_vars</span>
        {required.length === 0 && <span className="text-xs text-[var(--text-muted)]">— không có</span>}
        {required.map((v) => (
          <Badge key={v} variant="outline" className="border-[var(--starlight)]/40 font-mono text-[10px] text-[var(--starlight)]">{v}</Badge>
        ))}
      </div>
      <Tabs defaultValue="payload">
        <TabsList variant="line" className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="payload">Payload mẫu</TabsTrigger>
          <TabsTrigger value="errors">Lỗi thường gặp</TabsTrigger>
        </TabsList>
        <TabsContent value="payload" className="min-w-0">
          <CodeBlock language="http" value={contractPayloadFor(template, topicKey, schema)} />
        </TabsContent>
        <TabsContent value="errors" className="min-w-0 space-y-2">
          {contractErrors(schema).map((e) => (
            <div key={e.code} className="rounded-lg border border-[var(--orbit)] p-2">
              <p className="font-mono text-xs text-[var(--supernova)]">{e.code}</p>
              <pre className="mt-1 overflow-x-auto font-mono text-[11px] text-[var(--text-secondary)]">{e.body}</pre>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
