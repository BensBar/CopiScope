import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CopilotRecord } from '../types/metrics'
import type { FilterState } from '../types/filters'
import type { CostConfig } from '../types/cost'
import type { CopilotMetricsResponse, CopilotSeatsResponse } from '../types/api'
import type { ProcessedData, ComparisonData } from '../types/usage'
import { loadFile } from '../lib/fileLoader'
import { generateSampleNDJSON } from '../lib/sampleData'
import { fetchCopilotData, getCopilotMetrics, getCopilotSeats } from '../lib/ingest/apiLoader'

export type TabId = 'overview' | 'cost' | 'adoption' | 'anomalies' | 'insights' | 'action-center' | 'seats'

export type DataSource = 'file' | 'api' | 'sample' | null

interface ApiData {
  metrics: CopilotMetricsResponse[] | null
  seats: CopilotSeatsResponse | null
}

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

  dataSource: DataSource
  apiData: ApiData | null
  processedUsageData: ProcessedData | null
  comparisonData: ComparisonData | null
}

interface AppActions {
  loadFile: (file: File) => Promise<void>
  loadSampleData: () => Promise<void>
  loadApiData: () => Promise<void>
  clearData: () => void
  setActiveTab: (tab: TabId) => void
  setFilters: (patch: Partial<FilterState>) => void
  resetFilters: () => void
  setCostConfig: (patch: Partial<CostConfig>) => void
  setProcessedUsageData: (data: ProcessedData | null) => void
  setComparisonData: (data: ComparisonData | null) => void
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

  dataSource: null,
  apiData: null,
  processedUsageData: null,
  comparisonData: null,

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
        dataSource: 'file',
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
    set({ dataSource: 'sample' })
    await get().loadFile(file)
    set({ dataSource: 'sample' })
  },

  loadApiData: async () => {
    set({ isLoading: true, parseError: null })
    try {
      const [metrics, seats] = await Promise.all([getCopilotMetrics(), getCopilotSeats()])
      set({
        apiData: { metrics, seats },
        dataSource: 'api',
        isLoading: false,
      })
    } catch (err) {
      set({
        parseError: err instanceof Error ? err.message : 'Failed to load API data',
        isLoading: false,
      })
      throw err
    }
  },

  clearData: () => {
    set({
      records: [],
      loadedFileName: null,
      parseWarnings: [],
      parseError: null,
      filters: DEFAULT_FILTERS,
      dataSource: null,
      apiData: null,
      processedUsageData: null,
      comparisonData: null,
    })
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  setFilters: (patch) =>
    set((s) => ({ filters: { ...s.filters, ...patch } })),

  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  setCostConfig: (patch) => {
    set((s) => ({ costConfig: { ...s.costConfig, ...patch } }))
    useCostStore.getState().setCostConfig(patch)
  },

  setProcessedUsageData: (data) => set({ processedUsageData: data }),
  setComparisonData: (data) => set({ comparisonData: data }),

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
