"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { papersForMetric, type PaperMetric } from "./dashboard-data";

const submissionTime = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
  hourCycle: "h23",
});

export default function DashboardPaperDetails({
  metric,
  title,
  onClose,
}: {
  metric: PaperMetric;
  title: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const papers = papersForMetric(metric);
  const filtered = papers.filter((paper) =>
    `${paper.title} ${paper.authors.join(" ")}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  useEffect(() => {
    dialog.current?.showModal();
    search.current?.focus();
  }, []);
  function close() {
    dialog.current?.close();
    onClose();
  }

  return (
    <dialog
      ref={dialog}
      className="desk-modal modal-wide dashboard-details"
      aria-labelledby="paper-details-title"
      aria-describedby="paper-details-description"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="modal-heading">
        <h2 id="paper-details-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Close paper details"
          onClick={close}
        >
          <X size={19} />
        </button>
      </div>
      <p id="paper-details-description" className="dashboard-details-note">
        <strong>Illustrative paper list</strong> Actual titles, authors, and
        submission times were not included in the reference screenshots. These
        placeholders show the details layout and do not account for the
        dashboard totals.
      </p>
      <div className="dashboard-details-toolbar">
        <label className="dashboard-paper-search">
          <Search size={16} />
          <input
            ref={search}
            type="search"
            aria-label="Search papers by title or author"
            placeholder="Search title or author"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <span role="status">
          {filtered.length} of {papers.length} placeholder papers
        </span>
      </div>
      {filtered.length ? (
        <div className="dashboard-paper-table">
          <table>
            <caption className="dashboard-sr-only">
              Paper details. Submission times are in WIB, UTC+7.
            </caption>
            <thead>
              <tr>
                <th scope="col">Title of paper</th>
                <th scope="col">Authors</th>
                <th scope="col">
                  Submission time<small>WIB · UTC+7</small>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((paper) => (
                <tr key={paper.id}>
                  <th scope="row">{paper.title}</th>
                  <td data-label="Authors">{paper.authors.join(", ")}</td>
                  <td data-label="Submission time · WIB">
                    <time dateTime={paper.submittedAt}>
                      {submissionTime.format(new Date(paper.submittedAt))}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="dashboard-details-empty">
          <h3>
            {papers.length
              ? "No matching papers"
              : "No paper records available"}
          </h3>
          <p>
            {papers.length
              ? "Try another title or author name."
              : "Paper details will appear when journal records are connected."}
          </p>
          {query && (
            <button className="secondary-button" onClick={() => setQuery("")}>
              Clear search
            </button>
          )}
        </div>
      )}
      <div className="dashboard-details-footer">
        <button className="secondary-button" onClick={close}>
          Back to dashboard
        </button>
      </div>
    </dialog>
  );
}
