import React from "react";
import logo from "../assets/logo.png";

export default function PrivacyPolicy() {
  return (
    <div style={styles.page}>
      <style>{`
        * { box-sizing: border-box; }
        .pp-link:hover { text-decoration: underline; }

        @media (max-width: 480px) {
          .pp-card { padding: 28px 20px !important; }
          .pp-page { padding: 0 !important; }
          .pp-title { font-size: 24px !important; }
        }
      `}</style>

      <div className="pp-page" style={styles.pageInner}>
        <div className="pp-card" style={styles.card}>
          <header style={styles.header}>
            <div style={styles.logoRow}>
              <img src={logo} alt="CheckIn logo" style={styles.logoImg} />
            </div>
            <h1 className="pp-title" style={styles.title}>
              Privacy Policy
            </h1>
            <p style={styles.updated}>Last updated: April 16, 2026</p>
          </header>

          <article style={styles.article}>
            <section style={styles.section}>
              <h2 style={styles.h2}>1. Introduction</h2>
              <p style={styles.p}>
                Welcome to our application (“we”, “our”, or “us”). This Privacy
                Policy explains how we collect, use, and protect your
                information when you use our project and task management
                platform.
              </p>
              <p style={{ ...styles.p, marginTop: 8 }}>
                By using our app, you agree to the terms of this Privacy Policy.
              </p>
            </section>

            <section style={styles.section}>
              <h2 style={styles.h2}>2. Information We Collect</h2>

              <div style={styles.subBlock}>
                <h3 style={styles.h3}>a. Personal Information</h3>
                <ul style={styles.ul}>
                  <li>Name</li>
                  <li>Email address</li>
                  <li>Account credentials (if applicable)</li>
                </ul>
              </div>

              <div style={styles.subBlock}>
                <h3 style={styles.h3}>b. Usage Data</h3>
                <ul style={styles.ul}>
                  <li>Projects, tasks, and to-do items you create</li>
                  <li>Activity within the app</li>
                  <li>Device and browser information</li>
                </ul>
              </div>

              <div style={styles.subBlock}>
                <h3 style={styles.h3}>c. Optional Permissions</h3>
                <p style={{ ...styles.p, marginTop: 4 }}>
                  If you grant permission, we may access your camera for
                  features like uploading images or scanning content.
                </p>
              </div>
            </section>

            <section style={styles.section}>
              <h2 style={styles.h2}>3. How We Use Your Information</h2>
              <ul style={styles.ul}>
                <li>Provide and maintain the app</li>
                <li>Manage your projects, tasks, and workflows</li>
                <li>Improve performance and user experience</li>
                <li>Communicate updates or important information</li>
                <li>Ensure security and prevent misuse</li>
              </ul>
            </section>

            <section style={styles.section}>
              <h2 style={styles.h2}>4. Data Storage and Security</h2>
              <p style={styles.p}>
                We take reasonable steps to protect your data using
                industry-standard security practices. However, no method of
                transmission over the internet is 100% secure.
              </p>
            </section>

            <section style={styles.section}>
              <h2 style={styles.h2}>5. Data Sharing</h2>
              <p style={{ ...styles.p, marginBottom: 8 }}>
                We do not sell your personal data.
              </p>
              <ul style={styles.ul}>
                <li>With service providers (hosting, analytics)</li>
                <li>If required by law</li>
                <li>To protect rights and prevent fraud</li>
              </ul>
            </section>

            <section style={styles.section}>
              <h2 style={styles.h2}>6. Your Rights</h2>
              <p style={styles.p}>
                Depending on your location, you may have the right to access,
                correct, or delete your personal data, or withdraw consent at
                any time.
              </p>
            </section>

            <section style={styles.section}>
              <h2 style={styles.h2}>7. Data Retention</h2>
              <p style={styles.p}>
                We retain your data only as long as necessary to provide our
                services or comply with legal obligations.
              </p>
            </section>

            <section style={styles.section}>
              <h2 style={styles.h2}>8. Third-Party Services</h2>
              <p style={styles.p}>
                Our app may use third-party services (such as authentication and
                analytics providers) that collect information according to their
                own privacy policies.
              </p>
            </section>

            <section style={styles.section}>
              <h2 style={styles.h2}>9. Children’s Privacy</h2>
              <p style={styles.p}>
                Our app is not intended for children under 13. We do not
                knowingly collect personal data from children.
              </p>
            </section>

            <section style={styles.section}>
              <h2 style={styles.h2}>10. Changes to This Policy</h2>
              <p style={styles.p}>
                We may update this Privacy Policy from time to time. Updates
                will be posted on this page with a revised date.
              </p>
            </section>

            <section style={styles.section}>
              <h2 style={styles.h2}>11. Contact Us</h2>
              <p style={styles.p}>If you have any questions, contact us at:</p>
              <p style={{ margin: "8px 0 0" }}>
                <a
                  href="mailto:info@pteshstudios.com"
                  className="pp-link"
                  style={styles.link}
                >
                  info@pteshstudios.com
                </a>
              </p>
            </section>
          </article>

          <footer style={styles.footer}>
            © {new Date().getFullYear()} CheckIn. All rights reserved.
          </footer>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "#ffffff",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  pageInner: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    padding: "48px 16px",
  },
  card: {
    width: "100%",
    maxWidth: 720,
    background: "#ffffff",
    padding: "0 8px",
    color: "#2b353b",
  },
  header: {
    marginBottom: 40,
    textAlign: "center",
  },
  logoRow: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoImg: {
    width: 56,
    height: 56,
    objectFit: "contain",
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: "#141b1f",
    margin: "0 0 6px",
    letterSpacing: -0.5,
  },
  updated: {
    fontSize: 13,
    color: "#8a97a0",
    margin: 0,
  },
  article: {
    fontSize: 15,
    lineHeight: 1.65,
    textAlign: "left",
  },
  section: {
    marginBottom: 32,
  },
  subBlock: {
    marginBottom: 16,
  },
  h2: {
    fontSize: 20,
    fontWeight: 600,
    color: "#141b1f",
    margin: "0 0 8px",
  },
  h3: {
    fontSize: 15,
    fontWeight: 600,
    color: "#141b1f",
    margin: 0,
  },
  p: {
    margin: 0,
    color: "#3d4a52",
  },
  ul: {
    margin: "4px 0 0",
    paddingLeft: 20,
    color: "#3d4a52",
    listStyleType: "disc",
    lineHeight: 1.8,
  },
  link: {
    color: "#159a6a",
    fontWeight: 600,
    textDecoration: "none",
  },
  footer: {
    marginTop: 56,
    paddingTop: 20,
    borderTop: "1px solid #e6e9eb",
    fontSize: 13,
    color: "#9aa4aa",
    textAlign: "center",
  },
};