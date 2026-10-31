import React, { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PLAN_KEY = "checkin_plan";
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "";
const DESCRIPTION = "This could be anything: a project, campaign, event or the deal that you're trying to close.";

// `price` is the monthly price; plans without a price skip the duration screen.
export const PLANS = [
  { id: "basic", title: "Basic - Free", price: 0, description: DESCRIPTION },
  { id: "premium-3", title: "Premium - $3/Month", price: 3, description: DESCRIPTION },
  { id: "premium-10", title: "Premium - $10/ Month", price: 10, description: DESCRIPTION },
  { id: "custom", title: "Custom - contact support", price: null, description: DESCRIPTION },
];

function savePlan(value) {
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(value));
  } catch {
    // storage unavailable — selection just isn't remembered
  }
}

function loadPlan() {
  try {
    return JSON.parse(localStorage.getItem(PLAN_KEY) || "null");
  } catch {
    return null;
  }
}

const STYLES = `
  @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap");
  .ci-sp-page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; background: #fff; font-family: "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .ci-sp { width: 100%; max-width: 480px; flex: 1; display: flex; flex-direction: column; padding: 18px 20px 28px; }
  .ci-sp-head { display: flex; align-items: center; gap: 14px; font-size: 14px; font-weight: 500; color: #141b1f; margin-bottom: 26px; }
  .ci-sp-back { border: none; background: none; cursor: pointer; padding: 4px; display: flex; color: #141b1f; }
  .ci-sp-title { font-size: 22px; font-weight: 600; line-height: 1.3; color: #0f1417; margin: 0 0 22px; }
  .ci-sp-title.sm { font-size: 20px; margin-bottom: 6px; }
  .ci-sp-sub { font-size: 10px; color: #6b7680; margin: 0 0 24px; line-height: 1.5; }
  .ci-sp-list { display: flex; flex-direction: column; gap: 16px; }
  .ci-sp-option { display: flex; align-items: center; gap: 14px; width: 100%; text-align: left; font-family: inherit; background: #fff; border: 1px solid #e6e9eb; border-radius: 10px; padding: 18px 16px; cursor: pointer; transition: border-color .15s ease, background .15s ease; }
  .ci-sp-option:hover { border-color: #b9c2c9; }
  .ci-sp-option.selected { border-color: #0C93CF; background: #F1F9FC; }
  .ci-sp-option.dur { border-color: #3b454c; border-radius: 6px; }
  .ci-sp-option.dur.selected { border-color: #0C93CF; }
  .ci-sp-radio { width: 15px; height: 15px; border-radius: 50%; background: #ebebeb; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .ci-sp-option.selected .ci-sp-radio { background: #0C93CF; }
  .ci-sp-option.selected .ci-sp-radio::after { content: ""; width: 5px; height: 5px; border-radius: 50%; background: #fff; }
  .ci-sp-opt-title { font-size: 13px; font-weight: 500; color: #141b1f; }
  .ci-sp-opt-desc { font-size: 9.5px; color: #6b7680; margin-top: 4px; line-height: 1.5; }
  .ci-sp-note { font-size: 12px; color: #0A74A5; background: #F1F9FC; border-radius: 10px; padding: 12px 14px; margin-top: 16px; line-height: 1.5; }
  .ci-sp-spacer { flex: 1; min-height: 40px; }
  .ci-sp-btn { width: 100%; border: none; border-radius: 10px; background: #c0c0c0; color: #fff; font-family: inherit; font-size: 14px; font-weight: 600; padding: 15px; cursor: not-allowed; }
  .ci-sp-btn.ready { background: #0C93CF; cursor: pointer; }
  .ci-sp-btn.ready:hover { background: #0A74A5; }
`;

function Header({ title, onBack }) {
  return (
    <div className="ci-sp-head">
      <button type="button" className="ci-sp-back" aria-label="Back" onClick={onBack}>
        <ArrowLeft size={20} />
      </button>
      {title}
    </div>
  );
}

/** Screen 1 — pick a plan. */
export default function SubscriptionPlan() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(() => loadPlan()?.planId || "basic");
  const [note, setNote] = useState("");
  const plan = PLANS.find((p) => p.id === selected);

  const next = () => {
    if (plan.id === "basic") {
      savePlan({ planId: "basic", billing: null });
      navigate("/profile");
    } else if (plan.id === "custom") {
      if (SUPPORT_EMAIL) {
        window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Custom subscription plan")}`;
      } else {
        setNote("Thanks! Our support team will reach out to you about a custom plan.");
      }
    } else {
      navigate("/subscription-plan/duration", { state: { planId: plan.id } });
    }
  };

  return (
    <div className="ci-sp-page">
      <style>{STYLES}</style>
      <div className="ci-sp">
        <Header title="Subscription Plan" onBack={() => navigate(-1)} />
        <h1 className="ci-sp-title">
          What permission role
          <br />
          does your organisation have?
        </h1>

        <div className="ci-sp-list" role="radiogroup">
          {PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={selected === p.id}
              className={`ci-sp-option${selected === p.id ? " selected" : ""}`}
              onClick={() => {
                setSelected(p.id);
                setNote("");
              }}
            >
              <span className="ci-sp-radio" />
              <span>
                <div className="ci-sp-opt-title">{p.title}</div>
                <div className="ci-sp-opt-desc">{p.description}</div>
              </span>
            </button>
          ))}
        </div>

        {note && <div className="ci-sp-note">{note}</div>}

        <div className="ci-sp-spacer" />
        <button type="button" className="ci-sp-btn ready" onClick={next}>
          Continue
        </button>
      </div>
    </div>
  );
}

/** Screen 2 — monthly or annual billing for the chosen premium plan. */
export function PlanDuration() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const plan = PLANS.find((p) => p.id === state?.planId && p.price);
  const [billing, setBilling] = useState("monthly");

  // Opened directly (no plan chosen) or a plan with no duration: go pick a plan first.
  if (!plan) return <Navigate to="/subscription-plan" replace />;

  const options = [
    { id: "monthly", title: "Monthly Subscription", cost: `Cost $${plan.price} every month.` },
    { id: "annual", title: "Annual Subscription", cost: `Cost $${plan.price * 12}  every year.` },
  ];

  const confirm = () => {
    savePlan({ planId: plan.id, billing });
    navigate("/profile");
  };

  return (
    <div className="ci-sp-page">
      <style>{STYLES}</style>
      <div className="ci-sp">
        <Header title="Plan Duration" onBack={() => navigate(-1)} />
        <h1 className="ci-sp-title sm">Premium - ${plan.price}/Month</h1>
        <p className="ci-sp-sub">{DESCRIPTION}</p>

        <div className="ci-sp-list" role="radiogroup">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={billing === o.id}
              className={`ci-sp-option dur${billing === o.id ? " selected" : ""}`}
              onClick={() => setBilling(o.id)}
            >
              <span className="ci-sp-radio" />
              <span>
                <div className="ci-sp-opt-title">{o.title}</div>
                <div className="ci-sp-opt-desc">{o.cost}</div>
              </span>
            </button>
          ))}
        </div>

        <div className="ci-sp-spacer" />
        <button type="button" className="ci-sp-btn ready" onClick={confirm}>
          Continue
        </button>
      </div>
    </div>
  );
}
