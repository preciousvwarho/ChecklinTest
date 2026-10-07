import React, { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";

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

// Method-select step. Share-a-link has been removed (email is currently
// the only supported invite method), so this pre-selects "email" — there's
// nothing else to pick, but the screen still exists as its own step before
// CheckInInviteByEmail actually collects addresses.
export default function CheckInInviteTeam({ companyName = "Ptesh", onNext, onBack }) {
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [inviteMethod] = useState("email");
  const isComplete = inviteMethod !== null;

  return (
    <div style={styles.page}>
      <style>{`
        * { box-sizing: border-box; }
        .ci-btn { transition: background 0.15s ease, transform 0.05s ease; }
        .ci-btn:not(:disabled):hover { background: #1691b6 !important; }
        .ci-btn:not(:disabled):active { transform: scale(0.99); }
        .ci-back:hover { background: #f0f2f3 !important; }
        .ci-option-btn { transition: border-color 0.15s ease, background 0.15s ease; }
        .ci-option-btn.selected { border-color: #1CA7D0; background: #f2fafc; }
        .ci-checkbox { accent-color: #1CA7D0; }

        @media (max-width: 480px) {
          .ci-card { padding: 32px 20px 0 !important; }
        }
      `}</style>

      <OnboardingHeader step={2} totalSteps={4} onBack={onBack} />

      <div style={styles.body}>
        <div className="ci-card" style={styles.card}>
          <h1 style={styles.heading}>Who is on the {companyName} team?</h1>
          <p style={styles.subtext}>Invite your teammates to Checkin</p>

          <div style={styles.optionsList}>
            <button
              type="button"
              className="ci-option-btn selected"
              style={{ ...styles.optionBtn, ...styles.optionBtnSelected }}
            >
              <Mail size={16} color="#1CA7D0" />
              <span>Add by email</span>
            </button>
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

      <label style={styles.checkboxRow}>
        <input
          className="ci-checkbox"
          type="checkbox"
          checked={marketingOptIn}
          onChange={(e) => setMarketingOptIn(e.target.checked)}
          style={styles.checkbox}
        />
        <span style={styles.checkboxText}>
          Send me marketing communications about Checkin. I understand I can unsubscribe at
          anytime.
        </span>
      </label>
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
    padding: "0 16px",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: "48px 16px 0",
    textAlign: "center",
  },
  heading: {
    fontSize: 18,
    fontWeight: 700,
    color: "#141b1f",
    margin: "0 0 8px",
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
    marginBottom: 20,
  },
  optionBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    background: "#fff",
    border: "1px solid #dfe3e6",
    borderRadius: 9,
    padding: "12px 0",
    fontSize: 14,
    fontWeight: 600,
    color: "#141b1f",
    cursor: "pointer",
  },
  optionBtnSelected: {
    border: "1.5px solid #1CA7D0",
    background: "#f2fafc",
    color: "#1CA7D0",
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
  checkboxRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    width: "100%",
    maxWidth: 420,
    margin: "0 auto",
    padding: "16px 20px 28px",
    cursor: "pointer",
  },
  checkbox: {
    width: 15,
    height: 15,
    marginTop: 2,
    flexShrink: 0,
    cursor: "pointer",
  },
  checkboxText: {
    fontSize: 11.5,
    lineHeight: 1.5,
    color: "#9aa4aa",
    textAlign: "left",
  },
};
