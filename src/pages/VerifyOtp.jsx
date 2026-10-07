import React, { useEffect, useRef, useState } from "react";
import { verifySignInCode, signInWithEmail, updatePushToken } from "../lib/api";
import { saveSession } from "../lib/session";
import logo from "../assets/logo.png";

const OTP_LENGTH = 4;

// email, resendAt, resendDelaySeconds come from SignIn after it calls
// POST /v1/auth/sign-in. pushToken is optional — pass it through if the
// app already has one available (e.g. from Expo) at this point.
export default function CheckInVerifyOtp({ email, resendAt, resendDelaySeconds, pushToken, onNext }) {
  const [values, setValues] = useState(Array(OTP_LENGTH).fill(""));
  const inputsRef = useRef([]);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

  const isComplete = values.every((v) => v !== "");

  // Drives the resend cooldown countdown from resendAt (falls back to
  // resendDelaySeconds if resendAt isn't available for some reason).
  useEffect(() => {
    const target = resendAt
      ? new Date(resendAt).getTime()
      : Date.now() + (resendDelaySeconds || 0) * 1000;

    const tick = () => {
      setSecondsLeft(Math.max(0, Math.round((target - Date.now()) / 1000)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [resendAt, resendDelaySeconds]);

  const setDigit = (index, digit) => {
    setValues((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
  };

  const handleChange = (index, e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    if (!raw) {
      setDigit(index, "");
      return;
    }
    const digit = raw[raw.length - 1];
    setDigit(index, digit);
    if (index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (values[index]) {
        setDigit(index, "");
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
        setDigit(index - 1, "");
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
    if (!text) return;
    e.preventDefault();
    const chars = text.slice(0, OTP_LENGTH).split("");
    const next = Array(OTP_LENGTH).fill("");
    chars.forEach((c, i) => (next[i] = c));
    setValues(next);
    const focusIndex = Math.min(chars.length, OTP_LENGTH - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  // POST /v1/auth/sign-in/verify — { email, code } -> { user, token, tokenExpiresOn }
  // On success: save the session, then best-effort register the push token
  // via the now-authenticated POST /v1/auth/push-token (a failure there
  // shouldn't block sign-in, so it's swallowed rather than shown as an error).
  const handleVerify = async () => {
    if (!isComplete || verifying) return;
    setError("");
    setVerifying(true);
    const code = values.join("");
    try {
      const result = await verifySignInCode({ email, code });
      saveSession(result.data);

      if (pushToken) {
        try {
          await updatePushToken({ pushToken, token: result.data.token });
        } catch {
          // non-fatal — sign-in already succeeded
        }
      }

      onNext?.(result);
    } catch (err) {
      setError(err.message || "Invalid verification code. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  // Re-calls POST /v1/auth/sign-in to trigger a fresh OTP, then restarts
  // the cooldown from the new resendAt.
  const handleResend = async () => {
    if (secondsLeft > 0 || resending) return;
    setError("");
    setResending(true);
    try {
      const result = await signInWithEmail({ email, pushToken: pushToken || null });
      setValues(Array(OTP_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
      const target = new Date(result.data.resendAt).getTime();
      setSecondsLeft(Math.max(0, Math.round((target - Date.now()) / 1000)));
    } catch (err) {
      setError(err.message || "Could not resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={styles.page}>
      <style>{`
        * { box-sizing: border-box; }
        .ci-otp-box { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .ci-otp-box:focus { border-color: #1CA7D0 !important; box-shadow: 0 0 0 3px rgba(28,167,208,0.15); outline: none; }
        .ci-resend:hover:not(.disabled) { text-decoration: underline; }
        .ci-resend.disabled { color: #b6bec3 !important; cursor: not-allowed; pointer-events: none; }
        .ci-verify-btn { transition: background 0.15s ease, transform 0.05s ease; }
        .ci-verify-btn:not(:disabled):hover { background: #1691b6 !important; }
        .ci-verify-btn:not(:disabled):active { transform: scale(0.99); }

        @media (max-width: 480px) {
          .ci-card { padding: 28px 20px !important; box-shadow: none !important; border-radius: 0 !important; }
          .ci-page { padding: 0 !important; background: #ffffff !important; }
          .ci-otp-row { gap: 8px !important; }
          .ci-otp-box { width: 42px !important; height: 50px !important; font-size: 18px !important; }
        }

        @media (max-width: 360px) {
          .ci-otp-row { gap: 6px !important; }
          .ci-otp-box { width: 36px !important; height: 46px !important; font-size: 16px !important; }
        }
      `}</style>

      <div className="ci-page" style={styles.pageInner}>
        <div className="ci-card" style={styles.card}>
          <div style={styles.top}>
            <div style={styles.logoRow}>
              <img src={logo} alt="CheckIn logo" style={styles.logoImg} />
            </div>
            <div style={styles.brand}>
              {/* Check<span style={styles.brandAccent}>In</span> */}
            </div>

            <h1 style={styles.heading}>Check your email</h1>
            <p style={styles.subtext}>
              We have sent an OTP to your email address
              <br />
              <span style={styles.emailText}>{email}</span>
            </p>

            <div className="ci-otp-row" style={styles.otpRow} onPaste={handlePaste}>
              {values.map((v, i) => (
                <input
                  key={i}
                  ref={(el) => (inputsRef.current[i] = el)}
                  className="ci-otp-box"
                  style={styles.otpBox}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={v}
                  onChange={(e) => handleChange(i, e)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  aria-label={`OTP digit ${i + 1}`}
                />
              ))}
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <p style={styles.resendRow}>
              Didn't receive the OTP?{" "}
              <a
                href="#"
                className={`ci-resend${secondsLeft > 0 || resending ? " disabled" : ""}`}
                style={styles.resendLink}
                onClick={(e) => {
                  e.preventDefault();
                  handleResend();
                }}
              >
                {resending
                  ? "Resending..."
                  : secondsLeft > 0
                  ? `Resend in ${secondsLeft}s`
                  : "Resend"}
              </a>
            </p>
          </div>

          <button
            className="ci-verify-btn"
            style={{
              ...styles.verifyBtn,
              background: isComplete && !verifying ? "#1CA7D0" : "#d3d8db",
              cursor: isComplete && !verifying ? "pointer" : "not-allowed",
            }}
            type="button"
            disabled={!isComplete || verifying}
            onClick={handleVerify}
          >
            {verifying ? "Verifying..." : "Verify"}
          </button>
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
    minHeight: 460,
    background: "#ffffff",
    borderRadius: 14,
    padding: "36px 32px 32px",
    // boxShadow: "0 1px 3px rgba(16,24,32,0.08), 0 8px 24px rgba(16,24,32,0.06)",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
  },
  top: {
    flex: 1,
  },
  logoRow: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 6,
  },
  logoImg: {
    width: 44,
    height: 44,
    objectFit: "contain",
  },
  brand: {
    fontSize: 18,
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
    margin: "0 0 8px",
  },
  subtext: {
    fontSize: 13,
    color: "#8a97a0",
    margin: "0 0 24px",
    lineHeight: 1.6,
  },
  emailText: {
    color: "#3a4247",
    fontWeight: 600,
  },
  otpRow: {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginBottom: 16,
  },
  otpBox: {
    width: 46,
    height: 54,
    border: "1px solid #dfe3e6",
    borderRadius: 10,
    textAlign: "center",
    fontSize: 20,
    fontWeight: 600,
    color: "#141b1f",
    background: "#fff",
  },
  error: {
    fontSize: 12.5,
    color: "#d64545",
    margin: "0 0 12px",
    textAlign: "left",
  },
  resendRow: {
    fontSize: 12.5,
    color: "#8a97a0",
    margin: 0,
  },
  resendLink: {
    color: "#1CA7D0",
    fontWeight: 600,
    textDecoration: "none",
  },
  verifyBtn: {
    width: "100%",
    color: "#fff",
    border: "none",
    borderRadius: 9,
    padding: "13px 0",
    fontSize: 15,
    fontWeight: 600,
    marginTop: 20,
  },
};