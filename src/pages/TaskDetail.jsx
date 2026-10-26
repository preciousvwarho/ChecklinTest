import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Pencil,
  MoreVertical,
  MoreHorizontal,
  CalendarDays,
  Plus,
  X,
  ThumbsUp,
  Reply,
  SquarePen,
  Wrench,
  LogOut,
} from "lucide-react";
import AppShell from "../components/AppShell";
import {
  getTask,
  getTaskComments,
  createTaskComment,
  getTaskWorkLogs,
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
];

// Maps GET /v1/projects/tasks/{taskId}/comments entries into what the
// comment list renders. Field names are a best guess pending the real
// response shape.
function toComment(c, fallbackAuthor = "Unknown") {
  // The author may sit at the top level or be nested (like work logs use
  // projectUser.user), so look in the likely places before giving up.
  const person = c.projectUser?.user || c.user || c.author || c.createdBy || c.sender || c;
  const name = personName(person, "") || personName(c, "");
  return {
    id: c.id,
    author: name || fallbackAuthor,
    time: c.createdAt ? new Date(c.createdAt).toLocaleString() : "Just now",
    text: c.content,
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

function toMember(m) {
  return {
    id: m.id,
    // Tasks reference people by organization user id, not the membership id.
    userId: m.user?.id || m.userId || m.id,
    name: personName(m),
    avatar: personImage(m) || `https://i.pravatar.cc/64?u=${m.id}`,
  };
}

// Task member lists can hold plain ids or person objects.
const idOf = (x) => (typeof x === "string" ? x : x?.userId || x?.user?.id || x?.id);

const STATUS_OPTIONS = ["Pending", "In Progress", "Completed"];
// UI labels <-> the enum values PATCH /v1/projects/tasks/{taskId}/status expects.
const STATUS_TO_API = { Pending: "PENDING", "In Progress": "IN_PROGRESS", Completed: "COMPLETED" };

const STATUS_STYLES = {
  Pending: { bg: "#FFEF1A", color: "#141b1f" },
  "In Progress": { bg: "#0C93CF", color: "#fff" },
  Completed: { bg: "#3CC48A", color: "#fff" },
};

export default function CheckInTaskDetail({
  task,
  taskId,
  projectId,
  organizationId,
  onBack,
  onGoHome,
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
  const [apiAssigneeCount, setApiAssigneeCount] = useState(0);
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
        const rawAssigned = [t.teamMembers, t.members, t.assignees, t.assignedTo, t.users].find(
          (l) => Array.isArray(l) && l.length
        ) || task?.members || [];
        const assignedIds = rawAssigned.map(idOf).filter(Boolean);
        setAssignees(
          assignedIds.map((id, i) => {
            const match = pool.find((m) => m.userId === id || m.id === id);
            if (match) return match;
            const raw = rawAssigned[i];
            const img = raw && typeof raw === "object" ? personImage(raw) || raw.avatar || raw.imageUrl : null;
            return { id, userId: id, name: "", avatar: img || null };
          })
        );
        setApiAssigneeCount(t.teamMembersCount ?? t.membersCount ?? assignedIds.length);

        console.log("[TaskDetail] raw comment sample:", commentsResult.data?.[0]);
        setComments((commentsResult.data || []).map((c) => toComment(c)));
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

  // POST /v1/projects/tasks/{taskId}/comments
  const submitComment = async () => {
    if (!draft.trim()) return;
    const token = getAuthToken();
    try {
      const result = await createTaskComment({ taskId: resolvedTaskId, projectId, content: draft.trim(), token });
      const text = draft.trim();
      setDraft("");
      setIsComposerOpen(false);
      // The create response often lacks the author, so reload the list from
      // the server to get the real name. Fall back to adding it locally.
      try {
        const fresh = await getTaskComments({ taskId: resolvedTaskId, projectId, page: 1, limit: 20, token });
        setComments((fresh.data || []).map((c) => toComment(c)));
      } catch {
        setComments((prev) => [toComment(result.data || { id: Date.now(), content: text }, "You"), ...prev]);
      }
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
    const wasAssigned = assignees.some((a) => a.userId === member.userId);
    const next = wasAssigned ? assignees.filter((a) => a.userId !== member.userId) : [...assignees, member];
    setAssignees(next);
    setApiAssigneeCount(next.length);
    const token = getAuthToken();
    try {
      await apiUpdateTask({ taskId: resolvedTaskId, teamMembers: next.map((m) => m.userId), token });
    } catch (err) {
      console.error("[TaskDetail] updateTask (assignees) failed:", err);
      setAssignees(assignees); // revert on failure
      setApiAssigneeCount(assignees.length);
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

  // "4 December" -> day "04", month "December"
  const [dueDayRaw, ...dueMonthParts] = dueDate.split(" ");
  const dueDayIsNumber = /^\d+$/.test(dueDayRaw);
  const dueDay = dueDayIsNumber ? dueDayRaw.padStart(2, "0") : dueDate;
  const dueMonth = dueDayIsNumber ? dueMonthParts.join(" ") : "";

  const shownAssignees = assignees.slice(0, 3);
  const assigneeTotal = Math.max(assignees.length, apiAssigneeCount);

  return (
    <AppShell>
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Poppins:wght@400;500;600&display=swap");

        .ci-td-inner { max-width: 600px; padding: 32px 40px 60px; font-family: "Inter", sans-serif; }
        .ci-td-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .ci-td-header-left { display: flex; align-items: center; gap: 12px; }
        .ci-back-btn {
          display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;
          border-radius: 8px; border: 1px solid #eef0f1; background: #fff; color: #141b1f; cursor: pointer; flex-shrink: 0;
        }
        .ci-back-btn:hover { background: #f5f6f7; }
        .ci-td-title { font-size: 48px; font-weight: 400; color: #3a3a3a; margin: 0 0 14px; line-height: 1.15; letter-spacing: -0.5px; }
        .ci-td-actions { display: flex; align-items: center; gap: 6px; position: relative; }
        .ci-icon-btn-ghost {
          display: flex; align-items: center; justify-content: center; width: 30px; height: 30px;
          border-radius: 8px; border: none; background: transparent; color: #9aa4aa; cursor: pointer;
        }
        .ci-icon-btn-ghost:hover { background: #f5f6f7; }
        .ci-td-description { font-size: 16px; color: #1f1f1f; line-height: 1.7; margin: 0 0 26px; max-width: 520px; }
        .ci-td-error { color: #d64545; font-size: 12.5px; margin-bottom: 16px; }

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

        /* ---------- info cards ---------- */
        .ci-td-cards { display: flex; gap: 36px; margin-bottom: 36px; }
        .ci-td-card {
          position: relative; flex: 1; max-width: 244px; min-height: 120px; background: #EBF6FE;
          border-radius: 20px; padding: 18px 20px; overflow: hidden; box-sizing: border-box;
        }
        .ci-td-card-label { font-family: "Poppins", sans-serif; font-size: 16px; font-weight: 600; color: #1d1d1d; }

        .ci-assignee-stack { position: absolute; left: 20px; bottom: 20px; display: flex; align-items: center; }
        .ci-assignee-avatar {
          width: 26px; height: 26px; border-radius: 50%; object-fit: cover; margin-left: -10px; background: #E2F2F9;
        }
        .ci-assignee-avatar:first-child { margin-left: 0; }
        .ci-assignee-dot { width: 26px; height: 26px; border-radius: 50%; margin-left: -10px; background: #E2F2F9; }
        .ci-assignee-dot:first-child { margin-left: 0; }
        .ci-assignee-dot.d2 { background: #B5E0FB; }
        .ci-assignee-dot.d3 { background: #8CCDF7; }
        .ci-assignee-count {
          display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%;
          background: #0C93CF; color: #fff; font-size: 11px; font-weight: 500; margin-left: -10px; position: relative;
        }
        .ci-assignee-count:first-child { margin-left: 0; }
        .ci-assign-work-btn {
          position: absolute; right: 0; bottom: 18px; display: flex; align-items: center; gap: 8px; white-space: nowrap;
          background: linear-gradient(90deg, #0C93CF 0%, #0C93CF 100%); color: #fff; border: none;
          border-radius: 10px 0 0 10px; padding: 9px 22px 9px 14px; font-family: "Poppins", sans-serif;
          font-size: 12px; font-weight: 500; cursor: pointer;
        }
        .ci-assign-work-btn:hover { filter: brightness(0.96); }

        .ci-due-date-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; font-family: "Poppins", sans-serif; font-size: 32px; font-weight: 400; color: #1d1d1d; line-height: 1.1; }
        .ci-due-date-month { font-family: "Poppins", sans-serif; font-size: 16px; font-weight: 400; color: #3a3a3a; margin-top: 2px; }
        .ci-status-pill {
          position: absolute; right: 0; bottom: 20px; font-family: "Poppins", sans-serif; font-size: 12px; font-weight: 500;
          border-radius: 6px 0 0 6px; padding: 6px 28px 6px 20px;
          background: ${statusStyle.bg}; color: ${statusStyle.color};
        }

        /* ---------- tabs ---------- */
        .ci-sub-tabs {
          display: flex; align-items: center; gap: 14px; border: 1.5px solid #dcdfe3; border-radius: 8px;
          padding: 10px 24px; margin-bottom: 26px; background: #fff;
        }
        .ci-sub-tab {
          background: none; border: 1.5px solid transparent; border-radius: 8px; padding: 5px 17px;
          font-family: "Poppins", sans-serif; font-size: 14px; font-weight: 400; color: #1d1d1d; cursor: pointer;
        }
        .ci-sub-tab.active { border-color: #0C93CF; color: #0C93CF; }

        /* ---------- work log ---------- */
        .ci-an-state { font-size: 13.5px; color: #9aa4aa; padding: 10px 0; }
        .ci-an-state.error { color: #d64545; }
        .ci-wl { display: flex; flex-direction: column; }
        .ci-wl-day { font-size: 11px; font-weight: 700; color: #9aa4aa; margin: 16px 0 6px; text-transform: uppercase; letter-spacing: 0.04em; }
        .ci-wl-day:first-child { margin-top: 2px; }
        .ci-wl-item { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #eef0f1; }
        .ci-wl-item:last-of-type { border-bottom: none; }
        .ci-wl-dot { width: 9px; height: 9px; border-radius: 50%; background: #0C93CF; margin-top: 5px; flex-shrink: 0; }
        .ci-wl-dot.comment { background: #8a97a0; }
        .ci-wl-dot.status { background: #1e9e63; }
        .ci-wl-dot.assign { background: #e0a21b; }
        .ci-wl-body { flex: 1; min-width: 0; }
        .ci-wl-text { font-size: 12.5px; color: #141b1f; line-height: 1.5; }
        .ci-wl-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 11px; color: #9aa4aa; margin-top: 3px; }
        .ci-wl-chip { background: #f1f3f4; color: #6b7680; border-radius: 999px; padding: 1px 8px; font-size: 10px; font-weight: 600; }
        .ci-wl-more { align-self: center; margin-top: 12px; border: 1px solid #dfe3e6; background: #fff; color: #0C93CF; font-size: 12px; font-weight: 600; border-radius: 999px; padding: 7px 16px; cursor: pointer; }
        .ci-wl-more:disabled { opacity: 0.6; cursor: default; }

        /* ---------- comments ---------- */
        .ci-comment-list { display: flex; flex-direction: column; gap: 36px; margin-bottom: 28px; }
        .ci-comment { display: flex; gap: 8px; }
        .ci-comment-avatar { width: 28px; height: 28px; border-radius: 50%; background: #0C93CF; flex-shrink: 0; margin-top: 2px; }
        .ci-comment-body { flex: 1; min-width: 0; }
        .ci-comment-author { font-family: "Poppins", sans-serif; font-size: 16px; font-weight: 400; color: #1d1d1d; line-height: 1.2; }
        .ci-comment-time { font-size: 10px; color: #7a7a7a; margin-top: 2px; }
        .ci-comment-text { font-size: 12.5px; color: #1d1d1d; margin-top: 18px; line-height: 1.5; }
        .ci-comment-actions { display: flex; align-items: center; gap: 14px; margin-top: 12px; }
        .ci-comment-action-btn { display: flex; background: none; border: none; color: #000; padding: 0; cursor: pointer; }
        .ci-comment-action-btn:hover { color: #0C93CF; }

        .ci-add-comment-row {
          display: flex; align-items: center; gap: 10px; border: 1px dashed #dfe3e6; border-radius: 12px;
          padding: 12px 14px; cursor: pointer; background: #fff; width: 100%; text-align: left;
        }
        .ci-add-comment-row:hover { border-color: #0C93CF; background: #F1F9FC; }
        .ci-add-comment-avatar { width: 28px; height: 28px; border-radius: 50%; background: #0C93CF; flex-shrink: 0; }
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
        .ci-field-input:focus, .ci-field-textarea:focus { border-color: #0C93CF; box-shadow: 0 0 0 3px rgba(12,147,207,0.12); }
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
          font-size: 10px; font-weight: 700; color: #0C93CF; background: #E7F4FA; border-radius: 999px; padding: 3px 10px;
        }
        .ci-assign-row-tag.added { color: #1e9e63; background: #e7f7ee; }

        @media (max-width: 640px) {
          .ci-td-inner { padding: 24px 20px 40px; }
          .ci-td-title { font-size: 36px; }
          .ci-td-cards { flex-direction: column; gap: 16px; }
          .ci-td-card { max-width: none; }
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

        <h1 className="ci-td-title">{editableTitle}</h1>
        <p className="ci-td-description">{editableDescription}</p>
        {error && <div className="ci-td-error">{error}</div>}

        <div className="ci-td-cards">
          <div className="ci-td-card">
            <div className="ci-td-card-label">Assigned to</div>
            <div className="ci-assignee-stack">
              {shownAssignees.map((a, i) =>
                a.avatar ? (
                  <img key={a.userId || a.id || i} src={a.avatar} alt="" className="ci-assignee-avatar" />
                ) : (
                  <span key={a.userId || a.id || i} className={`ci-assignee-dot d${i + 1}`} />
                )
              )}
              {assigneeTotal > 0 && <span className="ci-assignee-count">+{assigneeTotal}</span>}
            </div>
            <button type="button" className="ci-assign-work-btn" onClick={() => setIsAssignOpen(true)}>
              <Plus size={13} strokeWidth={2.5} />
              Assign Task
            </button>
          </div>

          <div className="ci-td-card">
            <div className="ci-td-card-label">Due Date</div>
            <div className="ci-due-date-row">
              <CalendarDays size={26} strokeWidth={2} color="#1d1d1d" />
              {dueDay}
            </div>
            {dueMonth && <div className="ci-due-date-month">{dueMonth}</div>}
            <span className="ci-status-pill">{status}</span>
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
                  <div className="ci-comment-avatar" />
                  <div className="ci-comment-body">
                    <div className="ci-comment-author">{c.author}</div>
                    <div className="ci-comment-time">{c.time}</div>
                    <div className="ci-comment-text">{c.text}</div>
                    <div className="ci-comment-actions">
                      <button className="ci-comment-action-btn" type="button" aria-label="Reply">
                        <Reply size={16} />
                      </button>
                      <button className="ci-comment-action-btn" type="button" aria-label="Like">
                        <ThumbsUp size={16} />
                      </button>
                      <button className="ci-comment-action-btn" type="button" aria-label="Edit">
                        <SquarePen size={16} />
                      </button>
                      <button className="ci-comment-action-btn" type="button" aria-label="More">
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" className="ci-add-comment-row" onClick={() => setIsComposerOpen(true)}>
              <span className="ci-add-comment-avatar" />
              <span className="ci-add-comment-placeholder">Add a comment...</span>
            </button>
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
                background: draft.trim() ? "#0C93CF" : "#eceef0",
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
                background: titleDraft.trim() ? "#0C93CF" : "#eceef0",
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
              <input
                type="text"
                placeholder="Search team member"
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
              />
            </div>

            <div className="ci-assign-list">
              {filteredTeamPool.map((member) => {
                const isAdded = assignees.some((a) => a.userId === member.userId);
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