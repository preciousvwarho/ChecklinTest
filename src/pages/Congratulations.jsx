import React, { useMemo } from "react";

const CONFETTI_COLORS = ["#1CA7D0", "#7FD8C4", "#FFC96B", "#FF9E9E", "#5FE0B7"];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function generateConfetti(count) {
  return Array.from({ length: count }).map((_, i) => {
    const shape = Math.random() > 0.55 ? "circle" : "bar";
    const size = shape === "circle" ? randomBetween(6, 14) : randomBetween(10, 20);
    return {
      id: i,
      left: randomBetween(0, 100),
      top: randomBetween(0, 100),
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      shape,
      size,
      rotation: randomBetween(0, 360),
      delay: randomBetween(0, 1.4),
      duration: randomBetween(2.6, 4.2),
    };
  });
}

export default function CheckInCongratulations({ projectName = "Budget", onNext }) {
  const confetti = useMemo(() => generateConfetti(48), []);

  return (
    <div style={styles.page}>
      <style>{`
        * { box-sizing: border-box; }
        .ci-confetti-piece {
          position: absolute;
          animation: ci-drift ease-in-out infinite;
        }
        @keyframes ci-drift {
          0%, 100% { transform: translateY(0px) rotate(var(--rot)); }
          50% { transform: translateY(-10px) rotate(calc(var(--rot) + 12deg)); }
        }
        .ci-next-btn { transition: background 0.15s ease, transform 0.05s ease; }
        .ci-next-btn:hover { background: #1691b6; }
        .ci-next-btn:active { transform: scale(0.99); }

        @media (prefers-reduced-motion: reduce) {
          .ci-confetti-piece { animation: none !important; }
        }

        @media (max-width: 480px) {
          .ci-heading { font-size: 17px !important; padding: 0 12px !important; }
        }
      `}</style>

      <div style={styles.confettiLayer} aria-hidden="true">
        {confetti.map((c) => (
          <span
            key={c.id}
            className="ci-confetti-piece"
            style={{
              left: `${c.left}%`,
              top: `${c.top}%`,
              width: c.shape === "circle" ? c.size : c.size * 0.35,
              height: c.shape === "circle" ? c.size : c.size,
              background: c.color,
              borderRadius: c.shape === "circle" ? "50%" : 3,
              "--rot": `${c.rotation}deg`,
              transform: `rotate(${c.rotation}deg)`,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
            }}
          />
        ))}
      </div>

      <div style={styles.content}>
        <h1 className="ci-heading" style={styles.heading}>
          Congratulations your project {projectName} has been created.
        </h1>
      </div>

      <div style={styles.footer}>
        <button className="ci-next-btn" style={styles.nextBtn} type="button" onClick={() => onNext?.()}>
          Next
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    width: "100%",
    background: "#ffffff",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  confettiLayer: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
  },
  content: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 24px",
    position: "relative",
    zIndex: 1,
  },
  heading: {
    fontSize: 19,
    fontWeight: 700,
    color: "#141b1f",
    textAlign: "center",
    maxWidth: 380,
    lineHeight: 1.4,
    margin: 0,
  },
  footer: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 460,
    margin: "0 auto",
    padding: "0 20px 32px",
  },
  nextBtn: {
    width: "100%",
    background: "#1CA7D0",
    color: "#fff",
    border: "none",
    borderRadius: 9,
    padding: "13px 0",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
};
