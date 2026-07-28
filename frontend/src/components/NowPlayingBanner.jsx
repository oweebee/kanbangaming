import { useState, useEffect, useRef } from 'react';
import { authHeaders } from '../utils.js';

// Extrait l'appid Steam depuis une URL d'icône Steam
// ex: https://cdn.akamai.steamstatic.com/steam/apps/12345/...
function extractAppId(gameIconUrl) {
  return gameIconUrl?.match(/apps\/(\d+)\//)?.[1] || null;
}

export default function NowPlayingBanner({ gameIconUrl, token }) {
  const [players, setPlayers] = useState([]);
  const intervalRef = useRef(null);
  const appId = extractAppId(gameIconUrl);

  useEffect(() => {
    if (!appId || !token) return;

    const fetchPlayers = async () => {
      try {
        const res = await fetch(`/api/steam/ingame/${appId}`, {
          headers: authHeaders(token),
        });
        if (res.ok) setPlayers(await res.json());
      } catch { /* silencieux */ }
    };

    fetchPlayers();
    intervalRef.current = setInterval(fetchPlayers, 60_000);
    return () => clearInterval(intervalRef.current);
  }, [appId, token]);

  if (!players.length) return null; // ← retire ce return pour tester l'affichage à vide

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: 'rgba(20, 20, 28, 0.92)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 999,
      padding: '8px 18px 8px 10px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.55)',
      pointerEvents: 'none',
      userSelect: 'none',
    }}>
      {/* Indicateur pulsant */}
      <div style={{ position: 'relative', width: 8, height: 8, flexShrink: 0 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: '#3db86a',
          position: 'absolute',
          boxShadow: '0 0 0 0 rgba(61,184,106,0.6)',
          animation: 'pulse-dot 1.8s infinite',
        }} />
      </div>

      {/* Avatars */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {players.slice(0, 5).map((p, i) => (
          <div key={p.steamId} title={p.steamPersonaName || p.username} style={{
            width: 26, height: 26, borderRadius: '50%',
            border: '2px solid rgba(20,20,28,0.9)',
            marginLeft: i === 0 ? 0 : -8,
            zIndex: players.length - i,
            position: 'relative',
            flexShrink: 0,
            overflow: 'hidden',
            background: 'var(--surface2)',
          }}>
            {p.steamAvatar
              ? <img src={p.steamAvatar} alt={p.username} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <div style={{ width: '100%', height: '100%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                  {(p.username?.[0] || '?').toUpperCase()}
                </div>
            }
          </div>
        ))}
      </div>

      {/* Label */}
      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
        {players.length === 1
          ? <><span style={{ color: 'rgba(255,255,255,0.65)' }}>{players[0].steamPersonaName || players[0].username}</span> · En jeu</>
          : <><span style={{ color: 'rgba(255,255,255,0.65)' }}>{players.length} joueurs</span> · En jeu</>
        }
      </span>

      <style>{`
        @keyframes pulse-dot {
          0%   { box-shadow: 0 0 0 0 rgba(61,184,106,0.6); }
          70%  { box-shadow: 0 0 0 7px rgba(61,184,106,0); }
          100% { box-shadow: 0 0 0 0 rgba(61,184,106,0); }
        }
      `}</style>
    </div>
  );
}
