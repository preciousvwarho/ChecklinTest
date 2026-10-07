import React, { useState } from "react";
import { ArrowLeft, Tag } from "lucide-react";
import { createProject } from "../lib/api";
import { getAuthToken } from "../lib/session";

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

const NAME_LIMIT = 100;

export default function CheckInProjectDetails({ organizationId, onNext, onBack }) {
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isComplete = projectName.trim().length > 0;

  // POST /v1/projects?organizationId=... — { name, description, checkInTime }
  // checkInTime isn't collected by this screen yet, so it defaults to "now".
  // Swap this for a real value once there's a date/time field, or a fixed
  // default the product wants instead.
  const handleNext = async () => {
    if (!isComplete || loading) return;
    setError("");
    setLoading(true);
    try {
      await createProject({
        organizationId,
        name: projectName.trim(),
        description,
        checkInTime: new Date().toISOString(),
        token: getAuthToken(),
      });
      onNext?.(projectName);
    } catch (err) {
      setError(err.message || "Could not create project. Please try again.");
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
        .ci-back:hover { background: #f0f2f3 !important; }
        .ci-input:focus-within { border-color: #1CA7D0 !important; box-shadow: 0 0 0 3px rgba(28,167,208,0.15); }
        .ci-textarea:focus { border-color: #1CA7D0 !important; box-shadow: 0 0 0 3px rgba(28,167,208,0.15); outline: none; }

        @media (max-width: 480px) {
          .ci-card { padding: 32px 20px 0 !important; }
        }
      `}</style>

      <OnboardingHeader step={4} totalSteps={4} onBack={onBack} />

      <div style={styles.body}>
        <div className="ci-card" style={styles.card}>
          <h1 style={styles.heading}>What's a project your team are working on?</h1>
          <p style={styles.subtext}>
            This could be anything: a project, campaign, event or the deal that you're trying to
            close.
          </p>

          <div className="ci-input" style={styles.inputWrap}>
            <Tag size={16} color="#8a97a0" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value.slice(0, NAME_LIMIT))}
              placeholder="e.g budget, website update..."
              style={styles.input}
              aria-label="Project name"
            />
          </div>
          <div style={styles.counter}>
            {projectName.length}/{NAME_LIMIT}
          </div>

          <textarea
            className="ci-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add Description"
            style={styles.textarea}
            aria-label="Project description"
          />

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
    maxWidth: 440,
    padding: "40px 16px 0",
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
    fontSize: 12.5,
    color: "#8a97a0",
    margin: "0 0 20px",
    lineHeight: 1.5,
  },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid #dfe3e6",
    borderRadius: 9,
    padding: "11px 14px",
    background: "#fff",
    textAlign: "left",
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
  counter: {
    textAlign: "right",
    fontSize: 11,
    color: "#b6bec3",
    margin: "4px 2px 14px",
  },
  textarea: {
    width: "100%",
    minHeight: 100,
    border: "1px solid #dfe3e6",
    borderRadius: 9,
    padding: "12px 14px",
    fontSize: 14,
    color: "#141b1f",
    fontFamily: "inherit",
    resize: "vertical",
    marginBottom: 20,
    textAlign: "left",
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
};