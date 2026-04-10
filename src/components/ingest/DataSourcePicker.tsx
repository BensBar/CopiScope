import { useRef, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { ApiConnector } from './ApiConnector'

type PickerView = 'menu' | 'api'

export function DataSourcePicker() {
  const loadFile = useAppStore((s) => s.loadFile)
  const loadSampleData = useAppStore((s) => s.loadSampleData)
  const isLoading = useAppStore((s) => s.isLoading)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [view, setView] = useState<PickerView>('menu')

  if (view === 'api') {
    return (
      <div className="flex flex-col items-center py-16 px-8">
        <button
          onClick={() => setView('menu')}
          className="mb-6 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <ApiConnector />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25 dark:shadow-blue-500/10">
        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">Get Started</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-10 leading-relaxed">
        Choose how you'd like to load your GitHub Copilot data into CopiScope.
      </p>

      {/* Cards */}
      <div className="grid sm:grid-cols-3 gap-4 max-w-2xl w-full">
        {/* Upload File */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="group flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/40 hover:-translate-y-0.5 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-white">Upload File</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">NDJSON, JSONL, or CSV</span>
        </button>

        {/* Connect API */}
        <button
          onClick={() => setView('api')}
          className="group flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-white">Connect API</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">GitHub Enterprise</span>
        </button>

        {/* Sample Data */}
        <button
          onClick={loadSampleData}
          disabled={isLoading}
          className="group flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50"
        >
          <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a3.75 3.75 0 01-5.303 0l-.347-.347z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-white">
            {isLoading ? 'Loading…' : 'Sample Data'}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">Try it instantly</span>
        </button>
      </div>

      {/* Supported formats */}
      <div className="mt-10 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50 max-w-md text-left">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Supported formats</p>
        <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <li><span className="font-mono bg-white dark:bg-slate-700 px-1 rounded border border-slate-200 dark:border-slate-600">.ndjson</span> — GitHub Copilot Metrics API export</li>
          <li><span className="font-mono bg-white dark:bg-slate-700 px-1 rounded border border-slate-200 dark:border-slate-600">.jsonl</span> — NDJSON alias</li>
          <li><span className="font-mono bg-white dark:bg-slate-700 px-1 rounded border border-slate-200 dark:border-slate-600">.csv</span> — Community export action format</li>
        </ul>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ndjson,.jsonl,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) loadFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
