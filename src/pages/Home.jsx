import React, { useEffect, useState } from "react";
import { X, Plus, Search, Calendar } from "lucide-react";
import AppShell from "../components/AppShell";
import { getOrganizations, getProjects, createProject as apiCreateProject } from "../lib/api";
import { getAuthToken, pickActiveOrgRow } from "../lib/session";

function ProgressTrack({ done, total }) {
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className="ci-progress-block">
      <div className="ci-progress-header">
        <span className="ci-progress-label">Progress Bar</span>
        <span className="ci-progress-fraction">
          {done}/{total}
        </span>
      </div>
      <div className="ci-progress-track">
        <div className="ci-progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

// Overlapping avatar-stack with a trailing "+N" badge for extra members,
// e.g. two faint filler circles then a solid "+8" circle.
function MemberStack({ extraCount }) {
  return (
    <div className="ci-member-stack">
      <span className="ci-member-avatar ci-member-avatar-1" />
      <span className="ci-member-avatar ci-member-avatar-2" />
      <span className="ci-member-avatar ci-member-count">+{extraCount}</span>
    </div>
  );
}

// Today's date as "YYYY-MM-DD", in the user's local timezone (not UTC —
// toISOString() alone would roll over to tomorrow for anyone west of GMT
// in the evening).
function todayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CheckInHome({ onOpenProject }) {
  const [organizationId, setOrganizationId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [checkinDate, setCheckinDate] = useState(todayDateString());
  const [creating, setCreating] = useState(false);
  const canCreate = projectName.trim().length > 0;

  // Maps a project as returned by the API into the shape this screen's
  // cards render (name + done/total task counts for the progress bar).
  const toCardProject = (p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    checkinDate: p.checkInTime,
    done: p.completedTasks ?? 0,
    total: p.totalTasks ?? 0,
    // UI-only placeholder for the "+N" member-stack badge shown on the
    // card. The API doesn't return team/member data yet, so this falls
    // back to a fixed number until there's a real field to read.
    extraMembers: p.extraMembers ?? p.memberCount ?? 8,
  });

  // On mount: find the user's organization, then load its projects.
  // GET /v1/organization -> [{ organizationId, organization: { id, name }, ... }]
  // GET /v1/projects?organizationId=... -> [{ id, name, completedTasks, totalTasks, ... }]
  useEffect(() => {
    const token = getAuthToken();

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const orgResult = await getOrganizations({ token });
        console.log("[Home] getOrganizations response:", orgResult);

        const row = pickActiveOrgRow(orgResult.data || []);
        const orgId = row?.organizationId || row?.organization?.id;
        if (!orgId) {
          setProjects([]);
          return;
        }
        setOrganizationId(orgId);

        const projectsResult = await getProjects({ organizationId: orgId, page: 1, limit: 50, token });
        console.log("[Home] getProjects response:", projectsResult);

        setProjects((projectsResult.data || []).map((p) => ({ ...toCardProject(p), organizationId: orgId })));
      } catch (err) {
        console.error("[Home] failed to load projects:", err);
        setError(err.message || "Could not load projects.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const openCreate = () => {
    setProjectName("");
    setDescription("");
    setCheckinDate(todayDateString());
    setIsCreateOpen(true);
  };

  // POST /v1/projects?organizationId=... — { name, description, checkInTime }
  const createProject = async () => {
    if (!canCreate || creating || !organizationId) return;
    setCreating(true);
    setError("");
    try {
      const token = getAuthToken();
      // Combine the picked date with the current real time-of-day, rather
      // than always sending midnight for whatever date is selected.
      const now = new Date();
      const [year, month, day] = checkinDate.split("-").map(Number);
      const checkInTime = new Date(
        year,
        month - 1,
        day,
        now.getHours(),
        now.getMinutes(),
        now.getSeconds()
      ).toISOString();

      const result = await apiCreateProject({
        organizationId,
        name: projectName.trim(),
        description: description.trim(),
        checkInTime,
        token,
      });
      console.log("[Home] createProject response:", result);

      setProjects((prev) => [...prev, toCardProject(result.data)]);
      setIsCreateOpen(false);
    } catch (err) {
      console.error("[Home] failed to create project:", err);
      setError(err.message || "Could not create project.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell>
      <style>{`
        .ci-content-inner { padding: 40px 48px 60px; width: 100%; margin: 0 auto; }
        .ci-page-title { font-size: 26px; font-weight: 800; color: #141b1f; margin: 0 0 20px; line-height: 1.3; }

        .ci-search {
          display: flex; align-items: center; gap: 12px; border: 1px solid #e6e9eb;
          border-radius: 999px; padding: 12px 18px; background: #fff; width: 100%; margin-bottom: 32px;
        }
        .ci-search:focus-within { border-color: #1CA7D0; box-shadow: 0 0 0 3px rgba(28,167,208,0.12); }
        .ci-search-icon-wrap {
          display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;
          border-radius: 50%; border: 1px solid #dfe3e6; flex-shrink: 0;
        }
        .ci-search-input { flex: 1; border: none; outline: none; font-size: 13.5px; color: #141b1f; background: transparent; }
        .ci-search-input::placeholder { color: #b3bcc2; }

        .ci-projects-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px; }
        .ci-project-card {
          border: 1px solid #ecefef; border-radius: 18px; padding: 26px 26px 28px; background: #fff;
          transition: box-shadow 0.15s ease, border-color 0.15s ease;
        }
        .ci-project-card:hover { box-shadow: 0 4px 14px rgba(16,24,32,0.08); border-color: #dfe3e6; }
        .ci-project-name { font-size: 22px; font-weight: 700; color: #141b1f; margin-bottom: 28px; }

        .ci-progress-block { margin-bottom: 22px; }
        .ci-progress-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .ci-progress-label { font-size: 13px; color: #8a97a0; }
        .ci-progress-fraction { font-size: 13px; color: #8a97a0; font-weight: 600; }
        .ci-progress-track { position: relative; width: 100%; height: 6px; border-radius: 999px; background: #e6e9eb; overflow: hidden; }
        .ci-progress-fill { height: 100%; border-radius: 999px; background: #1CA7D0; }

        .ci-member-stack { display: flex; align-items: center; }
        .ci-member-avatar {
          width: 34px; height: 34px; border-radius: 50%; border: 2px solid #fff;
          display: flex; align-items: center; justify-content: center;
        }
        .ci-member-avatar-1 { background: #d6eef6; margin-left: 0; }
        .ci-member-avatar-2 { background: #8fd3e8; margin-left: -12px; }
        .ci-member-count {
          background: #3ab6dd; color: #fff; font-size: 11.5px; font-weight: 700;
          margin-left: -12px; position: relative; z-index: 1;
        }

        .ci-fab {
          position: fixed; right: 32px; bottom: 32px; width: 52px; height: 52px; border-radius: 50%;
          background: #1CA7D0; border: none; display: flex; align-items: center; justify-content: center;
          cursor: pointer; box-shadow: 0 6px 16px rgba(28,167,208,0.35); z-index: 15;
          transition: background 0.15s ease, transform 0.1s ease;
        }
        .ci-fab:hover { background: #1691b6; transform: scale(1.05); }

        /* ---------- create-project modal ---------- */
        .ci-modal-overlay {
          position: fixed; inset: 0; background: rgba(10,16,20,0.45); z-index: 50;
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .ci-modal {
          width: 100%; max-width: 380px; max-height: 90vh; overflow-y: auto;
          background: #fff; border-radius: 20px; padding: 24px 22px 22px;
          box-shadow: 0 20px 50px rgba(16,24,32,0.25);
        }
        .ci-modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .ci-modal-title { font-size: 17px; font-weight: 700; color: #141b1f; margin: 0; }
        .ci-modal-close {
          display: flex; align-items: center; justify-content: center; width: 26px; height: 26px;
          border-radius: 50%; border: 1px solid #dfe3e6; background: #fff; cursor: pointer;
        }
        .ci-modal-close:hover { background: #f5f6f7; }
        .ci-field { margin-bottom: 16px; }
        .ci-field-label { display: block; font-size: 12.5px; font-weight: 700; color: #141b1f; margin-bottom: 8px; }
        .ci-field-input, .ci-field-textarea {
          width: 100%; border: 1px solid #dfe3e6; border-radius: 9px; padding: 11px 14px;
          font-size: 13.5px; color: #141b1f; font-family: inherit; outline: none;
        }
        .ci-field-input:focus, .ci-field-textarea:focus, .ci-date-box:focus-within {
          border-color: #1CA7D0; box-shadow: 0 0 0 3px rgba(28,167,208,0.12);
        }
        .ci-field-textarea { min-height: 90px; resize: vertical; }
        .ci-date-box { border: 1px solid #dfe3e6; border-radius: 9px; padding: 10px 14px; }
        .ci-date-sublabel { font-size: 10.5px; color: #9aa4aa; margin-bottom: 4px; }
        .ci-date-row { display: flex; align-items: center; gap: 8px; }
        .ci-date-input { border: none; outline: none; font-size: 13.5px; color: #141b1f; flex: 1; font-family: inherit; }
        .ci-modal-create-btn {
          width: 100%; border: none; border-radius: 9px; padding: 12px 0; font-size: 15px;
          font-weight: 600; margin-top: 4px;
        }

        @media (max-width: 640px) {
          .ci-content-inner { padding: 24px 20px 40px; }
          .ci-page-title { font-size: 22px; }
        }
        @media (max-width: 560px) {
          .ci-projects-grid { grid-template-columns: 1fr; }
          .ci-fab { right: 20px; bottom: 20px; width: 48px; height: 48px; }
        }
      `}</style>

      <div className="ci-content-inner">
        <h1 className="ci-page-title">Projects ({projects.length})</h1>

        <div className="ci-search">
          <span className="ci-search-icon-wrap">
            <Search size={12} color="#8a97a0" />
          </span>
          <input type="text" placeholder="Search" className="ci-search-input" />
        </div>

        {loading && <p style={{ color: "#8a97a0", fontSize: 13.5 }}>Loading projects...</p>}
        {error && !loading && <p style={{ color: "#d64545", fontSize: 13.5 }}>{error}</p>}

        {!loading && !error && (
          <div className="ci-projects-grid">
            {projects.map((p) => (
              <div
                key={p.id}
                className="ci-project-card"
                onClick={() => onOpenProject?.(p)}
                role={onOpenProject ? "button" : undefined}
                tabIndex={onOpenProject ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onOpenProject && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onOpenProject(p);
                  }
                }}
                style={{ cursor: onOpenProject ? "pointer" : "default" }}
              >
                <div className="ci-project-name">{p.name}</div>
                <ProgressTrack done={p.done} total={p.total} />
                <MemberStack extraCount={p.extraMembers} />
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="ci-fab" type="button" aria-label="New project" onClick={openCreate}>
        <Plus size={22} color="#fff" />
      </button>

      {isCreateOpen && (
        <div className="ci-modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="ci-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ci-modal-header">
              <h2 className="ci-modal-title">Create Project</h2>
              <button className="ci-modal-close" type="button" aria-label="Close" onClick={() => setIsCreateOpen(false)}>
                <X size={15} color="#141b1f" />
              </button>
            </div>

            <div className="ci-field">
              <label className="ci-field-label">Project Name</label>
              <input
                type="text"
                className="ci-field-input"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g Website redesign"
              />
            </div>

            <div className="ci-field">
              <label className="ci-field-label">Description</label>
              <textarea
                className="ci-field-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add Description"
              />
            </div>

            <div className="ci-field">
              <label className="ci-field-label">Checkin Time</label>
              <div className="ci-date-box">
                <div className="ci-date-sublabel">Date</div>
                <div className="ci-date-row">
                  <Calendar size={15} color="#8a97a0" />
                  <input
                    type="date"
                    className="ci-date-input"
                    value={checkinDate}
                    onChange={(e) => setCheckinDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button
              className="ci-modal-create-btn"
              type="button"
              disabled={!canCreate || creating}
              style={{
                background: canCreate && !creating ? "#1CA7D0" : "#eceef0",
                color: canCreate && !creating ? "#fff" : "#8a97a0",
                cursor: canCreate && !creating ? "pointer" : "not-allowed",
              }}
              onClick={createProject}
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}