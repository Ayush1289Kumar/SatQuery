import type { ReactNode } from 'react'

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  className = '',
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition duration-150 ease-out enabled:cursor-pointer enabled:active:scale-[0.98] disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/60'
  const styles = {
    primary: 'bg-primary text-white shadow-card hover:bg-primary-dark focus:ring-primary',
    secondary: 'bg-surface-50 text-primary ring-1 ring-edge hover:bg-primary-50',
    ghost: 'text-primary hover:bg-primary-50',
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-card bg-surface-50 shadow-card ring-1 ring-edge p-6 ${className}`}>
      {children}
    </div>
  )
}

export function StepBadge({ label, index, active, complete }: { label: string; index: number; active: boolean; complete: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${active ? 'text-primary' : complete ? 'text-success' : 'text-ink-500'}`}>
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors duration-150 ${
          active ? 'bg-primary text-white' : complete ? 'bg-success/15 text-success' : 'bg-edge text-ink-500'
        }`}
      >
        {complete ? '✓' : index + 1}
      </span>
      <span className="font-medium">{label}</span>
    </div>
  )
}