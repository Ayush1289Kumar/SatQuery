import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Catches JavaScript errors anywhere in the child component tree, logs them,
 * and renders a graceful fallback UI instead of crashing the whole app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console in development; in production you'd send this to a monitoring service
    if ((import.meta as any).env?.DEV) {
      console.error('ErrorBoundary caught an error:', error, info)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }

      return (
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-4 rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(0,0,0,0.30)] p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(255,99,99,0.30)] bg-[rgba(255,99,99,0.10)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13M12 17H12.01M5.07 19H18.93C20.17 19 21.14 17.92 20.95 16.69C20.82 15.82 20.35 14.99 19.64 14.41C19.24 14.08 18.75 13.85 18.2 13.73C18.25 13.45 18.33 12.74 18.33 12C18.33 10.34 17.05 9 15.5 9C15.37 7.61 14.61 6.29 13.42 5.47C12.63 4.9 11.7 4.62 10.74 4.67C8.98 4.77 7.52 6.2 7.75 8C7.93 9.45 9.05 10.71 10.5 10.71H11C11.55 10.71 12 11.16 12 11.71V13M12 17C12.55 17 13 17.45 13 18C13 18.55 12.55 19 12 19C11.45 19 11 18.55 11 18C11 17.45 11.45 17 12 17Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">Something went wrong</h3>
          <p className="max-w-sm text-sm text-[rgba(255,255,255,0.60)]">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={this.handleReset}
            className="rounded-full bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-black transition-all duration-200 hover:brightness-110"
          >
            Try again
          </button>
        </div>
      )
    }

    return <>{this.props.children}</>
  }
}
