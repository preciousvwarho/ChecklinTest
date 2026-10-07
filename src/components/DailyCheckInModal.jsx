import React, { useMemo, useState } from "react";
import { X } from "lucide-react";

const STYLES = `
  @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap");
  .ci-dc-overlay { position: fixed; inset: 0; background: rgba(20,27,31,0.55); z-index: 120; display: flex; align-items: center; justify-content: center; padding: 16px; font-family: "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .ci-dc { position: relative; width: 100%; max-width: 400px; max-height: calc(100vh - 32px); background: #fff; border-radius: 28px; overflow: hidden; display: flex; flex-direction: column; }
  .ci-dc-bar { height: 2px; background: #e6e8ea; flex-shrink: 0; }
  .ci-dc-bar > span { display: block; height: 100%; background: #0b93d0; transition: width 0.25s ease; }
  .ci-dc-close { position: absolute; top: 14px; right: 14px; width: 28px; height: 28px; border: none; background: #f3f5f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6b7680; padding: 0; }
  .ci-dc-body { padding: 36px 24px 22px; display: flex; flex-direction: column; min-height: 0; overflow-y: auto; }
  .ci-dc-title { font-size: 25px; font-weight: 700; line-height: 1.25; color: #0f1417; margin: 0 0 22px; }
  .ci-dc-list { display: flex; flex-direction: column; gap: 10px; }
  .ci-dc-list.scroll { max-height: 188px; overflow-y: auto; }
  .ci-dc-task { display: flex; align-items: center; gap: 12px; width: 100%; background: #fff; border: 1px solid #c9cdd1; border-radius: 12px; padding: 10px 14px; text-align: left; font-family: inherit; }
  button.ci-dc-task { cursor: pointer; }
  .ci-dc-task.selected { border-color: #1CA7D0; background: #f5fbfe; }
  .ci-dc-date { display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 38px; padding-right: 12px; border-right: 1px solid #d5d9dc; align-self: stretch; color: #3b454c; }
  .ci-dc-date b { font-size: 18px; font-weight: 400; line-height: 1.1; }
  .ci-dc-date span { font-size: 10px; }
  .ci-dc-info { flex: 1; min-width: 0; }
  .ci-dc-name { font-size: 12.5px; font-weight: 600; color: #141b1f; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ci-dc-range { font-size: 9px; color: #6b7680; margin-top: 3px; }
  .ci-dc-pill { background: #f5890a; color: #fff; font-size: 8.5px; font-weight: 500; border-radius: 999px; padding: 3px 10px; flex-shrink: 0; white-space: nowrap; }
  .ci-dc-label { font-size: 11px; font-weight: 500; color: #141b1f; margin: 18px 0 8px; }
  .ci-dc-text { width: 100%; height: 112px; resize: none; border: 1px solid #c9cdd1; border-radius: 10px; padding: 12px 14px; font-family: inherit; font-size: 12.5px; color: #141b1f; outline: none; }
  .ci-dc-text:focus { border-color: #1CA7D0; }
  .ci-dc-btn { margin-top: 18px; width: 100%; border: none; border-radius: 10px; background: #e8e8e8; color: #3b454c; font-family: inherit; font-size: 14px; font-weight: 600; padding: 15px; cursor: pointer; transition: background 0.15s ease, color 0.15s ease; }
  .ci-dc-btn.ready { background: #1CA7D0; color: #fff; }
  .ci-dc-btn:disabled { cursor: default; opacity: 0.85; }
  .ci-dc-spacer { flex: 1; min-height: 40px; }
  .ci-dc-back { align-self: center; margin-top: 12px; border: none; background: none; color: #6b7680; font-family: inherit; font-size: 12px; cursor: pointer; }
  .ci-dc-error { font-size: 12px; color: #d64545; margin-top: 10px; }
  .ci-dc-empty { font-size: 12.5px; color: #8a97a0; padding: 14px 0; }
  @media (max-width: 520px) {
    .ci-dc-overlay { align-items: flex-end; padding: 0; }
    .ci-dc { max-width: none; border-radius: 28px 28px 0 0; max-height: 94vh; }
  }
`;

function TaskRow({ task, selected, onClick }) {
  const due = task.endDate ? new Date(task.endDate) : null;
  const day = due ? String(due.getDate()).padStart(2, "0") : "--";
  const month = due ? due.toLocaleDateString(undefined, { month: "short" }) : "";
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} className={`ci-dc-task ${selected ? "selected" : ""}`} onClick={onClick} aria-pressed={onClick ? !!selected : undefined}>
      <div className="ci-dc-date">
        <b>{day}</b>
        <span>{month}</span>
      </div>
      <div className="ci-dc-info">
        <div className="ci-dc-name">{task.title}</div>
        <div className="ci-dc-range">{task.dateRange}</div>
      </div>
      <span className="ci-dc-pill">In Progress</span>
    </Tag>
  );
}

/**
 * Two-step daily check-in.
 *  1. blockers / challenges (free text)
 *  2. pick the tasks you're focusing on today
 *
 * @param {Object} props
 * @param {Array} props.tasks - the user's in-progress tasks
 * @param {() => void} props.onClose - dismiss without submitting
 * @param {({blocker: string, focusTasks: object[]}) => Promise<void>} props.onSubmit
 */
export default function DailyCheckInModal({ tasks, onClose, onSubmit }) {
  const [step, setStep] = useState(1);
  const [blocker, setBlocker] = useState("");
  const [selected, setSelected] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    if (!selected.length || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit({ blocker: blocker.trim(), focusTasks: tasks.filter((t) => selectedSet.has(t.id)) });
    } catch (err) {
      setError(err.message || "Failed to submit your check-in. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="ci-dc-overlay" role="dialog" aria-modal="true">
      <style>{STYLES}</style>
      <div className="ci-dc">
        <div className="ci-dc-bar">
          <span style={{ width: step === 1 ? "50%" : "100%" }} />
        </div>
        <button type="button" className="ci-dc-close" aria-label="Close" onClick={onClose} disabled={submitting}>
          <X size={15} />
        </button>

        {step === 1 ? (
          <div className="ci-dc-body">
            <h2 className="ci-dc-title">What are your blockers or Challenges?</h2>
            <div className={`ci-dc-list ${tasks.length > 3 ? "scroll" : ""}`}>
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
            <label className="ci-dc-label" htmlFor="ci-dc-blocker">Describe</label>
            <textarea id="ci-dc-blocker" className="ci-dc-text" placeholder="Add Describe" value={blocker} onChange={(e) => setBlocker(e.target.value)} />
            <button type="button" className={`ci-dc-btn ${blocker.trim() ? "ready" : ""}`} onClick={() => setStep(2)}>
              Next
            </button>
          </div>
        ) : (
          <div className="ci-dc-body">
            <h2 className="ci-dc-title">What are your focusing on today?</h2>
            <div className="ci-dc-list">
              {tasks.length === 0 && <div className="ci-dc-empty">No in-progress tasks.</div>}
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} selected={selectedSet.has(t.id)} onClick={() => toggle(t.id)} />
              ))}
            </div>
            <div className="ci-dc-spacer" />
            {error && <div className="ci-dc-error">{error}</div>}
            <button type="button" className={`ci-dc-btn ${selected.length ? "ready" : ""}`} disabled={!selected.length || submitting} onClick={submit}>
              {submitting ? "Submitting…" : "Submit"}
            </button>
            <button type="button" className="ci-dc-back" onClick={() => setStep(1)} disabled={submitting}>
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
