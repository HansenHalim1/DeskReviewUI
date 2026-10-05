"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  CircleCheck,
  CircleHelp,
  FileArchive,
  FileText,
  Highlighter,
  History,
  LayoutPanelLeft,
  LoaderCircle,
  LogOut,
  Maximize2,
  Menu,
  Minimize2,
  Minus,
  Monitor,
  Moon,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sun,
  Upload,
  X,
} from "lucide-react";
import {
  findings,
  reviewSummary,
  sampleManuscript,
  type Finding,
} from "./review-data";
import { downloadBundle, readDocx } from "./document-utils";
import {
  authorFiles,
  findingStatus,
  findingText,
  progress,
  type FindingDecision,
  type ReviewTab,
  type Theme,
} from "./reviewer-model";
import { useWorkspace } from "./use-workspace";
import ReviewerCard from "./reviewer-card";
import "./desk-review.css";

const tabs: ReviewTab[] = ["Overview", "Findings", "Similarity", "Files"];
function scrollWithin(
  container: HTMLDivElement | null,
  element: HTMLElement | null,
  center = true,
) {
  if (!container || !element || !container.clientHeight) return;
  const position =
    container.scrollTop +
    element.getBoundingClientRect().top -
    container.getBoundingClientRect().top;
  const offset = center
    ? Math.max(20, (container.clientHeight - element.clientHeight) / 2)
    : 20;
  container.scrollTo({
    top: Math.max(0, position - offset),
    behavior: "smooth",
  });
}
function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`desk-modal ${wide ? "modal-wide" : ""}`}
      aria-labelledby="modal-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export default function DeskReview() {
  const {
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
  } = useWorkspace();
  const [section, setSection] = useState<"review" | "documents">("review");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modal, setModal] = useState<"upload" | "package" | "help" | null>(
    null,
  );
  const [uploadError, setUploadError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const [downloading, setDownloading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [previewFile, setPreviewFile] = useState("author_review.md");
  const [toast, setToast] = useState("");
  const [undo, setUndo] = useState<{
    manuscriptId: string;
    findingId: number;
    previous: FindingDecision;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const restored = useRef("");
  const activeFindings = manuscript.sample ? findings : [];
  const counts = progress(draft, activeFindings);
  const files = authorFiles(manuscript, activeFindings, draft);
  const selectedIndex = activeFindings.findIndex(
    (f) => f.id === draft.view.selected,
  );
  const selectedFinding = activeFindings[selectedIndex];
  const visibleFindings = activeFindings.filter(
    (f) =>
      (statusFilter === "all" || findingStatus(draft, f) === statusFilter) &&
      (priorityFilter === "all" || f.severity === priorityFilter),
  );
  const selectedFile =
    files.find((file) => file.name === previewFile) ?? files[0];
  const wordCount = [
    manuscript.title,
    ...manuscript.paragraphs.map((p) => p.text),
  ]
    .join(" ")
    .trim()
    .split(/\s+/).length;

  useEffect(() => {
    if (!ready || restored.current === `${manuscript.id}:${section}`) return;
    const frame = requestAnimationFrame(() => {
      documentRef.current?.scrollTo({ top: draft.view.documentTop });
      reviewRef.current?.scrollTo({ top: draft.view.reviewTop });
      restored.current = `${manuscript.id}:${section}`;
    });
    return () => cancelAnimationFrame(frame);
  }, [
    ready,
    manuscript.id,
    section,
    draft.view.documentTop,
    draft.view.reviewTop,
  ]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6500);
    return () => clearTimeout(timer);
  }, [toast]);

  function switchTab(tab: ReviewTab) {
    updateView({ tab, reviewTop: 0 });
    reviewRef.current?.scrollTo({ top: 0 });
  }
  function openManuscript(id: string) {
    openDocument(id);
    setSection("review");
    setSidebarOpen(false);
    setQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setUndo(null);
  }
  function locateFinding(
    finding: Finding,
    target: "document" | "review" = "document",
  ) {
    setStatusFilter("all");
    setPriorityFilter("all");
    updateView({
      tab: "Findings",
      selected: finding.id,
      highlights: true,
      mobilePane: target,
      documentWide: target === "review" ? false : draft.view.documentWide,
    });
    requestAnimationFrame(() => {
      scrollWithin(
        documentRef.current,
        document.getElementById(`doc-${finding.paragraph}`),
      );
      scrollWithin(
        reviewRef.current,
        document.getElementById(`finding-${finding.id}`),
        false,
      );
    });
  }
  function nextPending() {
    const ordered = [
      ...activeFindings.slice(selectedIndex + 1),
      ...activeFindings.slice(0, selectedIndex + 1),
    ];
    const next = ordered.find((f) => findingStatus(draft, f) === "pending");
    if (next) {
      updateView({ documentWide: false });
      locateFinding(next, "review");
    }
  }
  function updateDecision(findingId: number, update: Partial<FindingDecision>) {
    updateDraft((previous) => ({
      ...previous,
      decisions: {
        ...previous.decisions,
        [findingId]: {
          ...(previous.decisions[findingId] ?? { status: "pending" }),
          ...update,
        },
      },
    }));
  }
  function replaceDecision(findingId: number, decision: FindingDecision) {
    updateDraft((previous) => ({
      ...previous,
      decisions: { ...previous.decisions, [findingId]: decision },
    }));
  }
  function commitDecision(
    findingId: number,
    decision: FindingDecision,
    message: string,
  ) {
    setUndo({
      manuscriptId: manuscript.id,
      findingId,
      previous: draft.decisions[findingId] ?? { status: "pending" },
    });
    replaceDecision(findingId, decision);
    setToast(message);
  }
  function undoDecision() {
    if (!undo || undo.manuscriptId !== manuscript.id) return;
    replaceDecision(undo.findingId, undo.previous);
    setUndo(null);
    setToast("Previous finding decision restored.");
  }
  function upload(file?: File) {
    if (!file) return;
    setUploadError("");
    startTransition(async () => {
      try {
        const doc = await readDocx(file);
        addDocument(doc);
        setSection("review");
        setModal(null);
        setQuery("");
        setUndo(null);
      } catch (error) {
        setUploadError(
          error instanceof Error
            ? error.message
            : "The document could not be opened. Please try another DOCX file.",
        );
      }
    });
  }
  async function exportAuthorPackage() {
    if (!files.length) return;
    setDownloading(true);
    try {
      await downloadBundle(files);
      setToast(
        "Author package downloaded. Private reviewer material was excluded.",
      );
    } catch {
      setToast("The ZIP could not be created. Please try again.");
    } finally {
      setDownloading(false);
    }
  }
  function openPackage(name = "author_review.md") {
    setPreviewFile(name);
    setModal("package");
  }
  function renderParagraph(text: string, paragraphId: string) {
    const ranges: { start: number; end: number; finding?: Finding }[] = [];
    if (draft.view.highlights)
      activeFindings
        .filter((f) => f.paragraph === paragraphId)
        .forEach((finding) => {
          const start = text.indexOf(finding.quote);
          if (start >= 0)
            ranges.push({ start, end: start + finding.quote.length, finding });
        });
    if (query.trim()) {
      let start = text.toLowerCase().indexOf(query.toLowerCase());
      while (start >= 0) {
        if (
          !ranges.some((r) => start < r.end && start + query.length > r.start)
        )
          ranges.push({ start, end: start + query.length });
        start = text
          .toLowerCase()
          .indexOf(query.toLowerCase(), start + query.length);
      }
    }
    ranges.sort((a, b) => a.start - b.start);
    const content: ReactNode[] = [];
    let cursor = 0;
    ranges.forEach((range, i) => {
      if (range.start < cursor) return;
      content.push(text.slice(cursor, range.start));
      content.push(
        range.finding ? (
          <mark
            key={i}
            className={`passage-mark mark-${range.finding.severity} ${draft.view.selected === range.finding.id ? "mark-selected" : ""} ${findingStatus(draft, range.finding) === "rejected" ? "mark-rejected" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={`Open finding ${range.finding.id}: ${findingText(range.finding, draft).title}`}
            onClick={() => locateFinding(range.finding!, "review")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                locateFinding(range.finding!, "review");
              }
            }}
          >
            {text.slice(range.start, range.end)}
            <sup>{range.finding.id}</sup>
          </mark>
        ) : (
          <mark key={i} className="search-mark">
            {text.slice(range.start, range.end)}
          </mark>
        ),
      );
      cursor = range.end;
    });
    content.push(text.slice(cursor));
    return content;
  }
  const reviewStatus = !activeFindings.length
    ? "Document preview"
    : !counts.reviewed
      ? "Not reviewed"
      : counts.pending
        ? "In review"
        : "Findings reviewed";

  return (
    <div className="desk-app" data-theme={workspace.theme}>
      {sidebarOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`desk-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <a
          className="brand"
          href="/deskreview"
          aria-label="BINUS deskreview home"
        >
          <span className="brand-logos">
            <Image
              className="university-logo"
              src="/branding/binus-university.svg"
              width={122}
              height={74}
              alt="BINUS University"
              unoptimized
            />
            <span className="brand-logo-divider" aria-hidden="true" />
            <Image
              className="journal-logo"
              src="/branding/binus-journal.svg"
              width={1146}
              height={508}
              alt="BINUS Journal"
              unoptimized
            />
          </span>
          <span className="brand-name">
            deskreview<small>REVIEWER WORKSPACE</small>
          </span>
        </a>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          <button
            className={`nav-item ${section === "review" ? "nav-active" : ""}`}
            onClick={() => {
              setSection("review");
              setSidebarOpen(false);
            }}
          >
            <LayoutPanelLeft size={18} /> Current review
          </button>
          <button
            className={`nav-item ${section === "documents" ? "nav-active" : ""}`}
            onClick={() => {
              setSection("documents");
              setSidebarOpen(false);
            }}
          >
            <History size={18} /> Documents & history{" "}
            <span className="nav-count">{workspace.documents.length + 1}</span>
          </button>
        </nav>
        <div className="recent-heading">
          <span className="nav-label">RECENT DOCUMENTS</span>
          <Badge>LOCAL</Badge>
        </div>
        <div className="recent-documents">
          {[...workspace.documents.slice(0, 3), sampleManuscript].map((doc) => (
            <button
              key={doc.id}
              className={`recent-document ${doc.id === manuscript.id && section === "review" ? "recent-active" : ""}`}
              onClick={() => openManuscript(doc.id)}
            >
              <FileText size={16} />
              <span>
                <strong>{doc.sample ? "Urban green spaces" : doc.title}</strong>
                <small>
                  {doc.sample ? "Sample manuscript" : "Document preview"}
                </small>
              </span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <form action="/api/auth/logout" method="post"><button className="help-button" type="submit"><LogOut size={16} /> Lock workspace</button></form>
          <div className="local-note">
            <ShieldCheck size={18} />
            <strong>Browser-local workspace</strong>
            <p>
              Drafts and decisions are saved on this device. They aren’t synced
              with the other reviewer.
            </p>
          </div>
          <button className="help-button" onClick={() => setModal("help")}>
            <CircleHelp size={16} /> Review & export guide{" "}
            <ArrowUpRight size={13} />
          </button>
        </div>
      </aside>
      <div className="desk-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span>Reviewer workspace</span>
            <ChevronRight size={14} />
            <strong>
              {section === "documents" ? "Documents" : "Desk review"}
            </strong>
          </div>
          <div className="topbar-actions">
            <span
              className={`save-indicator ${storageAvailable ? "" : "save-error"}`}
              role="status"
            >
              {storageAvailable ? (
                <CircleCheck size={13} />
              ) : (
                <CircleHelp size={13} />
              )}
              <span>{saveStatus}</span>
            </span>
            <label className="theme-control">
              {workspace.theme === "dark" ? (
                <Moon size={15} />
              ) : workspace.theme === "light" ? (
                <Sun size={15} />
              ) : (
                <Monitor size={15} />
              )}
              <select
                aria-label="Color theme"
                value={workspace.theme}
                onChange={(e) => setTheme(e.target.value as Theme)}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </div>
        </header>
        <main className="desk-content">
          {section === "documents" ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="page-eyebrow">YOUR WORKSPACE</div>
                  <h1>Documents & review history</h1>
                  <p>
                    Reopen a manuscript with its decisions, notes, and reading
                    position.
                  </p>
                </div>
                <button
                  className="primary-button"
                  disabled={!ready}
                  onClick={() => {
                    setUploadError("");
                    setModal("upload");
                  }}
                >
                  <Plus size={16} /> Open manuscript
                </button>
              </div>
              <section className="history-page">
                <div className="history-heading">
                  <h2>Recent manuscripts</h2>
                  <Badge>
                    <ShieldCheck size={12} /> Stored on this browser
                  </Badge>
                </div>
                {[...workspace.documents, sampleManuscript].map((doc) => {
                  const localDraft = workspace.drafts[doc.id];
                  const reviewed = localDraft
                    ? progress(localDraft, doc.sample ? findings : []).reviewed
                    : 0;
                  return (
                    <button
                      className="history-row"
                      key={doc.id}
                      onClick={() => openManuscript(doc.id)}
                    >
                      <span className="file-icon">
                        <FileText size={22} />
                      </span>
                      <span>
                        <strong>{doc.title}</strong>
                        <small>{doc.name}</small>
                      </span>
                      <Badge
                        tone={doc.sample && reviewed ? "green" : "neutral"}
                      >
                        {doc.sample
                          ? `${reviewed} / ${findings.length} reviewed`
                          : "Preview only"}
                      </Badge>
                      <ArrowRight size={17} />
                    </button>
                  );
                })}
                <p className="history-note">
                  <ShieldCheck size={14} /> Clearing browser data removes your
                  saved drafts. This workspace is not shared between devices.
                </p>
              </section>
            </>
          ) : (
            <>
              <div className="page-heading manuscript-heading">
                <div>
                  <div className="page-eyebrow">
                    DESK REVIEW <span>·</span>{" "}
                    <span className="review-status">{reviewStatus}</span>
                  </div>
                  <h1>{manuscript.title}</h1>
                  <p>{manuscript.authors}</p>
                </div>
                <button
                  className="secondary-button"
                  disabled={!ready}
                  onClick={() => {
                    setUploadError("");
                    setModal("upload");
                  }}
                >
                  <Plus size={16} />
                  <span>Open manuscript</span>
                </button>
              </div>
              <div className="manuscript-bar">
                <div className="manuscript-info">
                  <span className="file-icon">
                    <FileText size={22} />
                  </span>
                  <div>
                    <div className="manuscript-name">
                      {manuscript.name}
                      {manuscript.sample && <Badge>Sample manuscript</Badge>}
                    </div>
                    <div className="manuscript-meta">
                      <span>DOCX</span>
                      <span>·</span>
                      <span>{wordCount.toLocaleString()} words</span>
                      <span>·</span>
                      <span>Original text preserved</span>
                    </div>
                  </div>
                </div>
                <button
                  className="primary-button package-button"
                  disabled={!ready}
                  onClick={() => openPackage()}
                >
                  <FileArchive size={16} />
                  <span>Author package</span>
                  <span className="button-count">{counts.included}</span>
                </button>
              </div>
              <div className="mobile-pane-switch">
                <button
                  className={
                    draft.view.mobilePane === "document" ? "active" : ""
                  }
                  onClick={() => updateView({ mobilePane: "document" })}
                >
                  <FileText size={15} />
                  Manuscript
                </button>
                <button
                  className={draft.view.mobilePane === "review" ? "active" : ""}
                  onClick={() => updateView({ mobilePane: "review" })}
                >
                  <LayoutPanelLeft size={15} />
                  Review findings
                </button>
              </div>
              <div
                ref={workspaceRef}
                className={`review-workspace mobile-show-${draft.view.mobilePane} ${draft.view.documentWide ? "document-wide" : ""}`}
                style={{
                  gridTemplateColumns: draft.view.documentWide
                    ? "1fr"
                    : `${draft.view.split}fr 8px ${100 - draft.view.split}fr`,
                }}
              >
                <section
                  className="document-panel"
                  aria-label="Manuscript preview"
                >
                  <div className="panel-toolbar">
                    <div className="panel-title">
                      <FileText size={16} />
                      <strong>Manuscript</strong>
                    </div>
                    <div className="document-tools">
                      <button
                        className={`icon-button ${searchOpen ? "tool-active" : ""}`}
                        aria-label="Search manuscript"
                        onClick={() => setSearchOpen(!searchOpen)}
                      >
                        <Search size={16} />
                      </button>
                      <span className="toolbar-divider" />
                      <button
                        className="icon-button"
                        aria-label="Zoom out"
                        disabled={draft.view.zoom === 80}
                        onClick={() =>
                          updateView({
                            zoom: Math.max(80, draft.view.zoom - 10),
                          })
                        }
                      >
                        <Minus size={14} />
                      </button>
                      <span className="zoom-value">{draft.view.zoom}%</span>
                      <button
                        className="icon-button"
                        aria-label="Zoom in"
                        disabled={draft.view.zoom === 130}
                        onClick={() =>
                          updateView({
                            zoom: Math.min(130, draft.view.zoom + 10),
                          })
                        }
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        className="icon-button expand-document"
                        aria-label={
                          draft.view.documentWide
                            ? "Show review panel"
                            : "Expand manuscript"
                        }
                        onClick={() =>
                          updateView({ documentWide: !draft.view.documentWide })
                        }
                      >
                        {draft.view.documentWide ? (
                          <Minimize2 size={15} />
                        ) : (
                          <Maximize2 size={15} />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="document-subbar">
                    <span>Text preview</span>
                    <button
                      className={`highlight-toggle ${draft.view.highlights ? "highlight-on" : ""}`}
                      onClick={() =>
                        updateView({ highlights: !draft.view.highlights })
                      }
                      aria-pressed={draft.view.highlights}
                    >
                      <Highlighter size={13} />
                      Highlights
                      <span className="mini-switch">
                        <span />
                      </span>
                    </button>
                  </div>
                  {searchOpen && (
                    <div className="document-search">
                      <Search size={15} />
                      <input
                        autoFocus
                        aria-label="Find text in manuscript"
                        placeholder="Find in manuscript…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && query.trim()) {
                            const match = manuscript.paragraphs.find((p) =>
                              p.text
                                .toLowerCase()
                                .includes(query.toLowerCase()),
                            );
                            if (match)
                              scrollWithin(
                                documentRef.current,
                                document.getElementById(`doc-${match.id}`),
                              );
                          }
                        }}
                      />
                      <span>
                        {query.trim()
                          ? `${manuscript.paragraphs.filter((p) => p.text.toLowerCase().includes(query.toLowerCase())).length} passages`
                          : ""}
                      </span>
                      <button
                        className="icon-button"
                        aria-label="Close search"
                        onClick={() => {
                          setSearchOpen(false);
                          setQuery("");
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <div
                    className="document-scroll"
                    ref={documentRef}
                    onScroll={(e) => {
                      if (
                        ready &&
                        restored.current === `${manuscript.id}:${section}`
                      )
                        updateView({ documentTop: e.currentTarget.scrollTop });
                    }}
                  >
                    <article
                      className="document-paper"
                      style={{ fontSize: `${(15 * draft.view.zoom) / 100}px` }}
                    >
                      <span className="paper-label">MANUSCRIPT</span>
                      <h2>{manuscript.title}</h2>
                      <p className="paper-authors">{manuscript.authors}</p>
                      {manuscript.sample && (
                        <p className="paper-affiliation">
                          ¹ Department of Urban Studies &nbsp; ² School of
                          Public Health
                        </p>
                      )}
                      <div className="paper-rule" />
                      {manuscript.paragraphs.map((p) =>
                        p.heading ? (
                          <h3 id={`doc-${p.id}`} key={p.id}>
                            {p.text}
                          </h3>
                        ) : (
                          <p
                            id={`doc-${p.id}`}
                            key={p.id}
                            className={`${p.id === "keywords" ? "paper-keywords" : ""} ${selectedFinding?.paragraph === p.id ? "paragraph-selected" : ""}`}
                          >
                            {renderParagraph(p.text, p.id)}
                          </p>
                        ),
                      )}
                      <div className="paper-end">— End of manuscript —</div>
                    </article>
                  </div>
                  <div className="document-footer">
                    <ShieldCheck size={12} />
                    <span>Review decisions don’t modify the manuscript.</span>
                  </div>
                </section>
                <div
                  className="panel-resizer"
                  role="separator"
                  aria-label="Resize manuscript and review panels"
                  aria-orientation="vertical"
                  aria-valuenow={Math.round(draft.view.split)}
                  aria-valuemin={35}
                  aria-valuemax={65}
                  tabIndex={0}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (e.buttons !== 1) return;
                    const rect = workspaceRef.current?.getBoundingClientRect();
                    if (rect)
                      updateView({
                        split: Math.min(
                          65,
                          Math.max(
                            35,
                            ((e.clientX - rect.left) / rect.width) * 100,
                          ),
                        ),
                      });
                  }}
                  onPointerUp={(e) => {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }}
                  onKeyDown={(e) => {
                    if (["ArrowLeft", "ArrowRight", "Home"].includes(e.key)) {
                      e.preventDefault();
                      updateView({
                        split:
                          e.key === "Home"
                            ? 51
                            : Math.max(
                                35,
                                Math.min(
                                  65,
                                  draft.view.split +
                                    (e.key === "ArrowRight" ? 2 : -2),
                                ),
                              ),
                      });
                    }
                  }}
                >
                  <span />
                </div>
                <section
                  className="insights-panel"
                  aria-label="Reviewer workspace"
                >
                  <div className="panel-toolbar">
                    <div className="panel-title">
                      <LayoutPanelLeft size={16} />
                      <strong>Review workspace</strong>
                    </div>
                    <Badge tone={counts.pending ? "neutral" : "green"}>
                      {counts.reviewed} / {counts.total} reviewed
                    </Badge>
                  </div>
                  <div
                    className="review-tabs"
                    role="tablist"
                    aria-label="Review sections"
                  >
                    {tabs.map((tab, i) => (
                      <button
                        id={`tab-${i}`}
                        key={tab}
                        role="tab"
                        aria-selected={draft.view.tab === tab}
                        aria-controls="review-tabpanel"
                        tabIndex={draft.view.tab === tab ? 0 : -1}
                        className={draft.view.tab === tab ? "tab-active" : ""}
                        onClick={() => switchTab(tab)}
                        onKeyDown={(e) => {
                          if (
                            ["ArrowRight", "ArrowLeft", "Home", "End"].includes(
                              e.key,
                            )
                          ) {
                            e.preventDefault();
                            const index =
                              e.key === "Home"
                                ? 0
                                : e.key === "End"
                                  ? 3
                                  : (i + (e.key === "ArrowRight" ? 1 : 3)) % 4;
                            switchTab(tabs[index]);
                            document.getElementById(`tab-${index}`)?.focus();
                          }
                        }}
                      >
                        {tab}
                        {tab === "Findings" && (
                          <span className="tab-count">{counts.total}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div
                    className="insights-scroll"
                    ref={reviewRef}
                    id="review-tabpanel"
                    role="tabpanel"
                    aria-labelledby={`tab-${tabs.indexOf(draft.view.tab)}`}
                    tabIndex={0}
                    onScroll={(e) => {
                      if (
                        ready &&
                        restored.current === `${manuscript.id}:${section}`
                      )
                        updateView({ reviewTop: e.currentTarget.scrollTop });
                    }}
                  >
                    {!ready ? (
                      <div className="empty-state">
                        <LoaderCircle size={28} className="spin" />
                        <h3>Opening your workspace…</h3>
                      </div>
                    ) : draft.view.tab === "Overview" ? (
                      <>
                        <div className="overview-intro">
                          <span className="section-eyebrow">
                            EDITORIAL TRIAGE
                          </span>
                          <h2>
                            {activeFindings.length
                              ? "Review the concerns. Decide what matters."
                              : "Document ready for review"}
                          </h2>
                          <p>
                            {activeFindings.length
                              ? "Evaluate each suggested finding in context, then prepare the feedback you want the author to receive."
                              : "Your document is available in the manuscript panel. Live finding generation will be connected after this interface feedback round."}
                          </p>
                        </div>
                        <div className="progress-card">
                          <div>
                            <strong>
                              {counts.reviewed} of {counts.total} findings
                              reviewed
                            </strong>
                            <span>{counts.pending} pending</span>
                          </div>
                          <progress
                            value={counts.reviewed}
                            max={counts.total || 1}
                            aria-label="Finding review progress"
                          />
                          <div className="progress-breakdown">
                            <span>
                              <i className="accepted-dot" />
                              {counts.included} for author
                            </span>
                            <span>
                              <i className="rejected-dot" />
                              {counts.rejected} rejected
                            </span>
                          </div>
                          <button
                            className="primary-button"
                            disabled={!counts.pending}
                            onClick={nextPending}
                          >
                            {counts.reviewed
                              ? "Next pending finding"
                              : "Start reviewing"}
                            <ArrowRight size={15} />
                          </button>
                        </div>
                        {activeFindings.length > 0 && (
                          <>
                            <div className="review-section">
                              <div className="section-heading">
                                <h3>Suggested review priorities</h3>
                                <Badge>Automated suggestions</Badge>
                              </div>
                              <div className="priority-grid">
                                {[
                                  ["high", "High priority"],
                                  ["medium", "Medium priority"],
                                  ["low", "Low priority"],
                                ].map(([priority, label]) => (
                                  <button
                                    key={priority}
                                    onClick={() => {
                                      setPriorityFilter(priority);
                                      setStatusFilter("all");
                                      switchTab("Findings");
                                    }}
                                  >
                                    <span
                                      className={`priority-dot ${priority}`}
                                    />
                                    <strong>
                                      {
                                        activeFindings.filter(
                                          (f) => f.severity === priority,
                                        ).length
                                      }
                                    </strong>
                                    <span>{label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="review-section overview">
                              <h3>Manuscript context</h3>
                              <p>{reviewSummary}</p>
                              <span className="field-hint">
                                Suggested context · your assessment below
                                remains authoritative.
                              </span>
                            </div>
                          </>
                        )}
                        <section className="assessment-section">
                          <div className="section-heading">
                            <h3>Reviewer assessment</h3>
                            <Badge>
                              <ShieldCheck size={11} /> Private by default
                            </Badge>
                          </div>
                          <label htmlFor="recommendation">
                            Internal recommendation
                          </label>
                          <select
                            id="recommendation"
                            value={draft.recommendation}
                            onChange={(e) =>
                              updateDraft((previous) => ({
                                ...previous,
                                recommendation: e.target
                                  .value as typeof draft.recommendation,
                              }))
                            }
                          >
                            <option value="">Choose an outcome…</option>
                            <option>Proceed</option>
                            <option>Request revisions</option>
                            <option>Decline</option>
                          </select>
                          <p className="field-hint">
                            Internal recommendation. Never included in author
                            files.
                          </p>
                          <label htmlFor="internal-assessment">
                            Internal notes
                          </label>
                          <textarea
                            id="internal-assessment"
                            rows={3}
                            placeholder="Editorial considerations, questions, or discussion with the other reviewer…"
                            value={draft.internalNote}
                            onChange={(e) =>
                              updateDraft((previous) => ({
                                ...previous,
                                internalNote: e.target.value,
                              }))
                            }
                          />
                          <p className="field-hint">
                            Saved on this browser. Never included in author
                            files.
                          </p>
                          <label htmlFor="author-assessment">
                            Message to author
                          </label>
                          <textarea
                            id="author-assessment"
                            rows={4}
                            placeholder="Write the overall assessment you would like to share…"
                            value={draft.authorAssessment}
                            onChange={(e) =>
                              updateDraft((previous) => ({
                                ...previous,
                                authorAssessment: e.target.value,
                              }))
                            }
                          />
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={draft.shareAssessment}
                              onChange={(e) =>
                                updateDraft((previous) => ({
                                  ...previous,
                                  shareAssessment: e.target.checked,
                                }))
                              }
                            />
                            <span>
                              Include this assessment in the author package
                            </span>
                          </label>
                          {draft.shareAssessment &&
                            !draft.authorAssessment.trim() && (
                              <p className="field-hint">
                                Add an assessment above to include it.
                              </p>
                            )}
                        </section>
                        <div className="review-footnote">
                          <ShieldCheck size={14} />
                          Accepted and edited findings are shared. Internal
                          notes and rejected findings are not.
                        </div>
                      </>
                    ) : draft.view.tab === "Findings" ? (
                      <>
                        <div className="findings-heading">
                          <div>
                            <h2>Review findings</h2>
                            <p>
                              Accept, refine, or reject each suggested concern.
                            </p>
                          </div>
                          <button
                            className="secondary-button next-pending"
                            disabled={!counts.pending}
                            onClick={nextPending}
                          >
                            Next pending <ArrowRight size={14} />
                          </button>
                        </div>
                        <div className="finding-navigation">
                          <span>
                            {selectedFinding
                              ? `Finding ${selectedIndex + 1} of ${counts.total}`
                              : `${counts.pending} awaiting review`}
                          </span>
                          <div>
                            <button
                              className="icon-button"
                              aria-label="Previous finding"
                              disabled={selectedIndex <= 0}
                              onClick={() =>
                                locateFinding(
                                  activeFindings[selectedIndex - 1],
                                  "review",
                                )
                              }
                            >
                              <ArrowLeft size={14} />
                            </button>
                            <button
                              className="icon-button"
                              aria-label="Next finding"
                              disabled={
                                selectedIndex >= counts.total - 1 ||
                                !counts.total
                              }
                              onClick={() =>
                                locateFinding(
                                  activeFindings[selectedIndex + 1],
                                  "review",
                                )
                              }
                            >
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                        <div
                          className="finding-filters"
                          aria-label="Filter findings by decision"
                        >
                          {[
                            "all",
                            "pending",
                            "accepted",
                            "edited",
                            "rejected",
                          ].map((status) => (
                            <button
                              key={status}
                              aria-pressed={statusFilter === status}
                              className={
                                statusFilter === status ? "filter-active" : ""
                              }
                              onClick={() => setStatusFilter(status)}
                            >
                              {status === "all"
                                ? "All"
                                : status[0].toUpperCase() + status.slice(1)}
                              <span>
                                {status === "all"
                                  ? counts.total
                                  : counts[
                                      status as
                                        | "pending"
                                        | "accepted"
                                        | "edited"
                                        | "rejected"
                                    ]}
                              </span>
                            </button>
                          ))}
                        </div>
                        <label className="priority-filter">
                          Priority
                          <select
                            aria-label="Filter by priority"
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                          >
                            <option value="all">All priorities</option>
                            <option value="high">High priority</option>
                            <option value="medium">Medium priority</option>
                            <option value="low">Low priority</option>
                          </select>
                        </label>
                        <div className="finding-list">
                          {visibleFindings.map((finding) => (
                            <ReviewerCard
                              key={finding.id}
                              finding={finding}
                              decision={
                                draft.decisions[finding.id] ?? {
                                  status: "pending",
                                }
                              }
                              active={draft.view.selected === finding.id}
                              editing={draft.view.editing === finding.id}
                              onLocate={() => locateFinding(finding)}
                              onUpdate={(update) =>
                                updateDecision(finding.id, update)
                              }
                              onCommit={(decision, message) =>
                                commitDecision(finding.id, decision, message)
                              }
                              onEdit={(editing) =>
                                updateView({
                                  editing: editing ? finding.id : null,
                                  selected: finding.id,
                                })
                              }
                            />
                          ))}
                        </div>
                        {!visibleFindings.length && (
                          <div className="empty-state">
                            <CircleCheck size={27} />
                            <h3>
                              {activeFindings.length
                                ? "No findings match this filter"
                                : "No generated findings yet"}
                            </h3>
                            <p>
                              {activeFindings.length
                                ? "Choose another status or priority to continue reviewing."
                                : "This upload is a text preview. A live review service is not connected."}
                            </p>
                            {activeFindings.length ? (
                              <button
                                className="secondary-button"
                                onClick={() => {
                                  setStatusFilter("all");
                                  setPriorityFilter("all");
                                }}
                              >
                                Show all findings
                              </button>
                            ) : (
                              <button
                                className="secondary-button"
                                onClick={() =>
                                  openManuscript(sampleManuscript.id)
                                }
                              >
                                Open sample manuscript
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    ) : draft.view.tab === "Similarity" ? (
                      <>
                        <div className="findings-heading">
                          <div>
                            <h2>Similarity evidence</h2>
                            <p>
                              Inspect overlap in context before drawing a
                              conclusion.
                            </p>
                          </div>
                          <ShieldCheck size={20} />
                        </div>
                        {manuscript.sample ? (
                          <>
                            <div className="similarity-card">
                              <strong>
                                8<span>%</span>
                              </strong>
                              <div>
                                <Badge>Illustrative sample score</Badge>
                                <h3>Overlapping language</h3>
                                <p>No live similarity service is connected.</p>
                              </div>
                            </div>
                            <p className="section-description">
                              Common terminology and properly cited material can
                              contribute to overlap. Review the passage and its
                              source rather than relying on the score alone.
                            </p>
                            {[
                              {
                                id: "introduction",
                                kind: "Common phrasing",
                                text: "More than half of the global population now lives in urban areas…",
                                source: "Source verification needed",
                              },
                              {
                                id: "measures",
                                kind: "Standard terminology",
                                text: "Well-being was measured using the WHO-5 Well-Being Index.",
                                source: "Source verification needed",
                              },
                            ].map((match) => (
                              <button
                                key={match.id}
                                className="similarity-match"
                                onClick={() => {
                                  updateView({ mobilePane: "document" });
                                  requestAnimationFrame(() =>
                                    scrollWithin(
                                      documentRef.current,
                                      document.getElementById(
                                        `doc-${match.id}`,
                                      ),
                                    ),
                                  );
                                }}
                              >
                                <Badge>{match.kind}</Badge>
                                <blockquote>“{match.text}”</blockquote>
                                <span>
                                  {match.source}
                                  <ArrowUpRight size={14} />
                                </span>
                              </button>
                            ))}
                          </>
                        ) : (
                          <div className="empty-state">
                            <ShieldCheck size={29} />
                            <h3>No similarity evidence available</h3>
                            <p>
                              A live similarity service must supply source
                              matches for this document.
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="findings-heading">
                          <div>
                            <h2>Author-facing files</h2>
                            <p>Only reviewer-approved content is packaged.</p>
                          </div>
                          <FileArchive size={20} />
                        </div>
                        <div className="export-summary">
                          <strong>{counts.included}</strong>
                          <span>findings included for the author</span>
                        </div>
                        {files.length ? (
                          <div className="output-list">
                            {files.map((file) => (
                              <button
                                key={file.name}
                                className="output-card"
                                onClick={() => openPackage(file.name)}
                              >
                                <span className="output-icon">
                                  <FileText size={22} />
                                </span>
                                <span>
                                  <strong>{file.name}</strong>
                                  <small>{file.description}</small>
                                  <span>{file.kind}</span>
                                </span>
                                <ArrowUpRight size={16} />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="empty-state">
                            <FileArchive size={28} />
                            <h3>No approved content yet</h3>
                            <p>
                              Accept or edit findings, or explicitly include a
                              message to the author.
                            </p>
                            <button
                              className="secondary-button"
                              onClick={() =>
                                counts.pending
                                  ? nextPending()
                                  : switchTab("Overview")
                              }
                            >
                              Continue reviewing <ArrowRight size={14} />
                            </button>
                          </div>
                        )}
                        <div className="export-boundary">
                          <ShieldCheck size={18} />
                          <div>
                            <strong>
                              Private reviewer material stays here.
                            </strong>
                            <p>
                              Rejected and pending findings, rejection reasons,
                              internal notes, and the internal recommendation
                              are never included in these files.
                            </p>
                          </div>
                        </div>
                        <button
                          className="primary-button full-width"
                          onClick={() => openPackage()}
                        >
                          <FileArchive size={16} />
                          Preview author package
                        </button>
                      </>
                    )}
                  </div>
                  <div className="insights-footer">
                    <span>{counts.included} included for author</span>
                    <span>{counts.pending} pending</span>
                    {undo?.manuscriptId === manuscript.id && (
                      <button className="text-button" onClick={undoDecision}>
                        <RotateCcw size={12} />
                        Undo last decision
                      </button>
                    )}
                  </div>
                </section>
              </div>
              <div className="workspace-bottom">
                <span>
                  <ShieldCheck size={13} /> Browser-local drafts · not synced
                  between reviewers
                </span>
                <span>
                  {manuscript.sample
                    ? "Sample review content · live backend not connected"
                    : "Local document preview · live backend not connected"}
                </span>
              </div>
            </>
          )}
        </main>
      </div>
      {modal === "upload" && (
        <Modal
          title="Open a manuscript"
          onClose={() => {
            if (!pending) setModal(null);
          }}
        >
          <p className="modal-description">
            Preview the document and keep your review work together.
          </p>
          <button
            className={`upload-zone ${dragging ? "upload-dragging" : ""}`}
            disabled={pending}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (!pending) upload(e.dataTransfer.files[0]);
            }}
          >
            <span className="upload-icon">
              {pending ? (
                <LoaderCircle size={28} className="spin" />
              ) : (
                <Upload size={28} />
              )}
            </span>
            <strong>
              {pending ? "Opening manuscript…" : "Drop a DOCX document here"}
            </strong>
            <span>or browse files</span>
            <small>Word documents (.docx) · Up to 4 MB</small>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {uploadError && (
            <p className="upload-error" role="alert">
              {uploadError}
            </p>
          )}
          <div className="info-note">
            <ShieldCheck size={17} />
            <p>
              Documents are previewed locally. Review generation is not
              connected; uploaded documents receive no simulated findings.
            </p>
          </div>
          <button
            className="text-button modal-sample-link"
            disabled={pending}
            onClick={() => {
              openManuscript(sampleManuscript.id);
              setModal(null);
            }}
          >
            Open sample manuscript <ArrowRight size={14} />
          </button>
        </Modal>
      )}
      {modal === "package" && (
        <Modal
          title="Author package preview"
          onClose={() => setModal(null)}
          wide
        >
          <p className="modal-description">
            Check exactly what the author will receive. No decision log is
            included.
          </p>
          <div className="package-inclusion">
            <Badge tone="green">{counts.included} approved findings</Badge>
            <Badge>
              {draft.shareAssessment && draft.authorAssessment.trim()
                ? "Assessment included"
                : "Assessment not included"}
            </Badge>
          </div>
          {counts.pending > 0 && (
            <div className="pending-warning">
              <CircleHelp size={17} />
              <p>
                <strong>{counts.pending} findings still pending.</strong> They
                will be excluded. Continue reviewing or export only the approved
                content below.
              </p>
            </div>
          )}
          {draft.view.editing !== null && (
            <div className="pending-warning">
              <PencilNotice />
              <p>
                An edit is still open. The package uses the last accepted
                wording until you select Save & accept.
              </p>
            </div>
          )}
          {files.length ? (
            <>
              <div
                className="package-file-tabs"
                role="tablist"
                aria-label="Author package files"
              >
                {files.map((file, i) => (
                  <button
                    key={file.name}
                    id={`package-file-${i}`}
                    role="tab"
                    aria-selected={selectedFile?.name === file.name}
                    aria-controls="package-file-content"
                    tabIndex={selectedFile?.name === file.name ? 0 : -1}
                    className={selectedFile?.name === file.name ? "active" : ""}
                    onClick={() => setPreviewFile(file.name)}
                    onKeyDown={(e) => {
                      if (
                        ["ArrowRight", "ArrowLeft", "Home", "End"].includes(
                          e.key,
                        )
                      ) {
                        e.preventDefault();
                        const next =
                          e.key === "Home"
                            ? 0
                            : e.key === "End"
                              ? files.length - 1
                              : (i + 1) % files.length;
                        setPreviewFile(files[next].name);
                        document
                          .getElementById(`package-file-${next}`)
                          ?.focus();
                      }
                    }}
                  >
                    <FileText size={14} />
                    {file.name}
                  </button>
                ))}
              </div>
              <pre
                id="package-file-content"
                className="file-preview-content"
                role="tabpanel"
                aria-labelledby={`package-file-${files.findIndex((file) => file.name === selectedFile?.name)}`}
                tabIndex={0}
              >
                {selectedFile?.content}
              </pre>
            </>
          ) : (
            <div className="empty-state">
              <FileArchive size={30} />
              <h3>No approved content yet</h3>
              <p>
                Accept findings or explicitly include an assessment before
                downloading an author package.
              </p>
            </div>
          )}
          <div className="package-footer">
            <button
              className="secondary-button"
              onClick={() => {
                setModal(null);
                if (counts.pending) nextPending();
                else switchTab("Overview");
              }}
            >
              Continue reviewing
            </button>
            <button
              className="primary-button"
              disabled={!files.length || downloading}
              onClick={exportAuthorPackage}
            >
              {downloading ? (
                <LoaderCircle size={15} className="spin" />
              ) : (
                <ArrowDownToLine size={15} />
              )}
              {counts.pending
                ? "Download accepted findings"
                : "Download author ZIP"}
            </button>
          </div>
          <p className="field-hint package-privacy">
            Excluded: pending and rejected findings, internal notes, reasons,
            and internal recommendations.
          </p>
        </Modal>
      )}
      {modal === "help" && (
        <Modal title="Review and export guide" onClose={() => setModal(null)}>
          <div className="help-steps">
            <section>
              <h3>1. Evaluate findings in context</h3>
              <p>
                Select a passage link to read it in the manuscript. Use Next
                pending to continue through undecided findings.
              </p>
            </section>
            <section>
              <h3>2. Accept, edit, or reject</h3>
              <p>
                Accepted and saved edits appear in the author package. Rejected
                findings stay private. Undo restores the previous decision; an
                editor draft is not shared until saved and accepted.
              </p>
            </section>
            <section>
              <h3>3. Preview before sharing</h3>
              <p>
                The author ZIP contains final feedback only. The overall
                assessment is included only when explicitly selected. There is
                no decision log.
              </p>
            </section>
            <section>
              <h3>Storage and sample content</h3>
              <p>
                Your drafts are saved on this browser, not shared between
                reviewers or devices. The included manuscript uses illustrative
                findings. Live review processing is not connected.
              </p>
            </section>
          </div>
          <button
            className="primary-button full-width"
            onClick={() => setModal(null)}
          >
            Return to review
          </button>
        </Modal>
      )}
      {toast && (
        <div className="desk-toast" role="status">
          <CircleCheck size={17} />
          <span>{toast}</span>
          {undo?.manuscriptId === manuscript.id && (
            <button className="text-button" onClick={undoDecision}>
              Undo
            </button>
          )}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function PencilNotice() {
  return <FileText size={17} />;
}
