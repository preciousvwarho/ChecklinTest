import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] px-4 py-12">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-lg font-semibold tracking-tight">Checkln</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Project & task management, simplified
          </p>
        </div>

        <Card className="border-0 shadow-none rounded-2xl">
          <CardHeader className="text-center space-y-3 pb-6">
            <div className="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-7 h-7 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 7h12M9 7V4h6v3m2 0v13a1 1 0 01-1 1H8a1 1 0 01-1-1V7h10zM10 11v6M14 11v6"
                />
              </svg>
            </div>

            <CardTitle className="text-2xl font-semibold tracking-tight">
              Delete Your Checkln Account
            </CardTitle>

            <CardDescription className="text-sm text-muted-foreground leading-6 max-w-lg mx-auto">
              You can request the deletion of your Checkln account and
              associated personal data at any time.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* How to request deletion */}
            <section className="space-y-3">
              <h2 className="text-base font-semibold">
                How to Request Account Deletion
              </h2>

              <p className="text-sm text-muted-foreground leading-6">
                To request deletion of your Checkln account, follow these steps:
              </p>

              <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground leading-6">
                <li>Open the Checkln mobile app.</li>
                <li>
                  Tap the <strong>settings</strong> button in the top right
                  corner.
                </li>
                <li>
                  Scroll down until you see <strong>Delete Account</strong>.
                </li>
                <li>
                  Tap <strong>Delete Account</strong>.
                </li>
                <li>
                  Enter the verification code sent to your email to confirm your
                  account deletion request.
                </li>
              </ol>

              <p className="text-sm text-muted-foreground leading-6">
                If you cannot access your Checkln account, you can request
                account deletion by contacting us using the support contact
                provided on our website. Please provide the email address
                associated with your Checkln account so that we can identify
                your account.
              </p>
            </section>

            {/* Data that will be deleted */}
            <section className="space-y-3">
              <h2 className="text-base font-semibold">
                Data That Will Be Deleted
              </h2>

              <p className="text-sm text-muted-foreground leading-6">
                When your account deletion request is completed, the following
                personal data associated with your account will be deleted or
                anonymized:
              </p>

              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground leading-6">
                <li>Your name and profile information</li>
                <li>Your email address</li>
                <li>Your profile picture</li>
                <li>Your authentication information</li>
                <li>Your organization membership information</li>
                <li>Your project membership information</li>
                <li>Your personal account settings</li>
                <li>Other personal information associated with your account</li>
              </ul>
            </section>

            {/* Data that may be retained */}
            <section className="space-y-3">
              <h2 className="text-base font-semibold">
                Data That May Be Retained
              </h2>

              <p className="text-sm text-muted-foreground leading-6">
                Some information may need to be retained after account deletion
                where it is necessary for legal, security, fraud prevention,
                financial, or other legitimate business purposes.
              </p>

              <p className="text-sm text-muted-foreground leading-6">
                For example, information that is required to comply with
                applicable legal or financial obligations may be retained for
                the period required by law.
              </p>

              <p className="text-sm text-muted-foreground leading-6">
                Any retained information will only be kept for the period
                necessary for the applicable purpose and will be deleted or
                anonymized when the retention period expires.
              </p>
            </section>

            {/* Content created in organizations */}
            <section className="space-y-3">
              <h2 className="text-base font-semibold">
                Organization and Shared Content
              </h2>

              <p className="text-sm text-muted-foreground leading-6">
                Some content created while using Checkln may be associated with
                an organization, project, or other users. Deleting your account
                may not automatically remove content that is required for the
                continued operation or history of an organization or project.
              </p>

              <p className="text-sm text-muted-foreground leading-6">
                Where applicable, personal identifiers associated with such
                content will be removed or anonymized.
              </p>
            </section>

            {/* Processing time */}
            <section className="space-y-3">
              <h2 className="text-base font-semibold">
                Deletion Processing Time
              </h2>

              <p className="text-sm text-muted-foreground leading-6">
                Account deletion requests are processed within{" "}
                <strong>30 days</strong>. Once the deletion process is
                completed, your account and the applicable associated personal
                data will no longer be available through Checkln.
              </p>
            </section>

            {/* Contact */}
            <section className="rounded-xl bg-muted/50 p-5 space-y-2">
              <h2 className="text-base font-semibold">Need Help?</h2>

              <p className="text-sm text-muted-foreground leading-6">
                If you are unable to delete your account through the Checkln
                app, please contact our support team and include the email
                address associated with your account.
              </p>

              <a
                href="mailto:support@checklnteam.com"
                className="text-sm font-medium underline underline-offset-4"
              >
                support@checklnteam.com
              </a>
            </section>

            {/* Back to website */}
            <Link href="/" className="block">
              <Button variant="outline" className="w-full h-12 rounded-xl">
                Back to Checkln
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} Checkln
        </p>
      </div>
    </div>
  );
}
