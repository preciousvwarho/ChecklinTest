import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SubscriptionSuccessfulPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-lg font-semibold tracking-tight">Checkln</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Project & task management, simplified
          </p>
        </div>

        <Card className="border-0 border-gray-200 shadow-none rounded-2xl">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-7 h-7 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <CardTitle className="text-2xl font-semibold tracking-tight">
              Subscription Successful 🎉
            </CardTitle>

            <CardDescription className="text-sm text-muted-foreground leading-6">
              Your subscription was successful. Open your organization in the
              app and enjoy premium benefits.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            <a href="checklin://home">
              <Button className="w-full h-12 rounded-xl">
                Open Checkln App
              </Button>
            </a>

            <a
              href="https://testflight.apple.com/join/g32XFwX5"
              target="_blank"
            >
              <Button variant="outline" className="w-full h-12 rounded-xl">
                Download for iPhone
              </Button>
            </a>

            <a
              href="https://play.google.com/apps/internaltest/4701464862425215205"
              target="_blank"
            >
              <Button variant="outline" className="w-full h-12 rounded-xl">
                Download for Android
              </Button>
            </a>
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
