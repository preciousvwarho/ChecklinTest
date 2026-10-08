// Base URL for the backend API. Set API_BASE_URL in your .env file,
// e.g. API_BASE_URL=https://api.checkin.app
const API_BASE_URL = import.meta.env.API_BASE_URL || ""; 
 
async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  console.log(`[api] ${method} ${path}`, body ? { body } : "");

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    console.error(`[api] ${method} ${path} network error:`, networkErr);
    throw new Error(
      "Network error. Please check your connection and try again.",
    );
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }

  console.log(`[api] ${method} ${path} response:`, data, JSON.stringify(data));

  if (!res.ok || data?.status === "error") {
    const details = Array.isArray(data?.errors)
      ? data.errors.map((e) => e.message || JSON.stringify(e)).join("; ")
      : data?.errors
        ? JSON.stringify(data.errors)
        : null;
    const message =
      [data?.message, details].filter(Boolean).join(" — ") ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

/**
 * POST /v1/auth/google
 * Authenticates a user with a verified Google ID token.
 *
 * @param {Object} params
 * @param {string} params.idToken - The Google ID token from Google Identity Services.
 * @param {string|null} [params.pushToken] - Optional device push token.
 * @returns {Promise<{status: string, data: {user: object, token: string, tokenExpiresOn: string, newUser: boolean}, message: string}>}
 */
export function signInWithGoogle({ idToken, pushToken = null }) {
  return request("/v1/auth/google", {
    method: "POST",
    body: { idToken, pushToken },
  });
}

/**
 * POST /v1/auth/sign-in
 * Starts the passwordless email sign in / signup flow by sending a
 * verification OTP to the given email.
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {string|null} [params.pushToken]
 * @returns {Promise<{status: string, data: {resendAt: string, resendDelaySeconds: number}, message: string}>}
 */
export function signInWithEmail({ email, pushToken = null }) {
  return request("/v1/auth/sign-in", {
    method: "POST",
    body: { email, pushToken },
  });
}

/**
 * POST /v1/auth/sign-in/verify
 * Verifies the OTP sent to the user's email and completes sign in / signup.
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.code
 * @returns {Promise<{status: string, data: {user: object, token: string, tokenExpiresOn: string}, message: string}>}
 */
export function verifySignInCode({ email, code }) {
  return request("/v1/auth/sign-in/verify", {
    method: "POST",
    body: { email, code },
  });
}

/**
 * POST /v1/auth/push-token
 * Stores or updates the authenticated user's push notification token.
 * Requires an auth token (call after sign-in/verify succeeds).
 *
 * @param {Object} params
 * @param {string} params.pushToken
 * @param {string} params.token - auth token from sign-in/verify
 * @returns {Promise<{status: string, data: null, message: string}>}
 */
export function updatePushToken({ pushToken, token }) {
  return request("/v1/auth/push-token", {
    method: "POST",
    body: { pushToken },
    token,
  });
}

/**
 * POST /v1/organization
 * Creates an organization for the authenticated user. All seeded project
 * roles are enabled by default — don't send a role selection list.
 *
 * @param {Object} params
 * @param {string} params.name
 * @param {string} [params.imageKey] - optional, e.g. an uploaded logo's storage key
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: {id: string, name: string, imageUrl: string|null, ...}, message: string}>}
 */
export function createOrganization({ name, imageKey, token }) {
  const body = imageKey ? { name, imageKey } : { name };
  return request("/v1/organization", {
    method: "POST",
    body,
    token,
  });
}

/**
 * POST /v1/projects?organizationId={organizationId}
 * Creates a project under the given organization.
 *
 * @param {Object} params
 * @param {string} params.organizationId
 * @param {string} params.name
 * @param {string} [params.description]
 * @param {string} params.checkInTime - ISO 8601 timestamp
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: {id: string, name: string, ...}, message: string}>}
 */
export function createProject({
  organizationId,
  name,
  description,
  checkInTime,
  token,
}) {
  return request(
    `/v1/projects?organizationId=${encodeURIComponent(organizationId)}`,
    {
      method: "POST",
      body: { name, description, checkInTime },
      token,
    },
  );
}

/**
 * GET /v1/projects?organizationId=...&page=...&limit=...
 * Retrieves projects for an organization.
 *
 * @param {Object} params
 * @param {string} params.organizationId
 * @param {number|string} [params.page]
 * @param {number|string} [params.limit]
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: object[], pageData: object, message: string}>}
 */
export function getProjects({ organizationId, page = 1, limit = 50, token }) {
  const query = new URLSearchParams({
    organizationId,
    page: String(page),
    limit: String(limit),
  });
  return request(`/v1/projects?${query.toString()}`, {
    method: "GET",
    token,
  });
}

/**
 * GET /v1/organization
 * Retrieves the organizations the authenticated user belongs to.
 *
 * @param {Object} params
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: object[], message: string}>}
 */
export function getOrganizations({ token }) {
  return request("/v1/organization", {
    method: "GET",
    token,
  });
}

/**
 * POST /v1/organization/team/invitation?organizationId=...
 * Invites users by email to join an organization. Registered invitees
 * with push tokens receive a push notification too.
 *
 * @param {Object} params
 * @param {string} params.organizationId
 * @param {string[]} params.emails
 * @param {string} [params.url] - link the invitee opens from the invite (defaults to this web app's /invite page)
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: {invitationSentTo: string[]}, message: string}>}
 */
const APP_URL = (
  import.meta.env.VITE_APP_URL || window.location.origin
).replace(/\/$/, "");

export function inviteTeamMembers({
  organizationId,
  emails,
  url = `${APP_URL}/invite`,
  token,
}) {
  console.log("[api] invitation url being sent to backend:", url);
  return request(
    `/v1/organization/team/invitation?organizationId=${encodeURIComponent(organizationId)}`,
    {
      method: "POST",
      body: { teamMembers: emails.map((email) => ({ email })), url },
      token,
    },
  );
}

// ---------------------------------------------------------------------------
// Projects: update / fetch one / delete
// ---------------------------------------------------------------------------

/**
 * PATCH /v1/projects/{projectId}
 *
 * @param {Object} params
 * @param {string} params.projectId
 * @param {string} [params.name]
 * @param {string} [params.description]
 * @param {string} [params.checkInTime] - ISO 8601 timestamp
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: object, message: string}>}
 */
export function updateProject({
  projectId,
  name,
  description,
  checkInTime,
  token,
}) {
  return request(`/v1/projects/${encodeURIComponent(projectId)}`, {
    method: "PATCH",
    body: { name, description, checkInTime },
    token,
  });
}

/**
 * GET /v1/projects/{projectId}?organizationId=...
 * Retrieves a single project, including its members and task-completion stats.
 *
 * @param {Object} params
 * @param {string} params.projectId
 * @param {string} [params.organizationId]
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: object, message: string}>}
 */
export function getProject({ projectId, organizationId, token }) {
  const query = organizationId
    ? `?organizationId=${encodeURIComponent(organizationId)}`
    : "";
  return request(`/v1/projects/${encodeURIComponent(projectId)}${query}`, {
    method: "GET",
    token,
  });
}

/**
 * DELETE /v1/projects/{projectId}
 *
 * @param {Object} params
 * @param {string} params.projectId
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, message: string}>}
 */
export function deleteProject({ projectId, token }) {
  return request(`/v1/projects/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
    token,
  });
}

/**
 * GET /v1/projects/search?organizationId=...&page=...&limit=...&q=...
 *
 * @param {Object} params
 * @param {string} params.organizationId
 * @param {string} params.q
 * @param {number|string} [params.page]
 * @param {number|string} [params.limit]
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: object[], pageData: object, message: string}>}
 */
export function searchProjects({
  organizationId,
  q,
  page = 1,
  limit = 20,
  token,
}) {
  const query = new URLSearchParams({
    organizationId,
    q,
    page: String(page),
    limit: String(limit),
  });
  return request(`/v1/projects/search?${query.toString()}`, {
    method: "GET",
    token,
  });
}

// ---------------------------------------------------------------------------
// Project members
// ---------------------------------------------------------------------------

/**
 * POST /v1/projects/members?organizationId=...&projectId=...
 * Adds existing organization users to a project's team.
 *
 * @param {Object} params
 * @param {string} params.organizationId
 * @param {string} params.projectId
 * @param {string[]} params.teamMembers - organization user IDs
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, message: string}>}
 */
export function addProjectMembers({
  organizationId,
  projectId,
  teamMembers,
  token,
}) {
  const query = new URLSearchParams({ organizationId, projectId });
  return request(`/v1/projects/members?${query.toString()}`, {
    method: "POST",
    body: { teamMembers },
    token,
  });
}

/**
 * GET /v1/projects/members?organizationId=...&projectId=...
 *
 * @param {Object} params
 * @param {string} params.organizationId
 * @param {string} params.projectId
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: object[], message: string}>}
 */
export function getProjectMembers({ organizationId, projectId, token }) {
  const query = new URLSearchParams({ organizationId, projectId });
  return request(`/v1/projects/members?${query.toString()}`, {
    method: "GET",
    token,
  });
}

/**
 * PATCH /v1/projects/members/{memberId}?projectId=...
 * Changes a project member's role.
 *
 * @param {Object} params
 * @param {string} params.memberId
 * @param {string} params.projectId
 * @param {string} params.roleId
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: object, message: string}>}
 */
export function updateProjectMember({ memberId, projectId, roleId, token }) {
  const query = new URLSearchParams({ projectId });
  return request(
    `/v1/projects/members/${encodeURIComponent(memberId)}?${query.toString()}`,
    {
      method: "PATCH",
      body: { roleId },
      token,
    },
  );
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

/**
 * POST /v1/projects/tasks?projectId=...
 *
 * @param {Object} params
 * @param {string} params.projectId
 * @param {string} params.title
 * @param {string} [params.description]
 * @param {string} params.startDate - ISO 8601 timestamp
 * @param {string} params.endDate - ISO 8601 timestamp
 * @param {string[]} [params.teamMembers] - user IDs to assign
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: object, message: string}>}
 */
export function createTask({
  projectId,
  title,
  description,
  startDate,
  endDate,
  teamMembers = [],
  token,
}) {
  return request(
    `/v1/projects/tasks?projectId=${encodeURIComponent(projectId)}`,
    {
      method: "POST",
      body: { title, description, startDate, endDate, teamMembers },
      token,
    },
  );
}

/**
 * GET /v1/projects/tasks?projectId=...&page=...&limit=...&taskScope=assigned|all
 *
 * @param {Object} params
 * @param {string} params.projectId
 * @param {number|string} [params.page]
 * @param {number|string} [params.limit]
 * @param {"assigned"|"all"} [params.taskScope] - defaults to "assigned"
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: object[], pageData: object, message: string}>}
 */
export function getTasks({
  projectId,
  page = 1,
  limit = 50,
  taskScope = "assigned",
  token,
}) {
  const query = new URLSearchParams({
    projectId,
    page: String(page),
    limit: String(limit),
    taskScope,
  });
  return request(`/v1/projects/tasks?${query.toString()}`, {
    method: "GET",
    token,
  });
}

/**
 * GET /v1/projects/tasks/ongoing?projectId=...
 * Tasks assigned to the authenticated user that are PENDING, IN_PROGRESS,
 * OVERDUE, or PENDING_COMPLETION_APPROVAL.
 *
 * @param {Object} params
 * @param {string} params.projectId
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: object[], message: string}>}
 */
export function getOngoingTasks({ projectId, token }) {
  return request(
    `/v1/projects/tasks/ongoing?projectId=${encodeURIComponent(projectId)}`,
    {
      method: "GET",
      token,
    },
  );
}

/**
 * PATCH /v1/projects/tasks/{taskId}
 *
 * @param {Object} params
 * @param {string} params.taskId
 * @param {string} [params.title]
 * @param {string} [params.description]
 * @param {string} [params.startDate] - ISO 8601 timestamp
 * @param {string} [params.endDate] - ISO 8601 timestamp
 * @param {string[]} [params.teamMembers] - user IDs to assign
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: object, message: string}>}
 */
export function updateTask({
  taskId,
  title,
  description,
  startDate,
  endDate,
  teamMembers,
  token,
}) {
  return request(`/v1/projects/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    body: { title, description, startDate, endDate, teamMembers },
    token,
  });
}

/**
 * GET /v1/projects/tasks/{taskId}?projectId=...
 *
 * @param {Object} params
 * @param {string} params.taskId
 * @param {string} [params.projectId]
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: object, message: string}>}
 */
export function getTask({ taskId, projectId, token }) {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  return request(`/v1/projects/tasks/${encodeURIComponent(taskId)}${query}`, {
    method: "GET",
    token,
  });
}

/**
 * DELETE /v1/projects/tasks/{taskId}?projectId=...
 *
 * @param {Object} params
 * @param {string} params.taskId
 * @param {string} params.projectId
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, message: string}>}
 */
export function deleteTask({ taskId, projectId, token }) {
  return request(
    `/v1/projects/tasks/${encodeURIComponent(taskId)}?projectId=${encodeURIComponent(projectId)}`,
    {
      method: "DELETE",
      token,
    },
  );
}

/**
 * PATCH /v1/projects/tasks/{taskId}/status
 * Assignees can move to IN_PROGRESS or submit COMPLETED (saved as
 * PENDING_COMPLETION_APPROVAL until the supervisor/admin approves).
 * Supervisors/admins can set COMPLETED directly.
 *
 * @param {Object} params
 * @param {string} params.taskId
 * @param {string} params.status - e.g. "IN_PROGRESS" | "COMPLETED"
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: object, message: string}>}
 */
export function updateTaskStatus({ taskId, status, token }) {
  return request(`/v1/projects/tasks/${encodeURIComponent(taskId)}/status`, {
    method: "PATCH",
    body: { status },
    token,
  });
}

/**
 * GET /v1/projects/tasks/{taskId}/work-logs?projectId=...&page=...&limit=...
 *
 * @param {Object} params
 * @param {string} params.taskId
 * @param {string} params.projectId
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: object[], pageData: object, message: string}>}
 */
export function getTaskWorkLogs({
  taskId,
  projectId,
  page = 1,
  limit = 20,
  token,
}) {
  const query = new URLSearchParams({
    projectId,
    page: String(page),
    limit: String(limit),
  });
  return request(
    `/v1/projects/tasks/${encodeURIComponent(taskId)}/work-logs?${query.toString()}`,
    {
      method: "GET",
      token,
    },
  );
}

// ---------------------------------------------------------------------------
// Task comments & thought process
// ---------------------------------------------------------------------------

/**
 * POST /v1/projects/tasks/{taskId}/comments?projectId=...
 * Use parentId to reply to an existing top-level comment.
 *
 * @param {Object} params
 * @param {string} params.taskId
 * @param {string} params.projectId
 * @param {string} params.content
 * @param {Array<{key: string, fileType: string, fileName: string, fileSize: number}>} [params.attachments]
 * @param {string} [params.parentId]
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: object, message: string}>}
 */
export function createTaskComment({
  taskId,
  projectId,
  content,
  attachments = [],
  parentId,
  token,
}) {
  const body = { content, attachments };
  if (parentId) body.parentId = parentId;
  return request(
    `/v1/projects/tasks/${encodeURIComponent(taskId)}/comments?projectId=${encodeURIComponent(projectId)}`,
    {
      method: "POST",
      body,
      token,
    },
  );
}

/**
 * GET /v1/projects/tasks/{taskId}/comments?projectId=...&page=...&limit=...&parentId=...
 * Omit parentId to get top-level comments; pass it to fetch replies to one comment.
 *
 * @param {Object} params
 * @param {string} params.taskId
 * @param {string} params.projectId
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {string} [params.parentId]
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: object[], pageData: object, message: string}>}
 */
export function getTaskComments({
  taskId,
  projectId,
  page = 1,
  limit = 20,
  parentId,
  token,
}) {
  const query = new URLSearchParams({
    projectId,
    page: String(page),
    limit: String(limit),
  });
  if (parentId) query.set("parentId", parentId);
  return request(
    `/v1/projects/tasks/${encodeURIComponent(taskId)}/comments?${query.toString()}`,
    {
      method: "GET",
      token,
    },
  );
}

/**
 * DELETE /v1/projects/tasks/{taskId}/comments/{commentId}
 *
 * @param {Object} params
 * @param {string} params.taskId
 * @param {string} params.commentId
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, message: string}>}
 */
export function deleteTaskComment({ taskId, commentId, token }) {
  return request(
    `/v1/projects/tasks/${encodeURIComponent(taskId)}/comments/${encodeURIComponent(commentId)}`,
    {
      method: "DELETE",
      token,
    },
  );
}

/**
 * POST /v1/projects/tasks/{taskId}/thought-process?projectId=...
 * Stored as a task comment with type THOUGHT_PROCESS; appears in the task's
 * comment list, not in the project group chat.
 *
 * @param {Object} params
 * @param {string} params.taskId
 * @param {string} params.projectId
 * @param {string} params.content
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: object, message: string}>}
 */
export function createTaskThoughtProcess({
  taskId,
  projectId,
  content,
  token,
}) {
  return request(
    `/v1/projects/tasks/${encodeURIComponent(taskId)}/thought-process?projectId=${encodeURIComponent(projectId)}`,
    {
      method: "POST",
      body: { content },
      token,
    },
  );
}

// ---------------------------------------------------------------------------
// Activity logs & analytics
// ---------------------------------------------------------------------------

/**
 * GET /v1/projects/activity-logs?date=...&page=...&limit=...
 * Returns activity entries grouped by date ("YYYY-MM-DD" keys).
 *
 * @param {Object} params
 * @param {string} [params.date]
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: Object<string, object[]>, pageData: object, message: string}>}
 */
export function getActivityLogs({ date, page = 1, limit = 20, token } = {}) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (date) query.set("date", date);
  return request(`/v1/projects/activity-logs?${query.toString()}`, {
    method: "GET",
    token,
  });
}

/**
 * GET /v1/projects/tasks/{taskId}/analytics?projectId=...&page=...&limit=...&date=...
 *
 * @param {Object} params
 * @param {string} params.taskId
 * @param {string} params.projectId
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {string} [params.date] - ISO date-time; returns the analytics row overlapping that day
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: object[], pageData: object, message: string}>}
 */
export function getTaskAnalytics({
  taskId,
  projectId,
  page = 1,
  limit = 20,
  date,
  token,
}) {
  const query = new URLSearchParams({
    projectId,
    page: String(page),
    limit: String(limit),
  });
  if (date) query.set("date", date);
  return request(
    `/v1/projects/tasks/${encodeURIComponent(taskId)}/analytics?${query.toString()}`,
    {
      method: "GET",
      token,
    },
  );
}

/**
 * GET /v1/projects/analytics?projectId=...&page=...&limit=...&date=...
 * Role-scoped: admins see project-level analytics, supervisors see tasks
 * they supervise, team members see tasks assigned to them.
 *
 * @param {Object} params
 * @param {string} params.projectId
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {string} [params.date]
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: object[], pageData: object, message: string}>}
 */
export function getRoleScopedAnalytics({
  projectId,
  page = 1,
  limit = 20,
  date,
  token,
}) {
  const query = new URLSearchParams({
    projectId,
    page: String(page),
    limit: String(limit),
  });
  if (date) query.set("date", date);
  return request(`/v1/projects/analytics?${query.toString()}`, {
    method: "GET",
    token,
  });
}

/**
 * GET /v1/projects/analytics/overview?projectId=...&page=...&limit=...&date=...
 * Screen-ready weekly analytics summaries for the Analytics tab.
 *
 * @param {Object} params
 * @param {string} params.projectId
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {string} [params.date]
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: {overview: object, data: object[], pageData: object}, message: string}>}
 */
export function getAnalyticsOverview({
  projectId,
  page = 1,
  limit = 20,
  date,
  token,
}) {
  const query = new URLSearchParams({
    projectId,
    page: String(page),
    limit: String(limit),
  });
  if (date) query.set("date", date);
  return request(`/v1/projects/analytics/overview?${query.toString()}`, {
    method: "GET",
    token,
  });
}

/**
 * GET /v1/projects/analytics/{analyticsId}/insight?projectId=...
 * Screen-ready AI Insight detail for one weekly project analytics summary.
 *
 * @param {Object} params
 * @param {string} params.analyticsId - a ProjectWeeklyAnalytics ID
 * @param {string} params.projectId
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: object, message: string}>}
 */
export function getAnalyticsInsight({ analyticsId, projectId, token }) {
  return request(
    `/v1/projects/analytics/${encodeURIComponent(analyticsId)}/insight?projectId=${encodeURIComponent(projectId)}`,
    {
      method: "GET",
      token,
    },
  );
}

/**
 * GET /v1/projects/analytics/{analyticsId}?projectId=...
 * One role-scoped task analytics row.
 *
 * @param {Object} params
 * @param {string} params.analyticsId
 * @param {string} params.projectId
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: object, message: string}>}
 */
export function getAnalyticsById({ analyticsId, projectId, token }) {
  return request(
    `/v1/projects/analytics/${encodeURIComponent(analyticsId)}?projectId=${encodeURIComponent(projectId)}`,
    {
      method: "GET",
      token,
    },
  );
}

// ---------------------------------------------------------------------------
// Messaging: DMs & project group chat
// ---------------------------------------------------------------------------

const orgQuery = (organizationId) =>
  `organizationId=${encodeURIComponent(organizationId)}`;

/**
 * POST /v1/messaging/conversations?organizationId=...
 * Creates (or initiates) a direct conversation with the given organization users.
 *
 * @param {Object} params
 * @param {string} params.organizationId
 * @param {string[]} params.organizationUsers - organization user IDs (NOT user IDs)
 * @param {string} params.token - auth token
 * @returns {Promise<{status: string, data: {id: string, participants: object[], ...}, message: string}>}
 */
export function createConversation({
  organizationId,
  organizationUsers,
  token,
}) {
  return request(`/v1/messaging/conversations?${orgQuery(organizationId)}`, {
    method: "POST",
    body: { organizationUsers },
    token,
  });
}

/**
 * GET /v1/messaging/conversations?organizationId=...&page=...&limit=...
 * Direct conversations for the authenticated org user, most recent activity
 * first. Each row includes participants, a `messages` preview and `unreadCount`.
 */
export function getConversations({
  organizationId,
  page = 1,
  limit = 50,
  token,
}) {
  const query = new URLSearchParams({
    organizationId,
    page: String(page),
    limit: String(limit),
  });
  return request(`/v1/messaging/conversations?${query.toString()}`, {
    method: "GET",
    token,
  });
}

/** GET /v1/messaging/conversations/{conversationId}?organizationId=... */
export function getConversation({ conversationId, organizationId, token }) {
  return request(
    `/v1/messaging/conversations/${encodeURIComponent(conversationId)}?${orgQuery(organizationId)}`,
    {
      method: "GET",
      token,
    },
  );
}

/**
 * GET /v1/messaging/conversations/{conversationId}/messages?organizationId=...&page=...&limit=...
 * Paginated messages incl. replyToMessage, deletedAt, checkIn, messageAttachments
 * (with signed urls) and readBy receipts.
 */
export function getConversationMessages({
  conversationId,
  organizationId,
  page = 1,
  limit = 30,
  token,
}) {
  const query = new URLSearchParams({
    organizationId,
    page: String(page),
    limit: String(limit),
  });
  return request(
    `/v1/messaging/conversations/${encodeURIComponent(conversationId)}/messages?${query.toString()}`,
    {
      method: "GET",
      token,
    },
  );
}

/** GET /v1/messaging/conversations/{conversationId}/participants?organizationId=...&page=...&limit=... */
export function getConversationParticipants({
  conversationId,
  organizationId,
  page = 1,
  limit = 50,
  token,
}) {
  const query = new URLSearchParams({
    organizationId,
    page: String(page),
    limit: String(limit),
  });
  return request(
    `/v1/messaging/conversations/${encodeURIComponent(conversationId)}/participants?${query.toString()}`,
    {
      method: "GET",
      token,
    },
  );
}

/**
 * GET /v1/messaging/conversations/by-project/{projectId}?organizationId=...
 * The project's group conversation (includes participants + unreadCount).
 */
export function getProjectConversation({ projectId, organizationId, token }) {
  return request(
    `/v1/messaging/conversations/by-project/${encodeURIComponent(projectId)}?${orgQuery(organizationId)}`,
    {
      method: "GET",
      token,
    },
  );
}

/**
 * PATCH /v1/messaging/conversations/{conversationId}/read?organizationId=...
 * Marks the latest message as read for the authenticated org user.
 */
export function markConversationRead({
  conversationId,
  organizationId,
  token,
}) {
  return request(
    `/v1/messaging/conversations/${encodeURIComponent(conversationId)}/read?${orgQuery(organizationId)}`,
    {
      method: "PATCH",
      token,
    },
  );
}

/**
 * DELETE /v1/messaging/conversations/{conversationId}/messages/{messageId}?organizationId=...
 * Soft-deletes one of the caller's own messages (row stays; `deletedAt` is set).
 */
export function deleteConversationMessage({
  conversationId,
  messageId,
  organizationId,
  token,
}) {
  return request(
    `/v1/messaging/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}?${orgQuery(organizationId)}`,
    { method: "DELETE", token },
  );
}

/**
 * POST /v1/messaging/conversations/{conversationId}/messages?organizationId=...
 *
 * ASSUMPTION: the docs you shared don't include a send endpoint (the backend
 * mentions realtime events, so sending may be a socket event). This follows the
 * REST convention of the sibling routes. If your backend differs, this is the
 * only function to change.
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.organizationId
 * @param {string} params.content
 * @param {string} [params.replyToMessageId]
 * @param {Array<{key: string, fileType: string, fileName: string, fileSize: number}>} [params.attachments]
 * @param {string} params.token - auth token
 */
export function sendConversationMessage({
  conversationId,
  organizationId,
  content,
  replyToMessageId,
  attachments = [],
  checkIn,
  token,
}) {
  const body = { content, attachments };
  // ASSUMPTION: check-in messages carry a `checkIn` object (the read side exposes blocker / focusTasks / inProgressTasks).
  if (checkIn) body.checkIn = checkIn;
  if (replyToMessageId) body.replyToMessageId = replyToMessageId;
  return request(
    `/v1/messaging/conversations/${encodeURIComponent(conversationId)}/messages?${orgQuery(organizationId)}`,
    {
      method: "POST",
      body,
      token,
    },
  );
}

// ---------------------------------------------------------------------------
// Current user & file uploads
// ---------------------------------------------------------------------------

/** GET /v1/auth/user — { id, email, firstName, lastName, avatarKey, avatarUrl, globalRole, ... } */
export function getCurrentUser({ token }) {
  return request("/v1/auth/user", { method: "GET", token });
}

/**
 * PATCH /v1/auth/user
 * @param {{firstName?: string, lastName?: string, avatarKey?: string, token: string}} params
 */
export function updateCurrentUser({ firstName, lastName, avatarKey, token }) {
  const body = {};
  if (firstName !== undefined) body.firstName = firstName;
  if (lastName !== undefined) body.lastName = lastName;
  if (avatarKey !== undefined) body.avatarKey = avatarKey;
  return request("/v1/auth/user", { method: "PATCH", body, token });
}

/**
 * GET /v1/files/upload-signed-url?sign=...
 * Returns [{ key, url }] — PUT the file bytes to `url`, then reference `key`.
 *
 * ASSUMPTION: `sign` is the number of upload URLs wanted (the docs don't say).
 */
export function getUploadSignedUrls({ count = 1, token }) {
  return request(
    `/v1/files/upload-signed-url?sign=${encodeURIComponent(String(count))}`,
    { method: "GET", token },
  );
}

/** GET /v1/files/signed-url?key=... — temporary download URL for a stored file. */
export function getFileSignedUrl({ key, token }) {
  return request(`/v1/files/signed-url?key=${encodeURIComponent(key)}`, {
    method: "GET",
    token,
  });
}

/**
 * Uploads files straight to object storage via signed URLs.
 * @param {File[]} files
 * @param {string} token
 * @returns {Promise<Array<{key: string, fileType: string, fileName: string, fileSize: number}>>}
 */
export async function uploadFiles(files, token) {
  if (!files.length) return [];
  const res = await getUploadSignedUrls({ count: files.length, token });
  const slots = res.data || [];
  if (slots.length < files.length)
    throw new Error("Could not get upload links. Please try again.");
  return Promise.all(
    files.map(async (file, i) => {
      let put;
      try {
        put = await fetch(slots[i].url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });
      } catch {
        throw new Error(
          `Upload failed for ${file.name}. Check your connection.`,
        );
      }
      if (!put.ok)
        throw new Error(`Upload failed for ${file.name} (${put.status}).`);
      return {
        key: slots[i].key,
        fileType: file.type,
        fileName: file.name,
        fileSize: file.size,
      };
    }),
  );
}

// ---------------------------------------------------------------------------
// Organization invitations (invitee side)
// ---------------------------------------------------------------------------

/** GET /v1/organization/team/invitations?page=&limit= — rows have acceptedAt / rejectedAt / email / organization. */
export function getInvitations({ page = 1, limit = 50, token }) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return request(`/v1/organization/team/invitations?${query.toString()}`, {
    method: "GET",
    token,
  });
}

/** GET /v1/organization/team/invitation/{invitationId} */
export function getInvitation({ invitationId, token }) {
  return request(
    `/v1/organization/team/invitation/${encodeURIComponent(invitationId)}`,
    { method: "GET", token },
  );
}

/** POST /v1/organization/team/invitation/accept — { id } */
export function acceptInvitation({ id, token }) {
  return request("/v1/organization/team/invitation/accept", {
    method: "POST",
    body: { id },
    token,
  });
}

/** POST /v1/organization/team/invitation/reject — { id } */
export function rejectInvitation({ id, token }) {
  return request("/v1/organization/team/invitation/reject", {
    method: "POST",
    body: { id },
    token,
  });
}
