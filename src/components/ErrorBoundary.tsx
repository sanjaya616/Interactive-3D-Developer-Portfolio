import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unexpected application error.',
    };
  }

  componentDidCatch(error: unknown): void {
    console.error('Application ErrorBoundary caught:', error);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center p-6 text-[#26211E]">
          <div className="max-w-md w-full bg-[#F5E9D4] border-2 border-[#26211E] rounded-2xl p-6 shadow-[0_6px_0_#26211E]">
            <div className="flex items-center gap-2 text-[#E65448] font-extrabold text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>SOMETHING WENT WRONG</span>
            </div>
            <h1 className="font-display text-4xl font-bold mt-1">SANJAYA&apos;S WORLD</h1>
            <p className="mt-2 text-sm font-semibold text-[#61564E]">
              We hit an unexpected issue while syncing data. Your local guest progress remains safe.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EC6D2C] text-[#FFF9F0] border-2 border-[#26211E] text-sm font-extrabold cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload Page</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
