import React from "react";
import { View, Text, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path, Rect, G, Ellipse, Defs, Pattern, Text as SvgText } from "react-native-svg";
import type { Rank, Suit } from "@touti/shared";
import { getCardComponent } from "./cardAssets";

// ─── Palette baraja (design/extracted/touti/project/cards.jsx) ────

const BARAJA = {
  blue: "#1E4FB8",
  blueDk: "#0F2E7A",
  red: "#E62020",
  redDk: "#A8141A",
  yellow: "#F2C42E",
  yellowDk: "#C89510",
  skin: "#F4D5A8",
  skinSh: "#D4A578",
  ink: "#151515",
  paper: "#FBF6EA",
  green: "#2D7F3D",
} as const;

// ─── Tailles ──────────────────────────────────────────────────────

export type CardSize = "sm" | "md" | "lg" | "xl";

const SIZES: Record<CardSize, { w: number; h: number; fs: number; pip: number }> = {
  sm: { w: 44, h: 64, fs: 9, pip: 9 },
  md: { w: 62, h: 92, fs: 12, pip: 13 },
  lg: { w: 84, h: 124, fs: 15, pip: 18 },
  xl: { w: 110, h: 162, fs: 19, pip: 24 },
};

// ─── Glyphes de couleur ───────────────────────────────────────────

function Oro({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={20} cy={20} r={16} fill={BARAJA.yellow} stroke={BARAJA.ink} strokeWidth={1.6} />
      <Circle cx={20} cy={20} r={11} fill="none" stroke={BARAJA.ink} strokeWidth={1} />
      <Path
        d="M20 10 L22.5 17.5 L30 17.5 L24 22 L26.5 29.5 L20 25 L13.5 29.5 L16 22 L10 17.5 L17.5 17.5 Z"
        fill={BARAJA.red}
        stroke={BARAJA.ink}
        strokeWidth={0.8}
      />
    </Svg>
  );
}

function Copa({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M9 10 Q20 7 31 10 L29 20 Q29 27 20 28 Q11 27 11 20 Z"
        fill={BARAJA.red}
        stroke={BARAJA.ink}
        strokeWidth={1.5}
      />
      <Path d="M9 10 Q20 7 31 10 L31 12 Q20 9 9 12 Z" fill={BARAJA.yellow} stroke={BARAJA.ink} strokeWidth={1} />
      <Path d="M12 18 Q20 19 28 18" stroke={BARAJA.yellow} strokeWidth={2} fill="none" />
      <Rect x={17} y={28} width={6} height={3} fill={BARAJA.yellow} stroke={BARAJA.ink} strokeWidth={1} />
      <Ellipse cx={20} cy={33} rx={8} ry={2.2} fill={BARAJA.yellow} stroke={BARAJA.ink} strokeWidth={1} />
    </Svg>
  );
}

function Espada({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path d="M20 3 L22 28 L18 28 Z" fill={BARAJA.blue} stroke={BARAJA.ink} strokeWidth={1.2} />
      <Path d="M20 3 L21 28 L19 28 Z" fill={BARAJA.blueDk} opacity={0.5} />
      <Rect x={11} y={26} width={18} height={3.5} rx={0.5} fill={BARAJA.yellow} stroke={BARAJA.ink} strokeWidth={1} />
      <Rect x={18.5} y={29.5} width={3} height={5} fill={BARAJA.red} stroke={BARAJA.ink} strokeWidth={0.8} />
      <Circle cx={20} cy={36} r={2.2} fill={BARAJA.yellow} stroke={BARAJA.ink} strokeWidth={1} />
    </Svg>
  );
}

function Basto({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M17 4 Q20 3 23 4 L24.5 34 Q20 36 15.5 34 Z"
        fill={BARAJA.yellow}
        stroke={BARAJA.ink}
        strokeWidth={1.4}
      />
      <Ellipse cx={20} cy={10} rx={4} ry={1.8} fill={BARAJA.yellowDk} stroke={BARAJA.ink} strokeWidth={0.6} />
      <Ellipse cx={20} cy={19} rx={4} ry={1.8} fill={BARAJA.yellowDk} stroke={BARAJA.ink} strokeWidth={0.6} />
      <Ellipse cx={20} cy={28} rx={4.2} ry={1.8} fill={BARAJA.yellowDk} stroke={BARAJA.ink} strokeWidth={0.6} />
      <Path d="M17 4 Q13 2 15 6 M23 4 Q27 2 25 6" stroke={BARAJA.green} strokeWidth={1.5} fill="none" />
    </Svg>
  );
}

export function SuitGlyph({ suit, size = 24 }: { suit: Suit; size?: number }) {
  if (suit === "oros") return <Oro size={size} />;
  if (suit === "copas") return <Copa size={size} />;
  if (suit === "espadas") return <Espada size={size} />;
  return <Basto size={size} />;
}

// ─── Figures royales (style monogramme moderne) ───────────────────
// Plutôt que des illustrations de personnages hasardeuses, on utilise une
// grosse lettre décorative (S / C / R) centrée au-dessus du symbole de
// couleur. Clean, lisible, reconnaissable, impossible de rater.

function FigureMonogram({
  letter,
  suit,
  ornament,
}: {
  letter: string;
  suit: Suit;
  ornament?: React.ReactNode;
}) {
  return (
    <Svg viewBox="0 0 60 90" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {/* Ornement facultatif (couronne pour Rey, etc.) */}
      {ornament}
      {/* Lettre principale */}
      <SvgText
        x={30}
        y={50}
        textAnchor="middle"
        fontSize={38}
        fontWeight="700"
        fontFamily="Georgia"
        fill={BARAJA.ink}
      >
        {letter}
      </SvgText>
      {/* Trait de séparation */}
      <Path d="M16 58 L44 58" stroke={BARAJA.ink} strokeWidth={0.5} />
      {/* Symbole de couleur (grand) */}
      <G transform="translate(12, 60) scale(1.6)">
        <SuitGlyph suit={suit} size={24} />
      </G>
    </Svg>
  );
}

function Sota({ suit }: { suit: Suit }) {
  return <FigureMonogram letter="S" suit={suit} />;
}

function Caballo({ suit }: { suit: Suit }) {
  return (
    <FigureMonogram
      letter="C"
      suit={suit}
      ornament={
        /* Silhouette minimaliste de tête de cavalier (chess-knight) au-dessus */
        <G transform="translate(22, 10)">
          <Path
            d="M8 16 L8 12 Q8 4 14 4 L18 4 L18 0 L14 0 Q4 0 4 12 L4 16 Z"
            fill={BARAJA.ink}
            opacity={0.25}
          />
        </G>
      }
    />
  );
}

function Rey({ suit }: { suit: Suit }) {
  return (
    <FigureMonogram
      letter="R"
      suit={suit}
      ornament={
        /* Petite couronne au-dessus de la lettre */
        <G transform="translate(22, 8)">
          <Path
            d="M0 12 L2 4 L5 9 L8 2 L11 9 L14 4 L16 12 Z"
            fill={BARAJA.yellow}
            stroke={BARAJA.ink}
            strokeWidth={0.7}
          />
          <Circle cx={8} cy={4} r={1.3} fill={BARAJA.red} stroke={BARAJA.ink} strokeWidth={0.3} />
          <Circle cx={2} cy={6} r={1} fill={BARAJA.red} stroke={BARAJA.ink} strokeWidth={0.3} />
          <Circle cx={14} cy={6} r={1} fill={BARAJA.red} stroke={BARAJA.ink} strokeWidth={0.3} />
          <Rect x={0} y={11} width={16} height={2} fill={BARAJA.yellowDk} stroke={BARAJA.ink} strokeWidth={0.4} />
        </G>
      }
    />
  );
}

function RoyalFigure({ rank, suit }: { rank: Rank; suit: Suit }) {
  if (rank === 10) return <Sota suit={suit} />;
  if (rank === 11) return <Caballo suit={suit} />;
  return <Rey suit={suit} />;
}

// ─── Layout des pips (cartes 2→7) ─────────────────────────────────

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  2: [[50, 22], [50, 78]],
  3: [[50, 18], [50, 50], [50, 82]],
  4: [[30, 22], [70, 22], [30, 78], [70, 78]],
  5: [[30, 22], [70, 22], [50, 50], [30, 78], [70, 78]],
  6: [[30, 18], [70, 18], [30, 50], [70, 50], [30, 82], [70, 82]],
  7: [[30, 18], [70, 18], [30, 50], [70, 50], [50, 34], [30, 82], [70, 82]],
};

function PipLayout({ count, suit, pipSize }: { count: number; suit: Suit; pipSize: number }) {
  const pts = PIP_LAYOUTS[count] ?? [];
  return (
    <View style={{ position: "relative", width: "100%", height: "100%" }}>
      {pts.map(([x, y], i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: `${x}%`,
            top: `${y}%`,
            transform: [{ translateX: -pipSize / 2 }, { translateY: -pipSize / 2 }, { rotate: y > 55 ? "180deg" : "0deg" }],
          }}
        >
          <SuitGlyph suit={suit} size={pipSize} />
        </View>
      ))}
    </View>
  );
}

// ─── Dos de carte (face-down) ─────────────────────────────────────

function CardBack({ w, h }: { w: number; h: number }) {
  const pid = `zb-${Math.round(w)}-${Math.round(h)}`;
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <Defs>
        <Pattern id={pid} x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
          <Rect width={14} height={14} fill="#8B2417" />
          <Path d="M7 0 L14 7 L7 14 L0 7 Z" fill="none" stroke="#D4A04C" strokeWidth={0.6} />
          <Circle cx={7} cy={7} r={1.5} fill="#D4A04C" opacity={0.7} />
        </Pattern>
      </Defs>
      <Rect width={w} height={h} fill={`url(#${pid})`} />
      <Rect x={2} y={2} width={w - 4} height={h - 4} rx={4} fill="none" stroke="#D4A04C" strokeWidth={1} opacity={0.8} />
      <Circle cx={w / 2} cy={h / 2} r={12} fill="none" stroke="#D4A04C" strokeWidth={0.8} opacity={0.9} />
      <Circle cx={w / 2} cy={h / 2} r={8} fill="none" stroke="#D4A04C" strokeWidth={0.6} opacity={0.7} />
      <Path
        d={`M${w / 2} ${h / 2 - 12} L${w / 2 + 6} ${h / 2} L${w / 2} ${h / 2 + 12} L${w / 2 - 6} ${h / 2} Z`}
        fill="#D4A04C"
        opacity={0.4}
      />
    </Svg>
  );
}

// ─── Cadre pointillé ──────────────────────────────────────────────

function DottedFrame({ w, h }: { w: number; h: number }) {
  const inset = w * 0.06;
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
    >
      <Rect
        x={inset}
        y={inset}
        width={w - inset * 2}
        height={h - inset * 2}
        fill="none"
        stroke={BARAJA.ink}
        strokeWidth={w * 0.015}
        strokeDasharray={`${w * 0.025} ${w * 0.035}`}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Composant principal ──────────────────────────────────────────

interface Props {
  rank: Rank;
  suit: Suit;
  size?: CardSize;
  faceDown?: boolean;
  dim?: boolean;
  highlighted?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  rank,
  suit,
  size = "md",
  faceDown = false,
  dim = false,
  highlighted = false,
  style,
}: Props) {
  const S = SIZES[size];
  const radius = S.w * 0.06;
  const rankLabel = String(rank);

  const base: ViewStyle = {
    width: S.w,
    height: S.h,
    borderRadius: radius,
    overflow: "hidden",
    opacity: dim ? 0.55 : 1,
    backgroundColor: faceDown ? "#8B2417" : BARAJA.paper,
    borderWidth: faceDown ? 0 : 1,
    borderColor: BARAJA.ink,
    shadowColor: highlighted ? "#D4A04C" : "#000",
    shadowOffset: { width: 0, height: highlighted ? 12 : 4 },
    shadowOpacity: highlighted ? 0.35 : 0.18,
    shadowRadius: highlighted ? 24 : 8,
    elevation: highlighted ? 10 : 4,
    flexShrink: 0,
  };

  if (faceDown) {
    return (
      <View style={[base, style]}>
        <LinearGradient
          colors={["#8B2417", "#6B1810"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <CardBack w={S.w} h={S.h} />
        {highlighted && (
          <View
            style={[
              StyleSheet.absoluteFill,
              { borderWidth: 2.5, borderColor: "#D4A04C", borderRadius: radius },
            ]}
          />
        )}
      </View>
    );
  }

  // Face visible : SVG vectoriel de vector.ma (thème Ronda / Touti marocain)
  const CardSvg = getCardComponent(suit, rank);
  return (
    <View style={[base, style]}>
      <CardSvg width={S.w} height={S.h} />
      {highlighted && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { borderWidth: 2.5, borderColor: "#D4A04C", borderRadius: radius },
          ]}
          pointerEvents="none"
        />
      )}
    </View>
  );
}
