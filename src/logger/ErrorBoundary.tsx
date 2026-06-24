import { Component, type ReactNode, type ErrorInfo } from 'react'
import { log } from '.'

interface Props { children: ReactNode }
interface State { crashed: boolean; error: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false, error: '' }

  componentDidCatch(error: Error, info: ErrorInfo) {
    log.error('React render error', {
      message: error.message,
      stack: info.componentStack ?? '',
    })
    this.setState({ crashed: true, error: error.message })
  }

  render() {
    if (this.state.crashed) {
      return (
        <div style={s.container}>
          <h2 style={s.title}>Something crashed</h2>
          <pre style={s.pre}>{this.state.error}</pre>
          <button style={s.btn} onClick={() => this.setState({ crashed: false, error: '' })}>
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const s: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: '#0d1117', color: '#f85149', fontFamily: 'monospace', padding: '2rem',
  },
  title: { marginBottom: '1rem' },
  pre: { color: '#8b949e', fontSize: '0.85rem', whiteSpace: 'pre-wrap', maxWidth: '600px' },
  btn: {
    marginTop: '1.5rem', background: '#21262d', color: '#e6edf3',
    border: '1px solid #30363d', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer',
  },
}
