import type { ReactNode } from 'react'

/* ============================================================
   SatQuery AI — Shared UI primitives (Midnight / Glass theme)
   ============================================================ */

/* ── Card ──────────────────────────────────────────────────── */

interface CardProps {
  children: ReactNode
  className?: string
  glow?: 'blue' | 'violet' | 'cyan' | 'none'
}

export function Card({ children, className = '', glow = 'none' }: CardProps) {
  const glowClass =
    glow === 'blue'   ? 'shadow-[0_0_40px_-8px_rgba(59,130,246,0.35)]' :
    glow === 'violet' ? 'shadow-[0_0_40px_-8px_rgba(139,92,246,0.35)]' :
    glow === 'cyan'   ? 'shadow-[0_0_40px_-8px_rgba(34,211,238,0.30)]' :
    'shadow-[0_4px_24px_rgba(0,0,0,0.50)]'

  return (
    <div className={`glass-card p-5 ${glowClass} ${className}`}>
      {children}
    </div>
  )
}

/* ── Button ─────────────────────────────────────────────────── */

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

export function Button({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  type = 'button',
  className = '',
}: ButtonProps) {
  const variantClass =
    variant === 'primary'   ? 'glass-btn glass-btn-primary' :
    variant === 'secondary' ? 'glass-btn glass-btn-secondary' :
                              'glass-btn glass-btn-ghost'

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${variantClass} ${className}`}
    >
      {children}
    </button>
  )
}

/* ── StepBadge ──────────────────────────────────────────────── */

interface StepBadgeProps {
  label: string
  index: number
  active: boolean
  complete: boolean
}

export function StepBadge({ label, active, complete }: StepBadgeProps) {
  const base = 'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-300'

  if (complete) {
    return (
      <span className={`${base} bg-[rgba(16,185,129,0.15)] text-[#10b981] border border-[rgba(16,185,129,0.30)]`}>
        <span className="text-[10px]">✓</span> {label}
      </span>
    )
  }

  if (active) {
    return (
      <span className={`${base} bg-[rgba(59,130,246,0.18)] text-[#3b82f6] border border-[rgba(59,130,246,0.40)] shadow-[0_0_16px_-4px_rgba(59,130,246,0.60)]`}>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3b82f6] animate-pulse" />
        {label}
      </span>
    )
  }

  return (
    <span className={`${base} bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.35)] border border-[rgba(255,255,255,0.08)]`}>
      {label}
    </span>
  )
}

/* ── Badge / Pill ───────────────────────────────────────────── */

interface BadgeProps {
  children: ReactNode
  color?: 'blue' | 'violet' | 'cyan' | 'green' | 'amber' | 'red' | 'muted'
  className?: string
}

export function Badge({ children, color = 'blue', className = '' }: BadgeProps) {
  const colorClass =
    color === 'blue'   ? 'bg-[rgba(59,130,246,0.15)] text-[#3b82f6] border-[rgba(59,130,246,0.30)]' :
    color === 'violet' ? 'bg-[rgba(139,92,246,0.15)] text-[#8b5cf6] border-[rgba(139,92,246,0.30)]' :
    color === 'cyan'   ? 'bg-[rgba(34,211,238,0.15)] text-[#22d3ee] border-[rgba(34,211,238,0.30)]' :
    color === 'green'  ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981] border-[rgba(16,185,129,0.30)]' :
    color === 'amber'  ? 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b] border-[rgba(245,158,11,0.30)]' :
    color === 'red'    ? 'bg-[rgba(248,113,113,0.15)] text-[#f87171] border-[rgba(248,113,113,0.30)]' :
                         'bg-[rgba(255,255,255,0.07)] text-[rgba(255,255,255,0.55)] border-[rgba(255,255,255,0.12)]'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${colorClass} ${className}`}>
      {children}
    </span>
  )
}