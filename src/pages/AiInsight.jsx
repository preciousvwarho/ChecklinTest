import React from "react";
import { ArrowLeft } from "lucide-react";
import AppShell from "../components/AppShell";

const STATS = [
  { id: "productivity", label: "Productivity", value: "78%" },
  { id: "tasks", label: "Tasks Completed", value: "12" },
  { id: "checkin", label: "Check-in Row", value: "8%" },
];

const RECOMMENDATIONS = [
  "Developer HomeScreen QA Backend: Validate User Add and Remove API Endpoints.",
  "Developer HomeScreen QA Backend: Validate User Add and Remove API Endpoints.",
];

const FOCUS_AREAS = [
  { id: 1, day: "04", month: "Dec", title: "Develop HomeScreen", dateRange: "20th Aug - 25 Aug 2025", status: "Overdue" },
  { id: 2, day: "04", month: "Dec", title: "Develop HomeScreen", dateRange: "20th Aug - 25 Aug 2026", status: "In Progress" },
];

export default function CheckInAiInsight({ onBack, onGoHome }) {
  return (
    <AppShell>
      <style>{`
        .ci-insight-hero { background: #eef4fb; padding: 28px 40px 26px; }
        .ci-insight-back {
          display: flex; align-items: center; justify-content: center; width: 30px; height: 30px;
          border-radius: 8px; border: 1px solid #dbe4ee; background: #fff; color: #141b1f; cursor: pointer; margin-bottom: 16px;
        }
        .ci-insight-back:hover { background: #f5f8fb; }
        .ci-insight-title { font-size: 24px; font-weight: 800; color: #141b1f; margin: 0 0 4px; }
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
        <div className="ci-insight-range">3rd April to 9th April 2026</div>

        <div className="ci-insight-stats">
          {STATS.map((s) => (
            <div key={s.id} className="ci-insight-stat-card">
              <div className="ci-insight-stat-label">{s.label}</div>
              <div className="ci-insight-stat-value">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="ci-insight-body">
        <p className="ci-insight-summary">
          Based on the todos assigned to you, your productivity was above average. You can do better.
        </p>

        <h2 className="ci-insight-section-title">Task analysis</h2>
        <p className="ci-insight-section-text">3 task at risk of being over. 4 task are already overdue.</p>

        <h2 className="ci-insight-section-title">Recommendations</h2>
        <ol className="ci-insight-reco-list">
          {RECOMMENDATIONS.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ol>

        <h2 className="ci-insight-section-title">Focus Areas</h2>
        <div className="ci-focus-list">
          {FOCUS_AREAS.map((f) => (
            <div key={f.id} className="ci-focus-card">
              <div className="ci-focus-date">
                <span className="ci-focus-day">{f.day}</span>
                <span className="ci-focus-month">{f.month}</span>
              </div>
              <div className="ci-focus-info">
                <div className="ci-focus-title">{f.title}</div>
                <div className="ci-focus-range">{f.dateRange}</div>
              </div>
              <span className={`ci-focus-status ${f.status === "Overdue" ? "overdue" : "in-progress"}`}>
                {f.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
