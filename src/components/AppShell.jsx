import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, MoreVertical, Home, MessageCircle, Activity, Pencil, Plus, Menu } from "lucide-react";
import { getOrganizations, getCurrentUser } from "../lib/api";
import { getAuthToken, getSession, saveSession, getActiveOrgId, setActiveOrgId } from "../lib/session";

export const CloudPinLogo = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 40a11 11 0 01-1-21.9A15 15 0 0146.5 22 10 10 0 0146 42H18z" fill="#1CA7D0" />
    <path d="M32 20c-5 0-9 4-9 9 0 6.8 9 15 9 15s9-8.2 9-15c0-5-4-9-9-9z" fill="#ffffff" stroke="#1CA7D0" strokeWidth="2.5" />
    <circle cx="32" cy="29" r="3.2" fill="#1CA7D0" />
  </svg>
);

// Maps GET /v1/organization rows into what the sidebar renders. Each row
// is a membership record — the org itself may be nested under
// `organization`, or the row may just be the org directly, so this is
// deliberately defensive (mirrors useResolvedOrganizationId in App.jsx,
// which reads the same endpoint).
function toOrgRow(o) {
  return {
    id: o.organizationId || o.organization?.id || o.id,
    name: o.organization?.name || o.name || "Unnamed Organisation",
    subtitle: o.role?.name || o.role || o.organization?.plan || "Member",
  };
}

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "dms", label: "DMs", icon: MessageCircle },
  { id: "activity", label: "Activity", icon: Activity },
];

/**
 * AppShell — shared layout for every signed-in screen.
 *
 * Renders the fixed sidebar (org switcher, nav, profile), the mobile
 * top bar (logo + hamburger), and the scrollable <main> that wraps
 * `children`. The sidebar stays fixed in position; only the content
 * inside <main> scrolls.
 *
 * By default, the Home/DMs/Activity nav items navigate to their real
 * routes (/home, /dms, /activities) and highlight based on the current
 * URL — no props needed. Pass activeNavId/onNavChange only if a page
 * wants to override that (e.g. a page that also needs to run its own
 * logic, like navigating back up a stack, when "Home" is clicked).
 *
 * Props:
 *  - activeNavId: optional override for which nav item is highlighted
 *  - onNavChange: optional override callback(id) fired when a nav item is clicked
 *  - children: page content rendered inside the scrollable <main>
 *  - modal: optional full-page overlay (e.g. a create-project modal)
 *           rendered outside <main> so it always covers the whole viewport
 */
const NAV_ROUTES = { home: "/home", dms: "/dms", activity: "/activities" };

export default function AppShell({ activeNavId, onNavChange, children, modal }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  // Loads the user's real organizations for the sidebar switcher. Runs on
  // every mount, so navigating back here from the onboarding flow (after
  // creating a new org) picks it up automatically — AppShell unmounts
  // while /onboarding is active and remounts once we land back on /home.
  useEffect(() => {
    const token = getAuthToken();
    getOrganizations({ token })
      .then((res) => setOrganizations((res.data || []).map(toOrgRow)))
      .catch((err) => console.error("[AppShell] getOrganizations failed:", err));
  }, []);

  // The selected org (set on switch, and right after creating a new one)
  // is shown as active; everything else lists under "Other Organisations".
  const storedActiveId = getActiveOrgId();
  const activeOrg = organizations.find((o) => o.id === storedActiveId) || organizations[0];
  const otherOrgs = organizations.filter((o) => o !== activeOrg);

  const switchOrg = (id) => {
    setActiveOrgId(id);
    setSidebarOpen(false);
    // New location.key remounts Home, which reloads projects for this org.
    navigate("/home", { state: { switchedAt: Date.now() } });
  };

  const [user, setUser] = useState(() => getSession()?.user || {});
  const [avatarBroken, setAvatarBroken] = useState(false);

  // Avatar URLs are signed and expire, so refresh the user once per mount and
  // whenever the profile page saves a change.
  useEffect(() => {
    const refresh = () =>
      getCurrentUser({ token: getAuthToken() })
        .then((res) => {
          if (!res.data) return;
          const session = getSession();
          if (session) saveSession({ ...session, user: { ...session.user, ...res.data } });
          setUser((prev) => ({ ...prev, ...res.data }));
          setAvatarBroken(false);
        })
        .catch(() => {});
    if (getAuthToken()) refresh();
    window.addEventListener("checkin:user-updated", refresh);
    return () => window.removeEventListener("checkin:user-updated", refresh);
  }, []);

  const initials = [user.firstName, user.lastName].filter(Boolean).map((w) => w[0].toUpperCase()).join("") || (user.email || "?")[0].toUpperCase();
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name || user.email || "Account";

  const inferredActiveId = location.pathname.startsWith("/activities")
    ? "activity"
    : location.pathname.startsWith("/dms")
    ? "dms"
    : "home";

  const resolvedActiveId = activeNavId ?? inferredActiveId;
  const handleNavChange = onNavChange ?? ((id) => navigate(NAV_ROUTES[id] || "/home"));

  return (
    <div className="ci-shell-page">
      <style>{`
        * { box-sizing: border-box; }
        .ci-shell-page {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          width: 100%;
          background: #f6f7f8;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .ci-overlay { position: fixed; inset: 0; background: rgba(10,16,20,0.4); z-index: 30; }

        /* ---------- sidebar ---------- */
        .ci-sidebar {
          width: 280px; height: 100vh; background: #ffffff; display: flex; flex-direction: column;
          flex-shrink: 0; position: fixed; top: 0; left: 0; z-index: 40;
        }
        .ci-sidebar-scroll {
          flex: 1; padding: 20px 18px 0; overflow-y: auto; background: #1CA7D0; border-bottom-right-radius: 20px;
        }
        .ci-org-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .ci-org-header-title { color: #fff; font-size: 15px; font-weight: 700; }
        .ci-icon-btn-light {
          display: flex; align-items: center; justify-content: center; width: 26px; height: 26px;
          border-radius: 7px; border: none; background: rgba(255,255,255,0.15); cursor: pointer;
        }
        .ci-org-row { border-radius: 10px; padding: 10px 12px; margin-bottom: 6px; transition: background 0.15s ease; cursor: pointer; }
        .ci-org-row:hover { background: rgba(255,255,255,0.12); }
        .ci-active-org-row { border-radius: 10px; padding: 10px 12px; background: rgba(255,255,255,0.18); margin-bottom: 18px; }
        .ci-active-org-name { color: #fff; font-size: 13.5px; font-weight: 700; }
        .ci-active-org-subtitle { color: rgba(255,255,255,0.75); font-size: 11.5px; margin-top: 2px; }
        .ci-other-orgs-label {
          color: rgba(255,255,255,0.65); font-size: 11px; font-weight: 600;
          letter-spacing: 0.4px; text-transform: uppercase; margin-bottom: 8px;
        }
        .ci-org-row-inner { display: flex; align-items: center; justify-content: space-between; }
        .ci-org-name { color: #fff; font-size: 13px; font-weight: 600; }
        .ci-org-subtitle { color: rgba(255,255,255,0.7); font-size: 11px; margin-top: 2px; }

        .ci-sidebar-panel { background: #ffffff; padding: 18px 16px 20px; flex-shrink: 0; }
        .ci-nav-list { display: flex; flex-direction: column; gap: 2px; margin-bottom: 14px; }
        .ci-nav-item {
          display: flex; align-items: center; gap: 10px; padding: 9px 12px;
          border-radius: 9px; font-size: 13.5px; font-weight: 600; color: #5b6870;
          transition: background 0.15s ease; cursor: pointer;
        }
        .ci-nav-item:hover { background: #f0f2f3; }
        .ci-nav-item.active { background: #eaf6fa; color: #1CA7D0; }
        .ci-profile-row {
          display: flex; align-items: center; gap: 10px; padding: 16px 12px 10px;
          border-top: 1px solid #eef0f1; margin-top: 6px;
        }
        .ci-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .ci-profile-info { min-width: 0; }
        .ci-profile-name { display: flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 700; color: #141b1f; }
        .ci-profile-email { font-size: 11px; color: #8a97a0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ci-create-org {
          display: flex; align-items: center; gap: 6px; background: none; border: none;
          color: #1CA7D0; font-size: 12.5px; font-weight: 700; padding: 10px 12px 0; cursor: pointer;
        }
        .ci-create-org:hover { text-decoration: underline; }

        /* ---------- mobile top bar ---------- */
        .ci-mobile-topbar {
          display: none; align-items: center; justify-content: space-between; position: sticky; top: 0;
          width: 100%; background: #fff; border-bottom: 1px solid #eef0f1; padding: 12px 16px; z-index: 20;
        }
        .ci-mobile-brand { display: flex; align-items: center; gap: 6px; }
        .ci-mobile-brand-text { font-size: 15px; font-weight: 700; color: #141b1f; }
        .ci-mobile-brand-accent { color: #1CA7D0; }
        .ci-menu-btn {
          display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;
          border-radius: 8px; border: 1px solid #eef0f1; background: #fff; cursor: pointer; flex-shrink: 0;
        }
        .ci-menu-btn:hover { background: #f0f2f3; }

        /* ---------- scrollable main ---------- */
        .ci-main { flex: 1; margin-left: 300px; min-height: 100vh; max-height: 100vh; overflow-y: auto; position: relative; }

        /* ================= RESPONSIVE ================= */
        @media (max-width: 860px) {
          .ci-sidebar { transform: translateX(-100%); transition: transform 0.25s ease; }
          .ci-sidebar.open { transform: translateX(0); }
          .ci-main { margin-left: 0; }
          .ci-mobile-topbar { display: flex; }
        }
        @media (min-width: 861px) { .ci-overlay { display: none; } }
      `}</style>

      {sidebarOpen && <div className="ci-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`ci-sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="ci-sidebar-scroll">
          <div className="ci-org-header">
            <span className="ci-org-header-title">Organisations</span>
            <button className="ci-icon-btn-light" type="button" aria-label="Close" onClick={() => setSidebarOpen(false)}>
              <X size={16} color="#ffffff" />
            </button>
          </div>

          <div className="ci-active-org-row">
            <div className="ci-active-org-name">{activeOrg?.name || "No organisation yet"}</div>
            <div className="ci-active-org-subtitle">{activeOrg?.subtitle || ""}</div>
          </div>

          {otherOrgs.length > 0 && (
            <>
              <div className="ci-other-orgs-label">Other Organisations</div>
              {otherOrgs.map((org) => (
                <div key={org.id} className="ci-org-row" onClick={() => switchOrg(org.id)} role="button" tabIndex={0}>
                  <div className="ci-org-row-inner">
                    <div>
                      <div className="ci-org-name">{org.name}</div>
                      <div className="ci-org-subtitle">{org.subtitle}</div>
                    </div>
                    <MoreVertical size={16} color="rgba(255,255,255,0.7)" />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="ci-sidebar-panel">
          <nav className="ci-nav-list">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = resolvedActiveId === item.id;
              return (
                <div
                  key={item.id}
                  className={`ci-nav-item${isActive ? " active" : ""}`}
                  onClick={() => handleNavChange(item.id)}
                  role="button"
                  tabIndex={0}
                >
                  <Icon size={17} color={isActive ? "#1CA7D0" : "#5b6870"} />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </nav>

          <div className="ci-profile-row" role="button" tabIndex={0} style={{ cursor: "pointer" }} onClick={() => navigate("/profile")} onKeyDown={(e) => e.key === "Enter" && navigate("/profile")}>
            {user.avatarUrl && !avatarBroken ? (
              <img src={user.avatarUrl} alt="" className="ci-avatar" onError={() => setAvatarBroken(true)} />
            ) : (
              <span className="ci-avatar" style={{ background: "#cfeaf6", color: "#25303a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                {initials}
              </span>
            )}
            <div className="ci-profile-info">
              <div className="ci-profile-name">
                {displayName} <Pencil size={11} color="#8a97a0" />
              </div>
              <div className="ci-profile-email">{user.email || ""}</div>
            </div>
          </div>

          <button className="ci-create-org" type="button" onClick={() => navigate("/onboarding")}>
            <Plus size={14} />
            <span>Create Organisation</span>
          </button>
        </div>
      </aside>

      <div className="ci-mobile-topbar">
        <div className="ci-mobile-brand">
          <CloudPinLogo size={26} />
          <span className="ci-mobile-brand-text">
            Check<span className="ci-mobile-brand-accent">In</span>
          </span>
        </div>
        <button className="ci-menu-btn" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
          <Menu size={20} color="#141b1f" />
        </button>
      </div>

      <main className="ci-main">{children}</main>

      {modal}
    </div>
  );
}
