import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CopilotRecord } from '../types/metrics'
import type { FilterState } from '../types/filters'
import type { CostConfig } from '../types/cost'
import { loadFile } from '../lib/fileLoader'
import { generateSampleNDJSON } from '../lib/sampleData'

export type TabId = 'overview' | 'cost' | 'adoption' | 'anomalies'

interface AppState {
  records: CopilotRecord[]
  loadedFileName: string | null
  parseWarnings: string[]
  parseError: string | null
  isLoading: boolean

  activeTab: TabId
  isExportModalOpen: boolean
  darkMode: boolean

  filters: FilterState
  costConfig: CostConfig
}

interface AppActions {
  loadFile: (file: File) => Promise<void>
  loadSampleData: () => Promise<void>
  clearData: () => void
  setActiveTab: (tab: TabId) => void
  setFilters: (patch: Partial<FilterState>) => void
  resetFilters: () => void
  setCostConfig: (patch: Partial<CostConfig>) => void
  openExportModal: () => void
  closeExportModal: () => void
  toggleDarkMode: () => void
}

const DEFAULT_FILTERS: FilterState = {
  dateFrom: null,
  dateTo: null,
  users: [],
  models: [],
}

const DEFAULT_COST_CONFIG: CostConfig = {
  pricePerSeat: 19,
  activeUserCount: null,
  monthlyBudget: null,
  forecastMonths: 3,
}

// Separate cost config persistence
const useCostStore = create<{ costConfig: CostConfig; setCostConfig: (patch: Partial<CostConfig>) => void }>()(
  persist(
    (set) => ({
      costConfig: DEFAULT_COST_CONFIG,
      setCostConfig: (patch) => set((s) => ({ costConfig: { ...s.costConfig, ...patch } })),
    }),
    { name: 'copiscope-cost' }
  )
)

export const useAppStore = create<AppState & AppActions>()((set, get) => ({
  records: [],
  loadedFileName: null,
  parseWarnings: [],
  parseError: null,
  isLoading: false,

  activeTab: 'overview',
  isExportModalOpen: false,
  darkMode: window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,

  filters: DEFAULT_FILTERS,
  costConfig: DEFAULT_COST_CONFIG,

  loadFile: async (file: File) => {
    set({ isLoading: true, parseError: null, parseWarnings: [] })
    try {
      const result = await loadFile(file)
      set({
        records: result.records,
        loadedFileName: file.name,
        parseWarnings: result.warnings,
        parseError: null,
        isLoading: false,
        filters: DEFAULT_FILTERS,
      })
    } catch (err) {
      set({
        parseError: err instanceof Error ? err.message : 'Unknown error parsing file',
        isLoading: false,
      })
    }
  },

  loadSampleData: async () => {
    const ndjson = generateSampleNDJSON()
    const file = new File([ndjson], 'sample-copilot-data.ndjson', { type: 'application/x-ndjson' })
    await get().loadFile(file)
  },

  clearData: () => {
    set({ records: [], loadedFileName: null, parseWarnings: [], parseError: null, filters: DEFAULT_FILTERS })
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  setFilters: (patch) =>
    set((s) => ({ filters: { ...s.filters, ...patch } })),

  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  setCostConfig: (patch) => {
    set((s) => ({ costConfig: { ...s.costConfig, ...patch } }))
    useCostStore.getState().setCostConfig(patch)
  },

  openExportModal: () => set({ isExportModalOpen: true }),
  closeExportModal: () => set({ isExportModalOpen: false }),

  toggleDarkMode: () => {
    const next = !get().darkMode
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('copiscope-dark', next ? '1' : '0')
    set({ darkMode: next })
  },
}))

// Hydrate cost config from localStorage on startup
const savedCost = useCostStore.getState().costConfig
useAppStore.setState({ costConfig: savedCost })

// Hydrate dark mode from localStorage on startup
const savedDark = localStorage.getItem('copiscope-dark')
const isDark = savedDark ? savedDark === '1' : window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
document.documentElement.classList.toggle('dark', isDark)
useAppStore.setState({ darkMode: isDark })
