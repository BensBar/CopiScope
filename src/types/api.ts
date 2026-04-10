export interface CopilotMetricsResponse {
  total_active_users: number;
  total_engaged_users: number;
  copilot_ide_code_completions?: {
    total_engaged_users: number;
    editors?: Array<{
      name: string;
      total_engaged_users: number;
    }>;
  };
  copilot_ide_chat?: {
    total_engaged_users: number;
  };
  copilot_dotcom_chat?: {
    total_engaged_users: number;
  };
  copilot_dotcom_pull_requests?: {
    total_engaged_users: number;
  };
  date: string;
}

export interface CopilotSeatsResponse {
  total_seats: number;
  seats: Array<{
    created_at: string;
    updated_at: string;
    pending_cancellation_date: string | null;
    last_activity_at: string | null;
    last_activity_editor: string | null;
    assignee: {
      login: string;
      id: number;
      avatar_url: string;
      type: string;
    };
    assigning_team?: {
      id: number;
      name: string;
      slug: string;
    };
  }>;
}

export interface CopilotMetrics {
  activeUsers: number;
  totalSeats: number;
  acceptanceRate: number;
  usageTrend: number;
  dailyAcceptanceRates: { date: string; rate: number }[];
}

export type AdoptionStatus = "Strong" | "Moderate" | "Underutilized";

export interface AdoptionResult {
  status: AdoptionStatus;
  ratio: number;
}
