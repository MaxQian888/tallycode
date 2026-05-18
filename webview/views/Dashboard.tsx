import {
  Camera,
  Download,
  GitCompare,
  History,
  Loader2,
  Play,
  RefreshCw,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Toaster } from '@/components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReport } from '@/hooks/useReport';
import { useTheme } from '@/hooks/useTheme';
import { useToastNotifications } from '@/hooks/useToastNotifications';
import { useVscodeMessage } from '@/hooks/useVscodeMessage';
import { exportPng } from '@/utils/exportPng';
import { vscode } from '@/utils/vscode';

import { DiffView } from './DiffView';
import { DirectoryTree } from './DirectoryTree';
import { FileTable } from './FileTable';
import { LanguageBreakdown } from './LanguageBreakdown';
import { LanguageTable } from './LanguageTable';
import { SummaryCards } from './SummaryCards';

import type { ExportFormat, HighlightTarget } from '@shared/messages';

interface InitialReportInjection {
  __TALLYCODE_REPORT__?: unknown;
}

const TAB_FOR_TARGET: Partial<Record<HighlightTarget, string>> = {
  languages: 'languages',
  directories: 'directories',
  files: 'files',
  baseline: 'diff',
};

export function Dashboard() {
  const state = useReport();
  const theme = useTheme();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<string>('languages');
  useToastNotifications();

  // Standalone HTML export injects the report on window — surface it to the
  // hook by re-dispatching a synthetic message.
  useEffect(() => {
    const w = window as unknown as InitialReportInjection;
    if (w.__TALLYCODE_REPORT__ && !state.report) {
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'scan/done', report: w.__TALLYCODE_REPORT__ },
      }));
    }
    // run once
  }, []);

  // Activity Bar tree nodes navigate here via the view/highlight message.
  useVscodeMessage('view/highlight', useCallback((m) => {
    const tab = TAB_FOR_TARGET[m.target];
    if (tab)
      setActiveTab(tab);
  }, []));

  const onScanWorkspace = (): void => {
    vscode.postMessage({ type: 'scan/start', scope: 'workspace' });
  };
  const onRefresh = (): void => {
    vscode.postMessage({ type: 'scan/refresh' });
  };
  const onSaveBaseline = (): void => {
    vscode.postMessage({ type: 'baseline/save' });
  };
  const onExportFormat = (format: ExportFormat): void => {
    vscode.postMessage({ type: 'export/format', format });
  };
  const onExportPng = (): void => {
    if (!dashboardRef.current)
      return;
    void exportPng(dashboardRef.current, `tallycode-${Date.now()}.png`, theme);
  };

  return (
    <main className="flex min-h-screen flex-col gap-4 p-4">
      <Toaster position="bottom-right" richColors />
      <header className="flex items-center gap-2">
        <div className="size-2 rounded-full bg-emerald-400" />
        <h1 className="text-lg font-semibold">TallyCode</h1>
        {state.report?.scope && (
          <Badge variant="outline" className="font-mono">{state.report.scope}</Badge>
        )}
        {state.staleCount > 0 && state.report && (
          <Badge variant="secondary" className="gap-1">
            {state.staleCount}
            {' '}
            changed since last scan
          </Badge>
        )}
        <div className="ml-auto flex flex-wrap gap-1.5">
          {state.report && (
            <Button
              size="sm"
              variant={state.staleCount > 0 ? 'default' : 'outline'}
              onClick={onRefresh}
              disabled={!!state.progress}
            >
              <RefreshCw className="mr-1 size-3.5" />
              Refresh
            </Button>
          )}
          <Button
            size="sm"
            variant={state.report ? 'outline' : 'default'}
            onClick={onScanWorkspace}
            disabled={!!state.progress}
          >
            {state.progress
              ? <Loader2 className="mr-1 size-3.5 animate-spin" />
              : <Play className="mr-1 size-3.5" />}
            Scan workspace
          </Button>
          <Button size="sm" variant="outline" onClick={onSaveBaseline} disabled={!state.report}>
            <History className="mr-1 size-3.5" />
            Save baseline
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={!state.report}>
                <Download className="mr-1 size-3.5" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExportFormat('md')}>Markdown</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportFormat('csv')}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportFormat('json')}>JSON</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportFormat('html')}>HTML (offline)</DropdownMenuItem>
              <DropdownMenuItem onClick={onExportPng}>
                <Camera className="mr-1 size-3.5" />
                PNG screenshot
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {state.progress && (
        <div className="space-y-1">
          <Progress value={state.progress.processed} max={state.progress.total} />
          <p className="text-xs text-muted-foreground">
            Scanning
            {' '}
            {state.progress.processed.toLocaleString('en-US')}
            {' '}
            /
            {' '}
            {state.progress.total.toLocaleString('en-US')}
            {state.progress.currentFile && (
              <span className="ml-2 truncate font-mono">
                ·
                {' '}
                {state.progress.currentFile}
              </span>
            )}
          </p>
        </div>
      )}

      {state.error && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">
          {state.error}
        </div>
      )}

      {!state.report && !state.progress && (
        <EmptyState onScan={onScanWorkspace} />
      )}

      {state.report && (
        <div ref={dashboardRef} className="space-y-4 rounded-lg bg-background p-1">
          <SummaryCards report={state.report} />
          <LanguageBreakdown report={state.report} />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="languages">By language</TabsTrigger>
              <TabsTrigger value="directories">Directory tree</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="diff" disabled={!state.diff}>
                <GitCompare className="mr-1 size-3.5" />
                Diff vs baseline
              </TabsTrigger>
            </TabsList>
            <TabsContent value="languages" className="mt-3">
              <div className="rounded-md border">
                <LanguageTable report={state.report} />
              </div>
            </TabsContent>
            <TabsContent value="directories" className="mt-3">
              <DirectoryTree report={state.report} />
            </TabsContent>
            <TabsContent value="files" className="mt-3">
              <FileTable report={state.report} />
            </TabsContent>
            <TabsContent value="diff" className="mt-3">
              {state.diff
                ? <DiffView diff={state.diff} />
                : <div className="text-sm text-muted-foreground">No baseline saved yet.</div>}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </main>
  );
}

function EmptyState({ onScan }: { onScan: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <RefreshCw className="size-8 text-muted-foreground" />
      <div>
        <h2 className="text-base font-semibold">Run your first scan</h2>
        <p className="text-sm text-muted-foreground">
          Count every code, comment, and blank line in this workspace. Test files are split out automatically.
        </p>
      </div>
      <Button onClick={onScan}>
        <Play className="mr-1 size-3.5" />
        Scan workspace
      </Button>
    </div>
  );
}
