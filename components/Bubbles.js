import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop, Text as SvgText } from "react-native-svg";
import { T } from "./theme";

// ═══════════════════════════════════════════════════════
// BUBBLES — Azurill-inspired financial mascot (SVG)
// ═══════════════════════════════════════════════════════

const MOODS = {
  happy:    { leftRx: 6, leftRy: 8, rightRx: 6, rightRy: 8, mouth: "M 42 68 Q 50 78 58 68" },
  excited:  { leftRx: 7, leftRy: 9, rightRx: 7, rightRy: 9, mouth: "M 40 66 Q 50 80 60 66" },
  worried:  { leftRx: 5, leftRy: 7, rightRx: 5, rightRy: 7, mouth: "M 43 72 Q 50 66 57 72" },
  thinking: { leftRx: 6, leftRy: 4, rightRx: 6, rightRy: 4, mouth: "M 44 70 Q 50 74 56 70" },
};

export function BubblesAvatar({ mood = "happy", size = 100 }) {
  const m = MOODS[mood] || MOODS.happy;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -6, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View style={{ width: size, height: size + 16, transform: [{ translateY: bob }] }}>
      <Svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: "visible" }}>
        <Defs>
          <RadialGradient id="bodyG" cx="45%" cy="40%">
            <Stop offset="0%" stopColor="#A8E8DD" />
            <Stop offset="100%" stopColor="#7ECEC1" />
          </RadialGradient>
          <RadialGradient id="bellyG" cx="50%" cy="40%">
            <Stop offset="0%" stopColor="#D4F5EE" />
            <Stop offset="100%" stopColor="#B8F0E8" />
          </RadialGradient>
        </Defs>

        {/* Coin halo */}
        <Circle cx="50" cy="8" r="7" fill="#E8B86D" opacity="0.9" />
        <SvgText x="50" y="12" textAnchor="middle" fontSize="9" fill="#1A1A2E" fontWeight="bold">{"\u2726"}</SvgText>

        {/* Body */}
        <Ellipse cx="50" cy="52" rx="34" ry="32" fill="url(#bodyG)" />
        {/* Belly */}
        <Ellipse cx="50" cy="58" rx="22" ry="18" fill="url(#bellyG)" opacity="0.7" />

        {/* Flippers */}
        <Ellipse cx="18" cy="48" rx="8" ry="5" fill="#6DBCAF" transform="rotate(-20 18 48)" />
        <Ellipse cx="82" cy="48" rx="8" ry="5" fill="#6DBCAF" transform="rotate(20 82 48)" />

        {/* Tail + coin */}
        <Path d="M 50 82 Q 55 92 62 88 Q 58 96 52 90" fill="#6DBCAF" />
        <Circle cx="64" cy="87" r="4" fill="#E8B86D" opacity="0.9" />

        {/* Eyes */}
        <Ellipse cx="39" cy="46" rx={m.leftRx} ry={m.leftRy} fill="#1A1A2E" />
        <Ellipse cx="61" cy="46" rx={m.rightRx} ry={m.rightRy} fill="#1A1A2E" />

        {/* Eye highlights */}
        <Ellipse cx="41" cy="43" rx="2.5" ry="3" fill="white" opacity="0.9" />
        <Ellipse cx="63" cy="43" rx="2.5" ry="3" fill="white" opacity="0.9" />
        <Circle cx="37" cy="48" r="1.2" fill="white" opacity="0.5" />
        <Circle cx="59" cy="48" r="1.2" fill="white" opacity="0.5" />

        {/* Blush */}
        <Ellipse cx="30" cy="56" rx="6" ry="3.5" fill="#FFB4C2" opacity="0.5" />
        <Ellipse cx="70" cy="56" rx="6" ry="3.5" fill="#FFB4C2" opacity="0.5" />

        {/* Mouth */}
        <Path d={m.mouth} fill="none" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════
// SPEECH BUBBLE — Conversational question text
// ═══════════════════════════════════════════════════════

export function SpeechBubble({ text }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(timer);
    }, 25);
    return () => clearInterval(timer);
  }, [text]);

  return (
    <View style={{
      flex: 1, backgroundColor: T.card, borderWidth: 1, borderColor: T.cardBorder,
      borderRadius: 16, padding: 14, marginTop: 8,
      shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    }}>
      <Text style={{ fontSize: 16, fontWeight: "600", color: T.text, lineHeight: 24 }}>
        {displayed}
        {displayed.length < text.length ? <Text style={{ color: T.gold }}>|</Text> : null}
      </Text>
      {/* Pointer triangle */}
      <View style={{
        position: "absolute", left: -8, top: 18, width: 0, height: 0,
        borderTopWidth: 8, borderTopColor: "transparent",
        borderBottomWidth: 8, borderBottomColor: "transparent",
        borderRightWidth: 8, borderRightColor: T.card,
      }} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════
// GOLD CTA BUTTON
// ═══════════════════════════════════════════════════════

export function GoldButton({ label, onPress, disabled = false, sub }) {
  return (
    <View style={{ opacity: disabled ? 0.4 : 1 }}>
      <View style={{
        borderRadius: T.radiusSm, overflow: "hidden",
        shadowColor: T.gold, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6,
      }}>
        <View
          style={{ borderRadius: T.radiusSm, backgroundColor: T.gold, paddingVertical: 17, alignItems: "center" }}
          onStartShouldSetResponder={() => !disabled}
          onResponderRelease={disabled ? undefined : onPress}
        >
          <Text style={{ fontSize: 17, fontWeight: "800", color: T.textOnAccent }}>{label}</Text>
          {sub ? <Text style={{ fontSize: 12, color: "rgba(26,26,46,0.6)", marginTop: 2 }}>{sub}</Text> : null}
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════
// PROGRESS BAR — Gold fill
// ═══════════════════════════════════════════════════════

export function ProgressBar({ current, total }) {
  const pct = (current / total) * 100;
  return (
    <View style={{ height: 4, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
      <View style={{ height: 4, borderRadius: 2, width: `${pct}%`, backgroundColor: T.gold }} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════
// SCORE RING — SVG circular progress
// ═══════════════════════════════════════════════════════

export function ScoreRing({ score, grade, size = 160, color = T.gold }) {
  const r = (size / 2) - 12;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${fill} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <SvgText x={size / 2} y={size / 2 - 6} textAnchor="middle" fill={color} fontSize="36" fontWeight="700">
          {score}
        </SvgText>
        <SvgText x={size / 2} y={size / 2 + 12} textAnchor="middle" fill={T.textSec} fontSize="13">
          /100
        </SvgText>
        {grade && (
          <SvgText x={size / 2} y={size / 2 + 32} textAnchor="middle" fill={T.text} fontSize="16" fontWeight="600">
            Grade {grade}
          </SvgText>
        )}
      </Svg>
    </View>
  );
}
