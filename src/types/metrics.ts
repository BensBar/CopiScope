export interface ModelFeatureTotals {
  model_name: string
  feature: string
  code_generation_activity_count: number
  code_acceptance_activity_count: number
  loc_suggested_to_add_sum: number
  loc_added_sum: number
}

export interface LanguageFeatureTotals {
  language: string
  feature: string
  code_generation_activity_count: number
  code_acceptance_activity_count: number
}

export interface IdeTotals {
  ide_name: string
  code_generation_activity_count: number
  code_acceptance_activity_count: number
}

export interface RawNDJSONRow {
  day: string
  user_id?: number
  user_login?: string
  organization_id?: number
  enterprise_id?: number
  code_generation_activity_count?: number
  code_acceptance_activity_count?: number
  loc_suggested_to_add_sum?: number
  loc_suggested_to_delete_sum?: number
  loc_added_sum?: number
  loc_deleted_sum?: number
  user_initiated_interaction_count?: number
  chat_panel_ask_mode?: number
  chat_panel_agent_mode?: number
  chat_panel_edit_mode?: number
  used_chat?: boolean
  used_agent?: boolean
  used_cli?: boolean
  last_known_ide_version?: string
  last_known_plugin_version?: string
  totals_by_model_feature?: ModelFeatureTotals[]
  totals_by_language_feature?: LanguageFeatureTotals[]
  totals_by_ide?: IdeTotals[]
}

export interface CopilotRecord {
  date: Date
  dateKey: string
  user: string
  suggestions: number
  acceptances: number
  locSuggested: number
  locAccepted: number
  chatInteractions: number
  usedChat: boolean
  usedAgent: boolean
  usedCLI: boolean
  models: ModelFeatureTotals[]
  languages: LanguageFeatureTotals[]
  ide: string
}

export interface RawCSVRow {
  date?: string
  day?: string
  login?: string
  user_login?: string
  suggestions_count?: string
  acceptances_count?: string
  lines_suggested?: string
  lines_accepted?: string
  active_users?: string
  total_suggestions_count?: string
  total_acceptances_count?: string
  total_lines_suggested?: string
  total_lines_accepted?: string
  [key: string]: string | undefined
}
