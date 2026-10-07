import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2 } from "lucide-react";
import { getInvitations, getInvitation, acceptInvitation, rejectInvitation, getOrganizations } from "../lib/api";
import { getAuthToken, getSession, setActiveOrgId } from "../lib/session";
import { personName } from "../lib/people";

/** Invitations that haven't been accepted/rejected and belong to this email. */
export function pendingInvitesFor(rows = [], email) {
  const mine = (email || "").trim().toLowerCase();
  return rows.filter(
    (r) => !r.acceptedAt && !r.rejectedAt && (!mine || !r.email || r.email.trim().toLowerCase() === mine)
  );
}

const STYLES = `
  .ci-inv { min-height: 100vh; background: #f6f8f9; display: flex; align-items: center; justify-content: center; padding: 24px 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .ci-inv-card { width: 100%; max-width: 440px; display: flex; flex-direction: column; gap: 14px; }
  .ci-inv-title { font-size: 22px; font-weight: 800; color: #141b1f; margin: 0; }
  .ci-inv-sub { font-size: 13px; color: #6b7680; margin: -6px 0 6px; }
  .ci-inv-item { background: #fff; border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 1px 2px rgba(20,27,31,0.04); }
  .ci-inv-org { display: flex; align-items: center; gap: 12px; }
  .ci-inv-logo { width: 44px; height: 44px; border-radius: 12px; background: #e3f4fb; color: #1CA7D0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ci-inv-name { font-size: 15px; font-weight: 700; color: #141b1f; }
  .ci-inv-meta { font-size: 12px; color: #8a97a0; margin-top: 2px; }
  .ci-inv-actions { display: flex; gap: 10px; }
  .ci-inv-btn { flex: 1; border-radius: 999px; padding: 11px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
  .ci-inv-btn.accept { border: none; background: #1CA7D0; color: #fff; }
  .ci-inv-btn.decline { border: 1px solid #dfe3e6; background: #fff; color: #4a565d; }
  .ci-inv-btn:disabled { opacity: 0.6; cursor: default; }
  .ci-inv-error { font-size: 12.5px; color: #d64545; }
  .ci-inv-state { text-align: center; font-size: 13.5px; color: #6b7680; padding: 24px 0; }
  .ci-inv-link { align-self: center; border: none; background: none; color: #1CA7D0; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
`;

export default function Invite() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // The invitation email link looks like /invite?invId=<id>. If the person had
  // to sign in first, the id was stashed in sessionStorage so it survives that.
  const linkedId =
    params.get("invId") ||
    params.get("id") ||
    params.get("invitationId") ||
    sessionStorage.getItem("checkin_pending_invite");

  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const token = getAuthToken();
    // Opened from an email while signed out: sign in first. After sign-in the
    // app checks for pending invitations and brings them back here.
    if (!token) {
      if (linkedId) sessionStorage.setItem("checkin_pending_invite", linkedId);
      navigate("/", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const email = getSession()?.user?.email;
        const res = await getInvitations({ token });
        let list = pendingInvitesFor(res.data || [], email);
        // Link carried a specific invitation that the list didn't include.
        if (linkedId && !list.some((i) => i.id === linkedId)) {
          try {
            const one = await getInvitation({ invitationId: linkedId, token });
            list = [...pendingInvitesFor([one.data], email), ...list];
          } catch {
            // ignore — fall back to whatever the list returned
          }
        }
        if (!cancelled) setInvites(list);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load invitations.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linkedId, navigate]);

  const goOn = async () => {
    try {
      const orgs = await getOrganizations({ token: getAuthToken() });
      navigate((orgs.data || []).length ? "/home" : "/onboarding", { replace: true });
    } catch {
      navigate("/home", { replace: true });
    }
  };

  const accept = async (inv) => {
    setBusyId(inv.id);
    setError("");
    try {
      await acceptInvitation({ id: inv.id, token: getAuthToken() });
      sessionStorage.removeItem("checkin_pending_invite");
      setActiveOrgId(inv.organizationId || inv.organization?.id);
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to accept the invitation.");
      setBusyId(null);
    }
  };

  const decline = async (inv) => {
    setBusyId(inv.id);
    setError("");
    try {
      await rejectInvitation({ id: inv.id, token: getAuthToken() });
      sessionStorage.removeItem("checkin_pending_invite");
      const rest = invites.filter((i) => i.id !== inv.id);
      setInvites(rest);
      setBusyId(null);
      if (!rest.length) goOn();
    } catch (err) {
      setError(err.message || "Failed to decline the invitation.");
      setBusyId(null);
    }
  };

  return (
    <div className="ci-inv">
      <style>{STYLES}</style>
      <div className="ci-inv-card">
        <h1 className="ci-inv-title">You've been invited</h1>
        <p className="ci-inv-sub">Join an organisation to start collaborating.</p>

        {loading && <div className="ci-inv-state">Loading invitations…</div>}
        {error && <div className="ci-inv-error">{error}</div>}
        {!loading && !error && invites.length === 0 && (
          <div className="ci-inv-state">
            No pending invitations.
            <div style={{ marginTop: 10 }}>
              <button type="button" className="ci-inv-link" onClick={goOn}>Continue</button>
            </div>
          </div>
        )}

        {invites.map((inv) => {
          const org = inv.organization || {};
          const owner = (org.usersPreview || org.organizationUsers || [])[0];
          const count = org.usersCount ?? org._count?.organizationUsers;
          return (
            <div key={inv.id} className="ci-inv-item">
              <div className="ci-inv-org">
                <span className="ci-inv-logo"><Building2 size={22} /></span>
                <div>
                  <div className="ci-inv-name">{org.name || "Organisation"}</div>
                  <div className="ci-inv-meta">
                    {typeof count === "number" ? `${count} member${count === 1 ? "" : "s"}` : ""}
                    {owner ? `${typeof count === "number" ? " · " : ""}${personName(owner, "")}` : ""}
                  </div>
                </div>
              </div>
              <div className="ci-inv-actions">
                <button type="button" className="ci-inv-btn decline" disabled={busyId === inv.id} onClick={() => decline(inv)}>
                  Decline
                </button>
                <button type="button" className="ci-inv-btn accept" disabled={busyId === inv.id} onClick={() => accept(inv)}>
                  {busyId === inv.id ? "Please wait…" : "Accept"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}