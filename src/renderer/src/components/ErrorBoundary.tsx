import { Component, ReactNode } from 'react';

export class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#333', color: '#fff', height: '100vh', overflow: 'auto' }}>
          <h2>Algo deu errado (App Crash)</h2>
          <pre style={{ color: '#ff6b6b' }}>{this.state.error?.toString()}</pre>
          <pre style={{ fontSize: '12px', marginTop: '10px', whiteSpace: 'pre-wrap' }}>{this.state.error?.stack}</pre>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', marginTop: '16px', background: '#4ecdc4', color: '#1a1a2e', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Recarregar</button>
        </div>
      );
    }
    return this.props.children;
  }
}
