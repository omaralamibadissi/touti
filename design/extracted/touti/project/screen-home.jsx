// Home / Lobby screen — French primary, Darija arabizi for game terms

function HomeScreen({ onNav }) {
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: `linear-gradient(180deg, ${COLORS.terracotta} 0%, ${COLORS.terracottaDark} 55%, #4E1208 100%)`,
      overflow: 'hidden',
      fontFamily: FONT_UI, color: COLORS.cream,
    }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.08 }}>
        <ZelligeBg color={COLORS.terracottaDark} accent={COLORS.saffronSoft} size={70}/>
      </div>
      <div style={{
        position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
        opacity: 0.1,
      }}>
        <StarBurst size={420} color={COLORS.saffronSoft} strokeW={0.6}/>
      </div>

      <div style={{ height: 59 }}/>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', zIndex: 2, position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar initials="S" size={40} color={COLORS.teal}/>
          <div>
            <div style={{ fontFamily: FONT_UI, fontSize: 15, fontWeight: 700, color: COLORS.cream, lineHeight: 1 }}>Salut, Sara</div>
            <div style={{ fontSize: 10, color: `${COLORS.cream}99`, letterSpacing: 1, marginTop: 3, fontWeight: 600 }}>NIVEAU 14 · L7AD9A</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <CoinBadge icon="coin" value="2 480"/>
          <CoinBadge icon="gem" value="42"/>
        </div>
      </div>

      <div style={{
        textAlign: 'center', marginTop: 18, marginBottom: 12,
        position: 'relative', zIndex: 2,
      }}>
        <div style={{
          display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}>
          <ArabesqueDivider width={180} color={COLORS.saffronSoft}/>
          <div style={{
            fontFamily: FONT_DISPLAY, fontSize: 72, fontWeight: 700,
            color: COLORS.saffronSoft, lineHeight: 0.9, letterSpacing: 4,
            textShadow: `0 2px 0 ${COLORS.terracottaDark}, 0 4px 14px ${COLORS.saffron}55`,
          }}>TOUTI</div>
          <div style={{
            fontFamily: FONT_UI, fontSize: 11, fontWeight: 700,
            color: COLORS.cream, letterSpacing: 6,
            textTransform: 'uppercase', marginTop: 2, fontStyle: 'italic', opacity: 0.8,
          }}>Le jeu de cartes marocain</div>
          <ArabesqueDivider width={180} color={COLORS.saffronSoft}/>
        </div>
      </div>

      <div style={{ padding: '4px 20px', marginTop: 4, position: 'relative', zIndex: 2 }}>
        <div onClick={() => onNav && onNav('match')} style={{
          position: 'relative',
          background: `linear-gradient(180deg, ${COLORS.saffron} 0%, ${COLORS.brassDeep} 100%)`,
          borderRadius: 18,
          padding: '16px 22px',
          boxShadow: `0 3px 0 ${COLORS.terracottaDark}, 0 10px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)`,
          border: `1px solid ${COLORS.terracottaDark}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer',
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: FONT_UI, fontSize: 22, fontWeight: 800, color: '#2B1810', lineHeight: 1, letterSpacing: 0.3 }}>Partie rapide</div>
            <div style={{ fontFamily: FONT_UI, fontSize: 11, fontWeight: 700, color: '#2B1810cc', letterSpacing: 2, marginTop: 4, fontStyle: 'italic' }}>LE3B BZZERBA · 2v2</div>
          </div>
          <div style={{
            width: 54, height: 54, borderRadius: 16,
            background: 'rgba(43,24,16,0.22)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M5 4l14 8-14 8V4z" fill="#2B1810"/>
            </svg>
          </div>
        </div>
        <div style={{
          marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, fontSize: 11, color: `${COLORS.cream}bb`, letterSpacing: 0.8, fontWeight: 500,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3FC26A', boxShadow: '0 0 6px #3FC26A' }}/>
          <span>12 840 joueurs en ligne</span>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0', zIndex: 2, position: 'relative' }}>
        <SectionHeader fr="Modes de jeu" dr="ANWA3 L'LO3B"/>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          <ModeTile
            fr="Avec des amis" dr="M3A S7ABEK"
            accent={COLORS.teal}
            icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.5" stroke="#F5EBD6" strokeWidth="1.8"/><circle cx="17" cy="10" r="2.5" stroke="#F5EBD6" strokeWidth="1.8"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5" stroke="#F5EBD6" strokeWidth="1.8" strokeLinecap="round"/><path d="M15 20c0-2 2-4 4.5-4" stroke="#F5EBD6" strokeWidth="1.8" strokeLinecap="round"/></svg>}
          />
          <ModeTile
            fr="Tournoi" dr="BTOLA"
            accent={COLORS.brassDeep} badge="LIVE"
            icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M7 4h10v4a5 5 0 01-5 5 5 5 0 01-5-5V4z" stroke="#F5EBD6" strokeWidth="1.8" strokeLinejoin="round"/><path d="M4 4h3v3a3 3 0 01-3 0M17 4h3v3a3 3 0 01-3 0M12 13v4M8 20h8" stroke="#F5EBD6" strokeWidth="1.8" strokeLinecap="round"/></svg>}
          />
          <ModeTile
            fr="Contre l'IA" dr="DED L'MACHINE"
            accent="#8B4A7F"
            icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="4" y="6" width="16" height="12" rx="2" stroke="#F5EBD6" strokeWidth="1.8"/><circle cx="9" cy="12" r="1.5" fill="#F5EBD6"/><circle cx="15" cy="12" r="1.5" fill="#F5EBD6"/><path d="M8 3v3M16 3v3" stroke="#F5EBD6" strokeWidth="1.8" strokeLinecap="round"/></svg>}
          />
          <ModeTile
            fr="Défi du jour" dr="T7ADI L'YOUM"
            accent={COLORS.terracotta} badge="+250"
            icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="15" rx="2" stroke="#F5EBD6" strokeWidth="1.8"/><path d="M4 9h16M8 3v4M16 3v4" stroke="#F5EBD6" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="14" r="2" fill="#E8A130"/></svg>}
          />
        </div>
      </div>

      <div style={{ padding: '18px 16px 0', position: 'relative', zIndex: 2 }}>
        <SectionHeader fr="Amis en ligne" dr="S7ABEK ONLINE" count={4}/>
        <div style={{ display: 'flex', gap: 12, marginTop: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {[
            { i: 'K', c: COLORS.brass, n: 'Karim' },
            { i: 'Y', c: '#8B4A7F', n: 'Yasmine' },
            { i: 'A', c: COLORS.teal, n: 'Amine' },
            { i: 'F', c: COLORS.terracotta, n: 'Fatima' },
            { i: '+', c: `${COLORS.cream}22`, n: '3ayet' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <Avatar initials={f.i} size={46} color={f.c} online={i < 3}/>
              </div>
              <div style={{ fontSize: 9, color: COLORS.cream, fontWeight: 600, letterSpacing: 0.5 }}>{f.n}</div>
            </div>
          ))}
        </div>
      </div>

      <BottomTabBar active="home" onNav={onNav}/>
    </div>
  );
}

function CoinBadge({ icon, value }) {
  const iconEl = icon === 'coin' ? (
    <div style={{ width: 18, height: 18, borderRadius: '50%',
      background: `linear-gradient(135deg, ${COLORS.saffron}, ${COLORS.brassDeep})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), 0 0 4px ${COLORS.saffron}66`,
      fontFamily: FONT_DISPLAY, fontSize: 11, fontWeight: 700, color: COLORS.terracottaDark,
    }}>D</div>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 2l8 7-8 13-8-13 8-7z" fill="#4FC2D9" stroke="#0F5A5E" strokeWidth="1"/></svg>
  );
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '5px 10px 5px 5px',
      background: 'rgba(0,0,0,0.3)', borderRadius: 14,
      border: `0.5px solid ${COLORS.brass}44`,
    }}>
      {iconEl}
      <span style={{ fontFamily: FONT_UI, fontSize: 13, fontWeight: 700, color: COLORS.cream }}>{value}</span>
      <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 2v6M2 5h6" stroke={COLORS.brass} strokeWidth="1.5" strokeLinecap="round"/></svg>
    </div>
  );
}

function SectionHeader({ fr, dr, count }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ fontFamily: FONT_UI, fontSize: 13, fontWeight: 700, color: COLORS.cream, letterSpacing: 0.3 }}>{fr}</div>
        <div style={{ fontFamily: FONT_UI, fontSize: 9, letterSpacing: 2, color: `${COLORS.cream}88`, fontWeight: 700, fontStyle: 'italic' }}>{dr}</div>
      </div>
      {count !== undefined && (
        <div style={{ fontSize: 11, color: COLORS.brass, fontWeight: 700, letterSpacing: 1 }}>+{count}</div>
      )}
    </div>
  );
}

function ModeTile({ fr, dr, accent, icon, badge }) {
  return (
    <div style={{
      position: 'relative',
      background: `linear-gradient(160deg, ${accent}dd, ${shade(accent,-25)}ee)`,
      borderRadius: 14,
      padding: 12,
      border: `0.5px solid ${COLORS.brass}55`,
      cursor: 'pointer',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.2)',
    }}>
      {badge && <div style={{
        position: 'absolute', top: 8, right: 8,
        background: COLORS.saffron, color: COLORS.terracottaDark,
        padding: '2px 6px', borderRadius: 4,
        fontSize: 8, fontWeight: 800, letterSpacing: 0.5,
      }}>{badge}</div>}
      {icon}
      <div style={{ marginTop: 10 }}>
        <div style={{ fontFamily: FONT_UI, fontSize: 14, fontWeight: 700, color: COLORS.cream, lineHeight: 1, letterSpacing: 0.2 }}>{fr}</div>
        <div style={{ fontFamily: FONT_UI, fontSize: 9, letterSpacing: 1.3, color: `${COLORS.cream}aa`, fontWeight: 700, marginTop: 4, fontStyle: 'italic' }}>{dr}</div>
      </div>
    </div>
  );
}

function BottomTabBar({ active = 'home', onNav }) {
  const tabs = [
    { id: 'home', label: 'ACCUEIL', icon: 'home' },
    { id: 'score', label: 'CLASSEMENT', icon: 'trophy' },
    { id: 'profile', label: 'PROFIL', icon: 'user' },
    { id: 'settings', label: 'RÉGLAGES', icon: 'gear' },
  ];
  const iconPath = {
    home:   'M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-9z',
    trophy: 'M7 4h10v4a5 5 0 01-10 0V4zM4 4h3v3a3 3 0 01-3 0M17 4h3v3a3 3 0 01-3 0M12 13v4M8 20h8',
    user:   'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c1-4 4-6 8-6s7 2 8 6',
    gear:   'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-1-2-2 1a7 7 0 00-1-1l1-2-2-1-1 2a7 7 0 00-2 0l-1-2-2 1 1 2a7 7 0 00-1 1l-2-1-1 2 2 1a7 7 0 000 2l-2 1 1 2 2-1a7 7 0 001 1l-1 2 2 1 1-2a7 7 0 002 0l1 2 2-1-1-2a7 7 0 001-1l2 1 1-2-2-1a7 7 0 000-2z',
  };
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      padding: '10px 16px 28px',
      background: 'linear-gradient(180deg, transparent 0%, rgba(78,18,8,0.9) 40%)',
      backdropFilter: 'blur(14px)',
      borderTop: `0.5px solid ${COLORS.brass}33`,
      zIndex: 3,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-around',
        background: 'rgba(43,16,10,0.7)',
        border: `0.5px solid ${COLORS.brass}44`,
        borderRadius: 20, padding: '8px 4px',
      }}>
        {tabs.map(t => (
          <div key={t.id} onClick={() => onNav && onNav(t.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 3, padding: '4px 10px', borderRadius: 12,
            background: active === t.id ? `${COLORS.brass}33` : 'transparent',
            cursor: 'pointer', minWidth: 62,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d={iconPath[t.icon]} stroke={active === t.id ? COLORS.saffron : COLORS.cream}
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div style={{
              fontSize: 8, fontWeight: 700, letterSpacing: 1,
              color: active === t.id ? COLORS.saffron : `${COLORS.cream}aa`,
            }}>{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { HomeScreen, BottomTabBar, SectionHeader, CoinBadge });
