import { subDays, format } from 'date-fns'
import type { CopilotRecord, ModelFeatureTotals } from '../types/metrics'

// Realistic enterprise org: ~50 engineers across 6 teams
const USERS: { login: string; team: string; seniority: 'senior' | 'mid' | 'junior'; activityLevel: number }[] = [
  // Platform team (high usage)
  { login: 'jchen', team: 'platform', seniority: 'senior', activityLevel: 1.6 },
  { login: 'agarcia', team: 'platform', seniority: 'senior', activityLevel: 1.4 },
  { login: 'mwilson', team: 'platform', seniority: 'mid', activityLevel: 1.2 },
  { login: 'kpatel', team: 'platform', seniority: 'mid', activityLevel: 1.1 },
  { login: 'rlee', team: 'platform', seniority: 'junior', activityLevel: 0.85 },
  { login: 'tkim', team: 'platform', seniority: 'junior', activityLevel: 0.7 },
  { login: 'nsingh', team: 'platform', seniority: 'mid', activityLevel: 1.0 },
  // Frontend team
  { login: 'erodriguez', team: 'frontend', seniority: 'senior', activityLevel: 1.5 },
  { login: 'jbrown', team: 'frontend', seniority: 'mid', activityLevel: 1.1 },
  { login: 'sthompson', team: 'frontend', seniority: 'mid', activityLevel: 1.0 },
  { login: 'lnguyen', team: 'frontend', seniority: 'junior', activityLevel: 0.9 },
  { login: 'dwang', team: 'frontend', seniority: 'junior', activityLevel: 0.6 },
  { login: 'cmartin', team: 'frontend', seniority: 'mid', activityLevel: 1.05 },
  { login: 'oanderson', team: 'frontend', seniority: 'senior', activityLevel: 1.3 },
  // Backend / API team
  { login: 'rtaylor', team: 'backend', seniority: 'senior', activityLevel: 1.4 },
  { login: 'jjackson', team: 'backend', seniority: 'senior', activityLevel: 1.35 },
  { login: 'awhite', team: 'backend', seniority: 'mid', activityLevel: 1.15 },
  { login: 'pharris', team: 'backend', seniority: 'mid', activityLevel: 1.0 },
  { login: 'mclark', team: 'backend', seniority: 'junior', activityLevel: 0.8 },
  { login: 'blewis', team: 'backend', seniority: 'junior', activityLevel: 0.65 },
  { login: 'krobinson', team: 'backend', seniority: 'mid', activityLevel: 0.95 },
  { login: 'dwalker', team: 'backend', seniority: 'senior', activityLevel: 1.25 },
  // Data engineering team
  { login: 'jhall', team: 'data', seniority: 'senior', activityLevel: 1.3 },
  { login: 'syoung', team: 'data', seniority: 'mid', activityLevel: 1.1 },
  { login: 'aking', team: 'data', seniority: 'mid', activityLevel: 0.95 },
  { login: 'ewright', team: 'data', seniority: 'junior', activityLevel: 0.7 },
  { login: 'mlopez', team: 'data', seniority: 'junior', activityLevel: 0.55 },
  { login: 'thill', team: 'data', seniority: 'senior', activityLevel: 1.2 },
  // DevOps / SRE
  { login: 'jscott', team: 'devops', seniority: 'senior', activityLevel: 1.2 },
  { login: 'rgreen', team: 'devops', seniority: 'mid', activityLevel: 1.0 },
  { login: 'aadams', team: 'devops', seniority: 'mid', activityLevel: 0.9 },
  { login: 'bnelson', team: 'devops', seniority: 'junior', activityLevel: 0.6 },
  { login: 'ccarter', team: 'devops', seniority: 'senior', activityLevel: 1.1 },
  // Mobile team
  { login: 'dmitchell', team: 'mobile', seniority: 'senior', activityLevel: 1.3 },
  { login: 'pperez', team: 'mobile', seniority: 'mid', activityLevel: 1.0 },
  { login: 'jroberts', team: 'mobile', seniority: 'mid', activityLevel: 0.95 },
  { login: 'sturner', team: 'mobile', seniority: 'junior', activityLevel: 0.75 },
  { login: 'lphillips', team: 'mobile', seniority: 'junior', activityLevel: 0.5 },
  { login: 'wcampbell', team: 'mobile', seniority: 'mid', activityLevel: 0.85 },
  // QA / Automation (lower copilot usage)
  { login: 'rparker', team: 'qa', seniority: 'senior', activityLevel: 0.7 },
  { login: 'jevans', team: 'qa', seniority: 'mid', activityLevel: 0.55 },
  { login: 'medwards', team: 'qa', seniority: 'mid', activityLevel: 0.5 },
  { login: 'acollins', team: 'qa', seniority: 'junior', activityLevel: 0.35 },
  // Inactive / churned seats
  { login: 'kstewart', team: 'platform', seniority: 'mid', activityLevel: 0 },
  { login: 'rsanchez', team: 'backend', seniority: 'junior', activityLevel: 0 },
  { login: 'jmorris', team: 'frontend', seniority: 'mid', activityLevel: 0 },
  { login: 'lrogers', team: 'devops', seniority: 'junior', activityLevel: 0 },
  { login: 'dreed', team: 'data', seniority: 'junior', activityLevel: 0 },
]

const MODELS = ['gpt-4o', 'gpt-4', 'claude-3.5-sonnet', 'copilot-classic']

const IDE_WEIGHTS: Record<string, { ide: string; weight: number }[]> = {
  platform: [{ ide: 'VS Code', weight: 0.5 }, { ide: 'JetBrains IntelliJ', weight: 0.3 }, { ide: 'Neovim', weight: 0.2 }],
  frontend: [{ ide: 'VS Code', weight: 0.8 }, { ide: 'WebStorm', weight: 0.2 }],
  backend: [{ ide: 'JetBrains IntelliJ', weight: 0.5 }, { ide: 'VS Code', weight: 0.4 }, { ide: 'Neovim', weight: 0.1 }],
  data: [{ ide: 'VS Code', weight: 0.6 }, { ide: 'JetBrains PyCharm', weight: 0.3 }, { ide: 'JupyterLab', weight: 0.1 }],
  devops: [{ ide: 'VS Code', weight: 0.7 }, { ide: 'Neovim', weight: 0.3 }],
  mobile: [{ ide: 'Xcode', weight: 0.4 }, { ide: 'Android Studio', weight: 0.3 }, { ide: 'VS Code', weight: 0.3 }],
  qa: [{ ide: 'VS Code', weight: 0.7 }, { ide: 'JetBrains IntelliJ', weight: 0.3 }],
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickIde(team: string, seed: number): string {
  const ides = IDE_WEIGHTS[team] || [{ ide: 'VS Code', weight: 1 }]
  const x = Math.sin(seed) * 10000
  const frac = x - Math.floor(x)
  let cumulative = 0
  for (const entry of ides) {
    cumulative += entry.weight
    if (frac < cumulative) return entry.ide
  }
  return ides[0].ide
}

export function generateSampleRecords(): CopilotRecord[] {
  const records: CopilotRecord[] = []
  const today = new Date()

  const activeUsers = USERS.filter((u) => u.activityLevel > 0)
  const inactiveUsers = USERS.filter((u) => u.activityLevel === 0)

  // Add a few old records for inactive users so they show up in the dataset
  for (const user of inactiveUsers) {
    const date = subDays(today, rand(75, 120))
    const dateKey = format(date, 'yyyy-MM-dd')
    records.push({
      date,
      dateKey,
      user: user.login,
      suggestions: rand(8, 35),
      acceptances: rand(3, 15),
      locSuggested: rand(40, 150),
      locAccepted: rand(15, 70),
      chatInteractions: rand(0, 3),
      usedChat: false,
      usedAgent: false,
      usedCLI: false,
      models: [],
      languages: [],
      ide: pickIde(user.team, user.login.charCodeAt(0)),
    })
  }

  // Generate 90 days of data for active users
  for (let dayOffset = 89; dayOffset >= 0; dayOffset--) {
    const date = subDays(today, dayOffset)
    const dateKey = format(date, 'yyyy-MM-dd')
    const dayOfWeek = date.getDay()

    // Skip weekends for most users
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    if (isWeekend) continue

    for (const user of activeUsers) {
      // Simulate PTO/absence: each user has a different absence rate
      const absenceSeed = dayOffset * 17 + user.login.charCodeAt(0) * 31
      const absenceThreshold = user.seniority === 'senior' ? 0.08 : user.seniority === 'mid' ? 0.12 : 0.15
      const absenceRoll = (Math.sin(absenceSeed) * 10000) % 1
      if (Math.abs(absenceRoll) < absenceThreshold) continue

      // Growth trend: enterprise rolling out over 90 days (adoption ramp)
      const adoptionRamp = user.seniority === 'junior'
        ? Math.min(1, (90 - dayOffset) / 60) // juniors ramp up slower
        : Math.min(1, (90 - dayOffset) / 30)  // seniors adopt faster
      const growthFactor = 0.6 + 0.4 * adoptionRamp

      // Base activity influenced by seniority and individual multiplier
      const seniorityBase = user.seniority === 'senior' ? 65 : user.seniority === 'mid' ? 50 : 35
      const dailyVariance = rand(seniorityBase - 15, seniorityBase + 25)
      const base = Math.floor(dailyVariance * growthFactor * user.activityLevel)

      // Simulate end-of-sprint spikes (every ~14 days some users spike)
      const sprintDay = dayOffset % 14
      const isSprintEnd = sprintDay <= 1
      const sprintMultiplier = isSprintEnd && user.seniority !== 'junior' ? rand(12, 22) / 10 : 1

      // Simulate a big incident week for devops ~45 days ago
      const incidentBoost =
        user.team === 'devops' && dayOffset >= 43 && dayOffset <= 47 ? 3.5 : 1

      const suggestions = Math.max(1, Math.floor(base * sprintMultiplier * incidentBoost))

      // Acceptance rate varies by seniority and team
      const baseRate =
        user.seniority === 'senior' ? 0.38 + rand(0, 8) / 100 :
        user.seniority === 'mid' ? 0.30 + rand(0, 8) / 100 :
        0.22 + rand(0, 8) / 100
      const acceptances = Math.floor(suggestions * baseRate)
      const locSuggested = suggestions * rand(4, 9)
      const locAccepted = Math.floor(acceptances * rand(3, 7))

      // Model breakdown: shifting towards newer models over time
      const newModelRatio = Math.min(0.75, 0.3 + (90 - dayOffset) / 120)
      const modelTotals: ModelFeatureTotals[] = MODELS.map((model, mi) => {
        const fraction = mi === 0 ? newModelRatio * 0.65 :   // gpt-4o
                         mi === 1 ? newModelRatio * 0.20 :   // gpt-4
                         mi === 2 ? newModelRatio * 0.15 :   // claude-3.5-sonnet
                         1 - newModelRatio                    // copilot-classic
        const mSugg = Math.max(0, Math.floor(suggestions * fraction))
        const mAcc = Math.max(0, Math.floor(acceptances * fraction))
        return {
          model_name: model,
          feature: 'code_completion',
          code_generation_activity_count: mSugg,
          code_acceptance_activity_count: mAcc,
          loc_suggested_to_add_sum: mSugg * rand(4, 7),
          loc_added_sum: mAcc * rand(3, 5),
        }
      })

      const ide = pickIde(user.team, dayOffset + user.login.charCodeAt(0))

      // Chat/agent usage correlates with seniority and team
      const chatBase = user.team === 'frontend' || user.team === 'platform' ? rand(2, 15) : rand(0, 8)
      const usedChat = user.activityLevel > 0.8 && rand(0, 10) > 3
      const usedAgent = user.seniority === 'senior' && rand(0, 10) > 5
      const usedCLI = user.team === 'devops' && rand(0, 10) > 4

      records.push({
        date,
        dateKey,
        user: user.login,
        suggestions,
        acceptances,
        locSuggested,
        locAccepted,
        chatInteractions: usedChat ? chatBase : rand(0, 2),
        usedChat,
        usedAgent,
        usedCLI,
        models: modelTotals,
        languages: [],
        ide,
      })
    }
  }

  return records
}

// Pre-generated sample as NDJSON text for the "load sample" button
export function generateSampleNDJSON(): string {
  const records = generateSampleRecords()
  return records
    .map((r) =>
      JSON.stringify({
        day: r.dateKey,
        user_login: r.user,
        code_generation_activity_count: r.suggestions,
        code_acceptance_activity_count: r.acceptances,
        loc_suggested_to_add_sum: r.locSuggested,
        loc_added_sum: r.locAccepted,
        user_initiated_interaction_count: r.chatInteractions,
        used_chat: r.usedChat,
        used_agent: r.usedAgent,
        used_cli: r.usedCLI,
        totals_by_model_feature: r.models,
        totals_by_ide: [{ ide_name: r.ide, code_generation_activity_count: r.suggestions, code_acceptance_activity_count: r.acceptances }],
      })
    )
    .join('\n')
}
