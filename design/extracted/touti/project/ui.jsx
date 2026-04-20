// Shared design tokens & UI primitives

const COLORS = {
  // Warm Moroccan palette
  terracotta: '#C8441A',
  terracottaDark: '#8B2417',
  saffron: '#E8A130',
  saffronSoft: '#F4D89E',
  brass: '#D4A04C',
  brassDeep: '#B8791C',
  teal: '#0F5A5E',
  tealDeep: '#083E42',
  cream: '#F5EBD6',
  creamDark: '#E8D9B8',
  ink: '#2B1810',
  inkSoft: '#5A3E2B',
  felt: '#1A4A3A',      // game table green-teal
  feltDark: '#0E2E24',
};

const FONT_DISPLAY = '"Cormorant Garamond", Georgia, serif';
const FONT_UI = '"Inter", -apple-system, system-ui, sans-serif';
const FONT_AR = '"Noto Naskh Arabic", "SF Arabic", serif';

// ─── Brass button ────────────────────────────────────────────
function BrassButton({ children, onClick, large = false, variant = 'primary', style = {} }) {
  const variants = {
    primary: {
      background: 'linear-gradient(180deg, #E8A130 0%, #B8791C 100%)',
      color: '#FDF6E3',
      border: '1.5px solid #8B5A12',
      boxShadow: '0 2px 0 #8B5A12, 0 6px 14px rgba(184,121,28,0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
    },
    ghost: {
      background: 'rgba(245,235,214,0.08)',
      color: COLORS.cream,
      border: '1px solid rgba(212,160,76,0.4)',
      boxShadow: 'none',
    },
    danger: {
      background: 'linear-gradient(180deg, #C8441A 0%, #8B2417 100%)',
      color: '#FDF6E3',
      border: '1.5px solid #5A1810',
      boxShadow: '0 2px 0 #5A1810, 0 6px 14px rgba(139,36,23,0.35)',
    },
  };
  return (
    <button onClick={onClick} style={{
      ...variants[variant],
      padding: large ? '16px 32px' : '10px 20px',
      borderRadius: large ? 14 : 10,
      fontFamily: FONT_UI, fontWeight: 700,
      fontSize: large ? 18 : 14,
      letterSpacing: 0.3,
      cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: 8,
      ...style,
    }}>{children}</button>
  );
}

// Bilingual label — French primary, Darija (arabizi) secondary for game terms
function BiLabel({ fr, dr, color = COLORS.cream, size = 14, dir = 'col', frSize, drSize, bold = true, align = 'center', ar, en }) {
  // Back-compat: allow old ar/en args to still map in
  const primary = fr || en || '';
  const secondary = dr || ar || '';
  const pS = frSize || size;
  const sS = drSize || size * 0.78;
  return (
    <div style={{
      display: 'flex',
      flexDirection: dir === 'col' ? 'column' : 'row',
      alignItems: align === 'center' ? 'center' : align === 'end' ? 'flex-end' : 'flex-start',
      gap: dir === 'col' ? 2 : 8,
      lineHeight: 1.05,
    }}>
      <div style={{
        fontFamily: FONT_UI, fontSize: pS, color,
        fontWeight: bold ? 700 : 500, letterSpacing: 0.3,
      }}>{primary}</div>
      {secondary && (
        <div style={{
          fontFamily: FONT_UI, fontSize: sS, color,
          opacity: 0.7, letterSpacing: 1.2,
          textTransform: 'uppercase', fontWeight: 600, fontStyle: 'italic',
        }}>{secondary}</div>
      )}
    </div>
  );
}

// Avatar with ring
function Avatar({ initials, color = COLORS.brass, size = 48, online = false, ring = true, img = null }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: img ? `url(${img})` : `linear-gradient(135deg, ${color} 0%, ${shade(color, -20)} 100%)`,
      backgroundSize: 'cover', backgroundPosition: 'center',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#FDF6E3', fontFamily: FONT_DISPLAY, fontWeight: 700,
      fontSize: size * 0.4,
      boxShadow: ring ? `0 0 0 2px ${COLORS.cream}, 0 0 0 3.5px ${COLORS.brass}` : 'none',
      position: 'relative',
      flexShrink: 0,
    }}>
      {!img && initials}
      {online && <div style={{
        position: 'absolute', bottom: 0, right: 2,
        width: size * 0.22, height: size * 0.22, borderRadius: '50%',
        background: '#3FC26A', border: `2px solid ${COLORS.cream}`,
      }}/>}
    </div>
  );
}

function shade(hex, pct) {
  const h = hex.replace('#','');
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  const f = (c) => Math.max(0, Math.min(255, c + (pct/100)*255));
  return `rgb(${f(r)|0},${f(g)|0},${f(b)|0})`;
}

// Decorative brass corner
function BrassCorner({ size = 24, color = COLORS.brass, pos = 'tl' }) {
  const rot = { tl: 0, tr: 90, br: 180, bl: 270 }[pos];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${rot}deg)` }}>
      <path d="M1 12 Q1 4 4 2 Q8 0 12 1" fill="none" stroke={color} strokeWidth="1.2" opacity="0.7"/>
      <path d="M4 12 Q4 7 6 5 Q9 3 12 4" fill="none" stroke={color} strokeWidth="1" opacity="0.5"/>
      <circle cx="3" cy="3" r="1.5" fill={color}/>
    </svg>
  );
}

// Ornate frame card
function OrnateFrame({ children, bg = COLORS.cream, accent = COLORS.brass, style = {}, padding = 20 }) {
  return (
    <div style={{
      position: 'relative', background: bg, borderRadius: 14,
      padding, ...style,
    }}>
      <div style={{
        position: 'absolute', inset: 5,
        border: `0.5px solid ${accent}`, borderRadius: 10,
        pointerEvents: 'none', opacity: 0.5,
      }}/>
      <div style={{ position: 'absolute', top: 3, left: 3 }}><BrassCorner color={accent} pos="tl"/></div>
      <div style={{ position: 'absolute', top: 3, right: 3 }}><BrassCorner color={accent} pos="tr"/></div>
      <div style={{ position: 'absolute', bottom: 3, left: 3 }}><BrassCorner color={accent} pos="bl"/></div>
      <div style={{ position: 'absolute', bottom: 3, right: 3 }}><BrassCorner color={accent} pos="br"/></div>
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

// iOS status bar for light-on-dark backgrounds (Touti has warm dark backgrounds)
function TopSafeArea({ color = '#fff' }) {
  return <div style={{ height: 59 }}/>;  // Matches the iOS status bar height
}

Object.assign(window, {
  COLORS, FONT_DISPLAY, FONT_UI, FONT_AR,
  BrassButton, BiLabel, Avatar, BrassCorner, OrnateFrame, TopSafeArea, shade,
});
