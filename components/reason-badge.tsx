export function ReasonBadge({ reason }: { reason: string }) {
  return (
    <span className="rounded bg-[var(--pulsar)]/10 px-1.5 py-0.5 font-mono text-[10px] text-[var(--pulsar)]">
      {reason}
    </span>
  )
}
