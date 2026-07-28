import { useState, useEffect } from 'react';
import { useLang } from '../i18n.js';
import { authHeaders } from '../utils.js';

function extractAppId(url) {
  if (!url) return null;
  const m = url.match(/\/apps\/(\d+)\//);
  return m ? m[1] : null;
}

// Couleur du niveau Steam (approximation par tranches)
function levelColor(level) {
  if (level === null) return '#8899aa';
  if (level >= 100) return '#e040fb';
  if (level >= 50)  return '#ff9800';
  if (level >= 20)  return '#4fc3f7';
  return '#78909c';
}

// Dot de statut
function StatusDot({ state }) {
  const colors = { 0: '#666', 1: '#3db86a', 2: '#f5a500', 3: '#f5c518', 4: '#aaa' };
  const color = colors[state] ?? '#666';
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: color, boxShadow: state === 1 ? `0 0 5px ${color}` : 'none', flexShrink: 0,
    }} />
  );
}

export default function GameStatsWidget({ api, token, board, rightOffset = 0 }) {
  const { t } = useLang();
  const [stats, setStats]       = useState(null);
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [slideIn, setSlideIn]   = useState(false);

  // Verrou permanent : 'open' | 'closed' | null (libre)
  const [permanentLock, setPermanentLock] = useState(() => {
    try { return localStorage.getItem('statsWidgetLock') || null; } catch { return null; }
  });
  const setPermanentLockAndSave = (val) => {
    setPermanentLock(val);
    try { if (val) localStorage.setItem('statsWidgetLock', val); else localStorage.removeItem('statsWidgetLock'); } catch {}
  };

  const appid = extractAppId(board?.headerImg) || extractAppId(board?.gameIcon);

  // Fetch game stats when board changes
  useEffect(() => {
    if (!appid || !token) { setLoading(false); return; }
    setLoading(true);
    setStats(null);
    fetch(`${api}/steam/gamestats/${appid}`, { headers: authHeaders(token) })
      .then(r => r.ok ? r.json() : null)
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [appid, token]);

  // Fetch player profile once (not game-specific)
  useEffect(() => {
    if (!token) return;
    fetch(`${api}/steam/profile`, { headers: authHeaders(token) })
      .then(r => r.ok ? r.json() : null)
      .then(data => setProfile(data))
      .catch(() => {});
  }, [token]);

  // Slide-in animation (respecte le verrou permanent)
  useEffect(() => {
    if (!appid) return;
    if (permanentLock === 'open')   { setSlideIn(true);  return; }
    if (permanentLock === 'closed') { setSlideIn(false); return; }
    setSlideIn(false);
    const t = setTimeout(() => setSlideIn(true), 60);
    return () => clearTimeout(t);
  }, [appid, permanentLock]);

  if (!appid) return null;
  if (!loading && !stats) return null;

  const bannerUrl = board?.headerImg || stats?.header_img;
  const gameName  = stats?.name || board?.name || '';
  const achPct    = stats?.achievements_total > 0
    ? Math.round((stats.achievements_unlocked / stats.achievements_total) * 100) : 0;

  // Quand fermé : se cacher entièrement derrière le bord droit (+ le panel éventuel)
  // Quand ouvert : dépasser de 18px depuis le bord (rightOffset)
  const closedTranslate = rightOffset > 0
    ? `translateX(calc(100% + ${rightOffset}px))`   // caché derrière le panel droit
    : 'translateX(calc(100% - 28px))';              // classique : seul le tab visible
  const openTranslate = `translateX(-${18 + rightOffset}px)`;

  return (
    <div style={{
      position: 'fixed',
      bottom: 50,
      right: 0,
      zIndex: 40,
      width: 258,
      display: 'flex',
      alignItems: 'stretch',
      transform: slideIn ? openTranslate : closedTranslate,
      transition: 'transform 0.3s cubic-bezier(0.34, 1.2, 0.64, 1)',
    }}>
      {/* Pull tab */}
      <div
        style={{
          width: 28, flexShrink: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: permanentLock ? 'rgba(192,87,10,0.12)' : 'var(--surface)',
          border: permanentLock ? '1px solid rgba(192,87,10,0.35)' : '1px solid var(--border)',
          borderRight: slideIn ? 'none' : undefined,
          borderRadius: slideIn ? '12px 0 0 12px' : 12,
          boxShadow: slideIn ? 'none' : '0 4px 16px rgba(0,0,0,.5)',
          transition: 'border-radius .3s, box-shadow .3s',
          gap: 4, paddingTop: 6, paddingBottom: 6,
        }}
      >
        {/* Flèche toggle (libre seulement) */}
        <div
          onClick={() => { if (!permanentLock) setSlideIn(v => !v); }}
          style={{ cursor: permanentLock ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, width: '100%' }}
          title={permanentLock ? (permanentLock === 'open' ? t('stats.locked_open') : t('stats.locked_closed')) : (slideIn ? t('stats.close') : t('stats.open'))}
        >
          <span style={{
            fontSize: 14,
            transform: slideIn ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform .3s',
            display: 'block', lineHeight: 1, userSelect: 'none',
            color: permanentLock ? 'var(--accent)' : 'var(--text-muted)',
          }}>›</span>
        </div>

        {/* Bouton verrou */}
        <div
          onClick={() => {
            if (!permanentLock) {
              // Verrouiller dans l'état actuel
              setPermanentLockAndSave(slideIn ? 'open' : 'closed');
            } else {
              // Déverrouiller
              setPermanentLockAndSave(null);
            }
          }}
          title={permanentLock ? t('stats.unlock') : (slideIn ? t('stats.lock_open') : t('stats.lock_closed'))}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', paddingBottom: 2 }}
        >
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none"
            stroke={permanentLock ? 'var(--accent)' : 'rgba(255,255,255,0.3)'}
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {permanentLock
              ? <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>
              : <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></>
            }
          </svg>
        </div>
      </div>

      {/* Main card */}
      <div style={{
        flex: 1,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: 'none',
        borderRadius: '0 12px 12px 0',
        overflow: 'hidden',
        boxShadow: '0 8px 28px rgba(0,0,0,.6)',
      }}>

        {/* ── Banner du jeu ── */}
        <div style={{ position: 'relative', height: 90, background: 'var(--surface2)', overflow: 'hidden' }}>
          {bannerUrl && (
            <img src={bannerUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          )}
        </div>

        {/* ── Mini fiche profil joueur ── */}
        {profile && (
          <a
            href={profile.profileUrl || `https://steamcommunity.com/profiles/${profile.steamId}`}
            target="_blank" rel="noreferrer"
            style={{ display: 'block', textDecoration: 'none' }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px',
              background: 'linear-gradient(135deg, rgba(29,40,58,0.95) 0%, rgba(23,26,33,0.95) 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              cursor: 'pointer',
              transition: 'background .15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(40,55,80,0.95) 0%, rgba(30,35,45,0.95) 100%)'}
              onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(29,40,58,0.95) 0%, rgba(23,26,33,0.95) 100%)'}
            >
              {/* Avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {profile.avatar ? (
                  <img src={profile.avatar} alt=""
                    style={{ width: 36, height: 36, borderRadius: 6, display: 'block', border: '1px solid rgba(255,255,255,0.15)' }}
                  />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: 6, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👤</div>
                )}
                {/* Statut dot bas-droite */}
                <span style={{
                  position: 'absolute', bottom: -1, right: -1,
                  width: 9, height: 9, borderRadius: '50%',
                  background: [0,4].includes(profile.personaState) ? '#555' : profile.personaState === 1 ? '#3db86a' : '#f5a500',
                  boxShadow: profile.personaState === 1 ? '0 0 4px #3db86a' : 'none',
                  border: '1.5px solid var(--surface)',
                }}/>
              </div>

              {/* Infos centre */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{
                    fontWeight: 700, fontSize: 12, color: '#c6d4df',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{profile.personaName || '—'}</span>
                  {profile.countryCode && (
                    <img
                      src={`https://flagcdn.com/16x12/${profile.countryCode.toLowerCase()}.png`}
                      alt={profile.countryCode}
                      style={{ height: 10, borderRadius: 1, flexShrink: 0, opacity: 0.85 }}
                    />
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>{profile.statusLabel}</span>
                  {profile.gameCount !== null && (
                    <>
                      <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 9 }}>·</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>🎮 {profile.gameCount.toLocaleString('fr-FR')}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Niveau Steam */}
              {profile.level !== null && (
                <div style={{
                  flexShrink: 0,
                  width: 30, height: 30,
                  borderRadius: 6,
                  background: `rgba(${profile.level >= 100 ? '180,40,240' : profile.level >= 50 ? '240,130,0' : profile.level >= 20 ? '30,150,220' : '80,100,120'},.18)`,
                  border: `1px solid ${levelColor(profile.level)}55`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 0,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 900, color: levelColor(profile.level), lineHeight: 1 }}>{profile.level}</span>
                  <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', lineHeight: 1, marginTop: 1 }}>LVL</span>
                </div>
              )}
            </div>
          </a>
        )}

        {/* ── Stats jeu ── */}
        <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', padding: '4px 0' }}>{t('stats.loading')}</div>
          ) : (
            <>
              <div style={{
                fontWeight: 700, fontSize: 11, color: 'var(--text)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{gameName}</div>

              <div style={{ display: 'flex', gap: 6 }}>
                {/* Playtime */}
                <div style={{
                  flex: 1, background: 'var(--surface2)', borderRadius: 7,
                  padding: '5px 7px', display: 'flex', flexDirection: 'column', gap: 1,
                }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('stats.playtime')}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                    {stats?.playtime_minutes === 0 ? t('stats.never_played') : stats?.playtime_display || '—'}
                  </div>
                </div>

                {/* Achievements */}
                {stats?.achievements_total > 0 && (
                  <a
                    href={stats.achievements_url || '#'}
                    target="_blank" rel="noreferrer"
                    style={{
                      flex: 1, background: 'var(--surface2)', borderRadius: 7,
                      padding: '5px 7px', display: 'flex', flexDirection: 'column', gap: 1,
                      textDecoration: 'none', border: '1px solid transparent',
                      transition: 'border-color .15s, background .15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-dim, rgba(232,129,58,.12))'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'var(--surface2)'; }}
                  >
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('stats.achievements')}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                      {stats.achievements_unlocked}
                      <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 10 }}>/{stats.achievements_total}</span>
                    </div>
                  </a>
                )}
              </div>

              {/* Barre progression succès */}
              {stats?.achievements_total > 0 && (
                <div style={{ height: 3, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 99, background: 'var(--accent)',
                    width: `${achPct}%`, transition: 'width 0.5s ease',
                  }} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
