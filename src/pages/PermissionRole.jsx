import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";

/**
 * Shared onboarding progress header — back arrow above a full-width progress bar.
 * Reused across all "step" screens in the CheckIn onboarding flow.
 * step: current step (1-indexed), totalSteps: total number of steps.
 */
function OnboardingHeader({ step, totalSteps, onBack }) {
  const percent = Math.round((step / totalSteps) * 100);
  return (
    <div style={styles.header}>
      <button className="ci-back" style={styles.backBtn} type="button" onClick={onBack} aria-label="Go back">
        <ArrowLeft size={18} color="#141b1f" />
      </button>
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${percent}%` }} />
      </div>
    </div>
  );
}

const ROLE_OPTIONS = [
  {
    id: "supervisor",
    title: "Supervisor",
    description:
      "This could be anything, a project, campaign, event or the deal that you're trying to close.",
  },
  {
    id: "line-manager",
    title: "Line manager",
    description:
      "This could be anything, a project, campaign, event or the deal that you're trying to close.",
  },
];

export default function CheckInPermissionRole({ onNext, onBack }) {
  const [selected, setSelected] = useState(null);
  const isComplete = selected !== null;

  return (
    <div style={styles.page}>
      <style>{`
        * { box-sizing: border-box; }
        .ci-btn { transition: background 0.15s ease, transform 0.05s ease; }
        .ci-btn:not(:disabled):hover { background: #1691b6 !important; }
        .ci-btn:not(:disabled):active { transform: scale(0.99); }
        .ci-back:hover { background: #f0f2f3 !important; }
        .ci-option { transition: border-color 0.15s ease, background 0.15s ease; cursor: pointer; }
        .ci-option:hover { border-color: #b9c2c9; }
        .ci-option.selected { border-color: #1CA7D0; background: #f2fafc; }

        @media (max-width: 480px) {
          .ci-card { padding: 32px 20px 0 !important; }
        }
      `}</style>

      <OnboardingHeader step={2} totalSteps={4} onBack={onBack} />

      <div style={styles.body}>
        <div className="ci-card" style={styles.card}>
          <h1 style={styles.heading}>
            What permission role does your organisation have?
          </h1>
          <p style={styles.subtext}>Select options</p>

          <div style={styles.optionsList}>
            {ROLE_OPTIONS.map((opt) => {
              const isSelected = selected === opt.id;
              return (
                <div
                  key={opt.id}
                  className={`ci-option${isSelected ? " selected" : ""}`}
                  style={styles.optionCard}
                  onClick={() => setSelected(opt.id)}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(opt.id);
                    }
                  }}
                >
                  <span style={styles.radioOuter}>
                    {isSelected && <span style={styles.radioInner} />}
                  </span>
                  <div style={styles.optionText}>
                    <div style={styles.optionTitle}>{opt.title}</div>
                    <div style={styles.optionDescription}>{opt.description}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            className="ci-btn"
            style={{
              ...styles.nextBtn,
              background: isComplete ? "#1CA7D0" : "#d3d8db",
              cursor: isComplete ? "pointer" : "not-allowed",
            }}
            type="button"
            disabled={!isComplete}
            onClick={() => onNext?.()}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "#ffffff",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: "100%",
    padding: "16px 20px",
    borderBottom: "1px solid #eef0f1",
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    borderRadius: 8,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    flexShrink: 0,
    alignSelf: "flex-start",
    marginLeft: -6,
  },
  progressTrack: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    background: "#e6e9eb",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "#1CA7D0",
    borderRadius: 2,
    transition: "width 0.25s ease",
  },
  body: {
    flex: 1,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "0 16px 32px",
  },
  card: {
    width: "100%",
    maxWidth: 460,
    padding: "44px 16px 0",
    textAlign: "center",
  },
  heading: {
    fontSize: 18,
    fontWeight: 700,
    color: "#141b1f",
    margin: "0 0 10px",
    lineHeight: 1.4,
  },
  subtext: {
    fontSize: 13,
    color: "#8a97a0",
    margin: "0 0 22px",
    lineHeight: 1.5,
  },
  optionsList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    border: "1px solid #dfe3e6",
    borderRadius: 12,
    padding: "16px 18px",
    textAlign: "left",
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: "2px solid #1CA7D0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: "50%",
    background: "#1CA7D0",
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14.5,
    fontWeight: 700,
    color: "#141b1f",
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: "#9aa4aa",
    lineHeight: 1.5,
  },
  nextBtn: {
    width: "100%",
    color: "#fff",
    border: "none",
    borderRadius: 9,
    padding: "12px 0",
    fontSize: 15,
    fontWeight: 600,
  },
};
