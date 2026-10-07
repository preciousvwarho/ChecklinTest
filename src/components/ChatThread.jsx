import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Send, Trash2, Reply, X, FileText, Download, ClipboardCheck, Paperclip } from "lucide-react";
import {
  getConversationMessages,
  sendConversationMessage,
  markConversationRead,
  deleteConversationMessage,
  uploadFiles,
} from "../lib/api";
import { getAuthToken, getSession } from "../lib/session";

const POLL_MS = 5000;
const PAGE_SIZE = 30;
const MAX_FILE_MB = 10;

export function participantName(p) {
  const u = p?.organizationUser?.user;
  return [u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.email || "Unknown";
}

export function initialsOf(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

/** The participant row that belongs to the signed-in user. */
export function findMe(participants = []) {
  const myUserId = getSession()?.user?.id;
  return participants.find((p) => p.organizationUser?.userId === myUserId) || null;
}

function sortMessages(a, b) {
  if (typeof a.offset === "number" && typeof b.offset === "number" && a.offset !== b.offset) return a.offset - b.offset;
  return new Date(a.createdAt) - new Date(b.createdAt);
}

function mergeMessages(prev, incoming) {
  const map = new Map(prev.map((m) => [m.id, m]));
  incoming.forEach((m) => map.set(m.id, { ...map.get(m.id), ...m }));
  return [...map.values()].sort(sortMessages);
}

function timeLabel(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function dayLabel(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STYLES = `
  .ci-th { display: flex; flex-direction: column; flex: 1; min-height: 0; width: 100%; }
  .ci-th-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 4px; }
  .ci-th-state { font-size: 13px; color: #9aa4aa; text-align: center; padding: 24px 0; }
  .ci-th-error { font-size: 12px; color: #d64545; text-align: center; padding: 8px 0; }
  .ci-th-more { align-self: center; border: 1px solid #dfe3e6; background: #fff; color: #1CA7D0; font-size: 12px; font-weight: 600; border-radius: 999px; padding: 6px 14px; cursor: pointer; margin-bottom: 10px; font-family: inherit; }
  .ci-th-more:disabled { opacity: 0.6; cursor: default; }
  .ci-th-day { align-self: center; font-size: 10.5px; color: #9aa4aa; background: #f3f5f6; border-radius: 999px; padding: 4px 12px; margin: 14px 0 8px; }
  .ci-th-msg { display: flex; flex-direction: column; max-width: 72%; margin-top: 10px; }
  .ci-th-msg.cont { margin-top: 2px; }
  .ci-th-msg.me { align-self: flex-end; align-items: flex-end; }
  .ci-th-msg.them { align-self: flex-start; align-items: flex-start; }
  .ci-th-sender { font-size: 11px; font-weight: 700; color: #6b7680; margin: 0 4px 3px; }
  .ci-th-row { display: flex; align-items: flex-end; gap: 6px; }
  .ci-th-msg.me .ci-th-row { flex-direction: row-reverse; }
  .ci-th-bubble { padding: 10px 14px; border-radius: 16px; font-size: 12.5px; line-height: 1.5; word-break: break-word; white-space: pre-wrap; }
  .ci-th-msg.them .ci-th-bubble { background: #eceeef; color: #2b3338; border-bottom-left-radius: 5px; }
  .ci-th-msg.me .ci-th-bubble { background: #1CA7D0; color: #fff; border-bottom-right-radius: 5px; }
  .ci-th-bubble.deleted { background: transparent !important; border: 1px dashed #d5dadd; color: #9aa4aa !important; font-style: italic; }
  .ci-th-bubble.failed { background: #fdecec !important; color: #b53a3a !important; }
  .ci-th-bubble.sending { opacity: 0.6; }
  .ci-th-quote { font-size: 11px; border-left: 3px solid rgba(28,167,208,0.6); background: rgba(0,0,0,0.05); border-radius: 6px; padding: 5px 8px; margin-bottom: 6px; opacity: 0.9; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ci-th-msg.me .ci-th-quote { background: rgba(255,255,255,0.18); border-left-color: rgba(255,255,255,0.7); }
  .ci-th-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.12s ease; }
  .ci-th-msg:hover .ci-th-actions, .ci-th-actions:focus-within { opacity: 1; }
  .ci-th-act { width: 24px; height: 24px; border: none; background: none; border-radius: 6px; color: #9aa4aa; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
  .ci-th-act:hover { background: #f1f3f4; color: #141b1f; }
  .ci-th-meta { font-size: 10px; color: #9aa4aa; margin: 4px 4px 0; display: flex; gap: 6px; }
  .ci-th-retry { border: none; background: none; color: #d64545; font-size: 10px; font-weight: 700; cursor: pointer; padding: 0; font-family: inherit; }
  .ci-th-file { display: flex; align-items: center; gap: 10px; background: #e3f1fb; border-radius: 10px; padding: 10px 12px; min-width: 200px; margin-top: 4px; }
  .ci-th-file-info { flex: 1; min-width: 0; }
  .ci-th-file-name { font-size: 11.5px; font-weight: 700; color: #141b1f; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ci-th-file-size { font-size: 10px; color: #8a97a0; margin-top: 2px; }
  .ci-th-file-dl { width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid #1CA7D0; display: flex; align-items: center; justify-content: center; color: #1CA7D0; flex-shrink: 0; }
  .ci-th-img { max-width: 240px; width: 100%; border-radius: 10px; display: block; margin-top: 4px; }
  .ci-th-checkin { background: #f1f9fc; border: 1px solid #cfeaf6; color: #141b1f; border-radius: 12px; padding: 10px 12px; margin-top: 4px; font-size: 12px; min-width: 200px; }
  .ci-th-checkin-title { display: flex; align-items: center; gap: 6px; font-weight: 700; color: #0f6f8f; margin-bottom: 4px; }
  .ci-th-checkin-line { color: #4a565d; margin-top: 2px; }
  .ci-th-replybar { display: flex; align-items: center; gap: 10px; padding: 8px 20px; border-top: 1px solid #eef0f1; background: #f9fbfc; font-size: 11.5px; color: #4a565d; }
  .ci-th-replybar-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ci-th-composer { display: flex; align-items: center; gap: 10px; padding: 12px 20px 16px; border-top: 1px solid #eef0f1; background: #fff; flex-shrink: 0; }
  .ci-th-input { flex: 1; border: 1px solid #dfe3e6; border-radius: 999px; padding: 11px 18px; font-size: 13px; outline: none; font-family: inherit; color: #141b1f; }
  .ci-th-input:focus { border-color: #1CA7D0; box-shadow: 0 0 0 3px rgba(28,167,208,0.12); }
  .ci-th-attach { width: 36px; height: 36px; border: none; background: none; color: #6b7680; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; padding: 0; }
  .ci-th-attach:hover { background: #f1f3f4; color: #1CA7D0; }
  .ci-th-staged { display: flex; gap: 8px; padding: 10px 20px 0; border-top: 1px solid #eef0f1; flex-wrap: wrap; }
  .ci-th-staged-item { position: relative; width: 56px; height: 56px; }
  .ci-th-staged-item img { width: 100%; height: 100%; object-fit: cover; border-radius: 10px; display: block; }
  .ci-th-staged-item button { position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; border-radius: 50%; border: none; background: #141b1f; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
  .ci-th-send { width: 38px; height: 38px; border-radius: 50%; border: none; background: #1CA7D0; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
  .ci-th-send:disabled { background: #eceef0; color: #8a97a0; cursor: not-allowed; }
  @media (max-width: 640px) {
    .ci-th-scroll { padding: 16px 14px; }
    .ci-th-msg { max-width: 86%; }
    .ci-th-composer, .ci-th-replybar { padding-left: 14px; padding-right: 14px; }
    .ci-th-actions { opacity: 1; }
  }
`;

/**
 * Real-time-ish chat thread for any conversation (DM or project group chat).
 *
 * @param {Object} props
 * @param {string} props.conversationId
 * @param {string} props.organizationId
 * @param {object[]} props.participants - conversation participants (used to resolve "me" and sender names)
 * @param {boolean} [props.showSenderNames] - show who sent each message (group chat)
 * @param {() => void} [props.onRead] - called after the conversation is marked read
 */
export default function ChatThread({
  conversationId,
  organizationId,
  participants = [],
  showSenderNames = false,
  emptyText = "No messages yet. Say hello!",
  onRead,
}) {
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState([]); // optimistic outgoing messages
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [files, setFiles] = useState([]); // images staged for the next message
  const fileInputRef = useRef(null);

  const scrollRef = useRef(null);
  const stickRef = useRef(true);
  const prevHeightRef = useRef(null);
  const lastReadIdRef = useRef(null);

  const me = useMemo(() => findMe(participants), [participants]);
  const byParticipantId = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants]);
  const isMine = (m) =>
    !!me && (m.participantId === me.id || m.participant?.organizationUserId === me.organizationUserId);

  const fetchPage = (page) =>
    getConversationMessages({ conversationId, organizationId, page, limit: PAGE_SIZE, token: getAuthToken() });

  // Initial load (and reset whenever the conversation changes).
  useEffect(() => {
    if (!conversationId || !organizationId) return;
    let cancelled = false;
    setMessages([]);
    setPending([]);
    setNextPage(null);
    setError("");
    setLoading(true);
    lastReadIdRef.current = null;
    stickRef.current = true;
    fetchPage(1)
      .then((res) => {
        if (cancelled) return;
        setMessages(mergeMessages([], res.data || []));
        setNextPage(res.pageData?.nextPage ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load messages.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for new messages / edits (deletes, read receipts).
  useEffect(() => {
    if (!conversationId || !organizationId) return;
    const id = setInterval(async () => {
      if (document.hidden) return;
      try {
        const res = await fetchPage(1);
        setMessages((prev) => mergeMessages(prev, res.data || []));
      } catch {
        // transient — try again next tick
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [conversationId, organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark the conversation read when the latest message is from someone else.
  useEffect(() => {
    if (!me || !messages.length) return;
    const latest = messages[messages.length - 1];
    if (isMine(latest) || lastReadIdRef.current === latest.id) return;
    lastReadIdRef.current = latest.id;
    markConversationRead({ conversationId, organizationId, token: getAuthToken() })
      .then(() => onRead?.())
      .catch((err) => console.error("[ChatThread] markConversationRead failed:", err));
  }, [messages, me]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the viewport pinned to the bottom unless the user scrolled up; keep
  // position steady after prepending older messages.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (prevHeightRef.current != null) {
      el.scrollTop += el.scrollHeight - prevHeightRef.current;
      prevHeightRef.current = null;
    } else if (stickRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, pending, loading]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const loadEarlier = async () => {
    if (!nextPage || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetchPage(nextPage);
      prevHeightRef.current = scrollRef.current?.scrollHeight ?? null;
      setMessages((prev) => mergeMessages(prev, res.data || []));
      setNextPage(res.pageData?.nextPage ?? null);
    } catch (err) {
      setError(err.message || "Failed to load earlier messages.");
    } finally {
      setLoadingMore(false);
    }
  };

  const deliver = async (item) => {
    setPending((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: "sending", error: "" } : p)));
    try {
      // Upload images once; keep the result so a retry doesn't re-upload.
      let attachments = item.uploaded;
      if (!attachments) {
        attachments = await uploadFiles(item.files || [], getAuthToken());
        item.uploaded = attachments;
      }
      await sendConversationMessage({
        conversationId,
        organizationId,
        content: item.content,
        replyToMessageId: item.replyToMessageId,
        attachments,
        token: getAuthToken(),
      });
      const res = await fetchPage(1);
      stickRef.current = true;
      setMessages((prev) => mergeMessages(prev, res.data || []));
      setPending((prev) => prev.filter((p) => p.id !== item.id));
      (item.previews || []).forEach((u) => URL.revokeObjectURL(u));
    } catch (err) {
      setPending((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, status: "failed", error: err.message || "Failed to send." } : p))
      );
    }
  };

  const pickFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    const ok = [];
    for (const f of picked) {
      if (!f.type.startsWith("image/")) {
        setError("Only images can be attached.");
        continue;
      }
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        setError(`${f.name} is larger than ${MAX_FILE_MB} MB.`);
        continue;
      }
      ok.push({ file: f, preview: URL.createObjectURL(f) });
    }
    if (ok.length) {
      setError("");
      setFiles((prev) => [...prev, ...ok].slice(0, 6));
    }
  };

  const unstage = (i) =>
    setFiles((prev) => {
      URL.revokeObjectURL(prev[i]?.preview);
      return prev.filter((_, idx) => idx !== i);
    });

  const send = () => {
    const content = draft.trim();
    if (!content && !files.length) return;
    const item = {
      id: `tmp-${Date.now()}`,
      content,
      files: files.map((f) => f.file),
      previews: files.map((f) => f.preview),
      replyToMessageId: replyTo?.id,
      replyPreview: replyTo ? (replyTo.content || "") : "",
      createdAt: new Date().toISOString(),
      status: "sending",
    };
    stickRef.current = true;
    setPending((prev) => [...prev, item]);
    setDraft("");
    setFiles([]);
    setReplyTo(null);
    deliver(item);
  };

  const removeMessage = async (m) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      const res = await deleteConversationMessage({
        conversationId,
        messageId: m.id,
        organizationId,
        token: getAuthToken(),
      });
      const deletedAt = res?.data?.deletedAt || new Date().toISOString();
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, deletedAt } : x)));
    } catch (err) {
      setError(err.message || "Failed to delete message.");
    }
  };

  // "Seen" on the caller's most recent message.
  const lastMine = [...messages].reverse().find((m) => isMine(m) && !m.deletedAt);
  const seenCount = lastMine
    ? (lastMine.readBy || []).filter(
        (r) =>
          r.organizationUserId !== me?.organizationUserId &&
          (typeof r.readAtOffset !== "number" || typeof lastMine.offset !== "number" || r.readAtOffset >= lastMine.offset)
      ).length
    : 0;

  const senderOf = (m) => participantName(byParticipantId.get(m.participantId));

  const rendered = [];
  let prevDay = null;
  let prevSender = null;
  messages.forEach((m) => {
    const day = dayLabel(m.createdAt);
    if (day !== prevDay) {
      rendered.push(
        <div key={`day-${m.id}`} className="ci-th-day">
          {day}
        </div>
      );
      prevDay = day;
      prevSender = null;
    }
    const mine = isMine(m);
    const continued = prevSender === m.participantId;
    prevSender = m.participantId;
    const quote = m.replyToMessage
      ? m.replyToMessage.deletedAt
        ? "Deleted message"
        : m.replyToMessage.content
      : null;

    rendered.push(
      <div key={m.id} className={`ci-th-msg ${mine ? "me" : "them"} ${continued ? "cont" : ""}`}>
        {showSenderNames && !mine && !continued && <div className="ci-th-sender">{senderOf(m)}</div>}
        <div className="ci-th-row">
          <div>
            {m.deletedAt ? (
              <div className="ci-th-bubble deleted">This message was deleted</div>
            ) : (
              <>
                {m.content ? (
                  <div className="ci-th-bubble">
                    {quote && <div className="ci-th-quote">{quote}</div>}
                    {m.content}
                  </div>
                ) : null}
                {m.checkIn && (
                  <div className="ci-th-checkin">
                    <div className="ci-th-checkin-title">
                      <ClipboardCheck size={14} /> Check-in
                    </div>
                    {m.checkIn.blocker && <div className="ci-th-checkin-line">Blocker: {m.checkIn.blocker}</div>}
                    <div className="ci-th-checkin-line">
                      {(m.checkIn.focusTasks || []).length} focus · {(m.checkIn.inProgressTasks || []).length} in progress
                    </div>
                  </div>
                )}
                {(m.messageAttachments || []).map((a) =>
                  a.fileType?.startsWith("image/") ? (
                    <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
                      <img src={a.url} alt={a.fileName || ""} className="ci-th-img" />
                    </a>
                  ) : (
                    <div key={a.id} className="ci-th-file">
                      <FileText size={18} color="#1CA7D0" />
                      <div className="ci-th-file-info">
                        <div className="ci-th-file-name">{a.fileName}</div>
                        <div className="ci-th-file-size">{formatSize(a.fileSize)}</div>
                      </div>
                      <a className="ci-th-file-dl" href={a.url} target="_blank" rel="noreferrer" download={a.fileName} aria-label="Download file">
                        <Download size={12} />
                      </a>
                    </div>
                  )
                )}
              </>
            )}
          </div>
          {!m.deletedAt && (
            <div className="ci-th-actions">
              <button type="button" className="ci-th-act" aria-label="Reply" onClick={() => setReplyTo(m)}>
                <Reply size={14} />
              </button>
              {mine && (
                <button type="button" className="ci-th-act" aria-label="Delete message" onClick={() => removeMessage(m)}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="ci-th-meta">
          <span>{timeLabel(m.createdAt)}</span>
          {lastMine?.id === m.id && seenCount > 0 && <span>{showSenderNames ? `Seen by ${seenCount}` : "Seen"}</span>}
        </div>
      </div>
    );
  });

  return (
    <div className="ci-th">
      <style>{STYLES}</style>

      <div className="ci-th-scroll" ref={scrollRef} onScroll={onScroll}>
        {nextPage && (
          <button type="button" className="ci-th-more" onClick={loadEarlier} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load earlier messages"}
          </button>
        )}
        {loading && <div className="ci-th-state">Loading messages…</div>}
        {!loading && !messages.length && !pending.length && !error && <div className="ci-th-state">{emptyText}</div>}
        {error && <div className="ci-th-error">{error}</div>}

        {rendered}

        {pending.map((p) => (
          <div key={p.id} className="ci-th-msg me">
            <div className={`ci-th-bubble ${p.status === "failed" ? "failed" : "sending"}`}>
              {p.replyPreview && <div className="ci-th-quote">{p.replyPreview}</div>}
              {p.content}
              {(p.previews || []).map((u, i) => (
                <img key={i} src={u} alt="" className="ci-th-img" style={{ marginTop: p.content || i ? 6 : 0 }} />
              ))}
            </div>
            <div className="ci-th-meta">
              {p.status === "failed" ? (
                <>
                  <span style={{ color: "#d64545" }}>{p.error}</span>
                  <button type="button" className="ci-th-retry" onClick={() => deliver(p)}>
                    Retry
                  </button>
                  <button
                    type="button"
                    className="ci-th-retry"
                    onClick={() => setPending((prev) => prev.filter((x) => x.id !== p.id))}
                  >
                    Discard
                  </button>
                </>
              ) : (
                <span>Sending…</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {replyTo && (
        <div className="ci-th-replybar">
          <Reply size={14} />
          <div className="ci-th-replybar-text">
            Replying to {isMine(replyTo) ? "yourself" : senderOf(replyTo)}: {replyTo.content || "attachment"}
          </div>
          <button type="button" className="ci-th-act" aria-label="Cancel reply" onClick={() => setReplyTo(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div className="ci-th-staged">
          {files.map((f, i) => (
            <div key={f.preview} className="ci-th-staged-item">
              <img src={f.preview} alt="" />
              <button type="button" aria-label="Remove image" onClick={() => unstage(i)}>
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="ci-th-composer">
        <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={pickFiles} />
        <button type="button" className="ci-th-attach" aria-label="Attach image" onClick={() => fileInputRef.current?.click()}>
          <Paperclip size={18} />
        </button>
        <input
          className="ci-th-input"
          placeholder="Type a message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button type="button" className="ci-th-send" aria-label="Send" disabled={!draft.trim() && !files.length} onClick={send}>
          <Send size={17} />
        </button>
      </div>
    </div>
  );
}
