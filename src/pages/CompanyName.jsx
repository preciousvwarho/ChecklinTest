import React, { useState } from "react";
import { ArrowLeft, Building2 } from "lucide-react";
import { createOrganization } from "../lib/api";
import { getAuthToken } from "../lib/session";

/**
 * Shared onboarding progress header — back arrow + full-width progress bar.
 * Sits outside/above the card, spanning the full page width.
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


export default function CheckInCompanyName({ onNext, onBack }) {
  const [name, setName] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isComplete = name.trim().length > 0;

  // POST /v1/organization — { name } -> { id, name, imageUrl, ... }
  // On success, pass the new organizationId up so OnboardingFlow can carry
  // it forward to the project-creation step.
  const handleNext = async () => {
    if (!isComplete || loading) return;
    setError("");
    setLoading(true);
    try {
      const result = await createOrganization({ name: name.trim(), token: getAuthToken() });
      onNext?.({ id: result.data.id, name: result.data.name });
    } catch (err) {
      setError(err.message || "Could not create organization. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <style>{`
        * { box-sizing: border-box; }
        .ci-btn { transition: background 0.15s ease, transform 0.05s ease; }
        .ci-btn:not(:disabled):hover { background: #1691b6 !important; }
        .ci-btn:not(:disabled):active { transform: scale(0.99); }
        .ci-input:focus-within { border-color: #1CA7D0 !important; box-shadow: 0 0 0 3px rgba(28,167,208,0.15); }
        .ci-back:hover { background: #f0f2f3 !important; }
        .ci-checkbox { accent-color: #1CA7D0; }

        @media (max-width: 480px) {
          .ci-card { padding: 32px 20px 0 !important; box-shadow: none !important; }
        }
      `}</style>

      <OnboardingHeader step={1} totalSteps={4} onBack={onBack} />

      <div style={styles.body}>
        <div className="ci-card" style={styles.card}>
          <h1 style={styles.heading}>What's the name of your company or team?</h1>
          <p style={styles.subtext}>This will be the name of your Checkin organisation</p>

          <div className="ci-input" style={styles.inputWrap}>
            <Building2 size={17} color="#8a97a0" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g Ptash Studios"
              style={styles.input}
              aria-label="Company or team name"
            />
          </div>

          <button
            className="ci-btn"
            style={{
              ...styles.nextBtn,
              background: isComplete && !loading ? "#1CA7D0" : "#d3d8db",
              cursor: isComplete && !loading ? "pointer" : "not-allowed",
            }}
            type="button"
            disabled={!isComplete || loading}
            onClick={handleNext}
          >
            {loading ? "Creating..." : "Next"}
          </button>
          {error && <p style={styles.error}>{error}</p>}
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
    padding: "56px 16px 0",
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
  inputWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid #dfe3e6",
    borderRadius: 9,
    padding: "11px 14px",
    marginBottom: 16,
    background: "#fff",
  },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: 14,
    color: "#141b1f",
    background: "transparent",
    minWidth: 0,
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
  error: {
    fontSize: 12.5,
    color: "#d64545",
    margin: "12px 0 0",
    textAlign: "left",
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
