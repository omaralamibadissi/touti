import React from "react";
import Svg, { Defs, Pattern, Rect, G, Line, Path, Circle } from "react-native-svg";
import { COLORS } from "../theme";

/**
 * ZelligeBg — motif de tuile marocaine (étoile à 8 branches tessellée).
 * À placer en position absolue derrière le contenu, avec une opacité réduite.
 */
export function ZelligeBg({
  color = COLORS.terracotta,
  accent = COLORS.saffronSoft,
  size = 60,
  opacity = 1,
  width = "100%",
  height = "100%",
}: {
  color?: string;
  accent?: string;
  size?: number;
  opacity?: number;
  width?: number | string;
  height?: number | string;
}) {
  const id = `zel-${Math.random().toString(36).slice(2, 8)}`;
  const r1 = size * 0.28;
  const r2 = size * 0.14;
  const starPath =
    Array.from({ length: 8 })
      .map((_, i) => {
        const a1 = ((i * 45) * Math.PI) / 180;
        const a2 = (((i + 0.5) * 45) * Math.PI) / 180;
        const x1 = Math.cos(a1) * r1;
        const y1 = Math.sin(a1) * r1;
        const x2 = Math.cos(a2) * r2;
        const y2 = Math.sin(a2) * r2;
        return `${i === 0 ? "M" : "L"} ${x1} ${y1} L ${x2} ${y2}`;
      })
      .join(" ") + " Z";

  return (
    <Svg width={width as any} height={height as any} style={{ opacity }}>
      <Defs>
        <Pattern id={id} x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
          <Rect width={size} height={size} fill={color} />
          <G transform={`translate(${size / 2} ${size / 2})`}>
            {[0, 45, 90, 135].map((a) => (
              <Line
                key={a}
                x1={-size * 0.45}
                y1="0"
                x2={size * 0.45}
                y2="0"
                stroke={accent}
                strokeWidth={0.8}
                opacity={0.5}
                transform={`rotate(${a})`}
              />
            ))}
            <Path d={starPath} fill="none" stroke={accent} strokeWidth={1.2} opacity={0.85} />
            <Circle r={size * 0.06} fill={accent} opacity={0.7} />
          </G>
          {[
            [0, 0],
            [size, 0],
            [0, size],
            [size, size],
          ].map(([cx, cy], i) => (
            <Circle key={i} cx={cx} cy={cy} r={size * 0.08} fill={accent} opacity={0.4} />
          ))}
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * ArabesqueDivider — diviseur ornemental fin.
 */
export function ArabesqueDivider({
  width = 200,
  color = COLORS.brass,
}: {
  width?: number;
  color?: string;
}) {
  return (
    <Svg width={width} height={20} viewBox="0 0 200 20">
      <Line x1="0" y1="10" x2="70" y2="10" stroke={color} strokeWidth={0.8} opacity={0.5} />
      <Line x1="130" y1="10" x2="200" y2="10" stroke={color} strokeWidth={0.8} opacity={0.5} />
      <G transform="translate(100 10)">
        <Path
          d="M-20 0 Q-10 -6 0 0 Q10 6 20 0 Q10 -6 0 0 Q-10 6 -20 0"
          fill="none"
          stroke={color}
          strokeWidth={1.2}
        />
        <Circle r={2.5} fill={color} />
        <Circle cx={-20} r={1.5} fill={color} opacity={0.6} />
        <Circle cx={20} r={1.5} fill={color} opacity={0.6} />
      </G>
    </Svg>
  );
}

/**
 * StarBurst — étoile rayonnante (décor hero).
 */
export function StarBurst({
  size = 120,
  color = COLORS.brass,
  strokeW = 1,
}: {
  size?: number;
  color?: string;
  strokeW?: number;
}) {
  const bursts = Array.from({ length: 16 });
  const petalPath =
    bursts
      .map((_, i) => {
        const a1 = ((i * 22.5) * Math.PI) / 180;
        const a2 = (((i + 0.5) * 22.5) * Math.PI) / 180;
        const r1 = 40;
        const r2 = 22;
        const x1 = Math.cos(a1 - Math.PI / 2) * r1;
        const y1 = Math.sin(a1 - Math.PI / 2) * r1;
        const x2 = Math.cos(a2 - Math.PI / 2) * r2;
        const y2 = Math.sin(a2 - Math.PI / 2) * r2;
        return `${i === 0 ? "M" : "L"} ${x1} ${y1} L ${x2} ${y2}`;
      })
      .join(" ") + " Z";

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G transform="translate(50 50)">
        {bursts.map((_, i) => (
          <Line
            key={i}
            x1="0"
            y1="0"
            x2="0"
            y2="-48"
            stroke={color}
            strokeWidth={strokeW}
            opacity={0.35}
            transform={`rotate(${i * 22.5})`}
          />
        ))}
        <Path d={petalPath} fill="none" stroke={color} strokeWidth={strokeW * 1.5} />
        <Circle r="8" fill="none" stroke={color} strokeWidth={strokeW} />
        <Circle r="3" fill={color} />
      </G>
    </Svg>
  );
}
