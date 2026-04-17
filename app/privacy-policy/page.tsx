import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkln Privacy Policy",
  description: "Checkln Privacy Policy",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white text-gray-800 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Last updated: April 16, 2026
          </p>
        </header>

        <article className="space-y-10 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-medium mb-2">1. Introduction</h2>
            <p>
              Welcome to our application (“we”, “our”, or “us”). This Privacy
              Policy explains how we collect, use, and protect your information
              when you use our project and task management platform.
            </p>
            <p className="mt-2">
              By using our app, you agree to the terms of this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-2">
              2. Information We Collect
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium">a. Personal Information</h3>
                <ul className="list-disc ml-5 mt-1 space-y-1 text-gray-700">
                  <li>Name</li>
                  <li>Email address</li>
                  <li>Account credentials (if applicable)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium">b. Usage Data</h3>
                <ul className="list-disc ml-5 mt-1 space-y-1 text-gray-700">
                  <li>Projects, tasks, and to-do items you create</li>
                  <li>Activity within the app</li>
                  <li>Device and browser information</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium">c. Optional Permissions</h3>
                <p className="text-gray-700 mt-1">
                  If you grant permission, we may access your camera for
                  features like uploading images or scanning content.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-2">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc ml-5 space-y-1 text-gray-700">
              <li>Provide and maintain the app</li>
              <li>Manage your projects, tasks, and workflows</li>
              <li>Improve performance and user experience</li>
              <li>Communicate updates or important information</li>
              <li>Ensure security and prevent misuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-2">
              4. Data Storage and Security
            </h2>
            <p>
              We take reasonable steps to protect your data using
              industry-standard security practices. However, no method of
              transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-2">5. Data Sharing</h2>
            <p className="mb-2">We do not sell your personal data.</p>
            <ul className="list-disc ml-5 space-y-1 text-gray-700">
              <li>With service providers (hosting, analytics)</li>
              <li>If required by law</li>
              <li>To protect rights and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-2">6. Your Rights</h2>
            <p>
              Depending on your location, you may have the right to access,
              correct, or delete your personal data, or withdraw consent at any
              time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-2">7. Data Retention</h2>
            <p>
              We retain your data only as long as necessary to provide our
              services or comply with legal obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-2">
              8. Third-Party Services
            </h2>
            <p>
              Our app may use third-party services (such as authentication and
              analytics providers) that collect information according to their
              own privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-2">9. Children’s Privacy</h2>
            <p>
              Our app is not intended for children under 13. We do not knowingly
              collect personal data from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-2">
              10. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. Updates will
              be posted on this page with a revised date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-2">11. Contact Us</h2>
            <p>If you have any questions, contact us at:</p>
            <p className="mt-2 font-medium text-gray-900">
              info@pteshstudios.com
            </p>
          </section>
        </article>

        <footer className="mt-16 text-sm text-gray-400 text-center">
          © {new Date().getFullYear()} Your App Name. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
