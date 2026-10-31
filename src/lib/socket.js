import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { getAuthToken, getActiveOrgId } from "./session";

// Socket.IO server URL. Defaults to the REST API origin; override with
// VITE_SOCKET_URL in .env if the socket server lives elsewhere.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || undefined;

let socket = null;
let socketKey = null; // `${token}|${organizationId}` — reconnect when either changes

/**
 * Returns the shared socket for this token + organization, creating it (or
 * replacing a stale one) when needed. Safe to call from many components.
 */
export function connectSocket({ token = getAuthToken(), organizationId = getActiveOrgId() } = {}) {
  if (!token || !organizationId) return null;
  const key = `${token}|${organizationId}`;
  if (socket && socketKey === key) return socket;

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  socketKey = key;
  socket = io(SOCKET_URL, { auth: { token, organizationId } });
  socket.on("connect_error", (err) => console.error("[socket] connect_error:", err.message));
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  socket = null;
  socketKey = null;
}

/**
 * socket.emit(event, payload, callback) as a promise. Resolves with the
 * callback's `data`; rejects with the server's `errorMessage` on
 * { status: "error" } or on timeout.
 */
export function emitWithAck(event, payload, { timeoutMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const s = socket;
    if (!s) return reject(new Error("Not connected to chat. Please refresh and try again."));
    s.timeout(timeoutMs).emit(event, payload, (err, res) => {
      if (err) return reject(new Error("The server took too long to respond. Please try again."));
      if (res?.status === "error") {
        const first = res.errors && Object.values(res.errors).flat()[0];
        return reject(new Error(res.errorMessage || first || "Request failed."));
      }
      resolve(res?.data);
    });
  });
}

/**
 * Subscribes to a socket event for the lifetime of the component.
 * `handler` always sees the latest closure (no stale state).
 * Also fires `onReconnect` after the socket (re)connects so callers can
 * refetch anything they missed while offline.
 */
export function useSocketEvents(organizationId, handlers = {}, onReconnect) {
  const handlersRef = useRefLatest(handlers);
  const reconnectRef = useRefLatest(onReconnect);

  useEffect(() => {
    const s = connectSocket({ organizationId });
    if (!s) return;
    const events = Object.keys(handlersRef.current);
    const bound = events.map((name) => {
      const fn = (...args) => handlersRef.current[name]?.(...args);
      s.on(name, fn);
      return [name, fn];
    });
    // If the socket is still connecting, its first "connect" is covered by the
    // caller's initial fetch; every later "connect" is a reconnect.
    let skip = !s.connected;
    const onConnect = () => {
      if (skip) {
        skip = false;
        return;
      }
      reconnectRef.current?.();
    };
    s.on("connect", onConnect);
    return () => {
      bound.forEach(([name, fn]) => s.off(name, fn));
      s.off("connect", onConnect);
    };
  }, [organizationId]); // eslint-disable-line react-hooks/exhaustive-deps
}

function useRefLatest(value) {
  const [ref] = useState(() => ({ current: value }));
  ref.current = value;
  return ref;
}

/** App-wide unread total + per-conversation counts from "chatUnreadCounts". */
export function useChatUnread(organizationId) {
  const [state, setState] = useState({ total: 0, byConversation: {} });
  useSocketEvents(organizationId, {
    chatUnreadCounts: (data) => {
      if (data?.organizationId && data.organizationId !== organizationId) return;
      const byConversation = {};
      (data?.conversations || []).forEach((c) => {
        byConversation[c.conversationId] = c;
      });
      setState({ total: data?.totalUnreadCount || 0, byConversation });
    },
  });
  return state;
}
