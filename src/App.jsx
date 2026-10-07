import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation, Navigate } from "react-router-dom";

import SignIn from "./pages/SignIn";
import VerifyOtp from "./pages/VerifyOtp";
import OnboardingFlow from "./pages/OnboardingFlow";
import Congratulations from "./pages/Congratulations";
import Home from "./pages/Home";
import ProjectDetail from "./pages/ProjectDetail";
import TaskDetail from "./pages/TaskDetail";
import AiInsight from "./pages/AiInsight";
import Activities from "./pages/Activities";
import Dms from "./pages/Dms";
import Profile from "./pages/Profile";
import Invite from "./pages/Invite";
import { getOrganizations, getInvitations } from "./lib/api";
import { getAuthToken, getSession, pickActiveOrgRow } from "./lib/session";
import { pendingInvitesFor } from "./pages/Invite";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import DeleteAccount from "./pages/DeleteAccount";

// After ANY successful sign-in (Google or email/OTP), decide whether this
// person is a first-timer who still needs onboarding, or an existing user
// who should land straight on Home. We check for organization membership
// rather than trusting a "newUser" flag (which the OTP-verify endpoint
// doesn't even document) — no organization yet means onboarding was never
// completed, regardless of which sign-in method was used.
async function routeAfterAuth(navigate, token) {
  // Someone who was invited must see their invitation BEFORE onboarding,
  // otherwise they're pushed into creating their own organization and never
  // get the chance to accept.
  try {
    const invites = await getInvitations({ token });
    if (pendingInvitesFor(invites.data || [], getSession()?.user?.email).length > 0) {
      navigate("/invite");
      return;
    }
  } catch (err) {
    console.error("[App] failed to check invitations after sign-in:", err);
  }
  try {
    const orgResult = await getOrganizations({ token });
    const hasOrganization = (orgResult.data || []).length > 0;
    navigate(hasOrganization ? "/home" : "/onboarding");
  } catch (err) {
    console.error("[App] failed to check organizations after sign-in:", err);
    // Can't tell either way — onboarding is the safer default since it
    // still ends at Home once a project exists.
    navigate("/onboarding");
  }
}

// project/task detail routes need organizationId, but it only ever arrives
// via router state (see HomeRoute below) — a hard refresh or a shared/
// bookmarked link to /project/:id loses that state entirely, leaving
// organizationId undefined. That undefined was getting stringified to the
// literal text "undefined" in query params and rejected by the API as
// "organizationId must be a UUID". This re-derives it the same way
// Home.jsx does (GET /v1/organization) whenever router state doesn't have it.
function useResolvedOrganizationId(routeOrganizationId) {
  const [organizationId, setOrganizationId] = useState(routeOrganizationId || null);
  const [loading, setLoading] = useState(!routeOrganizationId);

  useEffect(() => {
    if (routeOrganizationId) {
      setOrganizationId(routeOrganizationId);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const token = getAuthToken();
    getOrganizations({ token })
      .then((res) => {
        if (cancelled) return;
        const row = pickActiveOrgRow(res.data || []);
        const orgId = row?.organizationId || row?.organization?.id || null;
        setOrganizationId(orgId);
      })
      .catch((err) => {
        console.error("[App] failed to resolve organizationId:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [routeOrganizationId]);

  return { organizationId, loading };
}

// Each route wrapper below just translates router hooks (navigate/params/location)
// into the same onNext/onBack-style props the page components already expect.

function SignInRoute() {
  const navigate = useNavigate();
  return (
    <SignIn
      onNext={(result) => {
        // Google sign-in resolves with the full API response
        // ({ status, data: { user, token, newUser }, message }) and is
        // already fully authenticated, so we skip OTP entirely and figure
        // out where to land via routeAfterAuth (existing users -> Home,
        // first-timers -> onboarding, which defaults to STEP.COMPANY_NAME).
        //
        // Email sign-in resolves with { email, resendAt, resendDelaySeconds }
        // (no .data key) after POST /v1/auth/sign-in sends the OTP — pass
        // that through as router state so /verify-otp can call
        // POST /v1/auth/sign-in/verify and drive its resend cooldown.
        //
        // Apple is still a placeholder that calls onNext() with no args,
        // which currently falls through to the email OTP route.
        if (result?.data) {
          routeAfterAuth(navigate, result.data.token);
        } else {
          navigate("/verify-otp", { state: result });
        }
      }}
    />
  );
}

function VerifyOtpRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { email, resendAt, resendDelaySeconds, pushToken } = location.state || {};
  return (
    <VerifyOtp
      email={email}
      resendAt={resendAt}
      resendDelaySeconds={resendDelaySeconds}
      pushToken={pushToken}
      // Verify succeeds -> saveSession has already run inside VerifyOtp ->
      // routeAfterAuth decides Home vs onboarding.
      onNext={(result) => routeAfterAuth(navigate, result.data.token)}
    />
  );
}

function CongratulationsRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const projectName = location.state?.projectName || "Budget";
  return <Congratulations projectName={projectName} onNext={() => navigate("/home")} />;
}

function HomeRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    // project comes from GET /v1/projects and carries a real id + the
    // organizationId it was fetched under (see Home.jsx's toCardProject) —
    // both are passed through router state so the detail screens never have
    // to re-derive them from a name.
    <Home key={location.key} onOpenProject={(project) => navigate(`/project/${project.id}`, { state: { project } })} />
  );
}

function ProjectDetailRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();
  const project = location.state?.project;
  const { organizationId, loading: orgLoading } = useResolvedOrganizationId(project?.organizationId);

  if (orgLoading) return null;

  return (
    <ProjectDetail
      projectId={projectId}
      organizationId={organizationId}
      projectName={project?.name}
      onBack={() => navigate("/home")}
      onOpenTask={(task) =>
        navigate(`/project/${projectId}/task/${task.id}`, {
          state: { task, projectId, organizationId },
        })
      }
      onOpenInsight={(analyticsId) =>
        navigate(`/project/${projectId}/insight`, { state: { analyticsId, projectId } })
      }
    />
  );
}

function TaskDetailRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId, taskId } = useParams();
  const task = location.state?.task;
  const { organizationId, loading: orgLoading } = useResolvedOrganizationId(location.state?.organizationId);

  if (orgLoading) return null;

  return (
    <TaskDetail
      taskId={taskId}
      projectId={projectId}
      organizationId={organizationId}
      task={task}
      onBack={() => navigate(`/project/${projectId}`)}
      onGoHome={() => navigate("/home")}
      onOpenInsight={(analyticsId) =>
        navigate(`/project/${projectId}/insight`, { state: { analyticsId, projectId } })
      }
    />
  );
}

function AiInsightRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();
  const analyticsId = location.state?.analyticsId;
  return (
    <AiInsight
      analyticsId={analyticsId}
      projectId={projectId}
      onBack={() => navigate(`/project/${projectId}`)}
      onGoHome={() => navigate("/home")}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page is Sign In (login) */}
        <Route path="/" element={<SignInRoute />} />

        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/delete-account" element={<DeleteAccount />} />

        <Route path="/verify-otp" element={<VerifyOtpRoute />} />

        {/* company-name, permission-role, invite-team, project-setup all
            live inside one route + one component, stepped via switch-case */}
        <Route path="/onboarding" element={<OnboardingFlow />} />

        <Route path="/congratulations" element={<CongratulationsRoute />} />

        <Route path="/home" element={<HomeRoute />} />
        <Route path="/activities" element={<Activities />} />
        <Route path="/invite" element={<Invite />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/dms" element={<Dms />} />
        <Route path="/dms/:conversationId" element={<Dms />} />
        <Route path="/project/:projectId" element={<ProjectDetailRoute />} />
        <Route path="/project/:projectId/task/:taskId" element={<TaskDetailRoute />} />
        <Route path="/project/:projectId/insight" element={<AiInsightRoute />} />

        {/* Unknown paths fall back to the landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}