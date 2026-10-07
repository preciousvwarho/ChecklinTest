import React, { useState } from "react";
import { ArrowLeft, Mail, X } from "lucide-react";
import { inviteTeamMembers } from "../lib/api";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Follows CheckInInviteTeam (the method-select step). Collects one or more
// teammate emails as chips, then sends the invites.
export default function CheckInInviteByEmail({ companyName = "Ptesh", organizationId, onNext, onBack }) {
  const [emails, setEmails] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isComplete = emails.length > 0;

  const addEmail = () => {
    const value = draft.trim().toLowerCase();
    if (!value) return;
    if (!EMAIL_RE.test(value)) {
      setError(`"${value}" isn't a valid email address.`);
      return;
    }
    if (emails.includes(value)) {
      setDraft("");
      return;
    }
    setError("");
    setEmails((prev) => [...prev, value]);
    setDraft("");
  };

  const removeEmail = (email) => {
    setEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleDraftKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmail();
    } else if (e.key === "Backspace" && !draft && emails.length > 0) {
      removeEmail(emails[emails.length - 1]);
    }
  };

  // POST /v1/organization/team/invitation?organizationId=...
  // { teamMembers: [{ email }], url } -> { invitationSentTo: [...] }
  const handleNext = async () => {
    if (!isComplete || loading) return;
    setError("");
    setLoading(true);
    try {
      await inviteTeamMembers({ organizationId, emails, token: getAuthToken() });
      onNext?.();
    } catch (err) {
      setError(err.message || "Could not send invitations. Please try again.");
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

        @media (max-width: 480px) {
          .ci-card { padding: 32px 20px 0 !important; }
        }
      `}</style>

      <OnboardingHeader step={3} totalSteps={4} onBack={onBack} />

      <div style={styles.body}>
        <div className="ci-card" style={styles.card}>
          <h1 style={styles.heading}>Add teammates by email</h1>
          <p style={styles.subtext}>Invite people to join the {companyName} team on Checkin</p>

          <div className="ci-input" style={styles.inputWrap}>
            <Mail size={16} color="#8a97a0" style={{ flexShrink: 0 }} />
            <div style={styles.chipInput}>
              {emails.map((email) => (
                <span key={email} style={styles.chip}>
                  {email}
                  <button
                    type="button"
                    style={styles.chipRemove}
                    onClick={() => removeEmail(email)}
                    aria-label={`Remove ${email}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                type="email"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleDraftKeyDown}
                onBlur={addEmail}
                placeholder={emails.length ? "" : "teammate@example.com"}
                style={styles.chipTextInput}
                aria-label="Teammate email"
              />
            </div>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            className="ci-btn"
            style={{
              ...styles.nextBtn,
              background: isComplete && !loading ? "#1CA7D0" : "#d3d8db",
              cursor: isComplete && !loading ? "pointer" : "not-allowed",
              marginTop: 20,
            }}
            type="button"
            disabled={!isComplete || loading}
            onClick={handleNext}
          >
            {loading ? "Sending invites..." : "Next"}
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
  inputWrap: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    border: "1px solid #dfe3e6",
    borderRadius: 9,
    padding: "10px 12px",
    marginBottom: 4,
    background: "#fff",
    textAlign: "left",
  },
  chipInput: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  chip: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "#f2fafc",
    color: "#1CA7D0",
    border: "1px solid #cdeaf2",
    borderRadius: 6,
    padding: "3px 6px 3px 10px",
    fontSize: 12.5,
    fontWeight: 600,
  },
  chipRemove: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    color: "#1CA7D0",
    cursor: "pointer",
    padding: 2,
  },
  chipTextInput: {
    flex: 1,
    minWidth: 120,
    border: "none",
    outline: "none",
    fontSize: 14,
    color: "#141b1f",
    background: "transparent",
    padding: "4px 0",
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
    margin: "8px 0 0",
    textAlign: "left",
  },
};
