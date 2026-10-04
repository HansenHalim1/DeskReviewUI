import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Pencil,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";
import type { Finding } from "./review-data";
import type { FindingDecision, FindingText } from "./reviewer-model";

type Props = {
  finding: Finding;
  decision: FindingDecision;
  active: boolean;
  editing: boolean;
  onLocate: () => void;
  onUpdate: (update: Partial<FindingDecision>) => void;
  onCommit: (decision: FindingDecision, message: string) => void;
  onEdit: (editing: boolean) => void;
};

export default function ReviewerCard({
  finding,
  decision,
  active,
  editing,
  onLocate,
  onUpdate,
  onCommit,
  onEdit,
}: Props) {
  const original = {
    title: finding.title,
    detail: finding.detail,
    suggestion: finding.suggestion,
  };
  const wording = decision.wording ?? original;
  const buffer = decision.editBuffer ?? wording;
  const status = decision.status;
  const statusLabel = {
    pending: "Pending",
    accepted: "Accepted",
    edited: "Edited",
    rejected: "Rejected",
  }[status];
  function editField(field: keyof FindingText, value: string) {
    onUpdate({ editBuffer: { ...buffer, [field]: value } });
  }
  function saveEdit() {
    const changed = (Object.keys(original) as (keyof FindingText)[]).some(
      (field) => buffer[field].trim() !== original[field],
    );
    onCommit(
      {
        ...decision,
        status: changed ? "edited" : "accepted",
        wording: {
          title: buffer.title.trim(),
          detail: buffer.detail.trim(),
          suggestion: buffer.suggestion.trim(),
        },
        editBuffer: undefined,
      },
      "Finding saved and included for the author.",
    );
    onEdit(false);
  }
  return (
    <article
      id={`finding-${finding.id}`}
      className={`finding-card ${active ? "finding-active" : ""} ${status === "rejected" ? "finding-rejected" : ""}`}
      aria-label={`Finding ${finding.id}: ${wording.title}`}
    >
      <div className="finding-meta">
        <span className="finding-number">
          {String(finding.id).padStart(2, "0")}
        </span>
        <span className={`badge badge-${finding.severity}`}>
          {finding.severity === "high"
            ? "High priority"
            : finding.severity === "medium"
              ? "Medium priority"
              : "Low priority"}
        </span>
        <span className="finding-category">{finding.category}</span>
        <span className={`badge status-${status}`}>{statusLabel}</span>
      </div>
      <h3>{wording.title}</h3>
      <button className="passage-link" onClick={onLocate}>
        <span>“{finding.quote}”</span>
        <ArrowUpRight size={15} />
        <span className="sr-only">View passage in manuscript</span>
      </button>
      {editing ? (
        <div className="finding-editor">
          <div className="editor-caption">
            <Pencil size={14} /> Author-facing wording{" "}
            <span>Editor draft · not shared</span>
          </div>
          <label htmlFor={`edit-title-${finding.id}`}>Finding title</label>
          <input
            id={`edit-title-${finding.id}`}
            value={buffer.title}
            onChange={(e) => editField("title", e.target.value)}
          />
          <label htmlFor={`edit-detail-${finding.id}`}>Comment to author</label>
          <textarea
            id={`edit-detail-${finding.id}`}
            rows={4}
            value={buffer.detail}
            onChange={(e) => editField("detail", e.target.value)}
          />
          <label htmlFor={`edit-suggestion-${finding.id}`}>
            Suggested revision
          </label>
          <textarea
            id={`edit-suggestion-${finding.id}`}
            rows={3}
            value={buffer.suggestion}
            onChange={(e) => editField("suggestion", e.target.value)}
          />
          <details className="original-wording">
            <summary>
              Compare with original wording <ChevronDown size={13} />
            </summary>
            <h4>{original.title}</h4>
            <p>{original.detail}</p>
            <p>
              <strong>Suggested revision:</strong> {original.suggestion}
            </p>
            <button
              className="text-button"
              onClick={() => onUpdate({ editBuffer: original })}
            >
              <RotateCcw size={13} /> Restore original into editor
            </button>
          </details>
          <div className="finding-actions">
            <button
              className="primary-button"
              disabled={
                !buffer.title.trim() ||
                !buffer.detail.trim() ||
                !buffer.suggestion.trim()
              }
              onClick={saveEdit}
            >
              <Check size={14} /> Save & accept
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                onUpdate({ editBuffer: undefined });
                onEdit(false);
              }}
            >
              Cancel edit
            </button>
          </div>
          <p className="field-hint">
            Unsaved edits stay private until you select Save & accept.
          </p>
        </div>
      ) : (
        <>
          <p className="finding-detail">{wording.detail}</p>
          <div className="finding-suggestion">
            <h4>Suggested revision</h4>
            <p>{wording.suggestion}</p>
          </div>
          <div className="finding-actions">
            <button
              className={`secondary-button accept-button ${status === "accepted" || status === "edited" ? "action-selected" : ""}`}
              onClick={() =>
                onCommit(
                  {
                    ...decision,
                    status: decision.wording ? "edited" : "accepted",
                  },
                  "Finding included for the author.",
                )
              }
              disabled={status === "accepted" || status === "edited"}
            >
              <Check size={14} /> Accept
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                onUpdate({ editBuffer: wording });
                onEdit(true);
              }}
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              className={`secondary-button reject-button ${status === "rejected" ? "action-selected" : ""}`}
              onClick={() =>
                onCommit(
                  { ...decision, status: "rejected" },
                  "Finding rejected. It will not be included in the author package.",
                )
              }
              disabled={status === "rejected"}
            >
              <X size={14} /> Reject
            </button>
            {status !== "pending" && (
              <button
                className="icon-button"
                aria-label="Reset finding to pending"
                title="Reset to pending"
                onClick={() =>
                  onCommit(
                    { ...decision, status: "pending" },
                    "Finding returned to pending.",
                  )
                }
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </>
      )}
      {status === "rejected" && (
        <div className="private-field">
          <label htmlFor={`rejection-${finding.id}`}>
            <ShieldCheck size={12} /> Internal rejection reason{" "}
            <span>Optional · never exported</span>
          </label>
          <textarea
            id={`rejection-${finding.id}`}
            rows={2}
            placeholder="Why this finding should be omitted…"
            value={decision.rejectionReason ?? ""}
            onChange={(e) => onUpdate({ rejectionReason: e.target.value })}
          />
        </div>
      )}
      <details className="internal-note">
        <summary>
          <ShieldCheck size={12} /> Internal note{" "}
          {decision.internalNote ? <span className="note-dot" /> : null}
          <ChevronDown size={13} />
        </summary>
        <label className="sr-only" htmlFor={`note-${finding.id}`}>
          Internal note for finding {finding.id}
        </label>
        <textarea
          id={`note-${finding.id}`}
          rows={2}
          placeholder="For your reference only. Never included in author files."
          value={decision.internalNote ?? ""}
          onChange={(e) => onUpdate({ internalNote: e.target.value })}
        />
        <p className="field-hint">
          Private to this browser. Never included in author files.
        </p>
      </details>
    </article>
  );
}
