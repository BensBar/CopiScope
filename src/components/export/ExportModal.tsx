import { useEffect, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useFilteredRecords } from '../../hooks/useFilteredRecords'
import { generateMarkdownSummary, downloadMarkdown } from '../../lib/export'

export function ExportModal() {
  const isOpen = useAppStore((s) => s.isExportModalOpen)
  const closeExportModal = useAppStore((s) => s.closeExportModal)
  const filters = useAppStore((s) => s.filters)
  const costConfig = useAppStore((s) => s.costConfig)
  const filtered = useFilteredRecords()
  const [preview, setPreview] = useState('')

  useEffect(() => {
    if (isOpen) {
      setPreview(generateMarkdownSummary(filtered, filters, costConfig))
    }
  }, [isOpen, filtered, filters, costConfig])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeExportModal} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-white">Export Summary</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Markdown report based on current filters</p>
          </div>
          <button onClick={closeExportModal} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <pre className="text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            {preview}
          </pre>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={closeExportModal}
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              downloadMarkdown(preview)
              closeExportModal()
            }}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Download .md
          </button>
        </div>
      </div>
    </div>
  )
}
