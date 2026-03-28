import { useState, useEffect, useRef } from "react";

const SCREENS = 9;

const BubblesAvatar = ({ mood = "happy", size = 100, celebrating = false }) => {
  const eyeVariants = {
    happy: { left: { rx: 6, ry: 8 }, right: { rx: 6, ry: 8 } },
    excited: { left: { rx: 7, ry: 9 }, right: { rx: 7, ry: 9 } },
    worried: { left: { rx: 5, ry: 7 }, right: { rx: 5, ry: 7 } },
    thinking: { left: { rx: 6, ry: 4 }, right: { rx: 6, ry: 4 } },
  };
  const eyes = eyeVariants[mood] || eyeVariants.happy;
  const mouthPaths = {
    happy: "M 42 68 Q 50 78 58 68",
    excited: "M 40 66 Q 50 80 60 66",
    worried: "M 43 72 Q 50 66 57 72",
    thinking: "M 44 70 Q 50 74 56 70",
  };

  return (
    <div style={{ position: "relative", width: size, height: size + 20 }}>
      {celebrating && (
        <div className="confetti-container">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: [
                  "#E8B86D",
                  "#7ECEC1",
                  "#4ADE80",
                  "#F87171",
                  "#FBBF24",
                ][i % 5],
              }}
            />
          ))}
        </div>
      )}
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={`bubbles-avatar bubbles-${mood}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          <radialGradient id="bodyGrad" cx="45%" cy="40%">
            <stop offset="0%" stopColor="#A8E8DD" />
            <stop offset="100%" stopColor="#7ECEC1" />
          </radialGradient>
          <radialGradient id="bellyGrad" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#D4F5EE" />
            <stop offset="100%" stopColor="#B8F0E8" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Crown / Coin Halo */}
        <circle
          cx="50"
          cy="8"
          r="7"
          fill="#E8B86D"
          filter="url(#glow)"
          opacity="0.9"
        />
        <text
          x="50"
          y="12"
          textAnchor="middle"
          fontSize="9"
          fill="#1A1A2E"
          fontWeight="bold"
        >
          ✦
        </text>
        {/* Body */}
        <ellipse cx="50" cy="52" rx="34" ry="32" fill="url(#bodyGrad)" />
        {/* Belly */}
        <ellipse
          cx="50"
          cy="58"
          rx="22"
          ry="18"
          fill="url(#bellyGrad)"
          opacity="0.7"
        />
        {/* Left Flipper */}
        <ellipse
          cx="18"
          cy="48"
          rx="8"
          ry="5"
          fill="#6DBCAF"
          transform="rotate(-20 18 48)"
          className="flipper-left"
        />
        {/* Right Flipper */}
        <ellipse
          cx="82"
          cy="48"
          rx="8"
          ry="5"
          fill="#6DBCAF"
          transform="rotate(20 82 48)"
          className="flipper-right"
        />
        {/* Tail */}
        <path
          d="M 50 82 Q 55 92 62 88 Q 58 96 52 90"
          fill="#6DBCAF"
          className="tail"
        />
        <circle cx="64" cy="87" r="4" fill="#E8B86D" opacity="0.9" />
        {/* Eyes */}
        <ellipse
          cx="39"
          cy="46"
          rx={eyes.left.rx}
          ry={eyes.left.ry}
          fill="#1A1A2E"
          className="eye-left"
        />
        <ellipse
          cx="61"
          cy="46"
          rx={eyes.right.rx}
          ry={eyes.right.ry}
          fill="#1A1A2E"
          className="eye-right"
        />
        {/* Eye Highlights */}
        <ellipse cx="41" cy="43" rx="2.5" ry="3" fill="white" opacity="0.9" />
        <ellipse cx="63" cy="43" rx="2.5" ry="3" fill="white" opacity="0.9" />
        <circle cx="37" cy="48" r="1.2" fill="white" opacity="0.5" />
        <circle cx="59" cy="48" r="1.2" fill="white" opacity="0.5" />
        {/* Blush */}
        <ellipse cx="30" cy="56" rx="6" ry="3.5" fill="#FFB4C2" opacity="0.5" />
        <ellipse cx="70" cy="56" rx="6" ry="3.5" fill="#FFB4C2" opacity="0.5" />
        {/* Mouth */}
        <path
          d={mouthPaths[mood]}
          fill="none"
          stroke="#1A1A2E"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

const SpeechBubble = ({ text, delay = 0 }) => {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, 25);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text]);
  return (
    <div className="speech-bubble" style={{ minHeight: 50 }}>
      <span>{displayed}</span>
      {!done && <span className="cursor-blink">|</span>}
      <div className="speech-pointer" />
    </div>
  );
};

const ProgressBar = ({ current, total }) => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      background: "rgba(255,255,255,0.06)",
      zIndex: 100,
    }}
  >
    <div
      className="progress-fill"
      style={{
        width: `${(current / total) * 100}%`,
        height: "100%",
        background: "linear-gradient(90deg, #E8B86D, #F0D090)",
        borderRadius: "0 2px 2px 0",
        transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
      }}
    />
  </div>
);

const GoldButton = ({ children, onClick, pulse = false, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`gold-btn ${pulse ? "pulse-btn" : ""}`}
    style={{
      opacity: disabled ? 0.4 : 1,
      cursor: disabled ? "not-allowed" : "pointer",
    }}
  >
    {children}
  </button>
);

const PillSelect = ({ options, value, onChange }) => (
  <div style={{ display: "flex", gap: 12 }}>
    {options.map((o) => (
      <button
        key={o}
        onClick={() => onChange(o)}
        className={`pill-btn ${value === o ? "pill-active" : ""}`}
      >
        {o}
      </button>
    ))}
  </div>
);

export default function FinBuddyApp() {
  const [screen, setScreen] = useState(0);
  const [income, setIncome] = useState(50000);
  const [expenses, setExpenses] = useState(25000);
  const [goal, setGoal] = useState(null);
  const [risk, setRisk] = useState(null);
  const [dependents, setDependents] = useState(null);
  const [debt, setDebt] = useState(null);
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [scoreAnim, setScoreAnim] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [slideDir, setSlideDir] = useState("right");

  const ratio = income > 0 ? Math.round((expenses / income) * 100) : 0;
  const ratioColor =
    ratio < 50 ? "#4ADE80" : ratio < 70 ? "#FBBF24" : "#F87171";
  const ratioLabel =
    ratio < 50
      ? "Healthy! 🎉"
      : ratio < 70
        ? "Getting tight 😬"
        : "Risky zone 🚨";

  const finalScore = Math.max(
    20,
    Math.min(
      95,
      100 -
        (ratio > 70 ? 30 : ratio > 50 ? 15 : 0) -
        (debt === "YES" ? 12 : 0) -
        (dependents === "YES" ? 5 : 0) +
        (goal === "Build Wealth" ? 5 : 0) +
        (risk === "Balanced" ? 3 : risk === "Play Safe" ? 5 : -2),
    ),
  );

  const grade =
    finalScore >= 80
      ? "A"
      : finalScore >= 60
        ? "B"
        : finalScore >= 40
          ? "C"
          : "D";

  const next = () => {
    setSlideDir("right");
    setScreen((s) => Math.min(s + 1, SCREENS - 1));
  };
  const back = () => {
    setSlideDir("left");
    setScreen((s) => Math.max(s - 1, 0));
  };

  // Analyze screen auto-advance
  useEffect(() => {
    if (screen === 6) {
      setAnalyzeStep(0);
      const t1 = setTimeout(() => setAnalyzeStep(1), 2000);
      const t2 = setTimeout(() => setAnalyzeStep(2), 4000);
      const t3 = setTimeout(() => {
        setAnalyzeStep(3);
        setTimeout(next, 800);
      }, 5500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [screen]);

  // Score count-up
  useEffect(() => {
    if (screen === 7) {
      setScoreAnim(0);
      let start = null;
      const dur = 2000;
      const step = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / dur, 1);
        setScoreAnim(Math.round(p * finalScore));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }, [screen, finalScore]);

  const formatMoney = (n) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
    return `₹${n}`;
  };

  const dimensions = [
    { icon: "🏦", name: "Emergency", score: Math.max(10, finalScore - 25) },
    { icon: "🛡️", name: "Insurance", score: Math.max(10, finalScore - 40) },
    { icon: "📈", name: "Investments", score: Math.min(95, finalScore + 10) },
    {
      icon: "💳",
      name: "Debt",
      score:
        debt === "YES"
          ? Math.max(10, finalScore - 20)
          : Math.min(90, finalScore + 5),
    },
    { icon: "📋", name: "Tax", score: Math.max(20, finalScore - 15) },
    { icon: "🏖️", name: "Retirement", score: Math.max(15, finalScore - 30) },
  ];

  const dimColor = (s) =>
    s >= 70 ? "#4ADE80" : s >= 45 ? "#FBBF24" : "#F87171";

  const screens = [
    // 0: Welcome
    <div
      key="welcome"
      className="screen-content fade-in"
      style={{ textAlign: "center", paddingTop: 60 }}
    >
      <div className="welcome-glow" />
      <BubblesAvatar mood="excited" size={140} />
      <h1
        style={{
          fontFamily: "Fraunces, serif",
          fontSize: 36,
          color: "#E8B86D",
          margin: "16px 0 8px",
          fontWeight: 700,
        }}
      >
        FinBuddy
      </h1>
      <p style={{ color: "#A0A0B8", fontSize: 16, marginBottom: 40 }}>
        Your cute companion for money wellness ✨
      </p>
      <GoldButton onClick={next} pulse>
        Let's Go!
      </GoldButton>
      <div className="floating-coins">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="floating-coin"
            style={{
              left: `${15 + i * 14}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${3 + i * 0.5}s`,
            }}
          >
            ✦
          </div>
        ))}
      </div>
    </div>,

    // 1: Income
    <div key="income" className="screen-content stagger-in">
      <div className="avatar-row">
        <BubblesAvatar mood="happy" size={90} />
        <SpeechBubble text="First things first! 💰 How much do you earn each month?" />
      </div>
      <div style={{ textAlign: "center", margin: "32px 0 16px" }}>
        <div
          style={{
            fontFamily: "Fraunces, serif",
            fontSize: 48,
            color: "#E8B86D",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          ₹{income.toLocaleString("en-IN")}
        </div>
      </div>
      <input
        type="range"
        min={10000}
        max={500000}
        step={1000}
        value={income}
        onChange={(e) => setIncome(+e.target.value)}
        className="gold-slider"
      />
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "center",
          margin: "16px 0 32px",
          flexWrap: "wrap",
        }}
      >
        {[25000, 50000, 100000, 200000].map((v) => (
          <button
            key={v}
            onClick={() => setIncome(v)}
            className={`quick-pill ${income === v ? "pill-active" : ""}`}
          >
            {formatMoney(v)}
          </button>
        ))}
      </div>
      <GoldButton onClick={next}>Continue</GoldButton>
    </div>,

    // 2: Expenses + Ring
    <div key="expenses" className="screen-content stagger-in">
      <div className="avatar-row">
        <BubblesAvatar
          mood={ratio < 50 ? "happy" : ratio < 70 ? "thinking" : "worried"}
          size={90}
        />
        <SpeechBubble text="Now, how much goes to essentials? Rent, food, bills... 🏠" />
      </div>
      <div style={{ textAlign: "center", margin: "24px 0 12px" }}>
        <div
          style={{
            fontFamily: "Fraunces, serif",
            fontSize: 40,
            color: "#F1F1F1",
            fontWeight: 700,
          }}
        >
          ₹{expenses.toLocaleString("en-IN")}
        </div>
      </div>
      <input
        type="range"
        min={5000}
        max={income}
        step={1000}
        value={Math.min(expenses, income)}
        onChange={(e) => setExpenses(+e.target.value)}
        className="gold-slider"
      />
      <div
        style={{ display: "flex", justifyContent: "center", margin: "24px 0" }}
      >
        <svg viewBox="0 0 120 120" width={140} height={140}>
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke={ratioColor}
            strokeWidth="10"
            strokeDasharray={`${(ratio / 100) * 314} 314`}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            style={{
              transition: "stroke-dasharray 0.4s ease, stroke 0.4s ease",
            }}
          />
          <text
            x="60"
            y="55"
            textAnchor="middle"
            fill={ratioColor}
            fontFamily="Fraunces, serif"
            fontSize="22"
            fontWeight="700"
          >
            {ratio}%
          </text>
          <text
            x="60"
            y="75"
            textAnchor="middle"
            fill="#A0A0B8"
            fontFamily="DM Sans, sans-serif"
            fontSize="10"
          >
            {ratioLabel}
          </text>
        </svg>
      </div>
      <GoldButton onClick={next}>Continue</GoldButton>
    </div>,

    // 3: Goal
    <div key="goal" className="screen-content stagger-in">
      <div className="avatar-row">
        <BubblesAvatar mood={goal ? "excited" : "happy"} size={90} />
        <SpeechBubble text="What's your money mission right now? Pick one! 🎯" />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          margin: "24px 0",
        }}
      >
        {[
          {
            icon: "🛡️",
            label: "Stay Safe",
            sub: "Build a safety net for peace of mind",
            tint: "rgba(126,206,193,0.1)",
          },
          {
            icon: "🌱",
            label: "Build Wealth",
            sub: "Grow your money and invest smarter",
            tint: "rgba(74,222,128,0.1)",
          },
          {
            icon: "🔥",
            label: "Destroy Debt",
            sub: "Crush loans and breathe free",
            tint: "rgba(248,113,113,0.1)",
          },
        ].map((g) => (
          <button
            key={g.label}
            onClick={() => setGoal(g.label)}
            className={`goal-card ${goal === g.label ? "goal-active" : ""}`}
            style={{
              background: goal === g.label ? "rgba(232,184,109,0.12)" : g.tint,
            }}
          >
            <span style={{ fontSize: 28, marginRight: 14 }}>{g.icon}</span>
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  fontFamily: "Fraunces, serif",
                  fontSize: 18,
                  color: "#F1F1F1",
                  fontWeight: 600,
                }}
              >
                {g.label}
              </div>
              <div style={{ fontSize: 13, color: "#A0A0B8", marginTop: 2 }}>
                {g.sub}
              </div>
            </div>
            {goal === g.label && (
              <span
                style={{ marginLeft: "auto", color: "#E8B86D", fontSize: 20 }}
              >
                ✓
              </span>
            )}
          </button>
        ))}
      </div>
      <GoldButton onClick={next} disabled={!goal}>
        Continue
      </GoldButton>
    </div>,

    // 4: Risk
    <div key="risk" className="screen-content stagger-in">
      <div className="avatar-row">
        <BubblesAvatar
          mood={
            risk === "YOLO"
              ? "excited"
              : risk === "Play Safe"
                ? "thinking"
                : "happy"
          }
          size={90}
        />
        <SpeechBubble text="How do you feel about financial risk? Be honest! 😄" />
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          margin: "32px 0",
          justifyContent: "center",
        }}
      >
        {[
          { icon: "🐢", label: "Play Safe", tint: "rgba(74,222,128,0.1)" },
          { icon: "⚖️", label: "Balanced", tint: "rgba(126,206,193,0.1)" },
          { icon: "🚀", label: "YOLO", tint: "rgba(248,113,113,0.1)" },
        ].map((r) => (
          <button
            key={r.label}
            onClick={() => setRisk(r.label)}
            className={`risk-card ${risk === r.label ? "risk-active" : ""}`}
            style={{
              background: risk === r.label ? "rgba(232,184,109,0.12)" : r.tint,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>{r.icon}</div>
            <div
              style={{
                fontFamily: "Fraunces, serif",
                fontSize: 15,
                color: "#F1F1F1",
                fontWeight: 600,
              }}
            >
              {r.label}
            </div>
          </button>
        ))}
      </div>
      <GoldButton onClick={next} disabled={!risk}>
        Continue
      </GoldButton>
    </div>,

    // 5: Quick flags
    <div key="flags" className="screen-content stagger-in">
      <div className="avatar-row">
        <BubblesAvatar mood="happy" size={90} />
        <SpeechBubble text="Almost there! Just a couple quick ones... 📋" />
      </div>
      <div style={{ margin: "32px 0" }}>
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              color: "#A0A0B8",
              fontSize: 14,
              marginBottom: 10,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Do you have dependents?
          </div>
          <PillSelect
            options={["YES", "NO"]}
            value={dependents}
            onChange={setDependents}
          />
        </div>
        <div>
          <div
            style={{
              color: "#A0A0B8",
              fontSize: 14,
              marginBottom: 10,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Any credit card debt?
          </div>
          <PillSelect options={["YES", "NO"]} value={debt} onChange={setDebt} />
        </div>
      </div>
      <GoldButton onClick={next} disabled={!dependents || !debt}>
        Continue
      </GoldButton>
    </div>,

    // 6: Analyzing
    <div
      key="analyze"
      className="screen-content fade-in"
      style={{ textAlign: "center", paddingTop: 40 }}
    >
      <BubblesAvatar mood="thinking" size={110} />
      <SpeechBubble
        text={
          analyzeStep === 0
            ? "Crunching your numbers... 🔢"
            : analyzeStep === 1
              ? "Ooh, interesting... 🤔"
              : analyzeStep === 2
                ? "Your results are ready! 🎉"
                : "Let's see! ✨"
        }
      />
      <div style={{ margin: "32px 0" }}>
        <svg viewBox="0 0 120 120" width={100} height={100}>
          <circle
            cx="60"
            cy="60"
            r="46"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="6"
          />
          <circle
            cx="60"
            cy="60"
            r="46"
            fill="none"
            stroke="#E8B86D"
            strokeWidth="6"
            strokeDasharray={`${((analyzeStep + 1) / 3) * 289} 289`}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
      </div>
      <div style={{ color: "#A0A0B8", fontSize: 15 }}>
        {analyzeStep === 0 && "📊 Analyzing income patterns..."}
        {analyzeStep === 1 && "🧠 Calculating your financial personality..."}
        {analyzeStep >= 2 && "✨ Generating your Money Health Score..."}
      </div>
    </div>,

    // 7: Score Reveal
    <div
      key="score"
      className="screen-content stagger-in"
      style={{ textAlign: "center", paddingTop: 20 }}
    >
      <BubblesAvatar mood="excited" size={90} celebrating={screen === 7} />
      <SpeechBubble text="Here's your Money Health Score! 🏆" />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          margin: "24px 0 12px",
        }}
      >
        <svg viewBox="0 0 160 160" width={180} height={180}>
          <circle
            cx="80"
            cy="80"
            r="68"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="12"
          />
          <circle
            cx="80"
            cy="80"
            r="68"
            fill="none"
            stroke="#E8B86D"
            strokeWidth="12"
            strokeDasharray={`${(scoreAnim / 100) * 427} 427`}
            strokeLinecap="round"
            transform="rotate(-90 80 80)"
          />
          <text
            x="80"
            y="72"
            textAnchor="middle"
            fill="#E8B86D"
            fontFamily="Fraunces, serif"
            fontSize="40"
            fontWeight="700"
          >
            {scoreAnim}
          </text>
          <text
            x="80"
            y="90"
            textAnchor="middle"
            fill="#A0A0B8"
            fontFamily="DM Sans, sans-serif"
            fontSize="13"
          >
            /100
          </text>
          <text
            x="80"
            y="112"
            textAnchor="middle"
            fill="#F1F1F1"
            fontFamily="Fraunces, serif"
            fontSize="16"
            fontWeight="600"
          >
            Grade {grade}
          </text>
        </svg>
      </div>
      <p style={{ color: "#A0A0B8", fontSize: 14, marginBottom: 20 }}>
        {finalScore >= 80
          ? "You're financially strong! 💪"
          : finalScore >= 60
            ? "Doing okay, room to grow! 💪"
            : "Let's work on this together! 💕"}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 24,
        }}
      >
        {dimensions.map((d) => (
          <div key={d.name} className="dim-card">
            <span style={{ marginRight: 6 }}>{d.icon}</span>
            <span style={{ flex: 1, fontSize: 13, color: "#F1F1F1" }}>
              {d.name}
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: dimColor(d.score),
                fontFamily: "Fraunces, serif",
              }}
            >
              {d.score}
            </span>
          </div>
        ))}
      </div>
      <GoldButton onClick={next}>View Full Dashboard →</GoldButton>
    </div>,

    // 8: Dashboard
    <div
      key="dash"
      className="screen-content stagger-in"
      style={{ paddingBottom: 80 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <svg viewBox="0 0 80 80" width={60} height={60}>
          <circle
            cx="40"
            cy="40"
            r="32"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="6"
          />
          <circle
            cx="40"
            cy="40"
            r="32"
            fill="none"
            stroke="#E8B86D"
            strokeWidth="6"
            strokeDasharray={`${(finalScore / 100) * 201} 201`}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
          />
          <text
            x="40"
            y="43"
            textAnchor="middle"
            fill="#E8B86D"
            fontFamily="Fraunces, serif"
            fontSize="18"
            fontWeight="700"
          >
            {finalScore}
          </text>
        </svg>
        <div>
          <div
            style={{
              fontFamily: "Fraunces, serif",
              fontSize: 20,
              color: "#F1F1F1",
              fontWeight: 700,
            }}
          >
            Grade {grade}
          </div>
          <div style={{ fontSize: 13, color: "#A0A0B8" }}>
            {finalScore >= 80
              ? "Financially strong"
              : finalScore >= 60
                ? "Room to improve"
                : "Needs attention"}
          </div>
        </div>
      </div>

      <div
        style={{
          fontFamily: "Fraunces, serif",
          fontSize: 16,
          color: "#F87171",
          marginBottom: 10,
        }}
      >
        ⚠️ Alerts
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 24,
        }}
      >
        {ratio > 50 && (
          <div className="alert-card">
            ⚠️ High expense ratio ({ratio}%){" "}
            <span className="fix-btn">Fix this →</span>
          </div>
        )}
        {debt === "YES" && (
          <div className="alert-card">
            ⚠️ Credit card debt detected{" "}
            <span className="fix-btn">Fix this →</span>
          </div>
        )}
        <div className="alert-card">
          ⚠️ No emergency fund data <span className="fix-btn">Fix this →</span>
        </div>
      </div>

      <div
        style={{
          fontFamily: "Fraunces, serif",
          fontSize: 16,
          color: "#F1F1F1",
          marginBottom: 10,
        }}
      >
        Cashflow
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { l: "Income", v: income, c: "#4ADE80" },
          { l: "Expenses", v: expenses, c: "#F87171" },
          { l: "Savings", v: income - expenses, c: "#E8B86D" },
        ].map((s) => (
          <div key={s.l} className="stat-box">
            <div style={{ fontSize: 11, color: "#A0A0B8" }}>{s.l}</div>
            <div
              style={{
                fontSize: 16,
                fontFamily: "Fraunces, serif",
                fontWeight: 700,
                color: s.c,
              }}
            >
              {formatMoney(s.v)}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          fontFamily: "Fraunces, serif",
          fontSize: 16,
          color: "#F1F1F1",
          marginBottom: 10,
        }}
      >
        Health Dimensions
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 24,
        }}
      >
        {dimensions.map((d) => (
          <div key={d.name} className="dim-card">
            <span style={{ marginRight: 6 }}>{d.icon}</span>
            <span style={{ flex: 1, fontSize: 13 }}>{d.name}</span>
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: "rgba(255,255,255,0.1)",
                marginLeft: 4,
              }}
            >
              <div
                style={{
                  width: `${d.score}%`,
                  height: "100%",
                  borderRadius: 2,
                  background: dimColor(d.score),
                  transition: "width 1s ease",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="doc-card">
        📄 No documents uploaded yet
        <br />
        <span style={{ color: "#E8B86D", fontSize: 13 }}>
          Upload for better accuracy →
        </span>
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setShowChat(true)}>
        💬
      </button>

      {showChat && (
        <div className="chat-overlay" onClick={() => setShowChat(false)}>
          <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <BubblesAvatar mood="happy" size={40} />
              <div
                style={{
                  fontFamily: "Fraunces, serif",
                  fontSize: 18,
                  color: "#F1F1F1",
                }}
              >
                AI Coach
              </div>
              <button
                onClick={() => setShowChat(false)}
                style={{
                  marginLeft: "auto",
                  background: "none",
                  border: "none",
                  color: "#A0A0B8",
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
            <div className="chat-bubble bot">
              Hi! Your score is {finalScore}.{" "}
              {finalScore < 70
                ? "Let's work on improving it!"
                : "Great job! Want tips to go even higher?"}
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 12,
              }}
            >
              {[
                "How can I improve?",
                "Am I saving enough?",
                "Where do I overspend?",
              ].map((s) => (
                <button key={s} className="chip">
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>,
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,500;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #1A1A2E; }

        .app-container {
          width: 100vw; min-height: 100vh; background: linear-gradient(180deg, #1A1A2E 0%, #16213E 100%);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          font-family: 'DM Sans', sans-serif; color: #F1F1F1; overflow-x: hidden;
        }

        .screen-wrapper {
          width: 100%; max-width: 440px; padding: 20px 24px; min-height: 100vh;
          display: flex; flex-direction: column; justify-content: center;
        }

        .screen-content { position: relative; }

        .avatar-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; }

        .speech-bubble {
          background: #242442; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;
          padding: 14px 18px; font-family: 'Fraunces', serif; font-size: 17px; color: #F1F1F1;
          position: relative; max-width: 280px; line-height: 1.5; margin-top: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .speech-pointer {
          position: absolute; left: -8px; top: 18px; width: 0; height: 0;
          border-top: 8px solid transparent; border-bottom: 8px solid transparent;
          border-right: 8px solid #242442;
        }
        .cursor-blink { animation: blink 0.8s infinite; color: #E8B86D; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

        .gold-btn {
          width: 100%; padding: 16px; border: none; border-radius: 14px;
          background: linear-gradient(135deg, #E8B86D, #D4A35A); color: #1A1A2E;
          font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 700;
          cursor: pointer; transition: transform 0.15s, box-shadow 0.3s;
        }
        .gold-btn:active { transform: scale(0.97); }
        .pulse-btn { animation: pulse 2s infinite; }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(232,184,109,0.4); }
          50% { box-shadow: 0 0 0 12px rgba(232,184,109,0); }
        }

        .gold-slider {
          -webkit-appearance: none; width: 100%; height: 6px; border-radius: 3px;
          background: rgba(255,255,255,0.08); outline: none;
        }
        .gold-slider::-webkit-slider-thumb {
          -webkit-appearance: none; width: 28px; height: 28px; border-radius: 50%;
          background: radial-gradient(circle at 40% 35%, #F0D090, #E8B86D); cursor: pointer;
          box-shadow: 0 2px 10px rgba(232,184,109,0.4);
        }

        .quick-pill, .pill-btn {
          padding: 10px 20px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.1);
          background: #242442; color: #A0A0B8; font-family: 'DM Sans', sans-serif;
          font-size: 14px; cursor: pointer; transition: all 0.2s;
        }
        .pill-active, .quick-pill.pill-active {
          background: rgba(232,184,109,0.15); border-color: #E8B86D; color: #E8B86D;
          transform: scale(1.05);
        }

        .goal-card {
          display: flex; align-items: center; padding: 18px 20px; border-radius: 16px;
          border: 1.5px solid rgba(255,255,255,0.06); cursor: pointer;
          transition: all 0.2s; width: 100%; text-align: left;
        }
        .goal-active { border-color: #E8B86D; transform: translateY(-2px); box-shadow: 0 4px 20px rgba(232,184,109,0.15); }
        .goal-card:not(.goal-active):hover { border-color: rgba(255,255,255,0.15); }

        .risk-card {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 20px 16px; border-radius: 16px; border: 1.5px solid rgba(255,255,255,0.06);
          cursor: pointer; transition: all 0.2s; width: 110px;
        }
        .risk-active { border-color: #E8B86D; transform: scale(1.05); box-shadow: 0 4px 20px rgba(232,184,109,0.15); }

        .dim-card {
          display: flex; align-items: center; padding: 12px 14px; border-radius: 12px;
          background: #242442; border: 1px solid rgba(255,255,255,0.06);
        }

        .alert-card {
          padding: 14px 16px; border-radius: 12px; background: rgba(248,113,113,0.08);
          border: 1px solid rgba(248,113,113,0.2); font-size: 14px; color: #F1F1F1;
          display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
        }
        .fix-btn { color: #E8B86D; font-size: 13px; margin-left: auto; cursor: pointer; }

        .stat-box {
          flex: 1; padding: 14px; border-radius: 12px; background: #242442;
          border: 1px solid rgba(255,255,255,0.06); text-align: center;
        }

        .doc-card {
          padding: 16px; border-radius: 14px; background: #242442;
          border: 1px solid rgba(255,255,255,0.06); font-size: 14px; color: "#A0A0B8"; text-align: center;
        }

        .fab {
          position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
          border-radius: 50%; background: linear-gradient(135deg, #E8B86D, #D4A35A);
          border: none; font-size: 24px; cursor: pointer; box-shadow: 0 4px 20px rgba(232,184,109,0.4);
          z-index: 50; display: flex; align-items: center; justify-content: center;
          transition: transform 0.2s;
        }
        .fab:hover { transform: scale(1.1); }

        .chat-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100;
          display: flex; align-items: flex-end; justify-content: center;
        }
        .chat-modal {
          background: #1A1A2E; border-radius: 20px 20px 0 0; padding: 24px;
          width: 100%; max-width: 440px; max-height: 60vh; border: 1px solid rgba(255,255,255,0.08);
        }
        .chat-bubble { padding: 12px 16px; border-radius: 14px; font-size: 14px; line-height: 1.5; margin-bottom: 8px; }
        .chat-bubble.bot { background: #242442; border: 1px solid rgba(255,255,255,0.06); color: #F1F1F1; }
        .chip {
          padding: 8px 14px; border-radius: 999px; background: rgba(232,184,109,0.1);
          border: 1px solid rgba(232,184,109,0.3); color: #E8B86D; font-size: 13px; cursor: pointer;
        }

        .welcome-glow {
          position: absolute; top: 30%; left: 50%; transform: translate(-50%, -50%);
          width: 250px; height: 250px; border-radius: 50%;
          background: radial-gradient(circle, rgba(232,184,109,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .floating-coins { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
        .floating-coin {
          position: absolute; color: #E8B86D; font-size: 18px; opacity: 0.3;
          animation: floatUp linear infinite;
        }
        @keyframes floatUp {
          0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
          10% { opacity: 0.3; }
          90% { opacity: 0.3; }
          100% { transform: translateY(-20px) rotate(360deg); opacity: 0; }
        }

        .bubbles-avatar { animation: bob 2.5s ease-in-out infinite; }
        @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }

        .bubbles-thinking { animation: tilt 1.5s ease-in-out infinite; }
        @keyframes tilt { 0%, 100% { transform: rotate(0deg) translateY(0); } 25% { transform: rotate(-4deg) translateY(-3px); } 75% { transform: rotate(4deg) translateY(-3px); } }

        .confetti-container { position: absolute; inset: -20px; pointer-events: none; overflow: visible; z-index: 10; }
        .confetti-piece {
          position: absolute; width: 6px; height: 6px; border-radius: 50%;
          animation: confettiBurst 1.5s ease-out forwards;
        }
        @keyframes confettiBurst {
          0% { transform: translateY(0) scale(0); opacity: 1; }
          100% { transform: translateY(-80px) translateX(var(--x, 20px)) scale(1); opacity: 0; }
        }
        .confetti-piece:nth-child(odd) { --x: -30px; border-radius: 2px; width: 4px; height: 8px; }
        .confetti-piece:nth-child(even) { --x: 25px; }
        .confetti-piece:nth-child(3n) { --x: -15px; }
        .confetti-piece:nth-child(4n) { --x: 40px; }

        .flipper-left { animation: wave 2s ease-in-out infinite; transform-origin: 22px 48px; }
        @keyframes wave { 0%, 100% { transform: rotate(-20deg); } 50% { transform: rotate(-35deg); } }

        .stagger-in > * { animation: staggerFade 0.4s ease-out backwards; }
        .stagger-in > *:nth-child(1) { animation-delay: 0ms; }
        .stagger-in > *:nth-child(2) { animation-delay: 80ms; }
        .stagger-in > *:nth-child(3) { animation-delay: 160ms; }
        .stagger-in > *:nth-child(4) { animation-delay: 240ms; }
        .stagger-in > *:nth-child(5) { animation-delay: 320ms; }
        @keyframes staggerFade { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

        .fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <div className="app-container">
        {screen > 0 && screen < 7 && <ProgressBar current={screen} total={7} />}
        <div className="screen-wrapper" key={screen}>
          {screen > 0 && screen < 7 && (
            <button
              onClick={back}
              style={{
                position: "fixed",
                top: 14,
                left: 16,
                background: "none",
                border: "none",
                color: "#A0A0B8",
                fontSize: 22,
                cursor: "pointer",
                zIndex: 101,
              }}
            >
              ←
            </button>
          )}
          {screens[screen]}
        </div>
      </div>
    </>
  );
}
