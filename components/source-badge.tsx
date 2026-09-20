export function SourceBadge({ source }: { source: string }) {
  return (
    <span className="rounded border border-[var(--orbit)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
      {source}
    </span>
  )
}
