import { Component, type ReactNode } from 'react'
import { remove } from '@/services/persistence'

/** Last-resort screen if rendering throws, e.g. after hand-edited local data. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-dvh place-items-center bg-bg p-6 text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-semibold text-ink">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted">The saved demo data may be damaged. Restoring the sample data usually fixes this.</p>
          <pre className="mt-4 overflow-auto rounded-lg bg-surface-3 p-3 text-left text-xs text-muted">{this.state.error.message}</pre>
          <button
            className="mt-5 h-9 rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-ink"
            onClick={() => {
              remove('data')
              location.assign('/learn')
            }}
          >
            Restore sample data
          </button>
        </div>
      </div>
    )
  }
}
