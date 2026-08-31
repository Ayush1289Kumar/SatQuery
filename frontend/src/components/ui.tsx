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
    'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition enabled:cursor-pointer disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/60'
  const styles = {
    primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
    secondary: 'bg-white text-primary ring-1 ring-slate-300 hover:bg-primary-50',
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
    <div className={`rounded-xl bg-white shadow-sm ring-1 ring-slate-200 p-6 ${className}`}>
      {children}
    </div>
  )
}

export function StepBadge({ label, index, active, complete }: { label: string; index: number; active: boolean; complete: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${active ? 'text-primary' : complete ? 'text-success' : 'text-slate-400'}`}>
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
          active ? 'bg-primary text-white' : complete ? 'bg-green-100 text-success' : 'bg-slate-200 text-slate-400'
        }`}
      >
        {complete ? '✓' : index + 1}
      </span>
      <span className="font-medium">{label}</span>
    </div>
  )
}