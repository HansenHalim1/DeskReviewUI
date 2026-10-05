"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  CalendarDays,
  CircleHelp,
} from "lucide-react";
import {
  journalSnapshot as snapshot,
  type DashboardMetric,
  type PaperMetric,
} from "./dashboard-data";
import DashboardPaperDetails from "./dashboard-paper-details";
import "./journal-dashboard.css";

function format(value: number, unit?: DashboardMetric["unit"]) {
  return `${value.toLocaleString()}${unit === "percent" ? "%" : unit === "days" ? " days" : ""}`;
}

function MetricsTable({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: DashboardMetric[];
}) {
  return (
    <section className="dashboard-table-card">
      <div className="dashboard-table-heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div
        className="dashboard-table-scroll"
        role="region"
        aria-label={title}
        tabIndex={0}
      >
        <table>
          <caption className="dashboard-sr-only">
            {title}: reference period compared with all time
          </caption>
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col">
                Reference period
                <small>
                  {snapshot.start} — {snapshot.end}
                </small>
              </th>
              <th scope="col">All time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.name}
                className={row.emphasis ? "dashboard-emphasis" : undefined}
              >
                <th
                  scope="row"
                  className={row.indent ? "dashboard-indented" : undefined}
                >
                  {row.name}
                </th>
                <td>{format(row.period, row.unit)}</td>
                <td>{format(row.total, row.unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function JournalDashboard() {
  const [category, setCategory] = useState("all");
  const [paperDetails, setPaperDetails] = useState<{
    metric: PaperMetric;
    title: string;
  } | null>(null);
  const total = snapshot.stages.reduce((sum, stage) => sum + stage.count, 0);
  const allGroups: {
    id: string;
    title: string;
    description: string;
    rows: DashboardMetric[];
  }[] = [
    {
      id: "trends",
      title: "Submission trends",
      description: "Submissions received, decided, and published.",
      rows: snapshot.trends,
    },
    {
      id: "performance",
      title: "Editorial performance",
      description: "Decision times and acceptance / rejection rates.",
      rows: snapshot.performance,
    },
  ];
  const groups = allGroups.filter(
    (group) => category === "all" || group.id === category,
  );
  function exportCsv() {
    const rows = [
      ["Section", "Metric", `${snapshot.start} to ${snapshot.end}`, "All time"],
      ...groups.flatMap((group) =>
        group.rows.map((row) => [
          group.title,
          row.name,
          format(row.period, row.unit),
          format(row.total, row.unit),
        ]),
      ),
    ];
    const csv = rows
      .map((row) =>
        row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "the-winners-reference-statistics.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="journal-dashboard">
      <div className="page-heading">
        <div>
          <div className="page-eyebrow">JOURNAL OVERVIEW</div>
          <h1>Editorial dashboard</h1>
          <p>
            {snapshot.journal} · Submission activity and editorial decisions
          </p>
        </div>
        <button className="primary-button" onClick={exportCsv}>
          <ArrowDownToLine size={16} /> Export statistics
        </button>
      </div>
      <div className="dashboard-reference">
        <CircleHelp size={17} />
        <p>
          <strong>Reference snapshot</strong> Figures supplied in your dashboard
          references. Live journal statistics are not connected.
        </p>
      </div>
      <section className="dashboard-pipeline" aria-labelledby="pipeline-title">
        <div className="dashboard-donut">
          <svg
            viewBox="0 0 120 120"
            role="img"
            aria-label={`18 active submissions: ${snapshot.stages.map((stage) => `${stage.count} in ${stage.name}`).join(", ")}`}
          >
            {snapshot.stages.map((stage, index) => {
              const length = (stage.count / total) * 100;
              const currentOffset =
                (snapshot.stages
                  .slice(0, index)
                  .reduce((sum, item) => sum + item.count, 0) /
                  total) *
                100;
              return (
                <circle
                  key={stage.name}
                  cx="60"
                  cy="60"
                  r="47"
                  fill="none"
                  stroke={stage.color}
                  strokeWidth="12"
                  pathLength="100"
                  strokeDasharray={`${length} ${100 - length}`}
                  strokeDashoffset={-currentOffset}
                  transform="rotate(-90 60 60)"
                />
              );
            })}
          </svg>
          <div className="dashboard-donut-label">
            <strong>{total}</strong>
            <span>active</span>
          </div>
        </div>
        <div className="dashboard-pipeline-content">
          <div className="page-eyebrow">SUBMISSION PIPELINE</div>
          <h2 id="pipeline-title">Active submissions</h2>
          <p>A snapshot of manuscripts across the editorial workflow.</p>
          <div className="dashboard-stages">
            {snapshot.stages.map((stage) => (
              <div key={stage.name}>
                <span className="dashboard-stage-name">
                  <i style={{ background: stage.color }} />
                  {stage.name}
                </span>
                <strong>{stage.count}</strong>
                <small>
                  {Math.round((stage.count / total) * 100)}% of active
                  submissions
                </small>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="dashboard-kpis">
        {[
          {
            metric: "received" as const,
            name: "Submissions received",
            value: "277",
            note: "In the reference period",
          },
          {
            metric: "accepted" as const,
            name: "Submissions accepted",
            value: "62",
            note: "22% acceptance rate",
          },
          {
            metric: "desk-rejected" as const,
            name: "Desk reject rate",
            value: "69%",
            note: "48% across all time",
          },
          {
            metric: "first-decision" as const,
            name: "First editorial decision",
            value: "40",
            suffix: "days",
            note: "56 days across all time",
          },
        ].map((item) => (
          <button
            type="button"
            className="dashboard-kpi"
            key={item.name}
            aria-label={`View papers: ${item.name}`}
            aria-haspopup="dialog"
            onClick={() =>
              setPaperDetails({ metric: item.metric, title: item.name })
            }
          >
            <span>{item.name}</span>
            <strong>
              {item.value}
              <small>{item.suffix}</small>
            </strong>
            <span className="dashboard-kpi-note">{item.note}</span>
            <span className="dashboard-kpi-link">
              View papers <ArrowUpRight size={13} />
            </span>
          </button>
        ))}
      </div>
      <div className="dashboard-toolbar">
        <div className="dashboard-period">
          <CalendarDays size={16} />
          <span>
            {snapshot.start} — {snapshot.end}
          </span>
        </div>
        <label>
          Show
          <select
            aria-label="Dashboard metrics"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All metrics</option>
            <option value="trends">Submission trends</option>
            <option value="performance">Editorial performance</option>
          </select>
        </label>
      </div>
      <div className="dashboard-tables">
        {groups.map((group) => (
          <MetricsTable key={group.id} {...group} />
        ))}
      </div>
      <p className="dashboard-footnote">
        Active submissions are a separate snapshot from period totals. Received
        and decided submissions may belong to different cohorts; rates are
        reproduced from the reference rather than recalculated.
      </p>
      {paperDetails && (
        <DashboardPaperDetails
          {...paperDetails}
          onClose={() => setPaperDetails(null)}
        />
      )}
    </div>
  );
}
