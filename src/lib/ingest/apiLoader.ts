import type {
  CopilotMetricsResponse,
  CopilotSeatsResponse,
  CopilotMetrics,
  AdoptionResult,
} from "@/types/api";

// Re-export types for convenience
export type { CopilotMetricsResponse, CopilotSeatsResponse, CopilotMetrics, AdoptionResult };

// ---------------------------------------------------------------------------
// Mock data generators
// ---------------------------------------------------------------------------

export function generateMockMetrics(): CopilotMetricsResponse[] {
  const today = new Date();
  const metrics: CopilotMetricsResponse[] = [];

  for (let i = 27; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const baseUsers = 85 + Math.floor(Math.random() * 30);
    const engagedUsers = Math.floor(baseUsers * (0.7 + Math.random() * 0.2));

    metrics.push({
      date: date.toISOString().split("T")[0],
      total_active_users: baseUsers,
      total_engaged_users: engagedUsers,
      copilot_ide_code_completions: {
        total_engaged_users: Math.floor(engagedUsers * 0.85),
        editors: [
          { name: "vscode", total_engaged_users: Math.floor(engagedUsers * 0.65) },
          { name: "jetbrains", total_engaged_users: Math.floor(engagedUsers * 0.15) },
          { name: "neovim", total_engaged_users: Math.floor(engagedUsers * 0.05) },
        ],
      },
      copilot_ide_chat: {
        total_engaged_users: Math.floor(engagedUsers * 0.45),
      },
      copilot_dotcom_chat: {
        total_engaged_users: Math.floor(engagedUsers * 0.25),
      },
      copilot_dotcom_pull_requests: {
        total_engaged_users: Math.floor(engagedUsers * 0.35),
      },
    });
  }

  return metrics;
}

export function generateMockSeats(): CopilotSeatsResponse {
  const users = [
    { login: "octocat", id: 1, avatar_url: "https://avatars.githubusercontent.com/u/583231" },
    { login: "mona", id: 2, avatar_url: "https://avatars.githubusercontent.com/u/79929883" },
    { login: "hubot", id: 3, avatar_url: "https://avatars.githubusercontent.com/u/480938" },
    { login: "github-actions", id: 4, avatar_url: "https://avatars.githubusercontent.com/u/41898282" },
    { login: "dependabot", id: 5, avatar_url: "https://avatars.githubusercontent.com/u/27347476" },
    { login: "alexdev", id: 6, avatar_url: "https://avatars.githubusercontent.com/u/1234567" },
    { login: "sarahcoder", id: 7, avatar_url: "https://avatars.githubusercontent.com/u/2345678" },
    { login: "mikejs", id: 8, avatar_url: "https://avatars.githubusercontent.com/u/3456789" },
    { login: "emilypython", id: 9, avatar_url: "https://avatars.githubusercontent.com/u/4567890" },
    { login: "chrisrust", id: 10, avatar_url: "https://avatars.githubusercontent.com/u/5678901" },
  ];

  const teams = [
    { id: 1, name: "Platform Team", slug: "platform-team" },
    { id: 2, name: "Frontend Team", slug: "frontend-team" },
    { id: 3, name: "Backend Team", slug: "backend-team" },
  ];

  const editors = ["vscode", "jetbrains", "neovim", "vim", null];

  const seats = users.map((user, index) => {
    const createdDate = new Date();
    createdDate.setMonth(createdDate.getMonth() - Math.floor(Math.random() * 6) - 1);

    const lastActivityDate = new Date();
    lastActivityDate.setDate(lastActivityDate.getDate() - Math.floor(Math.random() * 14));

    return {
      created_at: createdDate.toISOString(),
      updated_at: lastActivityDate.toISOString(),
      pending_cancellation_date: null,
      last_activity_at: Math.random() > 0.1 ? lastActivityDate.toISOString() : null,
      last_activity_editor: Math.random() > 0.1 ? editors[Math.floor(Math.random() * editors.length)] : null,
      assignee: {
        login: user.login,
        id: user.id,
        avatar_url: user.avatar_url,
        type: "User",
      },
      assigning_team: Math.random() > 0.3 ? teams[index % teams.length] : undefined,
    };
  });

  return {
    total_seats: 200,
    seats,
  };
}

// ---------------------------------------------------------------------------
// Fetch helpers (currently backed by mock data)
// ---------------------------------------------------------------------------

export async function getCopilotMetrics(): Promise<CopilotMetricsResponse[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return generateMockMetrics();
}

export async function getCopilotSeats(): Promise<CopilotSeatsResponse> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return generateMockSeats();
}

export async function fetchCopilotData(): Promise<CopilotMetrics> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const today = new Date();
  const dailyAcceptanceRates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toLocaleDateString("en-US", { weekday: "short" }),
      rate: Math.floor(Math.random() * 20) + 25,
    };
  });

  return {
    activeUsers: 127,
    totalSeats: 200,
    acceptanceRate: 32,
    usageTrend: 8,
    dailyAcceptanceRates,
  };
}

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

export function getAdoptionStatus(
  activeUsers: number,
  totalSeats: number
): AdoptionResult {
  const ratio = totalSeats > 0 ? Math.round((activeUsers / totalSeats) * 100) : 0;

  if (ratio >= 70) {
    return { status: "Strong", ratio };
  } else if (ratio >= 40) {
    return { status: "Moderate", ratio };
  } else {
    return { status: "Underutilized", ratio };
  }
}
