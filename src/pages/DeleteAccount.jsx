import React from "react";
import logo from "../assets/logo.png";

export default function DeleteAccount() {
  return (
    <div style={styles.page}>
      <style>{`
        * { box-sizing: border-box; }
        .da-link:hover { text-decoration: underline; }

        @media (max-width: 480px) {
          .da-card { padding: 28px 20px !important; }
          .da-page { padding: 0 !important; }
          .da-title { font-size: 24px !important; }
        }
      `}</style>

      <div className="da-page" style={styles.pageInner}>
        <div className="da-card" style={styles.card}>
          <header style={styles.header}>
            <div style={styles.logoRow}>
              <img src={logo} alt="CheckIn logo" style={styles.logoImg} />
            </div>
            <h1 className="da-title" style={styles.title}>
              Delete Your CheckIn Account
            </h1>
            <p style={styles.updated}>
              You can request the deletion of your CheckIn account and
              associated personal data at any time.
            </p>
          </header>

          <article style={styles.article}>
            <section style={styles.section}>
              <h2 style={styles.h2}>1. How to Request Account Deletion</h2>
              <p style={styles.p}>
                To request deletion of your CheckIn account, follow these steps:
              </p>
              <ol style={styles.ol}>
                <li>Open the CheckIn mobile app.</li>
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
              <p style={{ ...styles.p, marginTop: 12 }}>
                If you cannot access your CheckIn account, you can request
                account deletion by contacting us using the support contact
                provided on our website. Please provide the email address
                associated with your CheckIn account so that we can identify
                your account.
              </p>
            </section>

            <section style={styles.section}>
              <h2 style={styles.h2}>2. Data That Will Be Deleted</h2>
              <p style={styles.p}>
                When your account deletion request is completed, the following
                personal data associated with your account will be deleted or
                anonymized:
              </p>
              <ul style={styles.ul}>
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

            <section style={styles.section}>
              <h2 style={styles.h2}>3. Data That May Be Retained</h2>
              <p style={styles.p}>
                Some information may need to be retained after account deletion
                where it is necessary for legal, security, fraud prevention,
                financial, or other legitimate business purposes.
              </p>
              <p style={{ ...styles.p, marginTop: 8 }}>
                For example, information that is required to comply with
                applicable legal or financial obligations may be retained for
                the period required by law.
              </p>
              <p style={{ ...styles.p, marginTop: 8 }}>
                Any retained information will only be kept for the period
                necessary for the applicable purpose and will be deleted or
                anonymized when the retention period expires.
              </p>
            </section>

            <section style={styles.section}>
              <h2 style={styles.h2}>4. Organization and Shared Content</h2>
              <p style={styles.p}>
                Some content created while using CheckIn may be associated with
                an organization, project, or other users. Deleting your account
                may not automatically remove content that is required for the
                continued operation or history of an organization or project.
              </p>
              <p style={{ ...styles.p, marginTop: 8 }}>
                Where applicable, personal identifiers associated with such
                content will be removed or anonymized.
              </p>
            </section>

            <section style={styles.section}>
              <h2 style={styles.h2}>5. Deletion Processing Time</h2>
              <p style={styles.p}>
                Account deletion requests are processed within{" "}
                <strong>30 days</strong>. Once the deletion process is
                completed, your account and the applicable associated personal
                data will no longer be available through CheckIn.
              </p>
            </section>

            <section style={styles.section}>
              <h2 style={styles.h2}>6. Need Help?</h2>
              <p style={styles.p}>
                If you are unable to delete your account through the CheckIn
                app, please contact our support team and include the email
                address associated with your account.
              </p>
              <p style={{ margin: "8px 0 0" }}>
                <a
                  href="mailto:support@checklnteam.com"
                  className="da-link"
                  style={styles.link}
                >
                  support@checklnteam.com
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
  h2: {
    fontSize: 20,
    fontWeight: 600,
    color: "#141b1f",
    margin: "0 0 8px",
  },
  p: {
    margin: 0,
    color: "#3d4a52",
  },
  ol: {
    margin: "8px 0 0",
    paddingLeft: 20,
    color: "#3d4a52",
    listStyleType: "decimal",
    lineHeight: 1.8,
  },
  ul: {
    margin: "8px 0 0",
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