import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import AppShell from "../components/AppShell";
import { getActivityLogs } from "../lib/api";
import { getAuthToken } from "../lib/session";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(iso) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function initials(user) {
  const a = user?.firstName?.[0] || user?.email?.[0] || "";
  const b = user?.lastName?.[0] || "";
  return (a + b).toUpperCase();
}

function toInputDate(key) {
  return key; // already YYYY-MM-DD
}

export default function CheckInActivities() {
  const [logs, setLogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pickedDate, setPickedDate] = useState(""); // YYYY-MM-DD from calendar, "" = all
  const [activeFilter, setActiveFilter] = useState("all");
  const dateInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await getActivityLogs({ date: pickedDate || undefined, page: 1, limit: 50, token: getAuthToken() });
        if (!cancelled) setLogs(res?.data || {});
      } catch (err) {
        if (!cancelled) {
          setLogs({});
          setError(err.message || "Failed to load activities.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [pickedDate]);

  const dateKeys = useMemo(() => Object.keys(logs).sort((x, y) => (x < y ? 1 : -1)), [logs]);

  const dayFilters = useMemo(
    () =>
      dateKeys.slice(0, 7).map((key) => {
        const d = parseKey(key);
        return { id: key, day: DAY_NAMES[d.getDay()], date: String(d.getDate()).padStart(2, "0") };
      }),
    [dateKeys]
  );

  const groups = useMemo(() => {
    const keys = activeFilter === "all" ? dateKeys : dateKeys.filter((k) => k === activeFilter);
    return keys.map((key) => {
      const d = parseKey(key);
      const items = [...(logs[key] || [])].sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1));
      return { id: key, day: DAY_NAMES[d.getDay()], date: `${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`, items };
    });
  }, [logs, dateKeys, activeFilter]);

  const totalShown = useMemo(() => groups.reduce((sum, g) => sum + g.items.length, 0), [groups]);

  const headerDate = useMemo(() => {
    if (activeFilter !== "all") {
      const d = parseKey(activeFilter);
      return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
    }
    if (pickedDate) {
      const d = parseKey(pickedDate);
      return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
    }
    return "All activity";
  }, [activeFilter, pickedDate]);

  const openCalendar = () => {
    const el = dateInputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.click();
  };

  const handlePick = (e) => {
    setPickedDate(e.target.value);
    setActiveFilter("all");
  };

  return (
    <AppShell>
      <style>{`
        .ci-activities-inner { padding: 32px 40px 60px; max-width: 760px; }
        .ci-activities-title { font-size: 26px; font-weight: 800; color: #141b1f; margin: 0 0 16px; }
        .ci-activities-divider { border: none; border-top: 1px solid #eef0f1; margin: 0 0 24px; }

        .ci-activities-date-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .ci-activities-date { font-size: 18px; font-weight: 800; color: #141b1f; margin: 0 0 2px; }
        .ci-activities-subcount { font-size: 12.5px; color: #9aa4aa; }
        .ci-activities-cal-btn {
          display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%;
          background: #eaf6fa; border: none; color: #1CA7D0; cursor: pointer; flex-shrink: 0;
        }
        .ci-activities-cal-btn:hover { background: #d9f0f6; }

        .ci-day-filters { display: flex; gap: 10px; margin-bottom: 28px; overflow-x: auto; padding-bottom: 4px; }
        .ci-day-filter {
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
          min-width: 64px; height: 64px; border-radius: 14px; border: none; background: #f1f5f8; cursor: pointer;
          flex-shrink: 0; transition: background 0.15s ease, color 0.15s ease;
        }
        .ci-day-filter-label { font-size: 11px; font-weight: 600; color: #6b7680; }
        .ci-day-filter-date { font-size: 16px; font-weight: 800; color: #141b1f; }
        .ci-day-filter.active { background: #1CA7D0; }
        .ci-day-filter.active .ci-day-filter-label,
        .ci-day-filter.active .ci-day-filter-date { color: #fff; }
        .ci-day-filter.all { font-size: 15px; font-weight: 800; color: #141b1f; }

        .ci-timeline-group { display: flex; gap: 18px; margin-bottom: 8px; }
        .ci-timeline-day-label { width: 64px; flex-shrink: 0; padding-top: 6px; }
        .ci-timeline-day { font-size: 13px; font-weight: 700; color: #141b1f; }
        .ci-timeline-date { font-size: 11px; color: #9aa4aa; }
        .ci-timeline-rail { flex: 1; border-left: 2px solid #dbeaf1; padding-left: 22px; display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
        .ci-timeline-row { position: relative; display: flex; align-items: center; gap: 14px; }
        .ci-timeline-dot {
          position: absolute; left: -28px; top: 50%; transform: translateY(-50%);
          width: 9px; height: 9px; border-radius: 50%; background: #1CA7D0; border: 2px solid #fff; box-shadow: 0 0 0 2px #dbeaf1;
        }
        .ci-timeline-time { width: 62px; flex-shrink: 0; font-size: 11px; font-weight: 600; color: #6b7680; }
        .ci-timeline-card {
          flex: 1; display: flex; align-items: center; gap: 12px; background: #eef4fb; border-radius: 12px; padding: 12px 16px;
        }
        .ci-timeline-avatar { width: 30px; height: 30px; border-radius: 50%; background: #bcdcec; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10.5px; font-weight: 700; color: #1b6f8a; }
        .ci-timeline-project { color: #9aa4aa; }
        .ci-activities-date-input { position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0; }
        .ci-activities-date-row { position: relative; }
        .ci-activities-state { font-size: 13px; color: #9aa4aa; padding: 24px 0; }
        .ci-activities-state.error { color: #d64545; }
        .ci-timeline-text { flex: 1; min-width: 0; font-size: 12.5px; color: #2b3338; }
        .ci-timeline-ago { font-size: 10.5px; color: #9aa4aa; flex-shrink: 0; white-space: nowrap; }

        @media (max-width: 640px) {
          .ci-activities-inner { padding: 24px 20px 48px; }
          .ci-activities-title { font-size: 21px; }
          .ci-timeline-day-label { width: 48px; }
          .ci-timeline-time { width: 48px; }
        }
      `}</style>

      <div className="ci-activities-inner">
        <h1 className="ci-activities-title">Activities</h1>
        <hr className="ci-activities-divider" />

        <div className="ci-activities-date-row">
          <div>
            <div className="ci-activities-date">{headerDate}</div>
            <div className="ci-activities-subcount">
              {totalShown} {totalShown === 1 ? "activity" : "activities"}
            </div>
          </div>
          <button type="button" className="ci-activities-cal-btn" aria-label="Pick a date" onClick={openCalendar}>
            <Calendar size={17} />
          </button>
          <input
            ref={dateInputRef}
            type="date"
            className="ci-activities-date-input"
            value={toInputDate(pickedDate)}
            onChange={handlePick}
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>

        <div className="ci-day-filters">
          <button
            type="button"
            className={`ci-day-filter all${activeFilter === "all" ? " active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            All
          </button>
          {dayFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`ci-day-filter${activeFilter === f.id ? " active" : ""}`}
              onClick={() => setActiveFilter(f.id)}
            >
              <span className="ci-day-filter-label">{f.day}</span>
              <span className="ci-day-filter-date">{f.date}</span>
            </button>
          ))}
        </div>

        {loading && <div className="ci-activities-state">Loading activities…</div>}
        {!loading && error && <div className="ci-activities-state error">{error}</div>}
        {!loading && !error && groups.length === 0 && <div className="ci-activities-state">No activities yet.</div>}

        {!loading && groups.map((group) => (
          <div key={group.id} className="ci-timeline-group">
            <div className="ci-timeline-day-label">
              <div className="ci-timeline-day">{group.day}</div>
              <div className="ci-timeline-date">{group.date}</div>
            </div>
            <div className="ci-timeline-rail">
              {group.items.map((item) => (
                <div key={item.id} className="ci-timeline-row">
                  <span className="ci-timeline-dot" />
                  <span className="ci-timeline-time">{formatTime(item.createdAt)}</span>
                  <div className="ci-timeline-card">
                    <span className="ci-timeline-avatar">{initials(item.projectUser?.user)}</span>
                    <span className="ci-timeline-text">
                      {item.log || "Activity recorded"}
                      {item.project?.name ? <span className="ci-timeline-project"> · {item.project.name}</span> : null}
                    </span>
                    <span className="ci-timeline-ago">{timeAgo(item.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
