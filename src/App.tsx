import { useRef } from 'react'
import { useAppStore } from './store/useAppStore'
import { Header } from './components/layout/Header'
import { TabNav } from './components/layout/TabNav'
import { FilterBar } from './components/filters/FilterBar'
import { EmptyState } from './components/shared/EmptyState'
import { ExportModal } from './components/export/ExportModal'
import { OverviewTab } from './tabs/OverviewTab'
import { CostTab } from './tabs/CostTab'
import { AdoptionTab } from './tabs/AdoptionTab'
import { AnomaliesTab } from './tabs/AnomaliesTab'

function WarningBanner() {
  const warnings = useAppStore((s) => s.parseWarnings)
  const error = useAppStore((s) => s.parseError)

  if (error) {
    return (
      <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span><strong>Parse error:</strong> {error}</span>
      </div>
    )
  }

  if (warnings.length > 0) {
    return (
      <div className="mx-6 mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg text-sm text-amber-700 dark:text-amber-400">
        <p className="font-medium mb-1">{warnings.length} warning{warnings.length !== 1 ? 's' : ''} during import:</p>
        <ul className="text-xs space-y-0.5 max-h-20 overflow-y-auto">
          {warnings.slice(0, 10).map((w, i) => <li key={i}>• {w}</li>)}
          {warnings.length > 10 && <li>…and {warnings.length - 10} more</li>}
        </ul>
      </div>
    )
  }

  return null
}

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const records = useAppStore((s) => s.records)
  const loadFile = useAppStore((s) => s.loadFile)
  const activeTab = useAppStore((s) => s.activeTab)

  const hasData = records.length > 0

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-200">
      <Header />
      {hasData && (
        <>
          <TabNav />
          <FilterBar />
        </>
      )}
      <WarningBanner />

      <main className="flex-1">
        {!hasData ? (
          <EmptyState onUpload={() => fileInputRef.current?.click()} />
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'cost' && <CostTab />}
            {activeTab === 'adoption' && <AdoptionTab />}
            {activeTab === 'anomalies' && <AnomaliesTab />}
          </>
        )}
      </main>

      <ExportModal />

      {/* Hidden file input for EmptyState trigger */}
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
