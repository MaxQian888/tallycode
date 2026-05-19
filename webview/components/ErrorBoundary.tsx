import i18n from 'i18next';
import { Component } from 'react';

import { getVscodeApi } from '@/hooks/useVscodeApi';

import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    getVscodeApi().postMessage({
      type: 'webview/error',
      error: { name: error.name, message: error.message, stack: error.stack },
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Class component — can't use useTranslation hook. Read directly from
      // the i18n singleton instead; the error path is rare enough that not
      // reactively re-rendering on language change is acceptable.
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6">
          <h1 className="text-xl font-semibold">{i18n.t('errorBoundary.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {this.state.error?.message ?? i18n.t('errorBoundary.unknown')}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
