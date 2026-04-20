// In-game table — connected to the local Touti engine.
// Tap a card (when it's your turn) to play it. AI plays for bots after short delay.

function GameTable({ tableColor = 'felt', turnState = 'yours', showPartner = false }) {
  const { dealNewGame, playCard, nextTrick, endRound, aiPick, legalMoves, cardKey, PLAYERS } = window;
  const [state, setState] = React.useState(() => {
    try {
      const saved = localStorage.getItem('touti-gamestate');
      if (saved) return JSON.parse(saved);
    } catch {}
    return dealNewGame();
  });
  const [selectedIdx, setSelectedIdx] = React.useState(null);

  React.useEffect(() => {
    try { localStorage.setItem('touti-gamestate', JSON.stringify(state)); } catch {}
  }, [state]);

  // AI tick
  React.useEffect(() => {
    if (state.phase !== 'playing') return;
    if (state.currentPlayer === 0) return;
    const t = setTimeout(() => {
      const pick = aiPick(state, state.currentPlayer);
      if (pick) setState(s => playCard(s, s.currentPlayer, pick));
    }, 750);
    return () => clearTimeout(t);
  }, [state]);

  // Auto-advance trick-end after a pause so users can see the result
  React.useEffect(() => {
    if (state.phase === 'trick-end') {
      const t = setTimeout(() => setState(nextTrick), 1800);
      return () => clearTimeout(t);
    }
    if (state.phase === 'round-end') {
      const t = setTimeout(() => setState(endRound), 2400);
      return () => clearTimeout(t);
    }
  }, [state.phase]);

  const myHand = state.hands[0];
  const legal = state.phase === 'playing' && state.currentPlayer === 0
    ? new Set(legalMoves(state, 0).map(cardKey))
    : new Set();
  const myTurn = state.currentPlayer === 0 && state.phase === 'playing';

  const handlePlay = (idx) => {
    const card = myHand[idx];
    if (!card || !myTurn || !legal.has(cardKey(card))) {
      setSelectedIdx(null);
      return;
    }
    if (selectedIdx !== idx) { setSelectedIdx(idx); return; }
    setState(s => playCard(s, 0, card));
    setSelectedIdx(null);
  };

  const resetGame = () => {
    const fresh = dealNewGame();
    setState(fresh);
    setSelectedIdx(null);
  };

  const tableBg = {
    felt:      { base: '#0F4A3A', dark: '#062820', accent: '#D4A04C' },
    terracotta:{ base: '#8B2417', dark: '#4E1208', accent: '#E8A130' },
    midnight:  { base: '#1A2840', dark: '#0A1428', accent: '#D4A04C' },
  }[tableColor] || { base: '#0F4A3A', dark: '#062820', accent: '#D4A04C' };

  // Group trick by player for centre rendering
  const playedByPos = {};
  state.trick.forEach(t => {
    playedByPos[PLAYERS[t.player].pos] = t.card;
  });

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: `radial-gradient(ellipse at center, ${tableBg.base} 0%, ${tableBg.dark} 90%)`,
      overflow: 'hidden', fontFamily: FONT_UI,
    }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.07 }}>
        <defs>
          <pattern id="felt-star2" x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M24 4 L28 20 L44 24 L28 28 L24 44 L20 28 L4 24 L20 20 Z"
                  fill="none" stroke={tableBg.accent} strokeWidth="0.6"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#felt-star2)"/>
      </svg>

      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: 260, height: 260, transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${tableBg.accent}22 0%, transparent 70%)`,
        pointerEvents: 'none',
      }}/>

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 62, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between',
        padding: '0 14px', zIndex: 5,
      }}>
        <GlassBadge onClick={resetGame}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 5 }}>
            <path d="M1 4v6h6M23 20v-6h-6" stroke={COLORS.cream} strokeWidth="2" strokeLinecap="round"/>
            <path d="M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15" stroke={COLORS.cream} strokeWidth="2" strokeLinecap="round" fill="none"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>NOUVELLE</span>
        </GlassBadge>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 11, letterSpacing: 3, color: COLORS.brass, fontWeight: 600 }}>MANCHE {state.trickNumber}/10</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(0,0,0,0.3)',
            border: `0.5px solid ${tableBg.accent}55`,
            borderRadius: 20, padding: '5px 14px', backdropFilter: 'blur(10px)',
          }}>
            <TeamScore label="Nous" subLabel="7NA" score={state.score.A + state.roundPoints.A} color={COLORS.brass}/>
            <div style={{ width: 1, height: 18, background: `${COLORS.cream}33` }}/>
            <TeamScore label="Eux" subLabel="HOMA" score={state.score.B + state.roundPoints.B} color={COLORS.cream}/>
          </div>
        </div>

        <GlassBadge>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke={COLORS.cream} strokeWidth="2"/>
            <path d="M12 7v5l3 2" stroke={COLORS.cream} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </GlassBadge>
      </div>

      {/* Trump indicator */}
      <div style={{
        position: 'absolute', top: 128, right: 14, zIndex: 4,
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(0,0,0,0.35)', padding: '6px 10px 6px 6px',
        borderRadius: 24, border: `0.5px solid ${tableBg.accent}55`,
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: COLORS.saffronSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 12px ${COLORS.saffron}88`,
        }}>
          <SuitGlyph suit={state.trump} size={18}/>
        </div>
        <div>
          <div style={{ fontSize: 9, color: `${COLORS.cream}aa`, letterSpacing: 1.5, fontWeight: 700 }}>ATOUT · TOUTI</div>
          <div style={{ fontFamily: FONT_UI, fontSize: 12, color: COLORS.cream, fontWeight: 700, marginTop: 1, fontStyle: 'italic', letterSpacing: 0.5 }}>
            {({oros:'Dheb (Or)', copas:'Kis (Coupe)', espadas:'Sif (Épée)', bastos:'3sa (Bâton)'})[state.trump]}
          </div>
        </div>
      </div>

      {/* Seats */}
      {PLAYERS.slice(1).map(p => (
        <PlayerSeat
          key={p.id}
          position={p.pos}
          name={p.name}
          subName={p.sub}
          initials={p.initials}
          color={p.color}
          cardCount={state.hands[p.id].length}
          isPartner={p.id === 2}
          showCards={showPartner && p.id === 2}
          partnerHand={showPartner && p.id === 2 ? state.hands[2] : null}
          active={state.currentPlayer === p.id && state.phase === 'playing'}
        />
      ))}

      {/* Played cards in center */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 200, height: 200,
      }}>
        {Object.entries(playedByPos).map(([pos, card]) => {
          const style = {
            top:    { top: 0,  left: '50%', transform: 'translate(-50%, 0) rotate(6deg)' },
            right:  { top: '50%', right: -4, transform: 'translate(0, -50%) rotate(90deg)' },
            left:   { top: '50%', left: -4, transform: 'translate(0, -50%) rotate(-90deg)' },
            bottom: { bottom: 0, left: '50%', transform: 'translate(-50%, 0) rotate(-3deg)' },
          }[pos];
          const isWinning = state.phase === 'trick-end' && PLAYERS[state.lastTrickWinner].pos === pos;
          return (
            <div key={pos} style={{ position: 'absolute', ...style }}>
              <Card rank={card.rank} suit={card.suit} size="md" highlighted={isWinning}/>
            </div>
          );
        })}

        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          <div style={{ fontFamily: FONT_UI, fontSize: 11, color: `${COLORS.cream}99`, letterSpacing: 2, fontWeight: 700, fontStyle: 'italic' }}>BAZZA</div>
          <div style={{ fontFamily: FONT_UI, fontSize: 9, color: `${COLORS.cream}55`, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>MAIN {state.trickNumber}/10</div>
        </div>
      </div>

      {/* Message toast */}
      {state.message && (
        <div style={{
          position: 'absolute', top: '58%', left: '50%',
          transform: 'translate(-50%, 0)',
          padding: '8px 16px',
          background: `linear-gradient(90deg, ${COLORS.saffron}, ${COLORS.brassDeep})`,
          color: COLORS.terracottaDark, borderRadius: 18,
          fontFamily: FONT_UI, fontSize: 12, fontWeight: 800, letterSpacing: 0.4,
          boxShadow: `0 6px 18px ${COLORS.saffron}66`,
          zIndex: 15, whiteSpace: 'nowrap',
        }}>{state.message}</div>
      )}

      {/* Turn indicator */}
      {myTurn && (
        <div style={{
          position: 'absolute', bottom: 232, left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 18px',
          background: `linear-gradient(90deg, ${COLORS.saffron}, ${COLORS.brassDeep})`,
          borderRadius: 20,
          boxShadow: `0 4px 14px ${COLORS.brassDeep}66, inset 0 1px 0 rgba(255,255,255,0.3)`,
          animation: 'pulse-glow 2s ease-in-out infinite',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FDF6E3' }}/>
          <span style={{ fontFamily: FONT_UI, fontSize: 13, color: '#FDF6E3', fontWeight: 700, letterSpacing: 0.5 }}>À toi de jouer</span>
          <span style={{ fontFamily: FONT_UI, fontSize: 11, color: '#FDF6E3dd', letterSpacing: 1.5, fontWeight: 700, fontStyle: 'italic' }}>· DORK</span>
        </div>
      )}

      {/* My hand */}
      <div style={{
        position: 'absolute', bottom: 60, left: 0, right: 0,
        height: 170, display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
        zIndex: 10,
      }}>
        {myHand.map((card, i) => {
          const n = myHand.length;
          const mid = (n - 1) / 2;
          const rot = (i - mid) * 6;
          const translateY = Math.abs(i - mid) * 4;
          const isSel = selectedIdx === i;
          const isLegal = legal.has(cardKey(card));
          const disabled = !myTurn || !isLegal;
          return (
            <div key={i} onClick={() => handlePlay(i)}
              style={{
                transform: `translateY(${isSel ? -32 : translateY}px) rotate(${rot}deg)`,
                transformOrigin: 'bottom center',
                marginLeft: i === 0 ? 0 : -22,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'transform 0.22s cubic-bezier(.2,.8,.3,1.2)',
                zIndex: isSel ? 20 : i,
                filter: disabled ? 'grayscale(0.4) brightness(0.7)' : 'none',
              }}>
              <Card rank={card.rank} suit={card.suit} size="lg" highlighted={isSel}/>
            </div>
          );
        })}
      </div>

      {/* My nameplate */}
      <div style={{
        position: 'absolute', bottom: 14, left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '5px 12px 5px 5px',
        background: 'rgba(0,0,0,0.4)', borderRadius: 24,
        border: `0.5px solid ${COLORS.brass}77`, backdropFilter: 'blur(10px)',
        zIndex: 11,
      }}>
        <Avatar initials="S" size={30} color={COLORS.teal} ring={false}/>
        <div>
          <div style={{ fontFamily: FONT_UI, fontSize: 13, color: COLORS.cream, fontWeight: 700, lineHeight: 1 }}>Sara</div>
          <div style={{ fontFamily: FONT_UI, fontSize: 9, color: `${COLORS.cream}99`, letterSpacing: 1.2, fontWeight: 600, marginTop: 2 }}>NTI · {myHand.length} cartes</div>
        </div>
        <div style={{ display: 'flex', gap: 2, marginLeft: 6 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: 14, height: 18, borderRadius: 2,
              background: i < state.tricksWon.A.length ? `linear-gradient(135deg, ${COLORS.saffron}, ${COLORS.brassDeep})` : `${COLORS.cream}22`,
              border: `0.5px solid ${COLORS.brass}`,
            }}/>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 4px 14px rgba(184,121,28,0.4), inset 0 1px 0 rgba(255,255,255,0.3); }
          50% { box-shadow: 0 4px 22px rgba(232,161,48,0.8), inset 0 1px 0 rgba(255,255,255,0.3); }
        }
      `}</style>
    </div>
  );
}

function GlassBadge({ children, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', padding: '8px 12px',
      background: 'rgba(0,0,0,0.3)',
      border: `0.5px solid ${COLORS.brass}44`,
      borderRadius: 20, backdropFilter: 'blur(10px)',
      color: COLORS.cream, fontFamily: FONT_UI,
      cursor: onClick ? 'pointer' : 'default',
    }}>{children}</div>
  );
}

function TeamScore({ label, subLabel, score, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: FONT_UI, fontSize: 10, color: `${color}cc`, fontWeight: 700, lineHeight: 1 }}>{label}</div>
        <div style={{ fontFamily: FONT_UI, fontSize: 7, color: `${color}88`, letterSpacing: 1, marginTop: 1 }}>{subLabel}</div>
      </div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color, fontWeight: 700, minWidth: 30, textAlign: 'center', lineHeight: 1 }}>{score}</div>
    </div>
  );
}

function PlayerSeat({ position, name, subName, initials, color, cardCount, isPartner, showCards, partnerHand, active }) {
  const layouts = {
    top:   { top: 72, left: '50%', transform: 'translateX(-50%)', flexDirection: 'column' },
    left:  { top: '42%', left: 8, transform: 'translateY(-50%)', flexDirection: 'column' },
    right: { top: '42%', right: 8, transform: 'translateY(-50%)', flexDirection: 'column' },
  };
  return (
    <div style={{
      position: 'absolute', ...layouts[position],
      display: 'flex', alignItems: 'center', gap: 8, zIndex: 4,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 10px 5px 5px',
        background: active ? `linear-gradient(90deg, ${COLORS.saffron}dd, ${COLORS.brassDeep}dd)` : 'rgba(0,0,0,0.4)',
        borderRadius: 20,
        border: `0.5px solid ${active ? COLORS.saffron : (isPartner ? COLORS.brass + '88' : `${COLORS.cream}33`)}`,
        backdropFilter: 'blur(10px)',
        boxShadow: active ? `0 0 18px ${COLORS.saffron}77` : 'none',
      }}>
        <Avatar initials={initials} size={28} color={color} ring={false}/>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontFamily: FONT_UI, fontSize: 12, fontWeight: 700, color: active ? '#FDF6E3' : COLORS.cream, lineHeight: 1, letterSpacing: 0.3 }}>{name}</div>
          <div style={{ fontFamily: FONT_UI, fontSize: 8, letterSpacing: 1.2, color: active ? '#FDF6E3cc' : `${COLORS.cream}88`, fontWeight: 700, marginTop: 2, fontStyle: 'italic' }}>
            {isPartner ? 'SA7BEK · ' : ''}{subName}
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: position === 'top' ? 'row' : 'column',
        marginTop: position === 'top' ? 4 : 0,
      }}>
        {Array.from({ length: cardCount }).map((_, i) => {
          const visibleCard = showCards && partnerHand ? partnerHand[i] : null;
          return (
            <div key={i} style={{
              marginLeft: position === 'top' && i > 0 ? -22 : 0,
              marginTop: position !== 'top' && i > 0 ? -40 : 0,
              transform: position === 'top'
                ? `rotate(${(i - (cardCount-1)/2) * 4}deg)`
                : position === 'left'
                  ? `rotate(90deg) translateX(${(i - (cardCount-1)/2) * 6}px)`
                  : `rotate(-90deg) translateX(${-(i - (cardCount-1)/2) * 6}px)`,
              transformOrigin: position === 'top' ? 'center top' : 'center',
            }}>
              {visibleCard
                ? <Card rank={visibleCard.rank} suit={visibleCard.suit} size="sm"/>
                : <Card rank={0} suit="oros" size="sm" faceDown/>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { GameTable });
