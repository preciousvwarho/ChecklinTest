import React, { useEffect, useState } from "react";
import {
  MoreVertical,
  Pencil,
  Trash2,
  MessageSquare,
  Paperclip,
  Plus,
  ArrowLeft,
  X,
  Search,
  Calendar,
} from "lucide-react";
import AppShell from "../components/AppShell";
import ChatThread from "../components/ChatThread";
import DailyCheckInModal from "../components/DailyCheckInModal";
import { hasCheckedInToday, markCheckedInToday, msUntilCheckIn } from "../lib/checkin";
import {
  getProject,
  getTasks,
  createTask as apiCreateTask,
  getProjectMembers,
  getAnalyticsOverview,
  inviteTeamMembers,
  getProjectConversation,
  sendConversationMessage,
} from "../lib/api";
import { getAuthToken } from "../lib/session";
import { personName, personImage } from "../lib/people";

const TABS = [
  { id: "board", label: "My Task Board" },
  { id: "chat", label: "Group Chat" },
  { id: "analytics", label: "Analytics" },
];

// Maps a task as returned by GET /v1/projects/tasks into the shape the
// board card / task detail route render. The swagger doc doesn't spell out
// every field name, so this is deliberately defensive — adjust the
// fallbacks below once the real response shape is confirmed.
function toBoardTask(t) {
  const statusLabel = { PENDING: "Pending", IN_PROGRESS: "In progress", COMPLETED: "Completed" }[t.status] || t.status || "Pending";
  const percent = t.percent ?? t.progress ?? (t.status === "COMPLETED" ? 100 : t.status === "IN_PROGRESS" ? 50 : 0);
  const formatDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : null);
  const dateRange = t.startDate && t.endDate ? `${formatDate(t.startDate)} - ${formatDate(t.endDate)}` : "No dates set";
  return {
    id: t.id,
    title: t.title,
    section: t.category || t.section || "General",
    percent,
    // "3/5" style label shown on the card — falls back to the percent.
    progressText:
      t.progressText ||
      (t.completedCount != null && t.totalCount != null ? `${t.completedCount}/${t.totalCount}` : `${percent}%`),
    dateRange,
    comments: t.commentsCount ?? t.commentCount ?? 0,
    files: t.attachmentsCount ?? t.filesCount ?? 0,
    active: t.status === "IN_PROGRESS",
    description: t.description || "No description provided.",
    dueDate: formatDate(t.endDate) || "No due date",
    status: statusLabel,
    rawStatus: t.status,
    startDate: t.startDate,
    endDate: t.endDate,
    members: t.teamMembers || [],
  };
}

// Converts a plain <input type="date"> value ("YYYY-MM-DD") into a UTC
// ISO 8601 timestamp the API will accept (e.g. "2025-05-12T00:00:00Z").
// endOfDay=true is used for the due date so it lands at the end of that day.
function toApiIsoDate(dateStr, endOfDay = false) {
  if (!dateStr) return undefined;
  return `${dateStr}T${endOfDay ? "23:59:59" : "00:00:00"}Z`;
}

// Maps a project member as returned by GET /v1/projects/members.
function toTeamMember(m) {
  return {
    id: m.id, // project-membership record id — used for role changes etc.
    userId: m.user?.id || m.userId || m.id, // organization user id — required by createTask's teamMembers
    name: personName(m),
    role: m.role?.name || m.projectRole?.name || (typeof m.role === "string" ? m.role : "") || "Member",
    avatar: personImage(m) || `https://i.pravatar.cc/64?u=${m.id}`,
  };
}

// Maps GET /v1/projects/analytics/overview into what the Analytics tab renders.
// Response shape: { data: { overview, data: [weekly cards], pageData } }
function toAnalytics(payload) {
  if (!payload) return null;
  const overview = payload.overview || {};
  const clamp = (n) => Math.max(0, Math.min(100, Number(n) || 0));
  return {
    periodLabel: overview.period?.label || "",
    productivity: clamp(overview.productivityScore),
    change: overview.productivityChangePercentage ?? null,
    remarkTitle: overview.remarkTitle || "",
    remark: overview.remark || "",
    totalCompleted: overview.totalCompletedTasks ?? 0,
    onTrack: overview.onTrackPercentage ?? 0,
    responseTime: overview.averageResponseTime?.label || "—",
    taskSummary: overview.taskAnalysis?.summary || "",
    entries: (payload.data || []).map((entry) => ({
      id: entry.analyticsId || entry.id,
      title: entry.title || entry.period?.label || "Weekly report",
      range: entry.period?.label || "",
      score: entry.productivityScore ?? entry.metrics?.productivity?.value ?? null,
    })),
  };
}

// ---- gauge geometry helpers (270deg sweep, 90deg gap centered at bottom) ----
function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}
function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return ["M", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y].join(" ");
}
const GAUGE_START = -135;
const GAUGE_SWEEP = 270;

const memberAvatar = (m, i) =>
  m?.imageUrl || m?.avatar || m?.user?.imageUrl || `https://i.pravatar.cc/40?u=${m?.id || m?.userId || i}`;

function TaskCard({ task, onClick }) {
  const members = task.members || [];
  const shownMembers = members.slice(0, 3);
  const extraCount = members.length - shownMembers.length;

  return (
    <div
      className="ci-task-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="ci-task-title">{task.title}</div>
      <div className="ci-task-progress-row">
        <span className="ci-task-progress-label">Progress Bar</span>
        <span className="ci-task-progress-percent">{task.progressText}</span>
      </div>
      <div className="ci-task-track">
        <div className="ci-task-fill" style={{ width: `${task.percent}%` }} />
      </div>
      <div className="ci-task-date">{task.dateRange}</div>
      <div className="ci-task-footer">
        <div className="ci-task-avatars">
          {shownMembers.map((m, i) => (
            <img key={m?.id || m?.userId || i} src={memberAvatar(m, i)} alt="" className="ci-task-avatar" />
          ))}
          {extraCount > 0 && <span className="ci-task-avatar-more">+{extraCount}</span>}
        </div>
        <span className="ci-task-meta">
          <MessageSquare size={13} />
          {task.comments}
        </span>
        <span className="ci-task-meta">
          <Paperclip size={13} />
          {task.files}
        </span>
      </div>
    </div>
  );
}

export default function CheckInProjectDetail({ projectId, organizationId, projectName = "Budget Project", onBack, onOpenTask, onOpenInsight }) {
  const [activeTab, setActiveTab] = useState("board");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmailInput, setInviteEmailInput] = useState("");
  const [inviteEmails, setInviteEmails] = useState([]);
  const [invitingTeam, setInvitingTeam] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSentTo, setInviteSentTo] = useState([]);
  const [chat, setChat] = useState(null); // project group conversation (id + participants)
  const [chatError, setChatError] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState("");
  const [fetchedProjectName, setFetchedProjectName] = useState(null);
  const displayProjectName = projectName || fetchedProjectName || "Project";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createTaskSection, setCreateTaskSection] = useState(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskStartDate, setTaskStartDate] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [taskMembers, setTaskMembers] = useState([]);
  const [creatingTask, setCreatingTask] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null); // project.checkInTime set by the admin
  const [checkInTasks, setCheckInTasks] = useState([]); // MY in-progress tasks

  // Load the task board, team panel, and analytics overview from the real
  // API as soon as we know which project we're looking at.
  useEffect(() => {
    if (!projectId) return;
    const token = getAuthToken();

    const load = async () => {
      setLoading(true);
      setError("");
      setAnalyticsError("");
      try {
        const [tasksResult, membersResult, analyticsResult, projectResult] = await Promise.all([
          getTasks({ projectId, page: 1, limit: 50, taskScope: "all", token }),
          getProjectMembers({ organizationId, projectId, token }).catch((err) => {
            console.error("[ProjectDetail] getProjectMembers failed:", err);
            return null;
          }),
          getAnalyticsOverview({ projectId, page: 1, limit: 20, token }).catch((err) => {
            console.error("[ProjectDetail] getAnalyticsOverview failed:", err);
            setAnalyticsError(err.message || "Failed to load analytics.");
            return null;
          }),
          getProject({ projectId, organizationId, token }).catch((err) => {
            console.error("[ProjectDetail] getProject failed:", err);
            return null;
          }),
        ]);
        setTasks((tasksResult.data || []).map(toBoardTask));
        setTeamMembers((membersResult?.data || []).map(toTeamMember));
        // analyticsResult.data = { overview, data: [weekly cards], pageData }
        setAnalytics(toAnalytics(analyticsResult?.data));
        if (projectResult?.data?.name) setFetchedProjectName(projectResult.data.name);
        setCheckInTime(projectResult?.data?.checkInTime || null);
      } catch (err) {
        console.error("[ProjectDetail] failed to load project data:", err);
        setError(err.message || "Failed to load project.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [projectId, organizationId]);

  // Load the project's group conversation the first time the chat tab opens.
  useEffect(() => {
    if (activeTab !== "chat" || chat || chatLoading || !projectId || !organizationId) return;
    let cancelled = false;
    setChatLoading(true);
    setChatError("");
    getProjectConversation({ projectId, organizationId, token: getAuthToken() })
      .then((res) => !cancelled && setChat(res.data))
      .catch((err) => !cancelled && setChatError(err.message || "Failed to load group chat."))
      .finally(() => !cancelled && setChatLoading(false));
    return () => {
      cancelled = true;
    };
  }, [activeTab, projectId, organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Daily check-in. The time is the project's own `checkInTime` (set by the
  // admin). Once it has passed today and the user hasn't checked in, open the
  // popup with the user's own in-progress tasks; if it's still ahead, open it
  // when that time arrives. Projects without a check-in time never prompt.
  useEffect(() => {
    if (loading || !projectId || !checkInTime || hasCheckedInToday(projectId)) return;
    const wait = msUntilCheckIn(checkInTime);
    if (wait === null || wait > 24 * 60 * 60 * 1000) return;

    let cancelled = false;
    const openIfNeeded = async () => {
      if (hasCheckedInToday(projectId)) return;
      try {
        // taskScope "assigned" = only tasks assigned to the signed-in user.
        const res = await getTasks({ projectId, page: 1, limit: 50, taskScope: "assigned", token: getAuthToken() });
        const mine = (res.data || []).map(toBoardTask).filter((t) => t.rawStatus === "IN_PROGRESS");
        if (cancelled || !mine.length) return;
        setCheckInTasks(mine);
        setCheckInOpen(true);
      } catch (err) {
        console.error("[ProjectDetail] check-in tasks failed:", err);
      }
    };

    if (wait <= 0) {
      openIfNeeded();
      return () => {
        cancelled = true;
      };
    }
    const id = setTimeout(openIfNeeded, wait);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [loading, projectId, checkInTime]); // eslint-disable-line react-hooks/exhaustive-deps

  // Posts the check-in to the project's group chat.
  const submitCheckIn = async ({ blocker, focusTasks }) => {
    const token = getAuthToken();
    const conv = chat || (await getProjectConversation({ projectId, organizationId, token })).data;
    const lines = ["Daily check-in"];
    lines.push(`Blockers: ${blocker || "None"}`);
    lines.push(`Focusing on: ${focusTasks.map((t) => t.title).join(", ")}`);
    await sendConversationMessage({
      conversationId: conv.id,
      organizationId,
      content: lines.join("\n"),
      checkIn: {
        blocker,
        focusTaskIds: focusTasks.map((t) => t.id),
        inProgressTaskIds: checkInTasks.map((t) => t.id),
      },
      token,
    });
    markCheckedInToday(projectId);
    setCheckInOpen(false);
  };

  const sections = [...new Set(tasks.map((t) => t.section))];
  const isCreateTaskOpen = createTaskSection !== null;
  const canCreateTask = taskTitle.trim().length > 0;

  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const completedPercent = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  const openCreateTask = (section) => {
    setCreateTaskSection(section);
    setTaskTitle("");
    setTaskDescription("");
    setTaskStartDate("");
    setTaskDueDate("");
    setMemberInput("");
    setTaskMembers([]);
  };

  // taskMembers holds organization user IDs (teamMembers[].userId, fetched
  // via GET /v1/projects/members) — NOT the membership record's own id.
  const addMember = (id) => {
    if (!id) return;
    setTaskMembers((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setMemberInput("");
  };

  const removeMember = (id) => {
    setTaskMembers((prev) => prev.filter((m) => m !== id));
  };

  const addableMembers = teamMembers.filter((m) => !taskMembers.includes(m.userId));

  // POST /v1/projects/tasks?projectId=... — the API has no "section"/
  // "category" field, so newly created tasks land in whichever section
  // openCreateTask was launched from purely on the client side.
  const createTask = async () => {
    if (!canCreateTask || creatingTask) return;
    const token = getAuthToken();
    setCreatingTask(true);
    try {
      const result = await apiCreateTask({
        projectId,
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        startDate: toApiIsoDate(taskStartDate),
        endDate: toApiIsoDate(taskDueDate, true),
        teamMembers: taskMembers,
        token,
      });
      const created = { ...toBoardTask(result.data || {}), section: createTaskSection };
      setTasks((prev) => [...prev, created]);
      setCreateTaskSection(null);
    } catch (err) {
      console.error("[ProjectDetail] createTask failed:", err);
      setError(err.message || "Failed to create task.");
    } finally {
      setCreatingTask(false);
    }
  };

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const openInvite = () => {
    setInviteEmailInput("");
    setInviteEmails([]);
    setInviteError("");
    setInviteSentTo([]);
    setIsInviteOpen(true);
  };

  const addInviteEmail = () => {
    const value = inviteEmailInput.trim();
    if (!value) return;
    if (!EMAIL_RE.test(value)) {
      setInviteError(`"${value}" doesn't look like a valid email.`);
      return;
    }
    setInviteError("");
    setInviteEmails((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setInviteEmailInput("");
  };

  const removeInviteEmail = (value) => {
    setInviteEmails((prev) => prev.filter((e) => e !== value));
  };

  // POST /v1/organization/team/invitation — invites people to the
  // organization by email (there's no endpoint to search/list existing
  // org members to add directly, so email invite is the real "add member" flow).
  const sendInvites = async () => {
    if (inviteEmails.length === 0 || invitingTeam) return;
    const token = getAuthToken();
    setInvitingTeam(true);
    setInviteError("");
    try {
      const result = await inviteTeamMembers({ organizationId, emails: inviteEmails, token });
      setInviteSentTo(result.data?.invitationSentTo || inviteEmails);
      setInviteEmails([]);
    } catch (err) {
      console.error("[ProjectDetail] inviteTeamMembers failed:", err);
      setInviteError(err.message || "Failed to send invites.");
    } finally {
      setInvitingTeam(false);
    }
  };

  // ---- analytics tab, from GET /v1/projects/analytics/overview ----
  const analyticsProductivity = analytics?.productivity ?? 0;
  const analyticsGaugeTrack = describeArc(50, 50, 40, GAUGE_START, GAUGE_START + GAUGE_SWEEP);
  // A 0% arc has zero length and some browsers render a dot, so skip drawing it.
  const analyticsGaugeProgress =
    analyticsProductivity > 0
      ? describeArc(50, 50, 40, GAUGE_START, GAUGE_START + (GAUGE_SWEEP * analyticsProductivity) / 100)
      : "";
  const analyticsChange = analytics?.change;
  const analyticsEntries = analytics?.entries || [];

  return (
    <AppShell>
      <style>{`
        .ci-main-inner { display: flex; align-items: flex-start; gap: 32px; padding: 32px 40px 60px; }
        .ci-board { flex: 1; min-width: 0; }

        .ci-board-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .ci-board-heading-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .ci-back-btn {
          display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;
          border-radius: 8px; border: 1px solid #eef0f1; background: #fff; color: #141b1f; cursor: pointer; flex-shrink: 0;
        }
        .ci-back-btn:hover { background: #f5f6f7; }
        .ci-board-title { font-size: 28px; font-weight: 800; color: #141b1f; margin: 0; letter-spacing: -0.3px; }
        .ci-board-actions { display: flex; align-items: center; gap: 6px; }
        .ci-icon-btn-ghost {
          display: flex; align-items: center; justify-content: center; width: 30px; height: 30px;
          border-radius: 8px; border: none; background: transparent; color: #9aa4aa; cursor: pointer;
        }
        .ci-icon-btn-ghost:hover { background: #f5f6f7; }
        .ci-icon-btn-ghost.danger:hover { background: #fdeeee; color: #e05555; }

        .ci-tabs { display: flex; gap: 32px; border-bottom: 1px solid #eef0f1; margin-bottom: 22px; }
        .ci-tab {
          background: none; border: none; padding: 0 0 12px; font-size: 13.5px; font-weight: 700;
          color: #9aa4aa; cursor: pointer; position: relative;
        }
        .ci-tab.active { color: #141b1f; }
        .ci-tab.active::after {
          content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 2.5px; background: #1CA7D0; border-radius: 2px;
        }

        /* ---------- blue stat card ---------- */
        .ci-stat-card {
          background: linear-gradient(120deg, #25A9CE 0%, #1CA7D0 55%, #1798bd 100%);
          border-radius: 14px; padding: 28px 30px; display: flex; align-items: center;
          gap: 22px; margin-bottom: 26px;
        }
        .ci-stat-left { display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .ci-stat-percent { color: #fff; font-size: 32px; font-weight: 800; line-height: 1; }
        .ci-stat-pill {
          display: inline-block; color: #fff; font-size: 10.5px; font-weight: 600; border: 1px solid rgba(255,255,255,0.55);
          border-radius: 999px; padding: 4px 14px;
        }
        .ci-stat-divider { width: 1px; align-self: stretch; background: rgba(255,255,255,0.45); }
        .ci-stat-text { flex: 1; text-align: left; }
        .ci-stat-headline { color: #fff; font-size: 16px; font-weight: 700; margin-bottom: 6px; line-height: 1.35; }
        .ci-stat-subline { color: rgba(255,255,255,0.85); font-size: 12.5px; }

        /* ---------- task cards ---------- */
        .ci-task-section { margin-bottom: 22px; }
        .ci-task-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .ci-task-section-title { font-size: 13px; font-weight: 700; color: #141b1f; }
        .ci-task-section-add {
          display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;
          border-radius: 7px; border: 1px solid #dfe3e6; background: #fff; color: #1CA7D0; cursor: pointer;
        }
        .ci-task-section-add:hover { background: #eaf6fa; }
        .ci-tasks-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
        .ci-task-card {
          border: none; border-radius: 14px; padding: 18px 18px 16px; background: #F8FAFB;
          cursor: pointer; transition: box-shadow 0.15s ease, background 0.15s ease;
        }
        .ci-task-card:hover { box-shadow: 0 4px 14px rgba(16,24,32,0.08); background: #f2f5f7; }
        .ci-task-title { font-size: 14.5px; font-weight: 700; color: #141b1f; margin-bottom: 12px; }
        .ci-task-progress-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .ci-task-progress-label { font-size: 10.5px; color: #9aa4aa; }
        .ci-task-progress-percent { font-size: 10.5px; color: #9aa4aa; font-weight: 600; }
        .ci-task-track { height: 5px; border-radius: 999px; background: #e4e8ea; margin-bottom: 12px; overflow: hidden; }
        .ci-task-fill { height: 100%; border-radius: 999px; background: #1CA7D0; }
        .ci-task-date {
          display: inline-block; font-size: 11px; color: #9aa4aa; border: 1px solid #e4e8ea;
          background: #fff; border-radius: 999px; padding: 4px 14px; margin-bottom: 14px;
        }
        .ci-task-footer { display: flex; align-items: center; gap: 14px; }
        .ci-task-avatars { display: flex; align-items: center; }
        .ci-task-avatar {
          width: 24px; height: 24px; border-radius: 50%; object-fit: cover;
          border: 2px solid #F8FAFB; margin-left: -7px;
        }
        .ci-task-avatar:first-child { margin-left: 0; }
        .ci-task-avatar-more {
          display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;
          border-radius: 50%; background: #BEE3F2; color: #fff; font-size: 9.5px; font-weight: 700;
          border: 2px solid #F8FAFB; margin-left: -7px;
        }
        .ci-task-meta { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #9aa4aa; font-weight: 600; }

        /* ---------- team rail ---------- */
        .ci-team-rail { width: 230px; flex-shrink: 0; }
        .ci-team-heading { font-size: 12px; color: #6b7680; margin-bottom: 12px; line-height: 1.4; }
        .ci-invite-btn {
          display: inline-flex; align-items: center; gap: 4px; background: #fff; color: #1CA7D0;
          border: 1px solid #BEE3F2; border-radius: 999px; font-size: 11px; font-weight: 700;
          padding: 6px 14px; cursor: pointer; margin-bottom: 14px;
        }
        .ci-invite-btn:hover { background: #eaf6fa; }
        .ci-team-member { display: flex; align-items: center; gap: 10px; padding: 8px 6px; border-radius: 10px; position: relative; }
        .ci-team-member:hover { background: #f6f7f8; }
        .ci-team-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .ci-team-info { min-width: 0; flex: 1; }
        .ci-team-name { font-size: 12.5px; font-weight: 700; color: #141b1f; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ci-team-role { font-size: 10.5px; color: #9aa4aa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ci-team-menu-btn { background: none; border: none; color: #b6bec3; cursor: pointer; padding: 4px; flex-shrink: 0; }
        .ci-team-dropdown {
          position: absolute; right: 4px; top: 36px; background: #fff; border: 1px solid #eef0f1;
          border-radius: 10px; box-shadow: 0 8px 20px rgba(16,24,32,0.12); padding: 6px; z-index: 10; min-width: 130px;
        }
        .ci-team-dropdown-item {
          display: block; width: 100%; text-align: left; background: none; border: none; padding: 8px 10px;
          font-size: 12px; font-weight: 600; color: #141b1f; border-radius: 7px; cursor: pointer;
        }
        .ci-team-dropdown-item:hover { background: #f5f6f7; }
        .ci-team-dropdown-item.danger { color: #e05555; }

        .ci-fab {
          position: fixed; right: 36px; bottom: 36px; width: 54px; height: 54px; border-radius: 50%;
          background: #1CA7D0; border: none; display: flex; align-items: center; justify-content: center;
          cursor: pointer; box-shadow: 0 8px 18px rgba(28,167,208,0.4); z-index: 15;
          transition: background 0.15s ease, transform 0.1s ease;
        }
        .ci-fab:hover { background: #1691b6; transform: scale(1.05); }

        /* ---------- add team member modal ---------- */
        .ci-modal-overlay {
          position: fixed; inset: 0; background: rgba(10,16,20,0.45); z-index: 50;
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .ci-invite-modal {
          width: 100%; max-width: 340px; max-height: 90vh; overflow-y: auto;
          background: #fff; border-radius: 20px; padding: 22px 20px; box-shadow: 0 20px 50px rgba(16,24,32,0.25);
        }
        .ci-invite-modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .ci-invite-modal-title { font-size: 16px; font-weight: 700; color: #141b1f; margin: 0; }
        .ci-modal-close {
          display: flex; align-items: center; justify-content: center; width: 26px; height: 26px;
          border-radius: 50%; border: 1px solid #dfe3e6; background: #fff; cursor: pointer; flex-shrink: 0;
        }
        .ci-modal-close:hover { background: #f5f6f7; }
        .ci-coworker-search {
          display: flex; align-items: center; gap: 8px; border: 1px solid #dfe3e6; border-radius: 10px;
          padding: 10px 14px; margin-bottom: 20px;
        }
        .ci-coworker-search:focus-within { border-color: #1CA7D0; box-shadow: 0 0 0 3px rgba(28,167,208,0.12); }
        .ci-coworker-search-input { flex: 1; border: none; outline: none; font-size: 13px; color: #141b1f; background: transparent; }
        .ci-coworker-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px 12px; }
        .ci-coworker-card {
          display: flex; flex-direction: column; align-items: center; gap: 8px; background: none; border: none;
          cursor: pointer; padding: 6px; border-radius: 12px; transition: background 0.15s ease;
        }
        .ci-coworker-card:hover { background: #f6f7f8; }
        .ci-coworker-avatar {
          width: 56px; height: 56px; border-radius: 50%; background: #cdeaf3; color: #0d6f8f;
          display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700;
        }
        .ci-coworker-name { font-size: 12.5px; font-weight: 600; color: #141b1f; text-align: center; }
        .ci-coworker-tag {
          font-size: 10px; font-weight: 700; color: #1CA7D0; background: #eaf6fa; border-radius: 999px;
          padding: 2px 10px;
        }
        .ci-coworker-tag.added { color: #1e9e63; background: #e7f7ee; }
        .ci-coworker-empty { grid-column: 1 / -1; text-align: center; font-size: 12.5px; color: #9aa4aa; padding: 12px 0; }
        .ci-invite-error { font-size: 12px; color: #d64545; margin: 8px 0 0; }
        .ci-invite-success { font-size: 12px; color: #1e9e63; margin: 12px 0 0; }

        /* ---------- group chat ---------- */
        .ci-chat { display: flex; flex-direction: column; height: 480px; border: 1px solid #eef0f1; border-radius: 14px; overflow: hidden; }
        .ci-chat-scroll { flex: 1; overflow-y: auto; padding: 18px 16px; display: flex; flex-direction: column; gap: 14px; }
        .ci-chat-row { display: flex; }
        .ci-chat-row.me { justify-content: flex-end; }
        .ci-chat-row.other { justify-content: flex-start; }
        .ci-chat-bubble {
          max-width: 320px; padding: 10px 14px; border-radius: 14px; font-size: 12.5px; line-height: 1.5;
        }
        .ci-chat-bubble.me { background: #1CA7D0; color: #fff; border-bottom-right-radius: 4px; }
        .ci-chat-bubble.other { background: #f1f3f4; color: #141b1f; border-bottom-left-radius: 4px; }
        .ci-chat-time { font-size: 10px; color: #b0b8bd; margin-top: 4px; }
        .ci-chat-time.me { text-align: right; }
        .ci-chat-time.other { text-align: left; }
        .ci-chat-image { width: 160px; border-radius: 12px; display: block; object-fit: cover; }
        .ci-chat-pending {
          display: flex; align-items: center; gap: 8px; background: #1CA7D0; color: #fff; font-size: 12px;
          font-weight: 600; padding: 8px 14px; border-radius: 999px;
        }
        .ci-chat-spinner {
          width: 12px; height: 12px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.5);
          border-top-color: #fff; animation: ci-spin 0.7s linear infinite; flex-shrink: 0;
        }
        @keyframes ci-spin { to { transform: rotate(360deg); } }
        .ci-chat-input-row {
          display: flex; align-items: center; gap: 6px; border-top: 1px solid #eef0f1; padding: 10px 12px; background: #fff;
        }
        .ci-chat-icon-btn {
          display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;
          border-radius: 8px; border: none; background: none; cursor: pointer; flex-shrink: 0;
        }
        .ci-chat-icon-btn:hover { background: #f5f6f7; }
        .ci-chat-input { flex: 1; border: none; outline: none; font-size: 13px; color: #141b1f; background: transparent; padding: 6px 4px; }
        .ci-chat-send-btn {
          display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%;
          background: #1CA7D0; border: none; cursor: pointer; flex-shrink: 0; transition: background 0.15s ease;
        }
        .ci-chat-send-btn:hover { background: #1691b6; }

        @media (max-width: 640px) {
          .ci-chat { height: 60vh; }
          .ci-chat-bubble { max-width: 220px; }
        }

        /* ---------- analytics tab ---------- */
        .ci-analytics-overview {
          background: linear-gradient(180deg, #22ADD4 0%, #189ac1 100%);
          border-radius: 20px; padding: 26px 28px 28px;
          display: flex; flex-direction: column; align-items: center; margin-bottom: 16px;
        }
        .ci-analytics-overview-text { align-self: flex-start; text-align: left; }
        .ci-analytics-overview-title { color: #fff; font-size: 17px; font-weight: 700; margin-bottom: 4px; }
        .ci-analytics-overview-range { color: rgba(255,255,255,0.8); font-size: 12.5px; min-height: 16px; }
        .ci-analytics-gauge { position: relative; width: 176px; max-width: 62%; margin-top: 14px; }
        .ci-analytics-gauge svg { width: 100%; height: auto; display: block; }
        .ci-analytics-gauge-track { fill: none; stroke: rgba(255,255,255,0.3); stroke-width: 9; stroke-linecap: round; }
        .ci-analytics-gauge-progress { fill: none; stroke: #fff; stroke-width: 9; stroke-linecap: round; }
        .ci-analytics-gauge-center {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .ci-analytics-gauge-value { color: #fff; font-size: 24px; font-weight: 800; line-height: 1.1; }
        .ci-analytics-gauge-label { color: rgba(255,255,255,0.85); font-size: 11.5px; margin-top: 2px; }
        .ci-analytics-change {
          color: #fff; font-size: 11.5px; font-weight: 600; background: rgba(255,255,255,0.2);
          border-radius: 999px; padding: 3px 12px; margin-top: 10px;
        }
        .ci-analytics-remark { align-self: flex-start; text-align: left; margin-top: 18px; }
        .ci-analytics-remark-title { color: #fff; font-size: 14px; font-weight: 700; margin-bottom: 2px; }
        .ci-analytics-remark-text { color: rgba(255,255,255,0.85); font-size: 12.5px; line-height: 1.5; }

        .ci-analytics-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px; }
        .ci-analytics-metric {
          border: 1px solid #eef0f1; border-radius: 14px; padding: 14px 12px; text-align: center; background: #fff;
        }
        .ci-analytics-metric-value { font-size: 18px; font-weight: 800; color: #141b1f; }
        .ci-analytics-metric-label { font-size: 11px; color: #9aa4aa; margin-top: 2px; }
        .ci-analytics-tasknote { font-size: 12.5px; color: #6b7680; margin-bottom: 20px; line-height: 1.5; }

        .ci-analytics-section-title { font-size: 13px; font-weight: 700; color: #141b1f; margin-bottom: 12px; }
        .ci-analytics-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .ci-analytics-stat-card {
          border: none; background: #EEF3FB; border-radius: 16px; padding: 22px 16px 22px;
          display: flex; flex-direction: column; align-items: center; text-align: center; min-height: 108px;
          justify-content: space-between; gap: 6px; font-family: inherit; cursor: pointer;
        }
        .ci-analytics-stat-card:hover { background: #E4ECF8; }
        .ci-analytics-stat-date { font-size: 14px; font-weight: 700; color: #141b1f; }
        .ci-analytics-stat-range { font-size: 11px; color: #9aa4aa; }
        .ci-analytics-stat-score { font-size: 11px; font-weight: 700; color: #1CA7D0; }
        .ci-analytics-error { color: #e05555; font-size: 12.5px; margin-bottom: 16px; }
        .ci-analytics-empty { color: #9aa4aa; font-size: 12.5px; }

        @media (max-width: 640px) {
          .ci-analytics-stats { grid-template-columns: 1fr; }
        }

        /* ---------- create task modal ---------- */
        .ci-task-modal {
          width: 100%; max-width: 380px; max-height: 90vh; overflow-y: auto;
          background: #fff; border-radius: 20px; padding: 24px 22px 22px; box-shadow: 0 20px 50px rgba(16,24,32,0.25);
        }
        .ci-task-modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .ci-task-modal-title { font-size: 17px; font-weight: 700; color: #141b1f; margin: 0; }
        .ci-field { margin-bottom: 16px; }
        .ci-field-label { display: block; font-size: 12.5px; font-weight: 700; color: #141b1f; margin-bottom: 8px; }
        .ci-field-input, .ci-field-textarea {
          width: 100%; border: 1px solid #dfe3e6; border-radius: 9px; padding: 11px 14px;
          font-size: 13.5px; color: #141b1f; font-family: inherit; outline: none;
        }
        .ci-field-input:focus, .ci-field-textarea:focus, .ci-date-box:focus-within {
          border-color: #1CA7D0; box-shadow: 0 0 0 3px rgba(28,167,208,0.12);
        }
        .ci-field-textarea { min-height: 80px; resize: vertical; }
        .ci-date-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .ci-date-box { border: 1px solid #dfe3e6; border-radius: 9px; padding: 10px 12px; }
        .ci-date-sublabel { font-size: 10.5px; color: #9aa4aa; margin-bottom: 4px; }
        .ci-date-row { display: flex; align-items: center; gap: 6px; }
        .ci-date-input { border: none; outline: none; font-size: 12.5px; color: #141b1f; flex: 1; font-family: inherit; min-width: 0; }
        .ci-member-input-row { display: flex; gap: 6px; }
        .ci-member-add-btn {
          border: 1px solid #dfe3e6; border-radius: 9px; background: #fff; color: #1CA7D0; font-weight: 700;
          font-size: 12.5px; padding: 0 14px; cursor: pointer; flex-shrink: 0;
        }
        .ci-member-add-btn:hover { background: #eaf6fa; }
        .ci-member-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .ci-member-chip {
          display: flex; align-items: center; gap: 6px; background: #eaf6fa; color: #0d6f8f; font-size: 11.5px;
          font-weight: 600; padding: 5px 10px; border-radius: 999px;
        }
        .ci-member-chip button { background: none; border: none; color: #0d6f8f; cursor: pointer; display: flex; }
        .ci-task-modal-create-btn {
          width: 100%; border: none; border-radius: 9px; padding: 12px 0; font-size: 15px; font-weight: 600; margin-top: 4px;
        }

        @media (max-width: 860px) {
          .ci-main-inner { flex-direction: column; padding: 24px 20px 48px; gap: 24px; }
          .ci-team-rail { width: 100%; }
        }
        @media (max-width: 640px) {
          .ci-tasks-grid { grid-template-columns: 1fr; }
          .ci-stat-card { flex-direction: column; align-items: flex-start; }
          .ci-stat-divider { display: none; }
          .ci-board-title { font-size: 22px; }
        }
      `}</style>

      <div className="ci-main-inner">
        <div className="ci-board">
          <div className="ci-board-header">
            <div className="ci-board-heading-left">
              {onBack && (
                <button className="ci-back-btn" type="button" aria-label="Back to projects" onClick={onBack}>
                  <ArrowLeft size={17} />
                </button>
              )}
              <h1 className="ci-board-title">{displayProjectName}</h1>
            </div>
            <div className="ci-board-actions">
              <button className="ci-icon-btn-ghost" type="button" aria-label="Edit project">
                <Pencil size={15} />
              </button>
              <button className="ci-icon-btn-ghost danger" type="button" aria-label="Delete project">
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          <div className="ci-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`ci-tab${activeTab === tab.id ? " active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "board" ? (
            <>
              <div className="ci-stat-card">
                <div className="ci-stat-left">
                  <div className="ci-stat-percent">{completedPercent}%</div>
                  <span className="ci-stat-pill">Completed</span>
                </div>
                <div className="ci-stat-divider" />
                <div className="ci-stat-text">
                  <div className="ci-stat-headline">
                    {loading ? "Loading tasks…" : `You have ${tasks.length} task${tasks.length === 1 ? "" : "s"} for today`}
                  </div>
                  <div className="ci-stat-subline">
                    {completedCount}/{tasks.length} Task completed.
                  </div>
                </div>
              </div>
              {error && <div style={{ color: "#e05555", fontSize: 12.5, marginBottom: 16 }}>{error}</div>}

              {sections.map((section) => (
                <div key={section} className="ci-task-section">
                  <div className="ci-task-section-header">
                    <span className="ci-task-section-title">{section}</span>
                    <button
                      type="button"
                      className="ci-task-section-add"
                      aria-label={`Add task to ${section}`}
                      onClick={() => openCreateTask(section)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="ci-tasks-grid">
                    {tasks
                      .filter((t) => t.section === section)
                      .map((task) => (
                        <TaskCard key={task.id} task={task} onClick={() => onOpenTask?.(task)} />
                      ))}
                  </div>
                </div>
              ))}
            </>
          ) : activeTab === "chat" ? (
            <div className="ci-chat">
              {chatError ? (
                <div className="ci-chat-scroll">
                  <div style={{ fontSize: 13, color: "#d64545", textAlign: "center", padding: 24 }}>{chatError}</div>
                </div>
              ) : !chat ? (
                <div className="ci-chat-scroll">
                  <div style={{ fontSize: 13, color: "#9aa4aa", textAlign: "center", padding: 24 }}>Loading group chat…</div>
                </div>
              ) : (
                <ChatThread
                  conversationId={chat.id}
                  organizationId={organizationId}
                  participants={chat.participants || []}
                  showSenderNames
                  emptyText="No messages yet. Start the conversation with your team."
                />
              )}
            </div>
          ) : (
            <div className="ci-analytics">
              {analyticsError && <div className="ci-analytics-error">{analyticsError}</div>}

              <div className="ci-analytics-overview">
                <div className="ci-analytics-overview-text">
                  <div className="ci-analytics-overview-title">Analytics Overview</div>
                  <div className="ci-analytics-overview-range">{analytics?.periodLabel || ""}</div>
                </div>
                <div className="ci-analytics-gauge">
                  <svg viewBox="0 0 100 100">
                    <path d={analyticsGaugeTrack} className="ci-analytics-gauge-track" />
                    {analyticsGaugeProgress && <path d={analyticsGaugeProgress} className="ci-analytics-gauge-progress" />}
                  </svg>
                  <div className="ci-analytics-gauge-center">
                    <span className="ci-analytics-gauge-value">{analyticsProductivity}%</span>
                    <span className="ci-analytics-gauge-label">Productivity</span>
                  </div>
                </div>
                {analyticsChange !== null && analyticsChange !== undefined && (
                  <span className="ci-analytics-change">
                    {analyticsChange > 0 ? "+" : ""}
                    {analyticsChange}% vs last period
                  </span>
                )}
                {(analytics?.remarkTitle || analytics?.remark) && (
                  <div className="ci-analytics-remark">
                    {analytics.remarkTitle && <div className="ci-analytics-remark-title">{analytics.remarkTitle}</div>}
                    {analytics.remark && <div className="ci-analytics-remark-text">{analytics.remark}</div>}
                  </div>
                )}
              </div>

              {analytics && (
                <>
                  <div className="ci-analytics-metrics">
                    <div className="ci-analytics-metric">
                      <div className="ci-analytics-metric-value">{analytics.totalCompleted}</div>
                      <div className="ci-analytics-metric-label">Tasks completed</div>
                    </div>
                    <div className="ci-analytics-metric">
                      <div className="ci-analytics-metric-value">{analytics.onTrack}%</div>
                      <div className="ci-analytics-metric-label">On track</div>
                    </div>
                    <div className="ci-analytics-metric">
                      <div className="ci-analytics-metric-value">{analytics.responseTime}</div>
                      <div className="ci-analytics-metric-label">Avg. response</div>
                    </div>
                  </div>
                  {analytics.taskSummary && <div className="ci-analytics-tasknote">{analytics.taskSummary}</div>}
                </>
              )}

              {analyticsEntries.length > 0 && <div className="ci-analytics-section-title">Weekly reports</div>}
              <div className="ci-analytics-stats">
                {analyticsEntries.map((entry, i) => (
                  <button
                    type="button"
                    key={entry.id ?? i}
                    className="ci-analytics-stat-card"
                    onClick={() => onOpenInsight?.(entry.id, projectId)}
                  >
                    <span className="ci-analytics-stat-date">{entry.title}</span>
                    <span className="ci-analytics-stat-range">{entry.range}</span>
                    {entry.score !== null && entry.score !== undefined && (
                      <span className="ci-analytics-stat-score">{entry.score}% productivity</span>
                    )}
                  </button>
                ))}
                {!loading && !analyticsError && analyticsEntries.length === 0 && (
                  <div className="ci-analytics-empty">No analytics yet for this project.</div>
                )}
              </div>
            </div>
          )}
        </div>

        <aside className="ci-team-rail">
          <div className="ci-team-heading">You currently have {teamMembers.length} team members</div>
          <button className="ci-invite-btn" type="button" onClick={openInvite}>
            <Plus size={12} strokeWidth={3} />
            Add Member
          </button>

          {teamMembers.map((member) => (
            <div key={member.id} className="ci-team-member">
              <img src={member.avatar} alt="" className="ci-team-avatar" />
              <div className="ci-team-info">
                <div className="ci-team-name">{member.name}</div>
                <div className="ci-team-role">{member.role}</div>
              </div>
              <button
                className="ci-team-menu-btn"
                type="button"
                aria-label="Member options"
                onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
              >
                <MoreVertical size={15} />
              </button>

              {openMenuId === member.id && (
                <div className="ci-team-dropdown">
                  <button className="ci-team-dropdown-item" type="button">
                    Assign Role
                  </button>
                  <button className="ci-team-dropdown-item danger" type="button">
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </aside>
      </div>

      {activeTab === "board" && (
        <button
          className="ci-fab"
          type="button"
          aria-label="Create task"
          onClick={() => openCreateTask(sections[0] || "General")}
        >
          <Plus size={24} color="#fff" strokeWidth={2.5} />
        </button>
      )}

      {isInviteOpen && (
        <div className="ci-modal-overlay" onClick={() => setIsInviteOpen(false)}>
          <div className="ci-invite-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ci-invite-modal-header">
              <h2 className="ci-invite-modal-title">Add Team Member</h2>
              <button
                className="ci-modal-close"
                type="button"
                aria-label="Close"
                onClick={() => setIsInviteOpen(false)}
              >
                <X size={15} color="#141b1f" />
              </button>
            </div>

            <div className="ci-coworker-search">
              <Search size={15} color="#8a97a0" />
              <input
                type="email"
                placeholder="Enter email address"
                value={inviteEmailInput}
                onChange={(e) => setInviteEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addInviteEmail();
                  }
                }}
                className="ci-coworker-search-input"
              />
              <button type="button" className="ci-member-add-btn" onClick={addInviteEmail}>
                Add
              </button>
            </div>

            {inviteError && <div className="ci-invite-error">{inviteError}</div>}

            {inviteEmails.length > 0 && (
              <div className="ci-member-chips">
                {inviteEmails.map((email) => (
                  <span key={email} className="ci-member-chip">
                    {email}
                    <button type="button" aria-label={`Remove ${email}`} onClick={() => removeInviteEmail(email)}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {inviteSentTo.length > 0 && (
              <div className="ci-invite-success">Invite sent to {inviteSentTo.join(", ")}.</div>
            )}

            <button
              className="ci-task-modal-create-btn"
              type="button"
              disabled={inviteEmails.length === 0 || invitingTeam}
              style={{
                background: inviteEmails.length ? "#1CA7D0" : "#eceef0",
                color: inviteEmails.length ? "#fff" : "#8a97a0",
                cursor: inviteEmails.length && !invitingTeam ? "pointer" : "not-allowed",
              }}
              onClick={sendInvites}
            >
              {invitingTeam ? "Sending…" : "Send Invite"}
            </button>
          </div>
        </div>
      )}

      {isCreateTaskOpen && (
        <div className="ci-modal-overlay" onClick={() => setCreateTaskSection(null)}>
          <div className="ci-task-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ci-task-modal-header">
              <h2 className="ci-task-modal-title">Create Task</h2>
              <button
                className="ci-modal-close"
                type="button"
                aria-label="Close"
                onClick={() => setCreateTaskSection(null)}
              >
                <X size={15} color="#141b1f" />
              </button>
            </div>

            <div className="ci-field">
              <label className="ci-field-label">Title</label>
              <input
                type="text"
                className="ci-field-input"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g UI/UX Design"
              />
            </div>

            <div className="ci-field">
              <label className="ci-field-label">Description</label>
              <textarea
                className="ci-field-textarea"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Add Description"
              />
            </div>

            <div className="ci-field">
              <label className="ci-field-label">Set Time Frame</label>
              <div className="ci-date-fields">
                <div className="ci-date-box">
                  <div className="ci-date-sublabel">Start Date</div>
                  <div className="ci-date-row">
                    <Calendar size={14} color="#8a97a0" />
                    <input
                      type="date"
                      className="ci-date-input"
                      value={taskStartDate}
                      onChange={(e) => setTaskStartDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="ci-date-box">
                  <div className="ci-date-sublabel">Due Date</div>
                  <div className="ci-date-row">
                    <Calendar size={14} color="#8a97a0" />
                    <input
                      type="date"
                      className="ci-date-input"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="ci-field">
              <label className="ci-field-label">Link Team Members</label>
              <div className="ci-member-input-row">
                <select
                  className="ci-field-input"
                  value={memberInput}
                  onChange={(e) => addMember(e.target.value)}
                >
                  <option value="">
                    {addableMembers.length ? "Select a team member" : "No members left to add"}
                  </option>
                  {addableMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              {taskMembers.length > 0 && (
                <div className="ci-member-chips">
                  {taskMembers.map((id) => {
                    const member = teamMembers.find((m) => m.userId === id);
                    return (
                      <span key={id} className="ci-member-chip">
                        {member ? member.name : id}
                        <button type="button" aria-label={`Remove member`} onClick={() => removeMember(id)}>
                          <X size={11} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              className="ci-task-modal-create-btn"
              type="button"
              disabled={!canCreateTask || creatingTask}
              style={{
                background: canCreateTask ? "#1CA7D0" : "#eceef0",
                color: canCreateTask ? "#fff" : "#8a97a0",
                cursor: canCreateTask && !creatingTask ? "pointer" : "not-allowed",
              }}
              onClick={createTask}
            >
              {creatingTask ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      )}
      {checkInOpen && (
        <DailyCheckInModal tasks={checkInTasks} onClose={() => setCheckInOpen(false)} onSubmit={submitCheckIn} />
      )}
    </AppShell>
  );
}
