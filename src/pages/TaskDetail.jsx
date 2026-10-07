import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Pencil,
  MoreVertical,
  Calendar,
  Plus,
  X,
  ThumbsUp,
  MessageCircle,
  Share2,
  BarChart3,
  Wrench,
  LogOut,
} from "lucide-react";
import AppShell from "../components/AppShell";
import {
  getTask,
  getTaskComments,
  createTaskComment,
  getTaskWorkLogs,
  getTaskAnalytics,
  updateTaskStatus,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
  getProjectMembers,
} from "../lib/api";
import { getAuthToken } from "../lib/session";
import { personName, personImage } from "../lib/people";

const SUB_TABS = [
  { id: "comment", label: "Comment" },
  { id: "work-log", label: "Work Log" },
  { id: "analytics", label: "Analytics" },
];

// Maps GET /v1/projects/tasks/{taskId}/comments entries into what the
// comment list renders. Field names are a best guess pending the real
// response shape.
function toComment(c) {
  return {
    id: c.id,
    author: personName(c, "Unknown"),
    time: c.createdAt ? new Date(c.createdAt).toLocaleString() : "Just now",
    text: c.content,
    avatar: personImage(c) || `https://i.pravatar.cc/64?u=${c.id}`,
  };
}

// Maps GET /v1/projects/tasks/{taskId}/work-logs entries.
// Shape: { id, type, log, createdAt, projectUser: { user: { firstName, lastName, email } } }
function toWorkLog(w) {
  const u = w.projectUser?.user || {};
  const author = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "Someone";
  const type = w.type || "";
  const label = type
    ? type.toLowerCase().split("_").map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(" ")
    : "Activity";
  const kind = /COMMENT/.test(type) ? "comment" : /STATUS|COMPLET/.test(type) ? "status" : /ASSIGN/.test(type) ? "assign" : "task";
  return {
    id: w.id,
    author,
    label,
    kind,
    text: w.log || label,
    createdAt: w.createdAt,
    day: w.createdAt ? new Date(w.createdAt).toDateString() : "",
    time: w.createdAt ? new Date(w.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "",
  };
}

function workLogDayLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function formatWeek(start, end) {
  const opts = { day: "numeric", month: "short" };
  const s = start ? new Date(start).toLocaleDateString(undefined, opts) : "";
  const e = end ? new Date(end).toLocaleDateString(undefined, { ...opts, year: "numeric" }) : "";
  return [s, e].filter(Boolean).join(" – ");
}

const PENDING_LABELS = { PENDING: "Pending", IN_PROGRESS: "In Progress", COMPLETED: "Completed" };

function toMember(m) {
  return {
    id: m.id,
    name: personName(m),
    avatar: personImage(m) || `https://i.pravatar.cc/64?u=${m.id}`,
  };
}

const STATUS_OPTIONS = ["Pending", "In Progress", "Completed"];
// UI labels <-> the enum values PATCH /v1/projects/tasks/{taskId}/status expects.
const STATUS_TO_API = { Pending: "PENDING", "In Progress": "IN_PROGRESS", Completed: "COMPLETED" };

const STATUS_STYLES = {
  Pending: { bg: "#fdf3c8", color: "#8a6d00" },
  "In Progress": { bg: "#dbeefc", color: "#0f6fb3" },
  Completed: { bg: "#e0f6e9", color: "#1e9e63" },
};

export default function CheckInTaskDetail({
  task,
  taskId,
  projectId,
  organizationId,
  onBack,
  onGoHome,
  onOpenInsight,
  onDeleteTask,
}) {
  const resolvedTaskId = taskId || task?.id;
  const [subTab, setSubTab] = useState("comment");
  const [comments, setComments] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);
  const [workLogsNextPage, setWorkLogsNextPage] = useState(null);
  const [workLogsLoadingMore, setWorkLogsLoadingMore] = useState(false);
  const [workLogsError, setWorkLogsError] = useState("");
  const [teamPool, setTeamPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analytics, setAnalytics] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const [editableTitle, setEditableTitle] = useState(task?.title || "Task");
  const [editableDescription, setEditableDescription] = useState(
    task?.description || "No description provided."
  );
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState(editableTitle);
  const [descriptionDraft, setDescriptionDraft] = useState(editableDescription);

  const [status, setStatus] = useState(task?.status || "Pending");
  const [dueDate, setDueDate] = useState(task?.dueDate || "No due date");

  const [assignees, setAssignees] = useState([]);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Once a task is Completed its status is final. Derived from `status`, so it
  // also applies when the task loads from the API already completed.
  const isCompleted = status === "Completed";

  // Load the real task, its comments, work logs, and the project's team
  // pool (for the assignee picker) once we know which task this is.
  useEffect(() => {
    if (!resolvedTaskId) return;
    const token = getAuthToken();

    const load = async () => {
      setLoading(true);
      setError("");
      setWorkLogsError("");
      try {
        const [taskResult, commentsResult, workLogsResult, membersResult] = await Promise.all([
          getTask({ taskId: resolvedTaskId, projectId, token }),
          getTaskComments({ taskId: resolvedTaskId, projectId, page: 1, limit: 20, token }),
          getTaskWorkLogs({ taskId: resolvedTaskId, projectId, page: 1, limit: 20, token }).catch((err) => {
            console.error("[TaskDetail] getTaskWorkLogs failed:", err);
            setWorkLogsError(err.message || "Failed to load work log.");
            return { data: [] };
          }),
          getProjectMembers({ organizationId, projectId, token }).catch((err) => {
            console.error("[TaskDetail] getProjectMembers failed:", err);
            return { data: [] };
          }),
        ]);

        const t = taskResult.data || {};
        setEditableTitle(t.title || task?.title || "Task");
        setEditableDescription(t.description || task?.description || "No description provided.");
        const apiToLabel = { PENDING: "Pending", IN_PROGRESS: "In Progress", COMPLETED: "Completed" };
        setStatus(apiToLabel[t.status] || t.status || task?.status || "Pending");
        setDueDate(t.endDate ? new Date(t.endDate).toLocaleDateString(undefined, { day: "numeric", month: "long" }) : task?.dueDate || "No due date");

        const pool = (membersResult.data || []).map(toMember);
        setTeamPool(pool);
        const assignedIds = t.teamMembers || [];
        setAssignees(pool.filter((m) => assignedIds.includes(m.id)));

        setComments((commentsResult.data || []).map(toComment));
        setWorkLogs((workLogsResult.data || []).map(toWorkLog));
        setWorkLogsNextPage(workLogsResult.pageData?.nextPage ?? null);
      } catch (err) {
        console.error("[TaskDetail] failed to load task:", err);
        setError(err.message || "Failed to load task.");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTaskId, projectId, organizationId]);

  const loadMoreWorkLogs = async () => {
    if (!workLogsNextPage || workLogsLoadingMore) return;
    setWorkLogsLoadingMore(true);
    try {
      const res = await getTaskWorkLogs({
        taskId: resolvedTaskId,
        projectId,
        page: workLogsNextPage,
        limit: 20,
        token: getAuthToken(),
      });
      setWorkLogs((prev) => {
        const seen = new Set(prev.map((w) => w.id));
        return [...prev, ...(res.data || []).map(toWorkLog).filter((w) => !seen.has(w.id))];
      });
      setWorkLogsNextPage(res.pageData?.nextPage ?? null);
    } catch (err) {
      setWorkLogsError(err.message || "Failed to load more.");
    } finally {
      setWorkLogsLoadingMore(false);
    }
  };

  // GET /v1/projects/tasks/{taskId}/analytics - loaded the first time the
  // Analytics tab is opened.
  useEffect(() => {
    if (subTab !== "analytics" || analyticsLoaded || !resolvedTaskId || !projectId) return;
    let cancelled = false;
    const run = async () => {
      setAnalyticsLoading(true);
      setAnalyticsError("");
      try {
        const res = await getTaskAnalytics({
          taskId: resolvedTaskId,
          projectId,
          page: 1,
          limit: 20,
          token: getAuthToken(),
        });
        if (!cancelled) {
          setAnalytics(res?.data || []);
          setAnalyticsLoaded(true);
        }
      } catch (err) {
        console.error("[TaskDetail] getTaskAnalytics failed:", err);
        if (!cancelled) setAnalyticsError(err.message || "Failed to load analytics.");
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [subTab, analyticsLoaded, resolvedTaskId, projectId]);

  // POST /v1/projects/tasks/{taskId}/comments
  const submitComment = async () => {
    if (!draft.trim()) return;
    const token = getAuthToken();
    try {
      const result = await createTaskComment({ taskId: resolvedTaskId, projectId, content: draft.trim(), token });
      setComments((prev) => [toComment(result.data || { id: Date.now(), content: draft.trim() }), ...prev]);
      setDraft("");
      setIsComposerOpen(false);
    } catch (err) {
      console.error("[TaskDetail] createTaskComment failed:", err);
      setError(err.message || "Failed to post comment.");
    }
  };

  const openEdit = () => {
    setTitleDraft(editableTitle);
    setDescriptionDraft(editableDescription);
    setIsEditOpen(true);
  };

  // PATCH /v1/projects/tasks/{taskId}
  const saveEdit = async () => {
    if (!titleDraft.trim()) return;
    const token = getAuthToken();
    try {
      const result = await apiUpdateTask({
        taskId: resolvedTaskId,
        title: titleDraft.trim(),
        description: descriptionDraft.trim(),
        token,
      });
      setEditableTitle(result.data?.title || titleDraft.trim());
      setEditableDescription(result.data?.description || descriptionDraft.trim());
      setIsEditOpen(false);
    } catch (err) {
      console.error("[TaskDetail] updateTask failed:", err);
      setError(err.message || "Failed to save changes.");
    }
  };

  // PATCH /v1/projects/tasks/{taskId} — teamMembers takes the full list of
  // assigned user IDs, so toggling re-sends the whole set.
  const toggleAssignee = async (member) => {
    const wasAssigned = assignees.some((a) => a.id === member.id);
    const next = wasAssigned ? assignees.filter((a) => a.id !== member.id) : [...assignees, member];
    setAssignees(next);
    const token = getAuthToken();
    try {
      await apiUpdateTask({ taskId: resolvedTaskId, teamMembers: next.map((m) => m.id), token });
    } catch (err) {
      console.error("[TaskDetail] updateTask (assignees) failed:", err);
      setAssignees(assignees); // revert on failure
      setError(err.message || "Failed to update assignees.");
    }
  };

  const filteredTeamPool = teamPool.filter((m) =>
    m.name.toLowerCase().includes(assigneeSearch.trim().toLowerCase())
  );

  // Next status in the Pending -> In Progress -> Completed cycle, shown as
  // the "switch to X" label in the more-options menu (not the current status).
  // Not shown once the task is completed.
  const nextStatus = STATUS_OPTIONS[(STATUS_OPTIONS.indexOf(status) + 1) % STATUS_OPTIONS.length];

  // PATCH /v1/projects/tasks/{taskId}/status
  const cycleStatus = async () => {
    setIsMoreMenuOpen(false);
    if (isCompleted) return; // completed is final

    const nextIndex = (STATUS_OPTIONS.indexOf(status) + 1) % STATUS_OPTIONS.length;
    const nextStatusValue = STATUS_OPTIONS[nextIndex];
    const token = getAuthToken();
    try {
      await updateTaskStatus({ taskId: resolvedTaskId, status: STATUS_TO_API[nextStatusValue], token });
      setStatus(nextStatusValue);
    } catch (err) {
      console.error("[TaskDetail] updateTaskStatus failed:", err);
      setError(err.message || "Failed to update status.");
    }
  };

  // DELETE /v1/projects/tasks/{taskId}
  const handleDelete = async () => {
    setIsMoreMenuOpen(false);
    const token = getAuthToken();
    try {
      await apiDeleteTask({ taskId: resolvedTaskId, projectId, token });
      onDeleteTask?.(task);
      onBack?.();
    } catch (err) {
      console.error("[TaskDetail] deleteTask failed:", err);
      setError(err.message || "Failed to delete task.");
    }
  };

  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.Pending;

  return (
    <AppShell>
      <style>{`
        .ci-td-inner { max-width: 720px; padding: 32px 40px 60px; }
        .ci-td-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .ci-td-header-left { display: flex; align-items: center; gap: 12px; }
        .ci-back-btn {
          display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;
          border-radius: 8px; border: 1px solid #eef0f1; background: #fff; color: #141b1f; cursor: pointer; flex-shrink: 0;
        }
        .ci-back-btn:hover { background: #f5f6f7; }
        .ci-td-title { font-size: 26px; font-weight: 800; color: #141b1f; margin: 0; }
        .ci-td-actions { display: flex; align-items: center; gap: 6px; position: relative; }
        .ci-icon-btn-ghost {
          display: flex; align-items: center; justify-content: center; width: 30px; height: 30px;
          border-radius: 8px; border: none; background: transparent; color: #9aa4aa; cursor: pointer;
        }
        .ci-icon-btn-ghost:hover { background: #f5f6f7; }
        .ci-td-description { font-size: 13.5px; color: #6b7680; line-height: 1.6; margin: 0 0 24px; }

        /* ---------- more-options dropdown ---------- */
        .ci-more-menu {
          position: absolute; top: 38px; right: 0; background: #14181f; border-radius: 14px;
          padding: 8px; min-width: 176px; box-shadow: 0 16px 36px rgba(10,14,20,0.35); z-index: 20;
        }
        .ci-more-menu-item {
          display: flex; align-items: center; gap: 10px; width: 100%; background: none; border: none;
          padding: 10px 12px; border-radius: 10px; font-size: 13px; font-weight: 600; color: #fff;
          cursor: pointer; text-align: left;
        }
        .ci-more-menu-item:hover { background: rgba(255,255,255,0.08); }
        .ci-more-menu-item.danger { color: #ff6b6b; }

        .ci-td-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 26px; }
        .ci-td-card {
          border: none; background: #EAF4FC; border-radius: 16px; padding: 20px 22px;
          display: flex; flex-direction: column; min-height: 130px;
        }
        .ci-td-card-label { font-size: 18px; font-weight: 800; color: #141b1f; }

        .ci-assigned-content { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: auto; padding-top: 22px; }
        .ci-assignee-stack { display: flex; align-items: center; }
        .ci-assignee-avatar {
          width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 2px solid #EAF4FC; margin-left: -10px;
        }
        .ci-assignee-avatar:first-child { margin-left: 0; }
        .ci-assignee-dot {
          width: 38px; height: 38px; border-radius: 50%; margin-left: -10px; border: 2px solid #EAF4FC;
          background: linear-gradient(135deg, #bfe3f7, #6fc3ea);
        }
        .ci-assignee-count {
          width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #3fb6e0, #1a92c9);
          color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center;
          border: 2px solid #EAF4FC; margin-left: -10px;
        }
        .ci-assign-work-btn {
          display: flex; align-items: center; gap: 6px; white-space: nowrap;
          background: linear-gradient(135deg, #3fb6e0, #0f8fc9); color: #fff; border: none;
          border-radius: 10px; font-size: 13px; font-weight: 700; padding: 10px 16px; cursor: pointer;
        }
        .ci-assign-work-btn:hover { filter: brightness(1.05); }

        .ci-duedate-content { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: auto; padding-top: 12px; }
        .ci-due-date-row { display: flex; align-items: center; gap: 8px; font-size: 32px; font-weight: 700; color: #141b1f; line-height: 1.1; }
        .ci-due-date-month { font-size: 15px; color: #141b1f; font-weight: 500; }
        .ci-status-pill {
          display: inline-block; font-size: 11.5px; font-weight: 700; padding: 8px 16px; border-radius: 8px; flex-shrink: 0;
          background: ${statusStyle.bg}; color: ${statusStyle.color};
        }

        .ci-sub-tabs { display: flex; align-items: center; gap: 8px; border: 1px solid #eef0f1; border-radius: 12px; padding: 8px 10px; margin-bottom: 20px; }
        .ci-sub-tab { border: 1.5px solid transparent; background: none; padding: 7px 16px; border-radius: 999px; font-size: 12.5px; font-weight: 700; color: #6b7680; cursor: pointer; }
        .ci-sub-tab.active { border-color: #1CA7D0; color: #1CA7D0; }

        .ci-an-list { display: flex; flex-direction: column; gap: 16px; }
        .ci-an-card { border: 1px solid #eef0f1; border-radius: 14px; padding: 16px 18px; background: #fff; }
        .ci-an-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .ci-an-week { font-size: 13.5px; font-weight: 800; color: #141b1f; }
        .ci-an-done { font-size: 11px; font-weight: 700; color: #1e9e63; background: #e7f7ee; border-radius: 999px; padding: 4px 10px; white-space: nowrap; }
        .ci-an-rate-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .ci-an-bar { flex: 1; height: 8px; border-radius: 999px; background: #eaf0f4; overflow: hidden; }
        .ci-an-bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #3fb6e0, #1a92c9); }
        .ci-an-rate { font-size: 13px; font-weight: 800; color: #141b1f; min-width: 40px; text-align: right; }
        .ci-an-remark { font-size: 12.5px; color: #3a4247; line-height: 1.55; margin: 0 0 12px; }
        .ci-an-section-title { font-size: 12px; font-weight: 700; color: #141b1f; margin: 12px 0 6px; }
        .ci-an-ul { margin: 0; padding-left: 18px; }
        .ci-an-ul li { font-size: 12.5px; color: #3a4247; line-height: 1.6; }
        .ci-an-risk { font-size: 12.5px; color: #3a4247; line-height: 1.6; }
        .ci-an-risk b { color: #c93b3b; }
        .ci-an-pending-pill { font-size: 10.5px; font-weight: 700; color: #8a6d00; background: #fdf3c8; border-radius: 999px; padding: 2px 8px; margin-left: 6px; }
        .ci-an-state { font-size: 13.5px; color: #9aa4aa; padding: 10px 0; }
        .ci-an-state.error { color: #d64545; }

        .ci-wl { display: flex; flex-direction: column; }
        .ci-wl-day { font-size: 11px; font-weight: 700; color: #9aa4aa; margin: 16px 0 6px; text-transform: uppercase; letter-spacing: 0.04em; }
        .ci-wl-day:first-child { margin-top: 2px; }
        .ci-wl-item { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #eef0f1; }
        .ci-wl-item:last-of-type { border-bottom: none; }
        .ci-wl-dot { width: 9px; height: 9px; border-radius: 50%; background: #1CA7D0; margin-top: 5px; flex-shrink: 0; }
        .ci-wl-dot.comment { background: #8a97a0; }
        .ci-wl-dot.status { background: #1e9e63; }
        .ci-wl-dot.assign { background: #e0a21b; }
        .ci-wl-body { flex: 1; min-width: 0; }
        .ci-wl-text { font-size: 12.5px; color: #141b1f; line-height: 1.5; }
        .ci-wl-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 11px; color: #9aa4aa; margin-top: 3px; }
        .ci-wl-chip { background: #f1f3f4; color: #6b7680; border-radius: 999px; padding: 1px 8px; font-size: 10px; font-weight: 600; }
        .ci-wl-more { align-self: center; margin-top: 12px; border: 1px solid #dfe3e6; background: #fff; color: #1CA7D0; font-size: 12px; font-weight: 600; border-radius: 999px; padding: 7px 16px; cursor: pointer; }
        .ci-wl-more:disabled { opacity: 0.6; cursor: default; }

        .ci-comment-list { display: flex; flex-direction: column; gap: 20px; margin-bottom: 20px; }
        .ci-comment { display: flex; gap: 10px; }
        .ci-comment-avatar { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .ci-comment-body { flex: 1; min-width: 0; }
        .ci-comment-meta { display: flex; align-items: baseline; gap: 8px; margin-bottom: 3px; }
        .ci-comment-author { font-size: 13px; font-weight: 700; color: #141b1f; }
        .ci-comment-time { font-size: 11px; color: #b0b8bd; }
        .ci-comment-text { font-size: 12.5px; color: #3a4247; line-height: 1.5; margin-bottom: 6px; }
        .ci-comment-actions { display: flex; align-items: center; gap: 14px; }
        .ci-comment-action-btn {
          display: flex; align-items: center; gap: 4px; background: none; border: none; color: #9aa4aa;
          font-size: 11px; font-weight: 600; cursor: pointer; padding: 2px;
        }
        .ci-comment-action-btn:hover { color: #1CA7D0; }

        .ci-add-comment-row {
          display: flex; align-items: center; gap: 10px; border: 1px dashed #dfe3e6; border-radius: 12px;
          padding: 12px 14px; cursor: pointer; background: #fff; width: 100%; text-align: left;
        }
        .ci-add-comment-row:hover { border-color: #1CA7D0; background: #f7fcfd; }
        .ci-add-comment-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .ci-add-comment-placeholder { font-size: 12.5px; color: #9aa4aa; }

        /* ---------- shared modal shell ---------- */
        .ci-modal-overlay {
          position: fixed; inset: 0; background: rgba(10,16,20,0.45); z-index: 50;
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .ci-composer-modal {
          width: 100%; max-width: 380px; background: #fff; border-radius: 20px; padding: 24px 22px 22px;
          box-shadow: 0 20px 50px rgba(16,24,32,0.25); max-height: 90vh; overflow-y: auto;
        }
        .ci-composer-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; gap: 12px; }
        .ci-composer-title { font-size: 18px; font-weight: 800; color: #141b1f; margin: 0; line-height: 1.35; }
        .ci-modal-close {
          display: flex; align-items: center; justify-content: center; width: 26px; height: 26px;
          border-radius: 50%; border: 1px solid #dfe3e6; background: #fff; cursor: pointer; flex-shrink: 0;
        }
        .ci-modal-close:hover { background: #f5f6f7; }
        .ci-field-label { display: block; font-size: 12.5px; font-weight: 700; color: #141b1f; margin-bottom: 8px; }
        .ci-field-input {
          width: 100%; border: 1px solid #dfe3e6; border-radius: 9px; padding: 11px 14px;
          font-size: 13.5px; color: #141b1f; font-family: inherit; outline: none; margin-bottom: 16px;
        }
        .ci-field-textarea {
          width: 100%; min-height: 120px; border: 1px solid #dfe3e6; border-radius: 9px; padding: 12px 14px;
          font-size: 13.5px; color: #141b1f; font-family: inherit; outline: none; resize: vertical; margin-bottom: 18px;
        }
        .ci-field-input:focus, .ci-field-textarea:focus { border-color: #1CA7D0; box-shadow: 0 0 0 3px rgba(28,167,208,0.12); }
        .ci-composer-submit-btn {
          width: 100%; border: none; border-radius: 9px; padding: 12px 0; font-size: 15px; font-weight: 600;
        }

        /* ---------- assign modal ---------- */
        .ci-assign-search {
          display: flex; align-items: center; gap: 8px; border: 1px solid #dfe3e6; border-radius: 10px;
          padding: 10px 14px; margin-bottom: 18px;
        }
        .ci-assign-search input { flex: 1; border: none; outline: none; font-size: 13px; color: #141b1f; background: transparent; }
        .ci-assign-list { display: flex; flex-direction: column; gap: 4px; }
        .ci-assign-row {
          display: flex; align-items: center; gap: 10px; width: 100%; background: none; border: none;
          padding: 8px; border-radius: 10px; cursor: pointer; text-align: left;
        }
        .ci-assign-row:hover { background: #f6f7f8; }
        .ci-assign-row-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .ci-assign-row-name { flex: 1; font-size: 13px; font-weight: 600; color: #141b1f; }
        .ci-assign-row-tag {
          font-size: 10px; font-weight: 700; color: #1CA7D0; background: #eaf6fa; border-radius: 999px; padding: 3px 10px;
        }
        .ci-assign-row-tag.added { color: #1e9e63; background: #e7f7ee; }

        @media (max-width: 640px) {
          .ci-td-inner { padding: 24px 20px 40px; }
          .ci-td-title { font-size: 20px; }
          .ci-td-cards { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="ci-td-inner">
        <div className="ci-td-header">
          <div className="ci-td-header-left">
            {onBack && (
              <button className="ci-back-btn" type="button" aria-label="Back to project" onClick={onBack}>
                <ArrowLeft size={17} />
              </button>
            )}
          </div>
          <div className="ci-td-actions">
            <button
              className="ci-icon-btn-ghost"
              type="button"
              aria-label="View task analytics"
              onClick={() => onOpenInsight?.()}
            >
              <BarChart3 size={15} />
            </button>
            <button className="ci-icon-btn-ghost" type="button" aria-label="Edit task" onClick={openEdit}>
              <Pencil size={15} />
            </button>
            <button
              className="ci-icon-btn-ghost"
              type="button"
              aria-label="More options"
              onClick={() => setIsMoreMenuOpen((v) => !v)}
            >
              <MoreVertical size={15} />
            </button>

            {isMoreMenuOpen && (
              <div className="ci-more-menu">
                {!isCompleted && (
                  <button type="button" className="ci-more-menu-item" onClick={cycleStatus}>
                    <Wrench size={14} />
                    {nextStatus}
                  </button>
                )}
                <button
                  type="button"
                  className="ci-more-menu-item"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsAssignOpen(true);
                  }}
                >
                  <Plus size={14} />
                  Assign Task
                </button>
                <button type="button" className="ci-more-menu-item danger" onClick={handleDelete}>
                  <LogOut size={14} />
                  Delete Todo
                </button>
              </div>
            )}
          </div>
        </div>

        <h1 className="ci-td-title" style={{ marginBottom: 10 }}>{editableTitle}</h1>
        <p className="ci-td-description">{editableDescription}</p>

        <div className="ci-td-cards">
          <div className="ci-td-card">
            <div className="ci-td-card-label">Assigned to</div>
            <div className="ci-assigned-content">
              <div className="ci-assignee-stack">
                <span className="ci-assignee-dot" />
                <span className="ci-assignee-dot" />
                <span className="ci-assignee-count">+{Math.max(assignees.length, 8)}</span>
              </div>
              <button
                type="button"
                className="ci-assign-work-btn"
                onClick={() => setIsAssignOpen(true)}
              >
                <Plus size={13} />
                Assign Task
              </button>
            </div>
          </div>

          <div className="ci-td-card">
            <div className="ci-td-card-label">Due Date</div>
            <div className="ci-duedate-content">
              <div>
                <div className="ci-due-date-row">
                  <Calendar size={22} color="#141b1f" />
                  {dueDate.split(" ")[0] || dueDate}
                </div>
                <div className="ci-due-date-month">{dueDate.split(" ").slice(1).join(" ")}</div>
              </div>
              <span className="ci-status-pill">{status}</span>
            </div>
          </div>
        </div>

        <div className="ci-sub-tabs">
          {SUB_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`ci-sub-tab${subTab === t.id ? " active" : ""}`}
              onClick={() => setSubTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {subTab === "comment" ? (
          <>
            <div className="ci-comment-list">
              {comments.map((c) => (
                <div key={c.id} className="ci-comment">
                  <img src={c.avatar} alt="" className="ci-comment-avatar" />
                  <div className="ci-comment-body">
                    <div className="ci-comment-meta">
                      <span className="ci-comment-author">{c.author}</span>
                      <span className="ci-comment-time">{c.time}</span>
                    </div>
                    <div className="ci-comment-text">{c.text}</div>
                    <div className="ci-comment-actions">
                      <button className="ci-comment-action-btn" type="button">
                        <ThumbsUp size={12} />
                        Like
                      </button>
                      <button className="ci-comment-action-btn" type="button">
                        <MessageCircle size={12} />
                        Reply
                      </button>
                      <button className="ci-comment-action-btn" type="button">
                        <Share2 size={12} />
                        Share
                      </button>
                      <button className="ci-comment-action-btn" type="button">
                        <MoreVertical size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" className="ci-add-comment-row" onClick={() => setIsComposerOpen(true)}>
              <img src="https://i.pravatar.cc/64?img=12" alt="" className="ci-add-comment-avatar" />
              <span className="ci-add-comment-placeholder">Add a comment...</span>
            </button>
          </>
        ) : subTab === "analytics" ? (
          <>
            {analyticsLoading && <div className="ci-an-state">Loading analytics…</div>}
            {!analyticsLoading && analyticsError && <div className="ci-an-state error">{analyticsError}</div>}
            {!analyticsLoading && !analyticsError && analyticsLoaded && analytics.length === 0 && (
              <div className="ci-an-state">No analytics for this task yet.</div>
            )}
            <div className="ci-an-list">
              {analytics.map((a) => {
                const rate = Math.max(0, Math.min(100, Number(a.completionRate) || 0));
                return (
                  <div key={a.id} className="ci-an-card">
                    <div className="ci-an-head">
                      <span className="ci-an-week">{formatWeek(a.weekStart, a.weekEnd)}</span>
                      <span className="ci-an-done">{a.totalCompletedTasks ?? 0} completed</span>
                    </div>

                    <div className="ci-an-rate-row">
                      <div className="ci-an-bar">
                        <div className="ci-an-bar-fill" style={{ width: `${rate}%` }} />
                      </div>
                      <span className="ci-an-rate">{rate}%</span>
                    </div>

                    {a.remark && <p className="ci-an-remark">{a.remark}</p>}

                    {a.insights?.length > 0 && (
                      <>
                        <div className="ci-an-section-title">Insights</div>
                        <ul className="ci-an-ul">
                          {a.insights.map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      </>
                    )}

                    {a.recommendations?.length > 0 && (
                      <>
                        <div className="ci-an-section-title">Recommendations</div>
                        <ul className="ci-an-ul">
                          {a.recommendations.map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      </>
                    )}

                    {a.riskOverdueTasks?.length > 0 && (
                      <>
                        <div className="ci-an-section-title">At risk / overdue</div>
                        {a.riskOverdueTasks.map((r, i) => (
                          <div key={r.taskId || i} className="ci-an-risk">
                            <b>{r.title}</b> — {r.reason}
                          </div>
                        ))}
                      </>
                    )}

                    {a.pendingTasks?.length > 0 && (
                      <>
                        <div className="ci-an-section-title">Pending</div>
                        {a.pendingTasks.map((r, i) => (
                          <div key={r.taskId || i} className="ci-an-risk">
                            {r.title}
                            <span className="ci-an-pending-pill">{PENDING_LABELS[r.status] || r.status}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="ci-wl">
            {loading && <div className="ci-an-state">Loading work log…</div>}
            {!loading && workLogsError && <div className="ci-an-state error">{workLogsError}</div>}
            {!loading && !workLogsError && workLogs.length === 0 && (
              <div style={{ color: "#9aa4aa", fontSize: 13.5, padding: "10px 0" }}>No work log entries yet.</div>
            )}
            {workLogs.map((w, i) => (
              <React.Fragment key={w.id}>
                {(i === 0 || workLogs[i - 1].day !== w.day) && <div className="ci-wl-day">{workLogDayLabel(w.createdAt)}</div>}
                <div className="ci-wl-item">
                  <span className={`ci-wl-dot ${w.kind}`} />
                  <div className="ci-wl-body">
                    <div className="ci-wl-text">{w.text}</div>
                    <div className="ci-wl-meta">
                      <span>{w.author}</span>
                      <span>·</span>
                      <span>{w.time}</span>
                      <span className="ci-wl-chip">{w.label}</span>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}
            {workLogsNextPage && (
              <button type="button" className="ci-wl-more" onClick={loadMoreWorkLogs} disabled={workLogsLoadingMore}>
                {workLogsLoadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>

      {isComposerOpen && (
        <div className="ci-modal-overlay" onClick={() => setIsComposerOpen(false)}>
          <div className="ci-composer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ci-composer-header">
              <h2 className="ci-composer-title">Whats your thought process?</h2>
              <button
                className="ci-modal-close"
                type="button"
                aria-label="Close"
                onClick={() => setIsComposerOpen(false)}
              >
                <X size={15} color="#141b1f" />
              </button>
            </div>

            <label className="ci-field-label">Describe</label>
            <textarea
              className="ci-field-textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add Description"
            />

            <button
              type="button"
              className="ci-composer-submit-btn"
              disabled={!draft.trim()}
              style={{
                background: draft.trim() ? "#1CA7D0" : "#eceef0",
                color: draft.trim() ? "#fff" : "#8a97a0",
                cursor: draft.trim() ? "pointer" : "not-allowed",
              }}
              onClick={submitComment}
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {isEditOpen && (
        <div className="ci-modal-overlay" onClick={() => setIsEditOpen(false)}>
          <div className="ci-composer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ci-composer-header">
              <h2 className="ci-composer-title">Edit Task</h2>
              <button
                className="ci-modal-close"
                type="button"
                aria-label="Close"
                onClick={() => setIsEditOpen(false)}
              >
                <X size={15} color="#141b1f" />
              </button>
            </div>

            <label className="ci-field-label">Title</label>
            <input
              type="text"
              className="ci-field-input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              placeholder="Task title"
            />

            <label className="ci-field-label">Description</label>
            <textarea
              className="ci-field-textarea"
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              placeholder="Add Description"
            />

            <button
              type="button"
              className="ci-composer-submit-btn"
              disabled={!titleDraft.trim()}
              style={{
                background: titleDraft.trim() ? "#1CA7D0" : "#eceef0",
                color: titleDraft.trim() ? "#fff" : "#8a97a0",
                cursor: titleDraft.trim() ? "pointer" : "not-allowed",
              }}
              onClick={saveEdit}
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {isAssignOpen && (
        <div className="ci-modal-overlay" onClick={() => setIsAssignOpen(false)}>
          <div className="ci-composer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ci-composer-header">
              <h2 className="ci-composer-title">Assign Task</h2>
              <button
                className="ci-modal-close"
                type="button"
                aria-label="Close"
                onClick={() => setIsAssignOpen(false)}
              >
                <X size={15} color="#141b1f" />
              </button>
            </div>

            <div className="ci-assign-search">
              <Plus size={0} />
              <input
                type="text"
                placeholder="Search team member"
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
              />
            </div>

            <div className="ci-assign-list">
              {filteredTeamPool.map((member) => {
                const isAdded = assignees.some((a) => a.id === member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    className="ci-assign-row"
                    onClick={() => toggleAssignee(member)}
                  >
                    <img src={member.avatar} alt="" className="ci-assign-row-avatar" />
                    <span className="ci-assign-row-name">{member.name}</span>
                    <span className={`ci-assign-row-tag${isAdded ? " added" : ""}`}>
                      {isAdded ? "Added" : "Add"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}