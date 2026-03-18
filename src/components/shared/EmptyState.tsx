import { useAppStore } from '../../store/useAppStore'

interface EmptyStateProps {
  onUpload: () => void
}

export function EmptyState({ onUpload }: EmptyStateProps) {
  const loadSampleData = useAppStore((s) => s.loadSampleData)
  const isLoading = useAppStore((s) => s.isLoading)

  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25 dark:shadow-blue-500/10">
        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">No data loaded</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-8 leading-relaxed">
        Upload a GitHub Copilot metrics export (NDJSON or CSV) to start analyzing usage, cost, and adoption.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onUpload}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-violet-700 transition-all shadow-sm shadow-blue-500/20"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload data
        </button>
        <button
          onClick={loadSampleData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a3.75 3.75 0 01-5.303 0l-.347-.347z" />
          </svg>
          {isLoading ? 'Loading…' : 'Load sample data'}
        </button>
      </div>
      <div className="mt-10 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50 max-w-md text-left">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Supported formats</p>
        <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <li><span className="font-mono bg-white dark:bg-slate-700 px-1 rounded border border-slate-200 dark:border-slate-600">.ndjson</span> — GitHub Copilot Metrics API export</li>
          <li><span className="font-mono bg-white dark:bg-slate-700 px-1 rounded border border-slate-200 dark:border-slate-600">.jsonl</span> — NDJSON alias</li>
          <li><span className="font-mono bg-white dark:bg-slate-700 px-1 rounded border border-slate-200 dark:border-slate-600">.csv</span> — Community export action format</li>
        </ul>
      </div>
    </div>
  )
}
