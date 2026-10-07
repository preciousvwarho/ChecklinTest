import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search, Plus, X } from "lucide-react";
import AppShell from "../components/AppShell";
import ChatThread, { participantName, initialsOf } from "../components/ChatThread";
import {
  getOrganizations,
  getConversations,
  getConversation,
  createConversation,
  getProjects,
  getProjectMembers,
} from "../lib/api";
import { getAuthToken, getSession, pickActiveOrgRow } from "../lib/session";

const LIST_POLL_MS = 15000;

function timeAgo(ts) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"}`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

// Resolves the active organization the same way App.jsx does for project routes.
function useOrganizationId() {
  const [organizationId, setOrganizationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    getOrganizations({ token: getAuthToken() })
      .then((res) => {
        if (cancelled) return;
        const row = pickActiveOrgRow(res.data || []);
        setOrganizationId(row?.organizationId || row?.organization?.id || null);
      })
      .catch((err) => !cancelled && setError(err.message || "Failed to load organization."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);
  return { organizationId, loading, error };
}

// Maps a GET /v1/messaging/conversations row to what the list renders.
function toRow(c) {
  const myUserId = getSession()?.user?.id;
  const others = (c.participants || []).filter((p) => p.organizationUser?.userId !== myUserId);
  const names = others.map(participantName);
  const last = (c.messages || [])[0];
  return {
    id: c.id,
    name: names.join(", ") || "Conversation",
    preview: last ? (last.deletedAt ? "Message deleted" : last.content || "Attachment") : "No messages yet",
    lastAt: last?.createdAt || c.updatedAt,
    unread: c.unreadCount || 0,
  };
}

const STYLES = `
  .ci-dm-inner { padding: 32px 40px 60px; max-width: 760px; }
  .ci-dm-title { font-size: 26px; font-weight: 800; color: #141b1f; margin: 0 0 20px; }
  .ci-dm-search {
    display: flex; align-items: center; gap: 12px; border: 1px solid #dfe3e6; border-radius: 14px;
    padding: 14px 18px; background: #fff; margin-bottom: 26px;
  }
  .ci-dm-search input { flex: 1; border: none; outline: none; font-size: 13.5px; color: #141b1f; background: transparent; font-family: inherit; }
  .ci-dm-list { display: flex; flex-direction: column; }
  .ci-dm-row {
    display: flex; align-items: center; gap: 14px; padding: 16px 4px; border: none; border-bottom: 1px solid #eef0f1;
    background: none; width: 100%; text-align: left; cursor: pointer; font-family: inherit;
  }
  .ci-dm-row:last-child { border-bottom: none; }
  .ci-dm-row:hover { background: #f9fbfc; }
  .ci-dm-avatar { width: 34px; height: 34px; border-radius: 50%; background: #cfeaf6; flex-shrink: 0; }
  .ci-dm-row-body { flex: 1; min-width: 0; }
  .ci-dm-name { font-size: 13.5px; font-weight: 700; color: #141b1f; }
  .ci-dm-preview { font-size: 11.5px; color: #8a97a0; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ci-dm-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
  .ci-dm-time { font-size: 11px; color: #9aa4aa; }
  .ci-dm-badge {
    min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: #bfe3f2; color: #0f6f8f;
    font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;
  }
  .ci-dm-empty { font-size: 13.5px; color: #9aa4aa; padding: 20px 0; }

  /* ---------- conversation ---------- */
  .ci-chat { display: flex; flex-direction: column; height: 100vh; max-width: 760px; }
  .ci-chat-header { display: flex; align-items: center; gap: 12px; padding: 20px 28px 16px; flex-shrink: 0; }
  .ci-chat-back { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: none; background: none; cursor: pointer; color: #141b1f; padding: 0; }
  .ci-chat-name { font-size: 14px; font-weight: 700; color: #141b1f; }
  .ci-chat-role { font-size: 11px; color: #9aa4aa; }
  .ci-chat-scroll { flex: 1; overflow-y: auto; padding: 24px 28px; display: flex; flex-direction: column; gap: 22px; }
  .ci-msg { display: flex; flex-direction: column; max-width: 70%; }
  .ci-msg.me { align-self: flex-end; align-items: flex-end; }
  .ci-msg.them { align-self: flex-start; align-items: flex-start; }
  .ci-bubble { padding: 14px 16px; border-radius: 18px; font-size: 12.5px; line-height: 1.55; word-break: break-word; }
  .ci-msg.them .ci-bubble { background: #e6e7e8; color: #2b3338; border-bottom-left-radius: 6px; }
  .ci-msg.me .ci-bubble { background: #1CA7D0; color: #fff; border-bottom-right-radius: 6px; }
  .ci-msg-time { font-size: 10.5px; color: #9aa4aa; margin-top: 6px; }
  .ci-file {
    display: flex; align-items: center; gap: 10px; background: #e3f1fb; border-radius: 10px; padding: 10px 12px; min-width: 200px;
  }
  .ci-file-info { flex: 1; min-width: 0; }
  .ci-file-name { font-size: 11.5px; font-weight: 700; color: #141b1f; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ci-file-size { font-size: 10px; color: #8a97a0; margin-top: 2px; }
  .ci-file-dl { width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid #1CA7D0; display: flex; align-items: center; justify-content: center; color: #1CA7D0; background: none; cursor: pointer; padding: 0; flex-shrink: 0; }
  .ci-img { max-width: 260px; width: 100%; border-radius: 4px; display: block; }

  .ci-composer { display: flex; align-items: center; gap: 10px; padding: 14px 28px 24px; border-top: 1px solid #eef0f1; flex-shrink: 0; }
  .ci-composer-attach { border: none; background: none; cursor: pointer; color: #8a97a0; padding: 6px; display: flex; }
  .ci-composer-attach:hover { color: #1CA7D0; }
  .ci-composer-input { flex: 1; border: 1px solid #dfe3e6; border-radius: 999px; padding: 12px 18px; font-size: 13px; outline: none; font-family: inherit; color: #141b1f; }
  .ci-composer-input:focus { border-color: #1CA7D0; box-shadow: 0 0 0 3px rgba(28,167,208,0.12); }
  .ci-composer-send { width: 40px; height: 40px; border-radius: 50%; border: none; background: #1CA7D0; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
  .ci-composer-send:disabled { background: #eceef0; color: #8a97a0; cursor: not-allowed; }


  .ci-dm-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
  .ci-dm-head .ci-dm-title { margin: 0; }
  .ci-dm-new { border: none; background: #1CA7D0; color: #fff; font-size: 12.5px; font-weight: 700; border-radius: 999px; padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: inherit; }
  .ci-dm-new:hover { background: #1691b6; }
  .ci-dm-avatar { display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #0f6f8f; }
  .ci-dm-error { font-size: 12.5px; color: #d64545; padding: 8px 0; }
  .ci-dm-overlay { position: fixed; inset: 0; background: rgba(20,27,31,0.45); display: flex; align-items: center; justify-content: center; z-index: 80; padding: 16px; }
  .ci-dm-modal { background: #fff; border-radius: 18px; width: 100%; max-width: 420px; max-height: 80vh; display: flex; flex-direction: column; padding: 20px 20px 12px; }
  .ci-dm-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .ci-dm-modal-title { font-size: 16px; font-weight: 800; color: #141b1f; }
  .ci-dm-modal-close { border: none; background: none; cursor: pointer; color: #6b7680; display: flex; padding: 4px; }
  .ci-dm-modal-list { overflow-y: auto; margin: 8px -8px 0; }
  .ci-dm-chat-sub { font-size: 11px; color: #9aa4aa; }

  @media (max-width: 860px) { .ci-chat { height: calc(100vh - 58px); } }
  @media (max-width: 640px) {
    .ci-dm-inner { padding: 24px 20px 48px; }
    .ci-dm-title { font-size: 21px; }
    .ci-chat-header, .ci-composer { padding-left: 16px; padding-right: 16px; }
    .ci-chat-scroll { padding: 20px 16px; }
    .ci-msg { max-width: 85%; }
  }
`;

function NewMessageModal({ organizationId, onClose, onPick }) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [starting, setStarting] = useState(false);

  // There's no "list org members" endpoint in the messaging docs, so candidates
  // are the people on the projects the user belongs to (deduped).
  useEffect(() => {
    let cancelled = false;
    const token = getAuthToken();
    const myUserId = getSession()?.user?.id;
    (async () => {
      try {
        const projects = await getProjects({ organizationId, page: 1, limit: 50, token });
        const lists = await Promise.all(
          (projects.data || []).map((p) =>
            getProjectMembers({ organizationId, projectId: p.id, token })
              .then((r) => r.data || [])
              .catch(() => [])
          )
        );
        const seen = new Map();
        lists.flat().forEach((m) => {
          // conversations are keyed by ORGANIZATION USER id
          const orgUserId = m.organizationUserId || m.organizationUser?.id || m.user?.organizationUserId || m.userId || m.user?.id;
          const userId = m.user?.userId || m.user?.id || m.userId;
          if (!orgUserId || userId === myUserId || seen.has(orgUserId)) return;
          const u = m.user || m.organizationUser?.user || {};
          const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || m.name || u.email || "Unnamed";
          seen.set(orgUserId, { id: orgUserId, name, email: u.email || "" });
        });
        if (!cancelled) setPeople([...seen.values()]);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load people.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const shown = people.filter((p) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()));

  const pick = async (person) => {
    if (starting) return;
    setStarting(true);
    setError("");
    try {
      await onPick(person);
    } catch (err) {
      setError(err.message || "Failed to start conversation.");
      setStarting(false);
    }
  };

  return (
    <div className="ci-dm-overlay" onClick={onClose}>
      <div className="ci-dm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ci-dm-modal-head">
          <span className="ci-dm-modal-title">New message</span>
          <button type="button" className="ci-dm-modal-close" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="ci-dm-search" style={{ marginBottom: 6 }}>
          <Search size={16} color="#6b7680" />
          <input placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {error && <div className="ci-dm-error">{error}</div>}
        <div className="ci-dm-modal-list">
          {loading && <div className="ci-dm-empty">Loading people…</div>}
          {!loading && shown.length === 0 && <div className="ci-dm-empty">No people found.</div>}
          {shown.map((p) => (
            <button key={p.id} type="button" className="ci-dm-row" disabled={starting} onClick={() => pick(p)}>
              <span className="ci-dm-avatar">{initialsOf(p.name)}</span>
              <div className="ci-dm-row-body">
                <div className="ci-dm-name">{p.name}</div>
                {p.email && <div className="ci-dm-preview">{p.email}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CheckInDms() {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { organizationId, loading: orgLoading, error: orgError } = useOrganizationId();

  const [rows, setRows] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);

  const [active, setActive] = useState(null); // full conversation (with participants)
  const [activeError, setActiveError] = useState("");

  // ---------- conversation list ----------
  const loadList = async () => {
    try {
      const res = await getConversations({ organizationId, page: 1, limit: 50, token: getAuthToken() });
      setRows((res.data || []).map(toRow));
      setListError("");
    } catch (err) {
      setListError(err.message || "Failed to load conversations.");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (!organizationId || conversationId) return;
    setListLoading(true);
    loadList();
    const id = setInterval(() => !document.hidden && loadList(), LIST_POLL_MS);
    return () => clearInterval(id);
  }, [organizationId, conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- single conversation ----------
  useEffect(() => {
    if (!organizationId || !conversationId) return;
    let cancelled = false;
    setActive(null);
    setActiveError("");
    getConversation({ conversationId, organizationId, token: getAuthToken() })
      .then((res) => !cancelled && setActive(res.data))
      .catch((err) => !cancelled && setActiveError(err.message || "Conversation not found."));
    return () => {
      cancelled = true;
    };
  }, [organizationId, conversationId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((c) => !q || c.name.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q));
  }, [rows, query]);

  const startConversation = async (person) => {
    const res = await createConversation({ organizationId, organizationUsers: [person.id], token: getAuthToken() });
    setShowNew(false);
    navigate(`/dms/${res.data.id}`);
  };

  // ---------- conversation view ----------
  if (conversationId) {
    const myUserId = getSession()?.user?.id;
    const others = (active?.participants || []).filter((p) => p.organizationUser?.userId !== myUserId);
    const title = others.map(participantName).join(", ") || "Conversation";
    const isGroup = others.length > 1;

    return (
      <AppShell>
        <style>{STYLES}</style>
        {activeError || orgError ? (
          <div className="ci-dm-inner">
            <button type="button" className="ci-chat-back" aria-label="Back" onClick={() => navigate("/dms")}>
              <ArrowLeft size={20} />
            </button>
            <div className="ci-dm-empty">{activeError || orgError}</div>
          </div>
        ) : (
          <div className="ci-chat">
            <div className="ci-chat-header">
              <button type="button" className="ci-chat-back" aria-label="Back to messages" onClick={() => navigate("/dms")}>
                <ArrowLeft size={20} />
              </button>
              <span className="ci-dm-avatar">{active ? initialsOf(title) : ""}</span>
              <div>
                <div className="ci-chat-name">{active ? title : "Loading…"}</div>
                {!isGroup && others[0]?.organizationUser?.user?.email && (
                  <div className="ci-chat-role">{others[0].organizationUser.user.email}</div>
                )}
              </div>
            </div>

            {active && organizationId && (
              <ChatThread
                conversationId={conversationId}
                organizationId={organizationId}
                participants={active.participants || []}
                showSenderNames={isGroup}
              />
            )}
          </div>
        )}
      </AppShell>
    );
  }

  // ---------- list view ----------
  const loading = orgLoading || listLoading;
  return (
    <AppShell>
      <style>{STYLES}</style>
      <div className="ci-dm-inner">
        <div className="ci-dm-head">
          <h1 className="ci-dm-title">Direct messages</h1>
          <button type="button" className="ci-dm-new" onClick={() => setShowNew(true)} disabled={!organizationId}>
            <Plus size={15} /> New
          </button>
        </div>

        <div className="ci-dm-search">
          <Search size={18} color="#6b7680" />
          <input placeholder="Search message" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {(listError || orgError) && <div className="ci-dm-error">{listError || orgError}</div>}

        <div className="ci-dm-list">
          {loading && <div className="ci-dm-empty">Loading messages…</div>}
          {!loading && !listError && filtered.length === 0 && <div className="ci-dm-empty">No messages found.</div>}
          {filtered.map((c) => (
            <button key={c.id} type="button" className="ci-dm-row" onClick={() => navigate(`/dms/${c.id}`)}>
              <span className="ci-dm-avatar">{initialsOf(c.name)}</span>
              <div className="ci-dm-row-body">
                <div className="ci-dm-name" style={c.unread > 0 ? { color: "#000" } : undefined}>{c.name}</div>
                <div className="ci-dm-preview" style={c.unread > 0 ? { color: "#4a565d", fontWeight: 600 } : undefined}>{c.preview}</div>
              </div>
              <div className="ci-dm-meta">
                <span className="ci-dm-time">{timeAgo(c.lastAt)}</span>
                {c.unread > 0 && <span className="ci-dm-badge">{c.unread}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {showNew && organizationId && (
        <NewMessageModal organizationId={organizationId} onClose={() => setShowNew(false)} onPick={startConversation} />
      )}
    </AppShell>
  );
}
