import type { Finding, Manuscript } from "./review-data";

export type FindingStatus = "pending" | "accepted" | "edited" | "rejected";
export type ReviewTab = "Overview" | "Findings" | "Similarity" | "Files";
export type Theme = "system" | "light" | "dark";
export type FindingText = Pick<Finding, "title" | "detail" | "suggestion">;
export type FindingDecision = {
  status: FindingStatus;
  wording?: FindingText;
  editBuffer?: FindingText;
  internalNote?: string;
  rejectionReason?: string;
};
export type ReviewDraft = {
  decisions: Record<string, FindingDecision>;
  authorAssessment: string;
  shareAssessment: boolean;
  internalNote: string;
  recommendation: "" | "Proceed" | "Request revisions" | "Decline";
  view: {
    tab: ReviewTab;
    selected: number | null;
    editing: number | null;
    documentTop: number;
    reviewTop: number;
    zoom: number;
    highlights: boolean;
    split: number;
    documentWide: boolean;
    mobilePane: "document" | "review";
  };
};

export function emptyDraft(): ReviewDraft {
  return {
    decisions: {},
    authorAssessment: "",
    shareAssessment: false,
    internalNote: "",
    recommendation: "",
    view: {
      tab: "Overview",
      selected: null,
      editing: null,
      documentTop: 0,
      reviewTop: 0,
      zoom: 100,
      highlights: true,
      split: 51,
      documentWide: false,
      mobilePane: "review",
    },
  };
}

export function findingStatus(
  draft: ReviewDraft,
  finding: Finding,
): FindingStatus {
  return draft.decisions[finding.id]?.status ?? "pending";
}

export function findingText(finding: Finding, draft: ReviewDraft): FindingText {
  return (
    draft.decisions[finding.id]?.wording ?? {
      title: finding.title,
      detail: finding.detail,
      suggestion: finding.suggestion,
    }
  );
}

export function progress(draft: ReviewDraft, findings: Finding[]) {
  const counts = { pending: 0, accepted: 0, edited: 0, rejected: 0 };
  findings.forEach((finding) => counts[findingStatus(draft, finding)]++);
  return {
    ...counts,
    reviewed: findings.length - counts.pending,
    total: findings.length,
    included: counts.accepted + counts.edited,
  };
}

// Author files are built from an explicit allowlist. Never serialize a draft or decision.
export function authorFiles(
  manuscript: Manuscript,
  findings: Finding[],
  draft: ReviewDraft,
) {
  const included = findings
    .filter((f) => ["accepted", "edited"].includes(findingStatus(draft, f)))
    .map((finding, index) => {
      const text = findingText(finding, draft);
      return {
        number: index + 1,
        priority: finding.severity,
        category: finding.category,
        title: text.title,
        comment: text.detail,
        suggestedRevision: text.suggestion,
        passage: { paragraph: finding.paragraph, quote: finding.quote },
      };
    });
  const assessment = draft.shareAssessment ? draft.authorAssessment.trim() : "";
  if (!included.length && !assessment) return [];
  const content =
    [
      "# Manuscript review",
      manuscript.title,
      ...(manuscript.sample
        ? [
            "This package uses illustrative review content from the sample manuscript.",
          ]
        : []),
      ...(assessment ? ["## Overall assessment", assessment] : []),
      ...included.flatMap((finding) => [
        `## ${finding.number}. ${finding.title}`,
        `**${finding.category} · ${finding.priority} priority**`,
        `> ${finding.passage.quote}`,
        finding.comment,
        `**Suggested revision:** ${finding.suggestedRevision}`,
      ]),
    ].join("\n\n") + "\n";
  return [
    {
      name: "author_review.md",
      kind: "Markdown",
      description: "Reviewer-approved feedback for the author",
      content,
    },
    {
      name: "findings.json",
      kind: "JSON",
      description: "Approved findings with manuscript passages",
      content: JSON.stringify(
        {
          manuscript: manuscript.title,
          ...(assessment ? { assessment } : {}),
          findings: included,
        },
        null,
        2,
      ),
    },
  ];
}
