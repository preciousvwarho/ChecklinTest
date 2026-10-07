import { getSession } from "./session";

// The check-in time comes from the project itself (`checkInTime`, an ISO
// timestamp the admin sets when creating/updating the project). Only its
// time of day matters — the popup repeats every day at that time.
const pad = (n) => String(n).padStart(2, "0");

export function localDateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const doneKey = (projectId) => `checkin_done_${getSession()?.user?.id || "me"}_${projectId}`;

export function hasCheckedInToday(projectId) {
  try {
    return localStorage.getItem(doneKey(projectId)) === localDateKey();
  } catch {
    return false;
  }
}

export function markCheckedInToday(projectId) {
  try {
    localStorage.setItem(doneKey(projectId), localDateKey());
  } catch {
    // storage unavailable — popup may show again, which is acceptable
  }
}

/** Milliseconds from now until today's check-in time (<= 0 once it has passed). */
export function msUntilCheckIn(checkInTime) {
  const t = new Date(checkInTime);
  if (Number.isNaN(t.getTime())) return null;
  const today = new Date();
  today.setHours(t.getHours(), t.getMinutes(), 0, 0);
  return today.getTime() - Date.now();
}
