import React from 'react';

export class ErrorBoundary extends React.Component<any, { error: any, errorInfo: any }> {
  state: { error: any, errorInfo: any } = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: any) {
    return { error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ background: '#800', color: 'white', padding: '20px', height: '100%', overflow: 'auto' }}>
          <h2>React crashed</h2>
          <pre>{this.state.error && this.state.error.toString()}</pre>
          <pre>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
