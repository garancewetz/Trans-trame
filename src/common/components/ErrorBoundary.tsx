import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

type State = {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-md rounded-lg border border-red-500/20 bg-red-950/30 p-6 text-center">
            <h2 className="mb-2 text-lg font-semibold text-red-400">
              Une erreur est survenue
            </h2>
            <p className="mb-4 text-sm text-white/60">
              {this.state.error.message}
            </p>
            <button
              className="rounded-md bg-red-500/20 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/30"
              onClick={() => this.setState({ error: null })}
            >
              Réessayer
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
