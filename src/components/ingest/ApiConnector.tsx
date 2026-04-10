import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/cn'

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

export function ApiConnector() {
  const loadApiData = useAppStore((s) => s.loadApiData)
  const [token, setToken] = useState('')
  const [org, setOrg] = useState('')
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const canConnect = token.trim().length > 0 && org.trim().length > 0

  const handleConnect = async () => {
    setStatus('connecting')
    setErrorMsg(null)
    try {
      await loadApiData()
      setStatus('connected')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Connection failed')
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-700 dark:text-slate-200" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Connect to GitHub API</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Connect to your GitHub Enterprise Copilot API for live data
          </p>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="api-token" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Personal Access Token
            </label>
            <input
              id="api-token"
              type="password"
              placeholder="ghp_xxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-mono"
            />
            <p className="text-xs text-slate-400">Requires <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">copilot</code> and <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">read:org</code> scopes</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="api-org" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Organization / Enterprise
            </label>
            <input
              id="api-org"
              type="text"
              placeholder="my-organization"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          {/* Status */}
          {status === 'connected' && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-sm text-emerald-700 dark:text-emerald-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Connected successfully — data loaded.
            </div>
          )}

          {status === 'error' && errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg text-sm text-red-700 dark:text-red-400">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30">
          <button
            onClick={handleConnect}
            disabled={!canConnect || status === 'connecting'}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg transition-all',
              canConnect && status !== 'connecting'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
            )}
          >
            {status === 'connecting' && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {status === 'connecting' ? 'Connecting…' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  )
}
