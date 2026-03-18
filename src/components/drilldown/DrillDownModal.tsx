import { useEffect } from 'react'

interface DrillDownModalProps {
  isOpen: boolean
  title: string
  children: React.ReactNode
  onClose: () => void
}

export function DrillDownModal({ isOpen, title, children, onClose }: DrillDownModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* Panel — right-side drawer */}
      <div className="relative ml-auto w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-slide-in h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-blue-500 flex-shrink-0" />
            <h2 className="text-base font-semibold text-slate-800 dark:text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.22s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>
    </div>
  )
}
