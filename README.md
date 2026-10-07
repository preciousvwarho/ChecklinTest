# CheckIn — React App

All 9 screens from the design, wired into a single Vite + React project.

## Getting started

npm install
npm run dev

## Structure

src/
  pages/
    SignIn.jsx            sign-in / email entry
    VerifyOtp.jsx          OTP verification
    CompanyName.jsx        onboarding step 1/5 — company/team name
    PermissionRole.jsx     onboarding step 2/5 — permission role
    InviteTeam.jsx          onboarding step 3/5 — invite teammates
    ProjectSetup.jsx       onboarding step 5/5 — project name + description
    Congratulations.jsx    onboarding complete
    Home.jsx               dashboard — projects grid + create-project modal
    ProjectDetail.jsx      single project view — task board + team panel
  App.jsx                 dev-only screen switcher (top nav bar) so every
                           screen can be previewed without a router yet

## Notes for wiring it up for real

- App.jsx currently swaps screens with local state purely for previewing —
  swap this out for react-router-dom (or your router of choice) when you're
  ready to add real navigation and URLs.
- Congratulations, InviteTeam, and ProjectDetail accept a prop
  (projectName / companyName) for the dynamic text — wire these to real
  form state as you connect the onboarding steps together.
- Every screen is fully self-contained (styles included via a <style> tag
  in each file) and responsive down to small mobile widths.
