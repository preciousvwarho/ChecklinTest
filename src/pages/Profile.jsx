import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, UserCog, RefreshCcwDot, ShieldAlert, Moon, Bell, ChevronRight, ArrowLeft, LogOut, Camera, X } from "lucide-react";
import AppShell from "../components/AppShell";
import { getOrganizations, getCurrentUser, updateCurrentUser, uploadFiles } from "../lib/api";
import { getAuthToken, getSession, saveSession, clearSession, pickActiveOrgRow } from "../lib/session";

const PREFS_KEY = "checkin_prefs";

function loadPrefs() {
  try {
    return { dark: false, notifications: true, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") };
  } catch {
    return { dark: false, notifications: true };
  }
}

const STYLES = `
  @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap");

  /* Two panes: profile list (left) | divider | detail area (right, empty for now).
     Measurements are taken from the design and scaled to real size. */
  .ci-pf-page { display: flex; align-items: flex-start; min-height: 100vh; font-family: "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .ci-pf-pane { width: 728px; max-width: 100%; flex-shrink: 0; padding: 130px 68px 60px 0; margin-left: 56px; border-right: 1px solid #e9edef; align-self: stretch; }
  .ci-pf-detail { flex: 1; }
  .ci-pf { width: 660px; max-width: 100%; }
  .ci-pf-back { display: none; border: none; background: none; cursor: pointer; padding: 0; margin-bottom: 14px; color: #141b1f; }

  .ci-pf-cover { height: 133px; border-radius: 16px; background: #0b93d0; }
  .ci-pf-id { display: flex; flex-direction: column; align-items: center; text-align: center; }
  .ci-pf-avatar {
    width: 74px; height: 74px; border-radius: 50%; background: #d3eefc; border: 8px solid #fff; box-sizing: content-box;
    margin-top: -45px; display: flex; align-items: center; justify-content: center; overflow: hidden;
    font-size: 16px; font-weight: 500; color: #25303a; letter-spacing: 5px; text-indent: 5px;
  }
  .ci-pf-avatar-wrap { position: relative; cursor: pointer; margin-top: -45px; display: block; }
  .ci-pf-avatar-wrap .ci-pf-avatar { margin-top: 0; }
  .ci-pf-avatar-cam { position: absolute; right: 8px; bottom: 8px; width: 24px; height: 24px; border-radius: 50%; background: #1CA7D0; color: #fff; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; }
  .ci-pf-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .ci-pf-name { font-size: 18px; font-weight: 500; color: #1d252b; margin-top: 12px; line-height: 1.3; }
  .ci-pf-role { font-size: 12px; font-weight: 400; color: #cdd2d6; margin-top: 4px; }
  .ci-pf-edit {
    margin-top: 12px; height: 24px; padding: 0 14px; border: 1px solid #1CA7D0; background: #fff; color: #1CA7D0;
    border-radius: 999px; font-family: inherit; font-size: 9.5px; font-weight: 500; cursor: pointer;
  }

  .ci-pf-section { margin-top: 50px; }
  .ci-pf-section.first { margin-top: 40px; }
  .ci-pf-section-title { height: 45px; display: flex; align-items: center; background: #f4f9fe; color: #5b6870; font-size: 15px; font-weight: 500; padding: 0 42px; }
  .ci-pf-item {
    display: flex; align-items: center; width: 100%; height: 54px; border: none; background: none; cursor: pointer;
    padding: 0 12px 0 55px; font-family: inherit; text-align: left; color: #141b1f;
  }
  .ci-pf-item svg { flex-shrink: 0; color: #1d252b; }
  .ci-pf-item-label { flex: 1; font-size: 12px; font-weight: 400; margin-left: 18px; color: #1d252b; }
  .ci-pf-item:hover { background: #fafcfd; }

  .ci-pf-toggle { width: 27px; height: 14px; border-radius: 999px; background: #a8a8a8; position: relative; flex-shrink: 0; margin-right: 8px; transition: background 0.15s ease; }
  .ci-pf-toggle::after { content: ""; position: absolute; top: 2px; left: 2px; width: 10px; height: 10px; border-radius: 50%; background: #fff; transition: transform 0.15s ease; }
  .ci-pf-toggle.on { background: #86cdeb; }
  .ci-pf-toggle.on::after { transform: translateX(13px); }

  .ci-pf-logout { margin: 34px 0 0 55px; border: none; background: none; color: #d64545; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 10px; cursor: pointer; font-family: inherit; padding: 0; }

  .ci-pf-overlay { position: fixed; inset: 0; background: rgba(20,27,31,0.45); display: flex; align-items: center; justify-content: center; z-index: 90; padding: 16px; font-family: "Poppins", -apple-system, sans-serif; }
  .ci-pf-modal { background: #fff; border-radius: 18px; width: 100%; max-width: 380px; padding: 22px; display: flex; flex-direction: column; gap: 14px; }
  .ci-pf-modal-head { display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: 600; color: #141b1f; }
  .ci-pf-modal-head button { border: none; background: none; cursor: pointer; color: #6b7680; display: flex; padding: 4px; }
  .ci-pf-photo { align-self: center; position: relative; cursor: pointer; }
  .ci-pf-photo-circle { width: 84px; height: 84px; border-radius: 50%; background: #d3eefc; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 500; color: #25303a; overflow: hidden; }
  .ci-pf-photo-circle img { width: 100%; height: 100%; object-fit: cover; }
  .ci-pf-photo-cam { position: absolute; right: 0; bottom: 0; width: 26px; height: 26px; border-radius: 50%; background: #1CA7D0; color: #fff; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; }
  .ci-pf-field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #5b6870; }
  .ci-pf-field input { border: 1px solid #dfe3e6; border-radius: 10px; padding: 11px 14px; font-size: 13px; font-family: inherit; color: #141b1f; outline: none; }
  .ci-pf-field input:focus { border-color: #1CA7D0; box-shadow: 0 0 0 3px rgba(28,167,208,0.12); }
  .ci-pf-error { font-size: 12px; color: #d64545; }
  .ci-pf-save { border: none; background: #1CA7D0; color: #fff; font-family: inherit; font-size: 13px; font-weight: 600; border-radius: 999px; padding: 12px; cursor: pointer; }
  .ci-pf-save:disabled { opacity: 0.6; cursor: default; }

  @media (max-width: 1100px) { .ci-pf-pane { margin-left: 24px; padding-right: 32px; width: 600px; } }
  @media (max-width: 860px) {
    .ci-pf-page { display: block; min-height: 0; }
    .ci-pf-pane { width: auto; margin: 0; border-right: none; padding: 24px 20px 48px; }
    .ci-pf-detail { display: none; }
    .ci-pf-back { display: block; }
    .ci-pf-cover { height: 110px; }
    .ci-pf-section-title { padding: 0 20px; }
    .ci-pf-item { padding-left: 24px; }
    .ci-pf-logout { margin-left: 24px; }
  }
`;

function EditProfileModal({ user, onClose, onSaved }) {
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(user.avatarUrl || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Please choose an image.");
    if (f.size > 5 * 1024 * 1024) return setError("Image must be under 5 MB.");
    setError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!firstName.trim()) return setError("First name is required.");
    setSaving(true);
    setError("");
    try {
      const token = getAuthToken();
      let avatarKey;
      if (file) {
        const [uploaded] = await uploadFiles([file], token);
        avatarKey = uploaded.key;
      }
      const res = await updateCurrentUser({ firstName: firstName.trim(), lastName: lastName.trim(), avatarKey, token });
      onSaved(res.data);
    } catch (err) {
      setError(err.message || "Failed to update profile.");
      setSaving(false);
    }
  };

  const initials = [firstName, lastName].filter(Boolean).map((w) => w[0].toUpperCase()).join(" ");

  return (
    <div className="ci-pf-overlay" onClick={saving ? undefined : onClose}>
      <div className="ci-pf-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ci-pf-modal-head">
          <span>Edit profile</span>
          <button type="button" aria-label="Close" onClick={onClose} disabled={saving}>
            <X size={18} />
          </button>
        </div>
        <label className="ci-pf-photo">
          <input type="file" accept="image/*" hidden onChange={pick} />
          <span className="ci-pf-photo-circle">{preview ? <img src={preview} alt="" /> : initials || "?"}</span>
          <span className="ci-pf-photo-cam"><Camera size={13} /></span>
        </label>
        <label className="ci-pf-field">
          First name
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </label>
        <label className="ci-pf-field">
          Last name
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </label>
        {error && <div className="ci-pf-error">{error}</div>}
        <button type="button" className="ci-pf-save" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getSession()?.user || {});
  const [editing, setEditing] = useState(false);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [roleName, setRoleName] = useState("");

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name || user.email || "Account";
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join(" ");

  // GET /v1/auth/user — fresh name + signed avatar URL.
  useEffect(() => {
    getCurrentUser({ token: getAuthToken() })
      .then((res) => res.data && applyUser(res.data))
      .catch((err) => console.error("[Profile] getCurrentUser failed:", err));
  }, []);

  // Keep the saved session in sync so the sidebar shows the new name too.
  const applyUser = (fresh) => {
    setUser((prev) => ({ ...prev, ...fresh }));
    const session = getSession();
    if (session) saveSession({ ...session, user: { ...session.user, ...fresh } });
    window.dispatchEvent(new Event("checkin:user-updated"));
  };

  // Tap the avatar to change the photo straight away (upload -> PATCH avatarKey).
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [avatarBroken, setAvatarBroken] = useState(false);
  const changePhoto = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return setPhotoError("Please choose an image.");
    if (f.size > 5 * 1024 * 1024) return setPhotoError("Image must be under 5 MB.");
    setPhotoBusy(true);
    setPhotoError("");
    try {
      const token = getAuthToken();
      const [uploaded] = await uploadFiles([f], token);
      const res = await updateCurrentUser({ avatarKey: uploaded.key, token });
      setAvatarBroken(false);
      applyUser(res.data);
    } catch (err) {
      setPhotoError(err.message || "Failed to update photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  // Role label comes from the active organisation membership (shape is
  // unconfirmed, so this is defensive).
  useEffect(() => {
    getOrganizations({ token: getAuthToken() })
      .then((res) => {
        const row = pickActiveOrgRow(res.data || []);
        const r = row?.orgRole?.name || row?.role?.name || (typeof row?.role === "string" ? row.role : "") || user.globalRole?.name || "";
        if (r) setRoleName(r);
      })
      .catch(() => {});
  }, []);

  const toggle = (key) =>
    setPrefs((p) => {
      const next = { ...p, [key]: !p[key] };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

  const logout = () => {
    clearSession();
    navigate("/");
  };

  const adminItems = [
    { icon: Building2, label: "Organisation" },
    { icon: UserCog, label: "Organisation Members" },
    { icon: UserCog, label: "Invitations" },
    { icon: RefreshCcwDot, label: "Subscription Plan" },
  ];

  const isAdmin = !roleName || /admin/i.test(roleName);

  return (
    <AppShell>
      <style>{STYLES}</style>
      <div className="ci-pf-page">
      <div className="ci-pf-pane">
      <div className="ci-pf">
        <button type="button" className="ci-pf-back" aria-label="Back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>

        <div className="ci-pf-cover" />
        <div className="ci-pf-id">
          <label className="ci-pf-avatar-wrap" title="Change photo">
            <input type="file" accept="image/*" hidden onChange={changePhoto} disabled={photoBusy} />
            <div className="ci-pf-avatar">
              {user.avatarUrl && !avatarBroken ? <img src={user.avatarUrl} alt="" onError={() => setAvatarBroken(true)} /> : initials}
            </div>
            <span className="ci-pf-avatar-cam">{photoBusy ? "…" : <Camera size={13} />}</span>
          </label>
          {photoError && <div className="ci-pf-error" style={{ marginTop: 6 }}>{photoError}</div>}
          <div className="ci-pf-name">{fullName}</div>
          <div className="ci-pf-role">{roleName || "Administrator"}</div>
          <button type="button" className="ci-pf-edit" onClick={() => setEditing(true)}>Edit Profile</button>
        </div>

        {isAdmin && (
          <div className="ci-pf-section first">
            <div className="ci-pf-section-title">Administrator</div>
            {adminItems.map(({ icon: Icon, label }) => (
              <button key={label} type="button" className="ci-pf-item">
                <Icon size={20} strokeWidth={2} />
                <span className="ci-pf-item-label">{label}</span>
                <ChevronRight size={18} strokeWidth={2.4} />
              </button>
            ))}
          </div>
        )}

        <div className="ci-pf-section">
          <div className="ci-pf-section-title">Preferences</div>
          <button type="button" className="ci-pf-item">
            <ShieldAlert size={20} strokeWidth={2} />
            <span className="ci-pf-item-label">Privacy Policy</span>
            <ChevronRight size={18} strokeWidth={2.4} />
          </button>
          <button type="button" className="ci-pf-item" onClick={() => toggle("dark")} role="switch" aria-checked={prefs.dark}>
            <Moon size={20} strokeWidth={2} />
            <span className="ci-pf-item-label">Dark theme</span>
            <span className={`ci-pf-toggle ${prefs.dark ? "on" : ""}`} />
          </button>
          <button type="button" className="ci-pf-item" onClick={() => toggle("notifications")} role="switch" aria-checked={prefs.notifications}>
            <Bell size={20} strokeWidth={2} />
            <span className="ci-pf-item-label">Notification</span>
            <span className={`ci-pf-toggle ${prefs.notifications ? "on" : ""}`} />
          </button>
        </div>

        <button type="button" className="ci-pf-logout" onClick={logout}>
          <LogOut size={16} /> Log out
        </button>
      </div>
      </div>
      <div className="ci-pf-detail" />
      </div>
      {editing && (
        <EditProfileModal
          user={user}
          onClose={() => setEditing(false)}
          onSaved={(fresh) => {
            applyUser(fresh);
            setEditing(false);
          }}
        />
      )}
    </AppShell>
  );
}
