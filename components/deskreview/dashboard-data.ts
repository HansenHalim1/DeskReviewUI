export type DashboardMetric = {
  name: string;
  period: number;
  total: number;
  unit?: "percent" | "days";
  indent?: boolean;
  emphasis?: boolean;
};

export type PaperMetric =
  "received" | "accepted" | "desk-rejected" | "first-decision";
export type DashboardPaper = {
  id: string;
  title: string;
  authors: string[];
  submittedAt: string;
  status: "submitted" | "accepted" | "desk-rejected" | "in-review";
  firstDecisionAt?: string;
};

// Illustrative UI records only: the supplied screenshots contain no paper records.
// Replace these with journal records independently of the dashboard component.
export const dashboardPapers: DashboardPaper[] = [
  {
    id: "preview-01",
    title: "Sample manuscript 01",
    authors: ["Sample author A", "Sample author B"],
    submittedAt: "2026-09-01T09:30:00+07:00",
    status: "accepted",
    firstDecisionAt: "2026-09-12T10:00:00+07:00",
  },
  {
    id: "preview-02",
    title: "Sample manuscript 02",
    authors: ["Sample author C"],
    submittedAt: "2026-08-25T14:15:00+07:00",
    status: "desk-rejected",
    firstDecisionAt: "2026-08-27T11:00:00+07:00",
  },
  {
    id: "preview-03",
    title: "Sample manuscript 03",
    authors: ["Sample author D", "Sample author E"],
    submittedAt: "2026-08-20T08:45:00+07:00",
    status: "in-review",
    firstDecisionAt: "2026-08-22T09:00:00+07:00",
  },
  {
    id: "preview-04",
    title: "Sample manuscript 04",
    authors: ["Sample author F"],
    submittedAt: "2026-09-14T16:00:00+07:00",
    status: "submitted",
  },
];

export function papersForMetric(metric: PaperMetric) {
  return dashboardPapers
    .filter((paper) => {
      if (metric === "received") return true;
      if (metric === "first-decision") return Boolean(paper.firstDecisionAt);
      return paper.status === metric;
    })
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));
}

// Transcribed reference snapshot. Replace this adapter with journal API data.
export const journalSnapshot = {
  journal: "Journal The Winners",
  start: "2023-01-01",
  end: "2026-09-15",
  stages: [
    { name: "Submission", count: 2, color: "#028ED5" },
    { name: "Review", count: 9, color: "#F3931B" },
    { name: "Copyediting", count: 6, color: "#169B89" },
    { name: "Production", count: 1, color: "#8975C7" },
  ],
  trends: [
    { name: "Submissions received", period: 277, total: 633, emphasis: true },
    { name: "Submissions accepted", period: 62, total: 137 },
    { name: "Submissions declined", period: 243, total: 399 },
    {
      name: "Desk rejected",
      period: 213,
      total: 306,
      indent: true,
      emphasis: true,
    },
    { name: "Declined after review", period: 30, total: 93, indent: true },
    { name: "Submissions published", period: 69, total: 134 },
    { name: "Other submissions", period: 7, total: 310 },
  ] satisfies DashboardMetric[],
  performance: [
    { name: "Submissions in progress", period: 0, total: 2 },
    { name: "Imported submissions", period: 7, total: 308 },
    {
      name: "Days to first editorial decision",
      period: 40,
      total: 56,
      unit: "days",
      emphasis: true,
    },
    {
      name: "Days to accept",
      period: 157,
      total: 134,
      unit: "days",
      indent: true,
    },
    {
      name: "Days to reject",
      period: 40,
      total: 109,
      unit: "days",
      indent: true,
    },
    { name: "Acceptance rate", period: 22, total: 22, unit: "percent" },
    { name: "Rejection rate", period: 78, total: 63, unit: "percent" },
    {
      name: "Desk reject rate",
      period: 69,
      total: 48,
      unit: "percent",
      indent: true,
      emphasis: true,
    },
    {
      name: "After review reject rate",
      period: 8,
      total: 15,
      unit: "percent",
      indent: true,
    },
  ] satisfies DashboardMetric[],
};
