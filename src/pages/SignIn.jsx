import React, { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { signInWithGoogle, signInWithEmail } from "../lib/api";
import { saveSession } from "../lib/session";
import logo from "../assets/logo.png";

const VITE_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// --- Inline icon components (brand marks drawn as simple SVGs) ---
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.6 0-14.1 4.3-17.4 10.6z"/>
    <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.5C29.6 34.8 27 35.7 24 35.7c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.9 39.6 16.4 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6.6 5.5C41.4 36.3 44 30.6 44 24c0-1.2-.1-2.3-.4-3.5z"/>
  </svg>
);

const AppleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#111111">
    <path d="M16.365 1.43c0 1.14-.463 2.11-1.222 2.86-.822.82-1.986 1.44-2.995 1.36-.13-1.09.42-2.24 1.14-2.98.79-.83 2.15-1.44 3.077-1.24zM20.63 17.28c-.53 1.22-.78 1.76-1.46 2.84-.95 1.51-2.29 3.39-3.95 3.4-1.47.02-1.85-.96-3.84-.95-1.99.01-2.41.97-3.88.95-1.66-.02-2.93-1.72-3.88-3.23C1.13 16.9.4 13.02 1.7 10.36c.9-1.85 2.5-3.02 4.24-3.05 1.42-.02 2.76.98 3.63.98.86 0 2.5-1.21 4.22-1.03.72.03 2.74.29 4.04 2.18-.1.07-2.41 1.42-2.39 4.24.03 3.37 2.95 4.49 2.99 4.5-.03.09-.47 1.61-1.5 3.1z"/>
  </svg>
);

export default function CheckInSignIn({ onNext }) {
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  // Creates a small expanding circle at the click point, then removes it
  // after the animation finishes. Purely visual — doesn't affect onClick logic.
  const createRipple = (e) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement("span");
    ripple.className = "ci-ripple";
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    button.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  };

  // Step 1 of the email flow: POST /v1/auth/sign-in to send an OTP, then
  // hand off email + resend timing to the parent route so it can navigate
  // to /verify-otp with that data (VerifyOtp needs the email to verify,
  // and resendAt/resendDelaySeconds to drive its resend cooldown).
  const handleEmailSubmit = async () => {
    if (!email.trim() || emailLoading) return;
    setError("");
    setEmailLoading(true);
    try {
      const result = await signInWithEmail({ email, pushToken: null });
      onNext?.({
        email,
        resendAt: result.data.resendAt,
        resendDelaySeconds: result.data.resendDelaySeconds,
      });
    } catch (err) {
      setError(err.message || "Could not send verification code. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  };

  // Handles the credential response from Google Identity Services,
  // exchanges the ID token with our backend, and hands control back
  // to the parent route so it can navigate based on newUser/token.
  const handleGoogleCredential = async (response) => {
    setError("");
    setGoogleLoading(true);
    try {
      const idToken = response.credential;
      const result = await signInWithGoogle({ idToken, pushToken: null });
      saveSession(result.data);
      console.log("[CheckInSignIn] backend response:", result);
      onNext?.(result);
    } catch (err) {
      setError(err.message || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  // Load the Google Identity Services script once and initialize it.
  // We call google.accounts.id.prompt() ourselves from a normal button's
  // onClick, so there's a real, visible, clickable <button> in the DOM.
  useEffect(() => {
    if (!VITE_GOOGLE_CLIENT_ID) {
      const msg = "Google sign-in is unavailable. Please contact support.";
      console.warn(
        "Google sign-in is unavailable: VITE_GOOGLE_CLIENT_ID is not set. Add it to your .env file and restart the dev server."
      );
      setError(msg);
      return;
    }

    let cancelled = false;

    const initialize = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        ux_mode: "popup",
      });
      if (!cancelled) setGoogleReady(true);
    };

    if (window.google?.accounts?.id) {
      initialize();
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initialize;
    script.onerror = () => {
      if (cancelled) return;
      setError("No internet connection. Please check your network and try again.");
    };
    document.body.appendChild(script);

    return () => {
      cancelled = true;
      script.onload = null;
      script.onerror = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Runs when the user clicks our real Google button. Asks Google's
  // already-loaded script to show its sign-in popup/One Tap dialog.
  const handleGoogleClick = () => {
    if (!googleReady || googleLoading) return;
    setError("");
    window.google.accounts.id.prompt((notification) => {
      // Surface a clear message if Google's UI didn't display at all
      // (e.g. blocked by browser settings or an unauthorized origin),
      // instead of leaving the user staring at nothing happening.
      if (
        notification.isNotDisplayed?.() ||
        notification.isSkippedMoment?.()
      ) {
        setError("Google sign-in didn't open. Please check your browser settings or try again.");
      }
    });
  };

  return (
    <div style={styles.page}>
      <style>{`
        * { box-sizing: border-box; }

        .ci-btn {
          transition: background 0.15s ease, border-color 0.15s ease,
            transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }
        .ci-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(16,24,32,0.08);
        }
        .ci-btn:active:not(:disabled) {
          transform: scale(0.99) translateY(0);
          box-shadow: none;
        }
        .ci-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(28,167,208,0.35);
        }
        .ci-btn:disabled {
          cursor: not-allowed;
        }

        .ci-ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(28,167,208,0.25);
          transform: scale(0);
          animation: ci-ripple-anim 0.5s ease-out;
          pointer-events: none;
        }
        .ci-primary .ci-ripple {
          background: rgba(255,255,255,0.55);
        }
        @keyframes ci-ripple-anim {
          to { transform: scale(2.2); opacity: 0; }
        }

        .ci-secondary:hover:not(:disabled) { border-color: #b9c2c9 !important; background: #fafbfc !important; }
        .ci-primary:hover:not(:disabled) { background: #1691b6 !important; }
        .ci-input:focus-within { border-color: #1CA7D0 !important; box-shadow: 0 0 0 3px rgba(28,167,208,0.15); }
        .ci-link:hover { text-decoration: underline; }

        @media (max-width: 480px) {
          .ci-card { padding: 28px 20px !important; box-shadow: none !important; border-radius: 0 !important; }
          .ci-page { padding: 0 !important; background: #ffffff !important; }
        }
      `}</style>

      <div className="ci-page" style={styles.pageInner}>
        <div className="ci-card" style={styles.card}>
          <div style={styles.logoRow}>
            <img src={logo} alt="CheckIn logo" style={styles.logoImg} />
          </div>
          <div style={styles.brand}>
            {/* Check<span style={styles.brandAccent}>In</span> */}
          </div>

          <h1 style={styles.heading}>Enter your email address</h1>
          <p style={styles.subtext}>or choose another option</p>

          <div className="ci-input" style={styles.inputWrap}>
            <Mail size={17} color="#8a97a0" style={{ flexShrink: 0 }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={styles.input}
              aria-label="Email address"
              onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
            />
          </div>

          <button
            className="ci-btn ci-primary"
            style={{
              ...styles.primaryBtn,
              opacity: emailLoading ? 0.7 : 1,
              cursor: email.trim() && !emailLoading ? "pointer" : "not-allowed",
            }}
            type="button"
            disabled={!email.trim() || emailLoading}
            onClick={handleEmailSubmit}
            onMouseDown={createRipple}
          >
            {emailLoading ? "Sending code..." : "Sign in"}
          </button>

          <div style={styles.dividerRow}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>OR</span>
            <span style={styles.dividerLine} />
          </div>

          <button
            className="ci-btn ci-secondary"
            style={{
              ...styles.secondaryBtn,
              opacity: googleLoading ? 0.6 : 1,
              cursor: googleReady && !googleLoading ? "pointer" : "not-allowed",
            }}
            type="button"
            onClick={handleGoogleClick}
            onMouseDown={createRipple}
            disabled={!googleReady || googleLoading}
          >
            <GoogleIcon />
            <span>{googleLoading ? "Signing in..." : "Google"}</span>
          </button>

          {error && <p style={styles.error}>{error}</p>}

          <button
            className="ci-btn ci-secondary"
            style={{ ...styles.secondaryBtn, marginBottom: 0, marginTop: 12 }}
            type="button"
            onClick={() => onNext?.()}
            onMouseDown={createRipple}
          >
            <AppleIcon />
            <span>Apple</span>
          </button>

          <p style={styles.footer}>
            By continuing, you agreed to CheckIn{" "}
            <a href="#" className="ci-link" style={styles.link}>Terms of Service</a>{" "}
            and{" "}
            <a href="#" className="ci-link" style={styles.link}>Privacy Policy</a>.
          </p>
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
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    background: "#ffffff",
    borderRadius: 14,
    padding: "40px 32px 32px",
    // boxShadow: "0 1px 3px rgba(16,24,32,0.08), 0 8px 24px rgba(16,24,32,0.06)",
    textAlign: "center",
  },
  logoRow: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 6,
  },
  logoImg: {
    width: 56,
    height: 56,
    objectFit: "contain",
  },
  brand: {
    fontSize: 20,
    fontWeight: 700,
    color: "#141b1f",
    marginBottom: 22,
  },
  brandAccent: {
    color: "#1CA7D0",
  },
  heading: {
    fontSize: 17,
    fontWeight: 700,
    color: "#141b1f",
    margin: "0 0 4px",
  },
  subtext: {
    fontSize: 13,
    color: "#8a97a0",
    margin: "0 0 20px",
  },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid #dfe3e6",
    borderRadius: 9,
    padding: "11px 14px",
    marginBottom: 14,
    background: "#fff",
  },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: 14,
    color: "#141b1f",
    background: "transparent",
    minWidth: 0,
  },
  primaryBtn: {
    width: "100%",
    background: "#1CA7D0",
    color: "#fff",
    border: "none",
    borderRadius: 9,
    padding: "12px 0",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: 18,
    position: "relative",
    overflow: "hidden",
  },
  dividerRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: "#e6e9eb",
  },
  dividerText: {
    fontSize: 11,
    fontWeight: 600,
    color: "#a3adb3",
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    background: "#fff",
    border: "1px solid #dfe3e6",
    borderRadius: 9,
    padding: "11px 0",
    fontSize: 14,
    fontWeight: 600,
    color: "#141b1f",
    cursor: "pointer",
    marginBottom: 0,
    position: "relative",
    overflow: "hidden",
  },
  error: {
    fontSize: 12.5,
    color: "#d64545",
    margin: "12px 0 0",
    textAlign: "left",
  },
  footer: {
    marginTop: 22,
    marginBottom: 0,
    fontSize: 11.5,
    lineHeight: 1.5,
    color: "#9aa4aa",
  },
  link: {
    color: "#159a6a",
    fontWeight: 600,
    textDecoration: "none",
  },
};