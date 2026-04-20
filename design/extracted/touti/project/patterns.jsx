// Zellige geometric patterns — Moroccan tile motifs (original)

function ZelligeBg({ color = '#C8441A', accent = '#F4D89E', opacity = 1, size = 60 }) {
  // 8-point star tessellation
  const id = `zel-${Math.random().toString(36).slice(2,8)}`;
  return (
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity }} preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id={id} x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
          <rect width={size} height={size} fill={color}/>
          <g transform={`translate(${size/2} ${size/2})`}>
            {/* 8-point star */}
            {[0,45,90,135].map(a => (
              <line key={a} x1={-size*0.45} y1="0" x2={size*0.45} y2="0"
                    stroke={accent} strokeWidth="0.8" opacity="0.5"
                    transform={`rotate(${a})`}/>
            ))}
            <path d={
              Array.from({length: 8}).map((_,i) => {
                const a1 = (i * 45) * Math.PI/180;
                const a2 = ((i+0.5) * 45) * Math.PI/180;
                const r1 = size * 0.28;
                const r2 = size * 0.14;
                return `${i===0?'M':'L'} ${Math.cos(a1)*r1} ${Math.sin(a1)*r1} L ${Math.cos(a2)*r2} ${Math.sin(a2)*r2}`;
              }).join(' ') + ' Z'
            } fill="none" stroke={accent} strokeWidth="1.2" opacity="0.85"/>
            <circle r={size*0.06} fill={accent} opacity="0.7"/>
          </g>
          {/* Corner motifs */}
          {[[0,0],[size,0],[0,size],[size,size]].map(([cx,cy],i) => (
            <circle key={i} cx={cx} cy={cy} r={size*0.08} fill={accent} opacity="0.4"/>
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`}/>
    </svg>
  );
}

function StarBurst({ size = 120, color = '#D4A04C', strokeW = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }}>
      <g transform="translate(50 50)">
        {Array.from({length: 16}).map((_,i) => (
          <line key={i} x1="0" y1="0" x2="0" y2="-48"
                stroke={color} strokeWidth={strokeW} opacity="0.35"
                transform={`rotate(${i*22.5})`}/>
        ))}
        <path d={
          Array.from({length: 16}).map((_,i) => {
            const a1 = (i * 22.5) * Math.PI/180;
            const a2 = ((i+0.5) * 22.5) * Math.PI/180;
            const r1 = 40, r2 = 22;
            const x1 = Math.cos(a1 - Math.PI/2)*r1, y1 = Math.sin(a1 - Math.PI/2)*r1;
            const x2 = Math.cos(a2 - Math.PI/2)*r2, y2 = Math.sin(a2 - Math.PI/2)*r2;
            return `${i===0?'M':'L'} ${x1} ${y1} L ${x2} ${y2}`;
          }).join(' ') + ' Z'
        } fill="none" stroke={color} strokeWidth={strokeW*1.5}/>
        <circle r="8" fill="none" stroke={color} strokeWidth={strokeW}/>
        <circle r="3" fill={color}/>
      </g>
    </svg>
  );
}

function KhamsaMotif({ size = 48, color = '#B8791C' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <g fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round">
        <path d="M24 6 Q18 8 16 14 L14 28 Q14 40 24 42 Q34 40 34 28 L32 14 Q30 8 24 6 Z"/>
        <path d="M14 20 Q10 20 10 26 Q10 30 14 30"/>
        <path d="M34 20 Q38 20 38 26 Q38 30 34 30"/>
        <path d="M20 14 L20 24 M24 12 L24 26 M28 14 L28 24"/>
        <circle cx="24" cy="26" r="4"/>
        <circle cx="24" cy="26" r="1.5" fill={color}/>
      </g>
    </svg>
  );
}

function ArabesqueDivider({ width = 200, color = '#D4A04C' }) {
  return (
    <svg width={width} height="20" viewBox="0 0 200 20">
      <line x1="0" y1="10" x2="70" y2="10" stroke={color} strokeWidth="0.8" opacity="0.5"/>
      <line x1="130" y1="10" x2="200" y2="10" stroke={color} strokeWidth="0.8" opacity="0.5"/>
      <g transform="translate(100 10)">
        <path d="M-20 0 Q-10 -6 0 0 Q10 6 20 0 Q10 -6 0 0 Q-10 6 -20 0"
              fill="none" stroke={color} strokeWidth="1.2"/>
        <circle r="2.5" fill={color}/>
        <circle cx="-20" r="1.5" fill={color} opacity="0.6"/>
        <circle cx="20" r="1.5" fill={color} opacity="0.6"/>
      </g>
    </svg>
  );
}

Object.assign(window, { ZelligeBg, StarBurst, KhamsaMotif, ArabesqueDivider });
