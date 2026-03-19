import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("React render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-text-primary">
          <h1 className="text-xl font-bold text-red-400">页面渲染出错</h1>
          <pre className="max-w-2xl overflow-auto rounded-2xl border border-stroke bg-bg-secondary p-4 text-sm text-red-300">
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
          <button
            className="rounded-full bg-accent-blue px-6 py-2 text-sm font-medium text-white"
            onClick={() => {
              this.setState({ error: null });
              window.location.hash = "";
              window.location.reload();
            }}
          >
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
