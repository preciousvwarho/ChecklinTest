const STORAGE_KEY = "checkin_session";

/**
 * Persists the auth session (user + token) returned by the backend.
 * @param {{user: object, token: string, tokenExpiresOn: string}} session
 */
export function saveSession(session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // localStorage unavailable (e.g. private mode) - fail silently
  }
}

export function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAuthToken() {
  return getSession()?.token || null;
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

const ACTIVE_ORG_KEY = "checkin_active_org";

export function getActiveOrgId() {
  try {
    return localStorage.getItem(ACTIVE_ORG_KEY);
  } catch {
    return null;
  }
}

export function setActiveOrgId(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_ORG_KEY, id);
    else localStorage.removeItem(ACTIVE_ORG_KEY);
  } catch {
    // ignore
  }
}

/**
 * From GET /v1/organization rows, returns the row for the user's selected
 * organisation (falls back to the first row if none is stored / it's gone).
 */
export function pickActiveOrgRow(rows = []) {
  const idOf = (r) => r?.organizationId || r?.organization?.id || r?.id;
  const stored = getActiveOrgId();
  return rows.find((r) => idOf(r) === stored) || rows[0] || null;
}
