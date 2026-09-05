import { useEffect, useState } from 'react'

/**
 * Tracks the user's `prefers-reduced-motion` OS/browser setting so
 * decorative animations (ambient backdrop, marker pulses, etc.) can be
 * disabled for people who've asked for less motion.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return reduced
}
