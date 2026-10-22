import { cn } from '@/lib/utils'

/** Glass surface duy nhất của app (`.cosmic-surface` trong globals.css). Forward mọi prop của <section>. */
export function Panel({
  children,
  className,
  glow = false,
  ring = false,
  ...props
}: React.ComponentProps<'section'> & {
  glow?: boolean
  ring?: boolean
}) {
  return (
    <section
      className={cn(
        'cosmic-surface rounded-xl',
        glow && 'shadow-[var(--glow-panel)]',
        ring && 'orbit-ring relative',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  )
}
