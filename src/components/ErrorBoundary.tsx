import React from 'react'

interface State { error: Error | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        height: '100vh',
        background: '#0f1117',
        color: '#e2e8f0',
        fontFamily: 'system-ui, sans-serif',
        gap: 16,
        padding: 32,
      }}>
        <div style={{ fontSize: 32, color: '#f87171' }}>⚠</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Something went wrong</div>
        <pre style={{
          fontSize: 12,
          color: '#94a3b8',
          background: '#1a1d27',
          padding: '12px 16px',
          borderRadius: 8,
          maxWidth: 600,
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {error.message}
        </pre>
        <button
          onClick={() => this.setState({ error: null })}
          style={{
            padding: '8px 20px',
            background: '#5b6af0',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Try again
        </button>
      </div>
    )
  }
}
