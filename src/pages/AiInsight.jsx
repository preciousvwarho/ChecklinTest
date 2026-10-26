import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import AppShell from "../components/AppShell";
import { getAnalyticsInsight } from "../lib/api";
import { getAuthToken } from "../lib/session";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ordinal = (n) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] || "th"}`;
};

const parseDate = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

const formatRange = (start, end) => {
  const a = parseDate(start);
  const b = parseDate(end);
  if (!a || !b) return "";
  const left = `${ordinal(a.getDate())} ${MONTHS[a.getMonth()]}`;
  return `${left} - ${ordinal(b.getDate())} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
};

const STATUS = {
  OVERDUE: { label: "Overdue", cls: "overdue" },
  IN_PROGRESS: { label: "In Progress", cls: "in-progress" },
  PENDING: { label: "Pending", cls: "pending" },
  PENDING_COMPLETION_APPROVAL: { label: "Awaiting Approval", cls: "pending" },
  COMPLETED: { label: "Completed", cls: "completed" },
};

const statusOf = (status) =>
  STATUS[status] || {
    label: String(status || "").replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
    cls: "pending",
  };

const pct = (n) => (n === null || n === undefined ? "—" : `${n}%`);

export default function CheckInAiInsight({ analyticsId, projectId, onBack, onGoHome }) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(Boolean(analyticsId && projectId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!analyticsId || !projectId) {
      setLoading(false);
      setInsight(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    getAnalyticsInsight({ analyticsId, projectId, token: getAuthToken() })
      .then((res) => {
        if (!cancelled) setInsight(res?.data || null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Couldn't load this insight.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [analyticsId, projectId]);

  const metrics = insight?.metrics || {};
  const stats = [
    { id: "productivity", label: "Productivity", value: pct(metrics.productivity?.value) },
    { id: "tasks", label: "Tasks Completed", value: metrics.tasksCompleted?.value ?? "—" },
    { id: "checkin", label: "Check-in Row", value: pct(metrics.checkInRow?.value) },
  ];
  const recommendations = insight?.recommendations || [];
  const focusAreas = insight?.focusAreas || [];
  const insightNotes = insight?.insights || [];

  let message = "";
  if (!analyticsId || !projectId) message = "No insight selected. Open one from the Analytics tab of a project.";
  else if (loading) message = "Loading insight…";
  else if (error) message = error;
  else if (!insight) message = "No insight available for this week yet.";

  return (
    <AppShell>
      <style>{`
        .ci-insight-hero { background: #E7F4FA; padding: 28px 40px 26px; }
        .ci-insight-back {
          display: flex; align-items: center; justify-content: center; width: 30px; height: 30px;
          border-radius: 8px; border: 1px solid #dbe4ee; background: #fff; color: #141b1f; cursor: pointer; margin-bottom: 16px;
        }
        .ci-insight-back:hover { background: #f5f8fb; }
        .ci-insight-title { font-size: 24px; font-weight: 500; color: #141b1f; margin: 0 0 4px; }
        .ci-insight-range { font-size: 12.5px; color: #6b7680; margin-bottom: 20px; }
        .ci-insight-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .ci-insight-stat-card { background: #fff; border-radius: 14px; padding: 14px 16px; }
        .ci-insight-stat-label { font-size: 11px; color: #9aa4aa; margin-bottom: 8px; }
        .ci-insight-stat-value { font-size: 20px; font-weight: 800; color: #141b1f; }

        .ci-insight-body { padding: 26px 40px 60px; max-width: 640px; }
        .ci-insight-summary { font-size: 13.5px; color: #3a4247; line-height: 1.6; margin: 0 0 24px; }
        .ci-insight-section-title { font-size: 14.5px; font-weight: 700; color: #141b1f; margin: 0 0 8px; }
        .ci-insight-section-text { font-size: 13px; color: #6b7680; line-height: 1.6; margin: 0 0 24px; }
        .ci-insight-reco-list { margin: 0 0 28px; padding-left: 18px; }
        .ci-insight-reco-list li { font-size: 13px; color: #3a4247; line-height: 1.7; }

        .ci-focus-list { display: flex; flex-direction: column; gap: 12px; }
        .ci-focus-card {
          display: flex; align-items: center; gap: 14px; border: 1px solid #eef0f1; border-radius: 14px; padding: 12px 16px;
        }
        .ci-focus-date {
          display: flex; flex-direction: column; align-items: center; justify-content: center; width: 44px; height: 44px;
          border-radius: 10px; background: #f1f3f4; flex-shrink: 0;
        }
        .ci-focus-day { font-size: 15px; font-weight: 800; color: #141b1f; line-height: 1; }
        .ci-focus-month { font-size: 10px; color: #9aa4aa; text-transform: uppercase; }
        .ci-focus-info { flex: 1; min-width: 0; }
        .ci-focus-title { font-size: 13.5px; font-weight: 700; color: #141b1f; }
        .ci-focus-range { font-size: 11px; color: #9aa4aa; margin-top: 2px; }
        .ci-focus-status {
          font-size: 10.5px; font-weight: 700; padding: 5px 12px; border-radius: 999px; color: #fff; flex-shrink: 0;
        }
        .ci-focus-status.overdue { background: #e05555; }
        .ci-focus-status.in-progress { background: #f0a93a; }
        .ci-focus-status.pending { background: #9aa4aa; }
        .ci-focus-status.completed { background: #1e9e63; }
        .ci-insight-message { padding: 40px; font-size: 13.5px; color: #6b7680; }
        .ci-insight-message.error { color: #d64545; }
        .ci-reco-desc { display: block; font-size: 12px; color: #6b7680; }
        .ci-insight-notes { margin: -12px 0 24px; padding-left: 18px; }
        .ci-insight-notes li { font-size: 13px; color: #6b7680; line-height: 1.6; }

        @media (max-width: 640px) {
          .ci-insight-hero { padding: 22px 20px 20px; }
          .ci-insight-body { padding: 22px 20px 48px; }
          .ci-insight-stats { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="ci-insight-hero">
        {onBack && (
          <button className="ci-insight-back" type="button" aria-label="Back to project" onClick={onBack}>
            <ArrowLeft size={16} />
          </button>
        )}
        <h1 className="ci-insight-title">Ai Insight</h1>
        <div className="ci-insight-range">{insight?.period?.label || ""}</div>

        <div className="ci-insight-stats">
          {stats.map((st) => (
            <div key={st.id} className="ci-insight-stat-card">
              <div className="ci-insight-stat-label">{st.label}</div>
              <div className="ci-insight-stat-value">{insight ? st.value : "—"}</div>
            </div>
          ))}
        </div>
      </div>

      {message ? (
        <div className={`ci-insight-message${error ? " error" : ""}`}>{message}</div>
      ) : (
        <div className="ci-insight-body">
          {insight.remark && <p className="ci-insight-summary">{insight.remark}</p>}
          {insightNotes.length > 0 && (
            <ul className="ci-insight-notes">
              {insightNotes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}

          <h2 className="ci-insight-section-title">Task analysis</h2>
          <p className="ci-insight-section-text">{insight.taskAnalysis?.summary || "No task analysis available."}</p>

          <h2 className="ci-insight-section-title">Recommendations</h2>
          {recommendations.length ? (
            <ol className="ci-insight-reco-list">
              {recommendations.map((r, i) => {
                const item = typeof r === "string" ? { title: r } : r;
                return (
                  <li key={item.index ?? i}>
                    {item.title}
                    {item.description && item.description !== item.title && (
                      <span className="ci-reco-desc">{item.description}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="ci-insight-section-text">No recommendations this week.</p>
          )}

          <h2 className="ci-insight-section-title">Focus Areas</h2>
          {focusAreas.length ? (
            <div className="ci-focus-list">
              {focusAreas.map((f) => {
                const due = parseDate(f.endDate);
                const st = statusOf(f.status);
                return (
                  <div key={f.id} className="ci-focus-card">
                    <div className="ci-focus-date">
                      <span className="ci-focus-day">{due ? String(due.getDate()).padStart(2, "0") : "--"}</span>
                      <span className="ci-focus-month">{due ? MONTHS[due.getMonth()] : ""}</span>
                    </div>
                    <div className="ci-focus-info">
                      <div className="ci-focus-title">{f.title}</div>
                      <div className="ci-focus-range">{formatRange(f.startDate, f.endDate)}</div>
                    </div>
                    <span className={`ci-focus-status ${st.cls}`}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="ci-insight-section-text">No focus areas this week.</p>
          )}
        </div>
      )}
    </AppShell>
  );
}
