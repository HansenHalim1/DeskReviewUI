"use client";

import { useEffect, useRef, useState } from "react";
import { sampleManuscript, type Manuscript } from "./review-data";
import { emptyDraft, type ReviewDraft, type Theme } from "./reviewer-model";

type Workspace = {
  version: 2;
  documents: Manuscript[];
  activeId: string;
  drafts: Record<string, ReviewDraft>;
  theme: Theme;
};
const key = "deskreview-workspace-v2";
const freshWorkspace = (): Workspace => ({
  version: 2,
  documents: [],
  activeId: sampleManuscript.id,
  drafts: {},
  theme: "system",
});
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isManuscript(value: unknown): value is Manuscript {
  return (
    record(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.title === "string" &&
    typeof value.authors === "string" &&
    value.sample === false &&
    Array.isArray(value.paragraphs) &&
    value.paragraphs.every(
      (p) =>
        record(p) && typeof p.id === "string" && typeof p.text === "string",
    )
  );
}
function readDraft(value: unknown): ReviewDraft {
  const draft = emptyDraft();
  if (!record(value)) return draft;
  for (const field of ["authorAssessment", "internalNote"] as const)
    if (typeof value[field] === "string") draft[field] = value[field];
  draft.shareAssessment = value.shareAssessment === true;
  if (
    ["Proceed", "Request revisions", "Decline"].includes(
      String(value.recommendation),
    )
  )
    draft.recommendation =
      value.recommendation as ReviewDraft["recommendation"];
  if (record(value.decisions))
    Object.entries(value.decisions).forEach(([id, item]) => {
      if (
        !record(item) ||
        !["pending", "accepted", "edited", "rejected"].includes(
          String(item.status),
        )
      )
        return;
      const decision = {
        status: item.status,
      } as ReviewDraft["decisions"][string];
      for (const field of ["internalNote", "rejectionReason"] as const)
        if (typeof item[field] === "string") decision[field] = item[field];
      for (const field of ["wording", "editBuffer"] as const) {
        const text = item[field];
        if (
          record(text) &&
          typeof text.title === "string" &&
          typeof text.detail === "string" &&
          typeof text.suggestion === "string"
        )
          decision[field] = {
            title: text.title,
            detail: text.detail,
            suggestion: text.suggestion,
          };
      }
      draft.decisions[id] = decision;
    });
  if (record(value.view)) {
    const view = value.view;
    if (
      ["Overview", "Findings", "Similarity", "Files"].includes(String(view.tab))
    )
      draft.view.tab = view.tab as ReviewDraft["view"]["tab"];
    for (const field of ["selected", "editing"] as const)
      if (typeof view[field] === "number" && Number.isSafeInteger(view[field]))
        draft.view[field] = view[field];
    for (const field of ["documentTop", "reviewTop"] as const)
      if (typeof view[field] === "number" && Number.isFinite(view[field]))
        draft.view[field] = Math.max(0, view[field]);
    if (typeof view.zoom === "number" && Number.isFinite(view.zoom))
      draft.view.zoom = Math.max(80, Math.min(130, view.zoom));
    if (typeof view.split === "number" && Number.isFinite(view.split))
      draft.view.split = Math.max(35, Math.min(65, view.split));
    draft.view.highlights = view.highlights !== false;
    draft.view.documentWide = view.documentWide === true;
    draft.view.mobilePane =
      view.mobilePane === "document" ? "document" : "review";
  }
  return draft;
}

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace>(freshWorkspace);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Loading saved workspace…");
  const [storageAvailable, setStorageAvailable] = useState(true);
  const latest = useRef(workspace);
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      const next = freshWorkspace();
      try {
        const stored: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
        if (record(stored) && stored.version === 2) {
          next.documents = Array.isArray(stored.documents)
            ? stored.documents.filter(isManuscript).slice(0, 12)
            : [];
          if (
            stored.activeId === sampleManuscript.id ||
            next.documents.some((doc) => doc.id === stored.activeId)
          )
            next.activeId = String(stored.activeId);
          if (["light", "dark", "system"].includes(String(stored.theme)))
            next.theme = stored.theme as Theme;
          if (record(stored.drafts))
            for (const [id, draft] of Object.entries(stored.drafts))
              next.drafts[id] = readDraft(draft);
        } else {
          const legacy: unknown = JSON.parse(
            localStorage.getItem("qwen-desk-manuscripts-v1") ?? "[]",
          );
          if (Array.isArray(legacy))
            next.documents = legacy.filter(isManuscript).slice(0, 12);
        }
      } catch {
        if (!cancelled) setStorageAvailable(false);
      }
      if (!cancelled) {
        setWorkspace(next);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    latest.current = workspace;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setSaveStatus("Saving…");
    });
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(workspace));
        setSaveStatus("Saved on this browser");
        setStorageAvailable(true);
      } catch {
        setSaveStatus("Not saved · browser storage unavailable");
        setStorageAvailable(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [workspace, ready]);
  useEffect(() => {
    if (!ready) return;
    const flush = () => {
      try {
        localStorage.setItem(key, JSON.stringify(latest.current));
      } catch {
        /* The visible save indicator reports storage failures. */
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ready]);
  const manuscript =
    workspace.documents.find((doc) => doc.id === workspace.activeId) ??
    sampleManuscript;
  const draft = workspace.drafts[manuscript.id] ?? emptyDraft();
  const updateDraft = (update: (draft: ReviewDraft) => ReviewDraft) =>
    setWorkspace((previous) => ({
      ...previous,
      drafts: {
        ...previous.drafts,
        [previous.activeId]: update(
          previous.drafts[previous.activeId] ?? emptyDraft(),
        ),
      },
    }));
  const updateView = (view: Partial<ReviewDraft["view"]>) =>
    updateDraft((draft) => ({ ...draft, view: { ...draft.view, ...view } }));
  const openDocument = (id: string) =>
    setWorkspace((previous) => ({ ...previous, activeId: id }));
  const addDocument = (doc: Manuscript) =>
    setWorkspace((previous) => ({
      ...previous,
      activeId: doc.id,
      documents: [doc, ...previous.documents].slice(0, 12),
    }));
  const setTheme = (theme: Theme) =>
    setWorkspace((previous) => ({ ...previous, theme }));
  return {
    workspace,
    manuscript,
    draft,
    ready,
    saveStatus,
    storageAvailable,
    updateDraft,
    updateView,
    openDocument,
    addDocument,
    setTheme,
  };
}
