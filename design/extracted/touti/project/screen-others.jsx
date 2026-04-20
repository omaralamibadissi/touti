// Matchmaking, Trick-won, Scoreboard, Profile, Settings — FR primary, Darija arabizi for game terms

function MatchmakingScreen({ onNav }) {
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: `radial-gradient(ellipse at top, ${COLORS.terracotta} 0%, ${COLORS.terracottaDark} 70%, #3E0F08 100%)`,
      overflow: 'hidden', fontFamily: FONT_UI, color: COLORS.cream,
    }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.07 }}>
        <ZelligeBg color={COLORS.terracottaDark} accent={COLORS.saffronSoft} size={80}/>
      </div>

      <div style={{ height: 59 }}/>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
        <div onClick={() => onNav && onNav('home')} style={{
          width: 38, height: 38, borderRadius: 12,
          background: 'rgba(0,0,0,0.3)', border: `0.5px solid ${COLORS.brass}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke={COLORS.cream} strokeWidth="2.5" fill="none" strokeLinecap="round"/></svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: FONT_UI, fontSize: 15, fontWeight: 700, color: COLORS.cream }}>Recherche de joueurs</div>
          <div style={{ fontSize: 9, letterSpacing: 2, color: `${COLORS.cream}88`, fontWeight: 700, fontStyle: 'italic', marginTop: 2 }}>KAYQALBO 3LA SHABEK</div>
        </div>
        <div style={{ width: 38 }}/>
      </div>

      <div style={{
        position: 'absolute', top: '34%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 280, height: 280,
      }}>
        <div style={{ position: 'absolute', inset: 0, animation: 'spin 12s linear infinite' }}>
          <StarBurst size={280} color={COLORS.saffronSoft} strokeW={0.8}/>
        </div>
        <div style={{ position: 'absolute', inset: 40, animation: 'spin 18s linear infinite reverse', opacity: 0.5 }}>
          <StarBurst size={200} color={COLORS.brass} strokeW={1}/>
        </div>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <div style={{ position: 'absolute', transform: 'translate(-50%, -50%) rotate(-10deg)' }}>
            <Card rank={0} suit="oros" size="lg" faceDown/>
          </div>
          <div style={{ position: 'absolute', transform: 'translate(-50%, -50%) rotate(4deg)' }}>
            <Card rank={0} suit="oros" size="lg" faceDown/>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', top: '62%', left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontFamily: FONT_UI, fontSize: 24, fontWeight: 700, color: COLORS.saffronSoft, letterSpacing: 0.3 }}>
          On cherche ton équipe
        </div>
        <div style={{ fontFamily: FONT_UI, fontSize: 12, letterSpacing: 3, color: `${COLORS.cream}aa`, marginTop: 6, fontWeight: 600, fontStyle: 'italic' }}>
          SBER CHWIYA · 00:14
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 150, left: 0, right: 0, padding: '0 20px' }}>
        <div style={{
          background: 'rgba(43,16,10,0.55)',
          border: `0.5px solid ${COLORS.brass}55`,
          borderRadius: 18, padding: 14,
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: `${COLORS.cream}aa`, fontWeight: 700, marginBottom: 10 }}>
            TABLE DE 4 · 2 CONTRE 2
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <PlayerSlot filled name="Sara" team="A" initials="S" color={COLORS.teal} you/>
            <PlayerSlot filled name="Karim" team="A" initials="K" color={COLORS.brass}/>
            <PlayerSlot filled name="Youssef" team="B" initials="Y" color="#8B4A7F"/>
            <PlayerSlot searching team="B"/>
          </div>
        </div>

        <div onClick={() => onNav && onNav('table')} style={{
          marginTop: 12, padding: '12px 16px',
          background: 'rgba(0,0,0,0.3)',
          border: `0.5px solid ${COLORS.cream}33`,
          borderRadius: 14,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer',
        }}>
          <div style={{ fontFamily: FONT_UI, fontSize: 14, fontWeight: 700 }}>Annuler la recherche</div>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: `${COLORS.cream}aa`, fontWeight: 700, fontStyle: 'italic' }}>BARAKA</div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function PlayerSlot({ filled, searching, name, team, initials, color, you }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px',
      background: filled ? `${color}22` : 'rgba(0,0,0,0.25)',
      border: `1px ${searching ? 'dashed' : 'solid'} ${filled ? color + '66' : COLORS.cream + '33'}`,
      borderRadius: 12,
      position: 'relative',
    }}>
      {searching ? (
        <>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            border: `1.5px dashed ${COLORS.cream}66`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pulse-op 1.6s ease-in-out infinite',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.saffron }}/>
          </div>
          <div>
            <div style={{ fontFamily: FONT_UI, fontSize: 12, color: `${COLORS.cream}cc`, fontWeight: 600 }}>Recherche…</div>
            <div style={{ fontSize: 9, letterSpacing: 1, color: `${COLORS.cream}77`, fontWeight: 700, fontStyle: 'italic', marginTop: 2 }}>KAYQALBO</div>
          </div>
        </>
      ) : (
        <>
          <Avatar initials={initials} size={32} color={color} ring={false}/>
          <div>
            <div style={{ fontFamily: FONT_UI, fontSize: 13, fontWeight: 700, color: COLORS.cream, lineHeight: 1 }}>
              {name} {you && <span style={{ fontSize: 8, color: COLORS.brass, marginLeft: 4, letterSpacing: 1 }}>NTI</span>}
            </div>
            <div style={{ fontSize: 9, letterSpacing: 1, color: `${COLORS.cream}88`, fontWeight: 700, marginTop: 3 }}>
              ÉQUIPE {team}
            </div>
          </div>
        </>
      )}
      <style>{`@keyframes pulse-op { 0%,100% { opacity:0.4 } 50% { opacity:1 } }`}</style>
    </div>
  );
}

function TrickWonScreen({ onNav }) {
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: `radial-gradient(ellipse at center, #1A4A3A 0%, #062820 100%)`,
      overflow: 'hidden', fontFamily: FONT_UI, color: COLORS.cream,
    }}>
      <div style={{
        position: 'absolute', top: '30%', left: '50%',
        transform: 'translate(-50%, -50%)',
        animation: 'spin-slow 40s linear infinite',
        opacity: 0.3,
      }}>
        <StarBurst size={620} color={COLORS.saffron} strokeW={0.8}/>
      </div>

      <div style={{ height: 59 }}/>

      <div style={{ textAlign: 'center', marginTop: 26, position: 'relative', zIndex: 2 }}>
        <div style={{ fontFamily: FONT_UI, fontSize: 10, letterSpacing: 4, color: COLORS.brass, fontWeight: 700 }}>
          MANCHE 4 · GAGNÉE PAR TON ÉQUIPE
        </div>
        <div style={{ fontFamily: FONT_UI, fontSize: 38, fontWeight: 800, color: COLORS.saffronSoft, marginTop: 8, lineHeight: 1,
          textShadow: `0 2px 20px ${COLORS.saffron}66`, letterSpacing: 0.3 }}>
          Bazza dyalek !
        </div>
        <div style={{ fontFamily: FONT_UI, fontSize: 13, color: `${COLORS.cream}cc`, fontWeight: 600, letterSpacing: 2, marginTop: 8, fontStyle: 'italic' }}>
          TU AS PRIS LA MAIN · 7SELTI L'BAZZA
        </div>
      </div>

      <div style={{
        position: 'absolute', top: '36%', left: '50%',
        transform: 'translate(-50%, 0)',
        display: 'flex', justifyContent: 'center',
      }}>
        {[
          { rank: 1, suit: 'oros', rot: -8 },
          { rank: 3, suit: 'oros', rot: -3 },
          { rank: 12, suit: 'copas', rot: 3 },
          { rank: 7, suit: 'espadas', rot: 8 },
        ].map((c, i) => (
          <div key={i} style={{ marginLeft: i === 0 ? 0 : -28, transform: `rotate(${c.rot}deg) translateY(${Math.abs(c.rot)}px)`, zIndex: i }}>
            <Card rank={c.rank} suit={c.suit} size="lg" highlighted={i === 0}/>
          </div>
        ))}
      </div>

      <div style={{ position: 'absolute', top: '60%', left: 0, right: 0, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '8px 22px',
          background: `linear-gradient(90deg, ${COLORS.brassDeep}, ${COLORS.saffron}, ${COLORS.brassDeep})`,
          borderRadius: 22,
          boxShadow: `0 4px 20px ${COLORS.saffron}66`,
        }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 38, fontWeight: 700, color: COLORS.terracottaDark, lineHeight: 1 }}>+24</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: FONT_UI, fontSize: 13, color: COLORS.terracottaDark, fontWeight: 800, lineHeight: 1 }}>POINTS</div>
            <div style={{ fontFamily: FONT_UI, fontSize: 9, color: COLORS.terracottaDark, letterSpacing: 1.5, fontWeight: 700, marginTop: 3, fontStyle: 'italic' }}>N9AT</div>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 120, left: 20, right: 20 }}>
        <OrnateFrame bg="rgba(0,0,0,0.35)" accent={COLORS.brass} padding={14}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT_UI, fontSize: 11, color: COLORS.brass, fontWeight: 700 }}>NOUS · 7NA</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 38, fontWeight: 700, color: COLORS.saffronSoft, lineHeight: 1 }}>62</div>
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: `${COLORS.cream}55`, fontWeight: 500 }}>—</div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontFamily: FONT_UI, fontSize: 11, color: `${COLORS.cream}99`, fontWeight: 700 }}>EUX · HOMA</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 38, fontWeight: 700, color: COLORS.cream, lineHeight: 1 }}>38</div>
            </div>
          </div>
          <div style={{ height: 6, background: 'rgba(0,0,0,0.4)', borderRadius: 3, marginTop: 10, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: '62%', background: `linear-gradient(90deg, ${COLORS.saffron}, ${COLORS.brassDeep})` }}/>
            <div style={{ width: '38%', background: `${COLORS.cream}55` }}/>
          </div>
          <div style={{ fontSize: 10, letterSpacing: 1.3, color: `${COLORS.cream}aa`, fontWeight: 600, marginTop: 8, textAlign: 'center' }}>
            PREMIER À 101 GAGNE · LLI KAYWSEL L'101 KAYREB7
          </div>
        </OrnateFrame>
      </div>

      <div style={{ position: 'absolute', bottom: 38, left: 20, right: 20 }}>
        <div onClick={() => onNav && onNav('table')} style={{
          padding: '14px 20px',
          background: `linear-gradient(180deg, ${COLORS.saffron}, ${COLORS.brassDeep})`,
          borderRadius: 14,
          textAlign: 'center',
          boxShadow: `0 3px 0 ${COLORS.terracottaDark}, 0 8px 18px rgba(0,0,0,0.3)`,
          cursor: 'pointer',
        }}>
          <div style={{ fontFamily: FONT_UI, fontSize: 17, fontWeight: 800, color: COLORS.terracottaDark, lineHeight: 1, letterSpacing: 0.3 }}>Continuer</div>
          <div style={{ fontFamily: FONT_UI, fontSize: 10, letterSpacing: 3, color: COLORS.terracottaDark, fontWeight: 700, marginTop: 4, fontStyle: 'italic' }}>KEMMEL · MANCHE SUIVANTE</div>
        </div>
      </div>

      <style>{`@keyframes spin-slow { to { transform: translate(-50%, -50%) rotate(360deg); } }`}</style>
    </div>
  );
}

function ScoreboardScreen({ onNav }) {
  const players = [
    { rank: 1, name: 'Mourad',  score: 18420, you: false, color: COLORS.brassDeep, chg: '+12' },
    { rank: 2, name: 'Layla',   score: 17895, you: false, color: '#8B4A7F', chg: '+8' },
    { rank: 3, name: 'Khalid',  score: 16330, you: false, color: COLORS.teal, chg: '—' },
    { rank: 4, name: 'Nadia',   score: 15200, you: false, color: COLORS.terracotta, chg: '+3' },
    { rank: 5, name: 'Sara',    score: 14980, you: true,  color: COLORS.teal, chg: '+22' },
    { rank: 6, name: 'Amine',   score: 14410, you: false, color: COLORS.brass, chg: '-2' },
    { rank: 7, name: 'Siham',   score: 13870, you: false, color: '#8B4A7F', chg: '—' },
  ];
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: `linear-gradient(180deg, ${COLORS.tealDeep} 0%, #051D20 100%)`,
      overflow: 'auto', fontFamily: FONT_UI, color: COLORS.cream,
    }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.06 }}>
        <ZelligeBg color={COLORS.tealDeep} accent={COLORS.brass} size={60}/>
      </div>

      <div style={{ height: 59 }}/>

      <div style={{ padding: '16px 16px 8px', position: 'relative', zIndex: 2 }}>
        <div style={{ fontFamily: FONT_UI, fontSize: 11, letterSpacing: 4, color: COLORS.brass, fontWeight: 700 }}>
          CLASSEMENT DE LA SEMAINE
        </div>
        <div style={{ fontFamily: FONT_UI, fontSize: 28, fontWeight: 800, color: COLORS.saffronSoft, lineHeight: 1, marginTop: 6, letterSpacing: 0.3 }}>
          Top Abtal <span style={{ fontStyle: 'italic', opacity: 0.6, fontWeight: 600 }}>· Champions</span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {[
            { fr: 'Amis', dr: 'S7ABEK' },
            { fr: 'Monde', dr: 'L3ALAM', active: true },
            { fr: 'Maroc', dr: 'L'+'MAGHRIB' },
          ].map((t, i) => (
            <div key={i} style={{
              padding: '6px 14px',
              background: t.active ? `linear-gradient(180deg, ${COLORS.saffron}, ${COLORS.brassDeep})` : 'rgba(0,0,0,0.3)',
              border: `0.5px solid ${t.active ? COLORS.saffron : COLORS.brass + '33'}`,
              borderRadius: 16,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontFamily: FONT_UI, fontSize: 12, fontWeight: 700, color: t.active ? COLORS.terracottaDark : COLORS.cream }}>{t.fr}</span>
              <span style={{ fontSize: 8, letterSpacing: 1, color: t.active ? COLORS.terracottaDark : `${COLORS.cream}77`, fontWeight: 700, fontStyle: 'italic' }}>{t.dr}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
        padding: '16px 16px 4px', gap: 10, position: 'relative', zIndex: 2,
      }}>
        {[{p: players[1], h: 70}, {p: players[0], h: 90}, {p: players[2], h: 55}].map(({p, h}, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Avatar initials={p.name.charAt(0)} size={i === 1 ? 54 : 42} color={p.color}/>
            <div style={{ fontFamily: FONT_UI, fontSize: 13, fontWeight: 700, color: COLORS.cream, marginTop: 6 }}>{p.name}</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: COLORS.saffronSoft, fontWeight: 700, lineHeight: 1 }}>{p.score.toLocaleString('fr-FR')}</div>
            <div style={{
              width: '100%', height: h, marginTop: 6,
              background: `linear-gradient(180deg, ${i === 1 ? COLORS.saffron : (i === 0 ? '#C0C0C0' : '#CD7F32')}, ${i === 1 ? COLORS.brassDeep : (i === 0 ? '#808080' : '#8B4513')})`,
              borderRadius: '10px 10px 0 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
              border: `0.5px solid ${COLORS.brass}`, borderBottom: 'none',
            }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 700, color: COLORS.terracottaDark }}>{p.rank}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '14px 16px 120px', position: 'relative', zIndex: 2 }}>
        {players.slice(3).map((p, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', marginBottom: 8,
            background: p.you
              ? `linear-gradient(90deg, ${COLORS.brassDeep}66, ${COLORS.brassDeep}22)`
              : 'rgba(0,0,0,0.3)',
            border: `0.5px solid ${p.you ? COLORS.brass : COLORS.cream + '22'}`,
            borderRadius: 12,
          }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: p.you ? COLORS.saffronSoft : `${COLORS.cream}aa`, width: 26 }}>#{p.rank}</div>
            <Avatar initials={p.name.charAt(0)} size={36} color={p.color} ring={p.you}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT_UI, fontSize: 14, fontWeight: 700, color: COLORS.cream, lineHeight: 1 }}>
                {p.name} {p.you && <span style={{ fontSize: 9, color: COLORS.brass, marginLeft: 4, letterSpacing: 1, fontStyle: 'italic' }}>· NTI</span>}
              </div>
              <div style={{ fontSize: 10, letterSpacing: 1, color: `${COLORS.cream}77`, fontWeight: 600, marginTop: 3 }}>Niveau {Math.floor(p.score/1200)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: COLORS.saffronSoft, lineHeight: 1 }}>{p.score.toLocaleString('fr-FR')}</div>
              <div style={{
                fontSize: 10, fontWeight: 700, marginTop: 3,
                color: p.chg.startsWith('+') ? '#3FC26A' : p.chg.startsWith('-') ? '#E8553A' : `${COLORS.cream}55`,
              }}>{p.chg}</div>
            </div>
          </div>
        ))}
      </div>

      <BottomTabBar active="score" onNav={onNav}/>
    </div>
  );
}

function ProfileScreen({ onNav }) {
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: `linear-gradient(180deg, ${COLORS.tealDeep} 0%, #051D20 70%)`,
      overflow: 'auto', fontFamily: FONT_UI, color: COLORS.cream,
    }}>
      <div style={{
        height: 240, position: 'relative',
        background: `linear-gradient(180deg, ${COLORS.terracotta} 0%, ${COLORS.terracottaDark} 100%)`,
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.15 }}>
          <ZelligeBg color={COLORS.terracottaDark} accent={COLORS.saffronSoft} size={50}/>
        </div>
        <div style={{ position: 'absolute', top: -80, right: -60, opacity: 0.25 }}>
          <StarBurst size={280} color={COLORS.saffronSoft} strokeW={0.8}/>
        </div>
        <div style={{ height: 59 }}/>
        <div style={{ padding: '56px 20px 0', position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <Avatar initials="S" size={84} color={COLORS.teal}/>
            <div style={{
              position: 'absolute', bottom: -4, right: -4,
              background: `linear-gradient(135deg, ${COLORS.saffron}, ${COLORS.brassDeep})`,
              color: COLORS.terracottaDark, fontFamily: FONT_DISPLAY,
              fontSize: 16, fontWeight: 800,
              width: 30, height: 30, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px solid ${COLORS.terracottaDark}`,
            }}>14</div>
          </div>
          <div>
            <div style={{ fontFamily: FONT_UI, fontSize: 26, fontWeight: 800, color: COLORS.cream, lineHeight: 1, letterSpacing: 0.3 }}>Sara A.</div>
            <div style={{ fontFamily: FONT_UI, fontSize: 12, fontWeight: 600, color: `${COLORS.cream}bb`, letterSpacing: 1.5, marginTop: 4, fontStyle: 'italic' }}>@sara_da_touti</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <div style={{
                padding: '2px 8px', background: COLORS.saffron,
                color: COLORS.terracottaDark, borderRadius: 4,
                fontSize: 9, fontWeight: 800, letterSpacing: 1,
              }}>L7AD9A · EXPERT</div>
              <div style={{ fontSize: 10, color: `${COLORS.cream}99`, letterSpacing: 1 }}>CASABLANCA, MA</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '18px 16px 0', position: 'relative', zIndex: 2, marginTop: -30 }}>
        <OrnateFrame bg="rgba(0,0,0,0.4)" accent={COLORS.brass} padding={14}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <StatBlock fr="Parties" dr="LEUB" value="284"/>
            <StatBlock fr="Victoires" dr="RAB7A" value="192" highlight/>
            <StatBlock fr="Ratio" dr="%" value="67%"/>
          </div>
          <div style={{ height: 0.5, background: `${COLORS.brass}44`, margin: '14px 0' }}/>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <StatBlock fr="Série" dr="SILSILA" value="7"/>
            <StatBlock fr="Bazzat" dr="BAZZA" value="2,1k"/>
            <StatBlock fr="XP" dr="N9AT" value="14,9k"/>
          </div>
        </OrnateFrame>
      </div>

      <div style={{ padding: '18px 16px 0' }}>
        <SectionHeader fr="Trophées" dr="INJAZAT" count={8}/>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {[
            { icon: '★', fr: 'Champion', dr: 'BTAL CH-CHAHR', unlocked: true, color: COLORS.saffron },
            { icon: '◆', fr: '7 bazzat', dr: 'SBE3 BAZZAT', unlocked: true, color: COLORS.terracotta },
            { icon: '✦', fr: 'Série 10', dr: 'SILSILA 10', unlocked: false, color: `${COLORS.cream}33` },
            { icon: '♦', fr: 'Niveau 20', dr: 'MOSTAWA 20', unlocked: false, color: `${COLORS.cream}33` },
          ].map((a, i) => (
            <div key={i} style={{
              flexShrink: 0, width: 94, padding: 10,
              background: a.unlocked ? `${a.color}22` : 'rgba(0,0,0,0.3)',
              border: `0.5px solid ${a.color}66`, borderRadius: 12,
              textAlign: 'center',
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: '50%',
                background: a.unlocked ? `linear-gradient(135deg, ${a.color}, ${shade(a.color,-20)})` : 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto', fontSize: 22, opacity: a.unlocked ? 1 : 0.3,
                border: `1px solid ${a.color}`, color: '#2B1810', fontWeight: 700,
              }}>{a.icon}</div>
              <div style={{ fontFamily: FONT_UI, fontSize: 11, fontWeight: 700, color: a.unlocked ? COLORS.cream : `${COLORS.cream}55`, marginTop: 6, lineHeight: 1.1 }}>{a.fr}</div>
              <div style={{ fontSize: 7, letterSpacing: 1, color: a.unlocked ? `${COLORS.cream}aa` : `${COLORS.cream}44`, fontWeight: 700, marginTop: 3, fontStyle: 'italic' }}>{a.dr}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '18px 16px 120px' }}>
        <SectionHeader fr="Parties récentes" dr="LEUB L'KHRA"/>
        <div style={{ marginTop: 10 }}>
          {[
            { won: true, score: '101-78', partner: 'Karim', ts: 'il y a 2h' },
            { won: true, score: '104-92', partner: 'Khalid', ts: 'il y a 5h' },
            { won: false, score: '89-101', partner: 'Layla', ts: 'hier' },
          ].map((g, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', marginBottom: 6,
              background: 'rgba(0,0,0,0.3)',
              border: `0.5px solid ${COLORS.cream}22`, borderRadius: 10,
            }}>
              <div style={{
                width: 8, height: 34, borderRadius: 4,
                background: g.won ? '#3FC26A' : '#E8553A',
              }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT_UI, fontSize: 13, fontWeight: 700, color: COLORS.cream, lineHeight: 1 }}>
                  {g.won ? 'Victoire' : 'Défaite'} · avec {g.partner}
                </div>
                <div style={{ fontSize: 10, letterSpacing: 1, color: `${COLORS.cream}77`, fontWeight: 700, marginTop: 3, fontStyle: 'italic' }}>
                  {g.won ? 'RAB7NA' : 'KHSERNA'} · M3A {g.partner.toUpperCase()}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: g.won ? COLORS.saffronSoft : `${COLORS.cream}aa`, lineHeight: 1 }}>{g.score}</div>
                <div style={{ fontSize: 9, color: `${COLORS.cream}66`, marginTop: 3 }}>{g.ts}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomTabBar active="profile" onNav={onNav}/>
    </div>
  );
}

function StatBlock({ fr, dr, value, highlight }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700,
        color: highlight ? COLORS.saffronSoft : COLORS.cream, lineHeight: 1,
      }}>{value}</div>
      <div style={{ fontFamily: FONT_UI, fontSize: 11, color: `${COLORS.cream}cc`, marginTop: 5, fontWeight: 600 }}>{fr}</div>
      <div style={{ fontSize: 8, letterSpacing: 1.5, color: `${COLORS.cream}88`, fontWeight: 700, marginTop: 2, fontStyle: 'italic' }}>{dr}</div>
    </div>
  );
}

function SettingsScreen({ onNav }) {
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: `linear-gradient(180deg, ${COLORS.tealDeep} 0%, #051D20 100%)`,
      overflow: 'auto', fontFamily: FONT_UI, color: COLORS.cream,
    }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.04 }}>
        <ZelligeBg color={COLORS.tealDeep} accent={COLORS.brass} size={60}/>
      </div>

      <div style={{ height: 59 }}/>
      <div style={{ padding: '16px 16px 8px', position: 'relative', zIndex: 2 }}>
        <div style={{ fontFamily: FONT_UI, fontSize: 11, letterSpacing: 4, color: COLORS.brass, fontWeight: 700 }}>RÉGLAGES</div>
        <div style={{ fontFamily: FONT_UI, fontSize: 28, fontWeight: 800, color: COLORS.saffronSoft, lineHeight: 1, marginTop: 6, letterSpacing: 0.3 }}>
          Paramètres
        </div>
      </div>

      <div style={{ padding: '14px 16px 120px', position: 'relative', zIndex: 2 }}>
        <SettingsGroup fr="Le jeu" dr="L'LO3B">
          <SettingRow fr="Langue" dr="L'LOGHA" value="Français"/>
          <SettingRow fr="Dos des cartes" dr="DHAHR L'KARTA" value="Zellige" swatch/>
          <SettingRow fr="Couleur de table" dr="LAWN T-TABLA" value="Vert" swatch color={COLORS.felt}/>
          <SettingRow fr="Vitesse du jeu" dr="SOR3A" value="Normale"/>
        </SettingsGroup>

        <SettingsGroup fr="Son & Vibrations" dr="S-SOUT">
          <SettingRow fr="Effets sonores" dr="TA2THIRAT" toggle value={true}/>
          <SettingRow fr="Musique" dr="MOSI9A" toggle value={true}/>
          <SettingRow fr="Vibrations" dr="HTIZAZ" toggle value={false}/>
        </SettingsGroup>

        <SettingsGroup fr="Compte" dr="L'7SAB">
          <SettingRow fr="Notifications" dr="ICH3ARAT" chevron/>
          <SettingRow fr="Confidentialité" dr="L'KHSOSIYA" chevron/>
          <SettingRow fr="Aide" dr="MOSA3ADA" chevron/>
          <SettingRow fr="Déconnexion" dr="KHROUJ" chevron danger/>
        </SettingsGroup>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <div style={{ fontFamily: FONT_UI, fontSize: 11, letterSpacing: 4, color: `${COLORS.cream}55`, fontWeight: 700 }}>TOUTI v2.4.1</div>
          <div style={{ fontFamily: FONT_UI, fontSize: 11, color: `${COLORS.cream}55`, marginTop: 6, fontStyle: 'italic' }}>Fait avec ♥ au Maroc · SNE3 F'L'MAGHRIB</div>
        </div>
      </div>

      <BottomTabBar active="settings" onNav={onNav}/>
    </div>
  );
}

function SettingsGroup({ fr, dr, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '0 4px 6px' }}>
        <div style={{ fontFamily: FONT_UI, fontSize: 12, fontWeight: 700, color: COLORS.brass }}>{fr}</div>
        <div style={{ fontFamily: FONT_UI, fontSize: 9, letterSpacing: 2, color: `${COLORS.brass}aa`, fontWeight: 700, fontStyle: 'italic' }}>{dr}</div>
      </div>
      <div style={{
        background: 'rgba(0,0,0,0.4)',
        border: `0.5px solid ${COLORS.brass}33`,
        borderRadius: 14, overflow: 'hidden',
      }}>{children}</div>
    </div>
  );
}

function SettingRow({ fr, dr, value, toggle, chevron, swatch, color, danger }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '12px 14px',
      borderBottom: `0.5px solid ${COLORS.cream}11`,
      minHeight: 48,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FONT_UI, fontSize: 14, fontWeight: 600, color: danger ? '#E8553A' : COLORS.cream, lineHeight: 1 }}>{fr}</div>
        <div style={{ fontSize: 9, letterSpacing: 1.3, color: danger ? '#E8553A99' : `${COLORS.cream}77`, fontWeight: 700, marginTop: 3, fontStyle: 'italic' }}>{dr}</div>
      </div>
      {value !== undefined && !toggle && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {swatch && <div style={{ width: 22, height: 22, borderRadius: 5, background: color || `linear-gradient(135deg, ${COLORS.terracotta}, ${COLORS.terracottaDark})`, border: `0.5px solid ${COLORS.brass}` }}/>}
          <div style={{ fontFamily: FONT_UI, fontSize: 12, color: COLORS.brass, fontWeight: 600 }}>{value}</div>
        </div>
      )}
      {toggle && (
        <div style={{
          width: 42, height: 24, borderRadius: 12,
          background: value ? `linear-gradient(90deg, ${COLORS.saffron}, ${COLORS.brassDeep})` : 'rgba(255,255,255,0.15)',
          position: 'relative',
          boxShadow: value ? `0 0 10px ${COLORS.saffron}66` : 'none',
        }}>
          <div style={{
            position: 'absolute', top: 2, left: value ? 20 : 2,
            width: 20, height: 20, borderRadius: '50%', background: '#FDF6E3',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s',
          }}/>
        </div>
      )}
      {chevron && (
        <svg width="8" height="14" viewBox="0 0 8 14" style={{ marginLeft: 8 }}>
          <path d="M1 1l6 6-6 6" stroke={`${COLORS.cream}55`} strokeWidth="2" fill="none" strokeLinecap="round"/>
        </svg>
      )}
    </div>
  );
}

Object.assign(window, { MatchmakingScreen, TrickWonScreen, ScoreboardScreen, ProfileScreen, SettingsScreen });
