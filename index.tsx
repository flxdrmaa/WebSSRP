import React, { Component, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';

// Error Boundary to catch crashes
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#18181b', color: '#ef4444', height: '100vh', fontFamily: 'monospace' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Application Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#000', padding: '1rem', borderRadius: '0.5rem' }}>
            {this.state.error?.message}
          </pre>
          <p style={{ marginTop: '1rem', color: '#a1a1aa' }}>Check the console for more details.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);