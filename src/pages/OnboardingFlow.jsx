import { useState } from "react";
import { useNavigate } from "react-router-dom";

import CompanyName from "./CompanyName";
import { setActiveOrgId } from "../lib/session";
// import PermissionRole from "./PermissionRole";
import InviteTeam from "./InviteTeam";
import InviteByEmail from "./InviteByEmail";
import ProjectSetup from "./ProjectSetup";

const STEP = {
  COMPANY_NAME: 1,
  // PERMISSION_ROLE: 2,
  INVITE_TEAM: 2,
  INVITE_BY_EMAIL: 3,
  PROJECT_SETUP: 4,
};

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEP.COMPANY_NAME);
  const [organizationId, setOrganizationId] = useState(null);
  const [organizationName, setOrganizationName] = useState(null);

  const goNext = () => setStep((s) => s + 1);
  const goBack = () => setStep((s) => s - 1);

  switch (step) {
    case STEP.COMPANY_NAME:
      return (
        <CompanyName
          // CompanyName creates the org via POST /v1/organization and
          // resolves onNext({ id, name }) with the new org's data.
          onNext={(org) => {
            setOrganizationId(org.id);
            setActiveOrgId(org.id); // new org becomes the selected one in the sidebar/Home
            setOrganizationName(org.name);
            goNext();
          }}
          onBack={() => navigate("/")}
        />
      );

    // case STEP.PERMISSION_ROLE:
    //   return <PermissionRole onNext={goNext} onBack={goBack} />;

    case STEP.INVITE_TEAM:
      // Method-select step. Email is currently the only option, so Next
      // just advances to the actual email-collection step.
      return (
        <InviteTeam
          companyName={organizationName}
          onNext={goNext}
          onBack={goBack}
        />
      );

    case STEP.INVITE_BY_EMAIL:
      // Collects addresses and calls POST /v1/organization/team/invitation.
      return (
        <InviteByEmail
          organizationId={organizationId}
          companyName={organizationName}
          onNext={goNext}
          onBack={goBack}
        />
      );

    case STEP.PROJECT_SETUP:
      return (
        <ProjectSetup
          organizationId={organizationId}
          onNext={(name) => navigate("/congratulations", { state: { projectName: name } })}
          onBack={goBack}
        />
      );

    default:
      return null;
  }
}
