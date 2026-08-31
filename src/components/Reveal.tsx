import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

interface RevealProps {
  children: ReactNode
  /** Stagger delay in ms (applied only when motion is allowed). */
  delay?: number
  className?: string
  as?: 'div' | 'section' | 'li' | 'article'
}

/**
 * Lightweight, dependency-free scroll-reveal wrapper.
 * Fades + rises content into view once it enters the viewport.
 * Automatically rendered fully visible when `prefers-reduced-motion: reduce`.
 */
export default function Reveal({ children, delay = 0, className = '', as = 'div' }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)
  const Tag = as

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true)
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            io.disconnect()
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref as never}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: visibilityDelay(delay, visible) } : undefined}
    >
      {children}
    </Tag>
  )
}

/** Only apply the stagger delay once the element is actually animating in. */
function visibilityDelay(delay: number, visible: boolean): string {
  return visible ? `${delay}ms` : '0ms'
}