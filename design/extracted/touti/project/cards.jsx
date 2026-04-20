// Spanish-suited cards for Touti — classic "baraja" folk-art style
// Palette: blue, red, yellow on white with dotted black frame
// Suits: Oros (coins), Copas (cups), Espadas (swords), Bastos (clubs)
// Ranks: 1(As), 2, 3, 4, 5, 6, 7, 10(Sota), 11(Caballo), 12(Rey)

// Shared baraja palette (not per-suit colors, since this style uses a fixed palette)
const BARAJA = {
  blue:   '#1E4FB8',
  blueDk: '#0F2E7A',
  red:    '#E62020',
  redDk:  '#A8141A',
  yellow: '#F2C42E',
  yellowDk: '#C89510',
  skin:   '#F4D5A8',
  skinSh: '#D4A578',
  ink:    '#151515',
  paper:  '#FBF6EA',
  green:  '#2D7F3D',
};

const SUIT_COLORS = {
  oros:    { ink: BARAJA.ink, accent: BARAJA.yellow },
  copas:   { ink: BARAJA.ink, accent: BARAJA.red },
  espadas: { ink: BARAJA.ink, accent: BARAJA.blue },
  bastos:  { ink: BARAJA.ink, accent: BARAJA.green },
};

const SUIT_NAMES_AR = {
  oros: 'الذهب', copas: 'الكؤوس', espadas: 'السيوف', bastos: 'الشكاير',
};

// ─── Suit glyphs in baraja palette ─────────────────────────────
function Oro({ size = 24 }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="16" fill={BARAJA.yellow} stroke={BARAJA.ink} strokeWidth="1.6"/>
      <circle cx="20" cy="20" r="11" fill="none" stroke={BARAJA.ink} strokeWidth="1"/>
      <path d="M20 10 L22.5 17.5 L30 17.5 L24 22 L26.5 29.5 L20 25 L13.5 29.5 L16 22 L10 17.5 L17.5 17.5 Z"
            fill={BARAJA.red} stroke={BARAJA.ink} strokeWidth="0.8"/>
    </svg>
  );
}

function Copa({ size = 24 }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40">
      {/* cup bowl — red */}
      <path d="M9 10 Q20 7 31 10 L29 20 Q29 27 20 28 Q11 27 11 20 Z"
            fill={BARAJA.red} stroke={BARAJA.ink} strokeWidth="1.5"/>
      {/* yellow rim */}
      <path d="M9 10 Q20 7 31 10 L31 12 Q20 9 9 12 Z" fill={BARAJA.yellow} stroke={BARAJA.ink} strokeWidth="1"/>
      {/* yellow decoration band */}
      <path d="M12 18 Q20 19 28 18" stroke={BARAJA.yellow} strokeWidth="2" fill="none"/>
      {/* stem */}
      <rect x="17" y="28" width="6" height="3" fill={BARAJA.yellow} stroke={BARAJA.ink} strokeWidth="1"/>
      {/* base */}
      <ellipse cx="20" cy="33" rx="8" ry="2.2" fill={BARAJA.yellow} stroke={BARAJA.ink} strokeWidth="1"/>
    </svg>
  );
}

function Espada({ size = 24 }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40">
      {/* blade — blue */}
      <path d="M20 3 L22 28 L18 28 Z" fill={BARAJA.blue} stroke={BARAJA.ink} strokeWidth="1.2"/>
      <path d="M20 3 L21 28 L19 28 Z" fill={BARAJA.blueDk} opacity="0.5"/>
      {/* crossguard yellow */}
      <rect x="11" y="26" width="18" height="3.5" rx="0.5" fill={BARAJA.yellow} stroke={BARAJA.ink} strokeWidth="1"/>
      {/* grip red */}
      <rect x="18.5" y="29.5" width="3" height="5" fill={BARAJA.red} stroke={BARAJA.ink} strokeWidth="0.8"/>
      {/* pommel */}
      <circle cx="20" cy="36" r="2.2" fill={BARAJA.yellow} stroke={BARAJA.ink} strokeWidth="1"/>
    </svg>
  );
}

function Basto({ size = 24 }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40">
      {/* club body — yellow-brown with knots */}
      <path d="M17 4 Q20 3 23 4 L24.5 34 Q20 36 15.5 34 Z"
            fill={BARAJA.yellow} stroke={BARAJA.ink} strokeWidth="1.4"/>
      {/* knots */}
      <ellipse cx="20" cy="10" rx="4" ry="1.8" fill={BARAJA.yellowDk} stroke={BARAJA.ink} strokeWidth="0.6"/>
      <ellipse cx="20" cy="19" rx="4" ry="1.8" fill={BARAJA.yellowDk} stroke={BARAJA.ink} strokeWidth="0.6"/>
      <ellipse cx="20" cy="28" rx="4.2" ry="1.8" fill={BARAJA.yellowDk} stroke={BARAJA.ink} strokeWidth="0.6"/>
      {/* leaves at top */}
      <path d="M17 4 Q13 2 15 6 M23 4 Q27 2 25 6" stroke={BARAJA.green} strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

function SuitGlyph({ suit, size = 24 }) {
  if (suit === 'oros') return <Oro size={size}/>;
  if (suit === 'copas') return <Copa size={size}/>;
  if (suit === 'espadas') return <Espada size={size}/>;
  return <Basto size={size}/>;
}

// ─── Royal figures — folk-illustrated, baraja style ────────────

// Sota (10) — standing page figure, one hand on hip, other holding suit item
function Sota({ suit }) {
  return (
    <svg viewBox="0 0 60 90" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {/* ground line */}
      <path d="M8 82 Q30 80 52 82" stroke={BARAJA.ink} strokeWidth="0.8" fill="none"/>
      {/* hat — red with yellow band */}
      <path d="M20 16 Q30 10 40 16 L39 22 L21 22 Z" fill={BARAJA.red} stroke={BARAJA.ink} strokeWidth="1"/>
      <rect x="21" y="20" width="18" height="2.5" fill={BARAJA.yellow} stroke={BARAJA.ink} strokeWidth="0.6"/>
      {/* face */}
      <ellipse cx="30" cy="27" rx="6" ry="7" fill={BARAJA.skin} stroke={BARAJA.ink} strokeWidth="1"/>
      <circle cx="27.5" cy="27" r="0.9" fill={BARAJA.ink}/>
      <circle cx="32.5" cy="27" r="0.9" fill={BARAJA.ink}/>
      <path d="M28 30 Q30 31.5 32 30" stroke={BARAJA.red} strokeWidth="0.8" fill="none"/>
      {/* torso — red doublet with yellow stripes */}
      <path d="M22 36 Q30 34 38 36 L40 56 L20 56 Z" fill={BARAJA.red} stroke={BARAJA.ink} strokeWidth="1"/>
      <path d="M25 38 L25 55 M30 38 L30 55 M35 38 L35 55" stroke={BARAJA.yellow} strokeWidth="1.2"/>
      {/* left arm holding suit item */}
      <path d="M22 38 L14 52 L16 54 L25 42 Z" fill={BARAJA.red} stroke={BARAJA.ink} strokeWidth="1"/>
      {/* suit item in hand */}
      <g transform="translate(6, 44) scale(0.5)">
        <SuitGlyph suit={suit} size={24}/>
      </g>
      {/* right arm on hip */}
      <path d="M38 38 L44 48 L40 50 L35 42 Z" fill={BARAJA.red} stroke={BARAJA.ink} strokeWidth="1"/>
      {/* hose — blue */}
      <path d="M20 56 L20 78 L28 78 L29 58 Z" fill={BARAJA.blue} stroke={BARAJA.ink} strokeWidth="1"/>
      <path d="M40 56 L40 78 L32 78 L31 58 Z" fill={BARAJA.blue} stroke={BARAJA.ink} strokeWidth="1"/>
      {/* shoes */}
      <ellipse cx="24" cy="80" rx="5" ry="1.8" fill={BARAJA.ink}/>
      <ellipse cx="36" cy="80" rx="5" ry="1.8" fill={BARAJA.ink}/>
    </svg>
  );
}

// Caballo (11) — rider on a horse, with suit item
function Caballo({ suit }) {
  return (
    <svg viewBox="0 0 60 90" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {/* horse body — blue */}
      <path d="M8 60 Q12 48 22 46 L42 46 Q50 48 54 60 L52 72 L44 72 L42 64 L20 64 L18 72 L10 72 Z"
            fill={BARAJA.blue} stroke={BARAJA.ink} strokeWidth="1"/>
      {/* horse mane & tail */}
      <path d="M54 58 Q58 56 56 64 Q54 62 54 60" fill={BARAJA.red} stroke={BARAJA.ink} strokeWidth="0.8"/>
      {/* neck & head */}
      <path d="M44 46 Q52 38 54 28 L58 30 L56 40 Q52 46 48 48 Z"
            fill={BARAJA.blue} stroke={BARAJA.ink} strokeWidth="1"/>
      <path d="M54 28 L58 30 L56 26 Z" fill={BARAJA.blue} stroke={BARAJA.ink} strokeWidth="0.8"/>
      <circle cx="55" cy="32" r="0.8" fill={BARAJA.ink}/>
      <path d="M52 34 L54 36" stroke={BARAJA.ink} strokeWidth="0.6"/>
      {/* mane on neck */}
      <path d="M46 44 L48 40 L50 42 L52 38 L53 42" stroke={BARAJA.red} strokeWidth="1.5" fill="none"/>
      {/* rider body — red tunic */}
      <path d="M18 38 Q26 34 34 38 L36 50 L16 50 Z" fill={BARAJA.red} stroke={BARAJA.ink} strokeWidth="1"/>
      {/* yellow belt */}
      <rect x="16" y="48" width="20" height="2.5" fill={BARAJA.yellow} stroke={BARAJA.ink} strokeWidth="0.6"/>
      {/* rider head */}
      <ellipse cx="26" cy="28" rx="5.5" ry="6.5" fill={BARAJA.skin} stroke={BARAJA.ink} strokeWidth="1"/>
      <circle cx="24" cy="28" r="0.8" fill={BARAJA.ink}/>
      <circle cx="28" cy="28" r="0.8" fill={BARAJA.ink}/>
      {/* red hat with yellow band */}
      <path d="M19 22 Q26 16 33 22 L32 26 L20 26 Z" fill={BARAJA.red} stroke={BARAJA.ink} strokeWidth="1"/>
      <rect x="20" y="24.5" width="12" height="1.8" fill={BARAJA.yellow} stroke={BARAJA.ink} strokeWidth="0.5"/>
      {/* suit item held up */}
      <g transform="translate(2, 22) scale(0.55)">
        <SuitGlyph suit={suit} size={22}/>
      </g>
      {/* arm to item */}
      <path d="M17 40 L10 32 L13 30 L20 38 Z" fill={BARAJA.red} stroke={BARAJA.ink} strokeWidth="1"/>
      {/* rider leg */}
      <path d="M32 50 L38 62 L34 64 L28 52 Z" fill={BARAJA.blue} stroke={BARAJA.ink} strokeWidth="1"/>
      {/* horse legs below */}
      <rect x="14" y="72" width="5" height="8" fill={BARAJA.blue} stroke={BARAJA.ink} strokeWidth="0.8"/>
      <rect x="41" y="72" width="5" height="8" fill={BARAJA.blue} stroke={BARAJA.ink} strokeWidth="0.8"/>
      <path d="M12 80 L21 80 M40 80 L49 80" stroke={BARAJA.ink} strokeWidth="0.8"/>
    </svg>
  );
}

// Rey (12) — crowned monarch in robe
function Rey({ suit }) {
  return (
    <svg viewBox="0 0 60 90" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {/* robe — blue with red inner */}
      <path d="M12 50 Q30 46 48 50 L50 82 L10 82 Z"
            fill={BARAJA.blue} stroke={BARAJA.ink} strokeWidth="1"/>
      <path d="M22 50 Q30 48 38 50 L40 82 L20 82 Z"
            fill={BARAJA.red} stroke={BARAJA.ink} strokeWidth="1"/>
      {/* yellow trim on robe */}
      <path d="M12 50 Q30 46 48 50" stroke={BARAJA.yellow} strokeWidth="2" fill="none"/>
      {/* yellow diamond pattern on red panel */}
      <g fill={BARAJA.yellow} stroke={BARAJA.ink} strokeWidth="0.4">
        <path d="M30 58 L33 62 L30 66 L27 62 Z"/>
        <path d="M30 70 L33 74 L30 78 L27 74 Z"/>
      </g>
      {/* shoulders/cape top */}
      <path d="M14 50 Q18 44 26 44 L34 44 Q42 44 46 50" fill={BARAJA.yellow} stroke={BARAJA.ink} strokeWidth="1"/>
      {/* face */}
      <ellipse cx="30" cy="32" rx="7.5" ry="8.5" fill={BARAJA.skin} stroke={BARAJA.ink} strokeWidth="1"/>
      <circle cx="27" cy="31" r="0.9" fill={BARAJA.ink}/>
      <circle cx="33" cy="31" r="0.9" fill={BARAJA.ink}/>
      {/* beard red/brown */}
      <path d="M24 36 Q30 44 36 36 Q34 41 30 42 Q26 41 24 36" fill={BARAJA.redDk} stroke={BARAJA.ink} strokeWidth="0.7"/>
      <path d="M28 33 Q30 34 32 33" stroke={BARAJA.ink} strokeWidth="0.5" fill="none"/>
      {/* crown — yellow with red gems */}
      <path d="M19 22 L22 14 L26 20 L30 12 L34 20 L38 14 L41 22 L41 25 L19 25 Z"
            fill={BARAJA.yellow} stroke={BARAJA.ink} strokeWidth="1"/>
      <circle cx="22" cy="14" r="1.6" fill={BARAJA.red} stroke={BARAJA.ink} strokeWidth="0.5"/>
      <circle cx="30" cy="12" r="1.8" fill={BARAJA.red} stroke={BARAJA.ink} strokeWidth="0.5"/>
      <circle cx="38" cy="14" r="1.6" fill={BARAJA.red} stroke={BARAJA.ink} strokeWidth="0.5"/>
      <rect x="19" y="24" width="22" height="1.5" fill={BARAJA.yellowDk}/>
      {/* suit item held */}
      <g transform="translate(4, 54) scale(0.6)">
        <SuitGlyph suit={suit} size={22}/>
      </g>
      {/* arm */}
      <path d="M14 52 L10 60 L14 62 L18 54 Z" fill={BARAJA.blue} stroke={BARAJA.ink} strokeWidth="1"/>
    </svg>
  );
}

function RoyalFigure({ rank, suit }) {
  if (rank === 10) return <Sota suit={suit}/>;
  if (rank === 11) return <Caballo suit={suit}/>;
  return <Rey suit={suit}/>;
}

// ─── Full card face ──────────────────────────────────────────
function Card({ rank, suit, size = 'md', faceDown = false, dim = false, highlighted = false, style = {} }) {
  const sizes = {
    sm: { w: 44, h: 64, fs: 9,  pip: 9 },
    md: { w: 62, h: 92, fs: 12, pip: 13 },
    lg: { w: 84, h: 124, fs: 15, pip: 18 },
    xl: { w: 110, h: 162, fs: 19, pip: 24 },
  };
  const S = sizes[size];
  const c = SUIT_COLORS[suit] || {};

  const cardStyle = {
    width: S.w, height: S.h, borderRadius: S.w * 0.06,
    background: faceDown
      ? 'linear-gradient(135deg, #8B2417 0%, #6B1810 100%)'
      : BARAJA.paper,
    boxShadow: highlighted
      ? `0 0 0 2.5px #D4A04C, 0 12px 24px rgba(212,160,76,0.35), 0 2px 6px rgba(0,0,0,0.15)`
      : '0 2px 4px rgba(0,0,0,0.15), 0 6px 14px rgba(0,0,0,0.12)',
    border: faceDown ? 'none' : `1px solid ${BARAJA.ink}`,
    position: 'relative', overflow: 'hidden', flexShrink: 0,
    opacity: dim ? 0.55 : 1,
    transition: 'transform 0.2s, box-shadow 0.2s',
    ...style,
  };

  if (faceDown) {
    return (
      <div style={cardStyle}>
        <svg width="100%" height="100%" viewBox="0 0 62 92" preserveAspectRatio="none">
          <defs>
            <pattern id={`zb-${size}`} x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
              <rect width="14" height="14" fill="#8B2417"/>
              <path d="M7 0 L14 7 L7 14 L0 7 Z" fill="none" stroke="#D4A04C" strokeWidth="0.6"/>
              <circle cx="7" cy="7" r="1.5" fill="#D4A04C" opacity="0.7"/>
            </pattern>
          </defs>
          <rect width="62" height="92" fill={`url(#zb-${size})`}/>
          <rect x="2" y="2" width="58" height="88" rx="4" fill="none" stroke="#D4A04C" strokeWidth="1" opacity="0.8"/>
          <circle cx="31" cy="46" r="12" fill="none" stroke="#D4A04C" strokeWidth="0.8" opacity="0.9"/>
          <circle cx="31" cy="46" r="8" fill="none" stroke="#D4A04C" strokeWidth="0.6" opacity="0.7"/>
          <path d="M31 34 L37 46 L31 58 L25 46 Z" fill="#D4A04C" opacity="0.4"/>
        </svg>
      </div>
    );
  }

  const rankLabel = rank === 1 ? '1' : rank === 10 ? '10' : rank === 11 ? '11' : rank === 12 ? '12' : String(rank);

  // dotted frame inset sizing
  const dashInset = S.w * 0.06;

  return (
    <div style={cardStyle}>
      {/* Dotted frame — signature of the baraja style */}
      <svg
        width="100%" height="100%" viewBox={`0 0 ${S.w} ${S.h}`}
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <rect
          x={dashInset} y={dashInset}
          width={S.w - dashInset * 2} height={S.h - dashInset * 2}
          fill="none" stroke={BARAJA.ink}
          strokeWidth={S.w * 0.015}
          strokeDasharray={`${S.w * 0.025} ${S.w * 0.035}`}
          strokeLinecap="round"
        />
      </svg>

      {/* Corner rank labels (top-left + bottom-right rotated) */}
      <div style={{
        position: 'absolute', top: S.w * 0.08, left: S.w * 0.1,
        fontSize: S.fs, fontWeight: 900, color: BARAJA.ink,
        fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: 1,
      }}>{rankLabel}</div>
      <div style={{
        position: 'absolute', bottom: S.w * 0.08, right: S.w * 0.1,
        fontSize: S.fs, fontWeight: 900, color: BARAJA.ink,
        fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: 1,
        transform: 'rotate(180deg)',
      }}>{rankLabel}</div>

      {/* Center art */}
      <div style={{
        position: 'absolute',
        left: S.w * 0.1, right: S.w * 0.1,
        top: S.w * 0.22, bottom: S.w * 0.22,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {rank >= 10 ? (
          <RoyalFigure rank={rank} suit={suit}/>
        ) : rank === 1 ? (
          <div style={{ transform: `scale(${S.pip / 10})` }}>
            <SuitGlyph suit={suit} size={20}/>
          </div>
        ) : (
          <PipLayout count={rank} suit={suit} pipSize={S.pip}/>
        )}
      </div>
    </div>
  );
}

function PipLayout({ count, suit, pipSize }) {
  const layouts = {
    2: [[50,22],[50,78]],
    3: [[50,18],[50,50],[50,82]],
    4: [[30,22],[70,22],[30,78],[70,78]],
    5: [[30,22],[70,22],[50,50],[30,78],[70,78]],
    6: [[30,18],[70,18],[30,50],[70,50],[30,82],[70,82]],
    7: [[30,18],[70,18],[30,50],[70,50],[50,34],[30,82],[70,82]],
  };
  const pts = layouts[count] || [];
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {pts.map(([x,y], i) => (
        <div key={i} style={{
          position: 'absolute', left: `${x}%`, top: `${y}%`,
          transform: `translate(-50%, -50%) ${y > 55 ? 'rotate(180deg)' : ''}`,
        }}>
          <SuitGlyph suit={suit} size={pipSize}/>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { Card, SuitGlyph, SUIT_COLORS, SUIT_NAMES_AR });
