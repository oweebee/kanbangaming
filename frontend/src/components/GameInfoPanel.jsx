import { useState, useEffect } from 'react';
import { useLang } from '../i18n.js';
import { formatDateLong, authHeaders } from '../utils.js';

export const GAME_INFO_PANEL_WIDTH = 390;

function fmtDate(ts) {
  return formatDateLong(ts * 1000);
}

function truncate(str = '', n = 260) {
  if (str.length <= n) return str;
  return str.slice(0, n).replace(/\s+\S*$/, '') + '…';
}

const STEAM_CLAN_IMG = 'https://clan.akamai.steamstatic.com/images/';

function extractNewsImage(contents = '') {
  const bbMatch = contents.match(/\[img\][^[]*?(?:\{STEAM_CLAN_IMAGE\}|https?:\/\/)[^\s[\]]*\.(jpe?g|png|gif|webp)[^\s[\]]*\[\/img\]/i);
  if (bbMatch) {
    const inner = bbMatch[0].replace(/^\[img\]|\[\/img\]$/gi, '').trim();
    return inner.replace(/\{STEAM_CLAN_IMAGE\}/g, STEAM_CLAN_IMG);
  }
  const htmlMatch = contents.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (htmlMatch) return htmlMatch[1];
  const urlMatch = contents.match(/https?:\/\/[^\s[\]"'<>]+\.(jpe?g|png|gif|webp)/i);
  if (urlMatch) return urlMatch[0];
  return null;
}

function extractYoutubeId(contents = '') {
  // [previewyoutube=VIDEO_ID;full][/previewyoutube]
  const bbMatch = contents.match(/\[previewyoutube=([A-Za-z0-9_-]{8,15})[;\]]/i);
  if (bbMatch) return bbMatch[1];
  // youtube.com/watch?v=ID or youtu.be/ID
  const urlMatch = contents.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{8,15})/i);
  if (urlMatch) return urlMatch[1];
  return null;
}

function tagStyle(tag) {
  const map = {
    patchnotes: { bg: 'rgba(71,167,245,0.15)', color: '#47a7f5', border: 'rgba(71,167,245,0.75)' },
    mod:        { bg: 'rgba(100,200,120,0.12)', color: '#4cd882', border: 'rgba(76,216,130,0.75)' },
    community:  { bg: 'rgba(245,197,24,0.12)', color: '#f5c518', border: 'rgba(245,197,24,0.75)' },
  };
  return map[tag?.toLowerCase()] || { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.3)' };
}

function LockIcon({ locked, size = 14 }) {
  return locked ? (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
    </svg>
  );
}

/**
 * GameInfoPanel
 * Props:
 *   api, token       — pour les requêtes
 *   gameInfo         — objet gameInfo déjà fetchée
 *   board            — board actif (headerImg, name)
 *   appId            — Steam appid string
 *   locked           — contrôlé par le parent
 *   onLockChange     — callback(bool)
 *   side             — 'left' | 'right' (contrôlé par le parent)
 *   onSideChange     — callback('left' | 'right')
 *   sidebarWidth     — largeur sidebar (défaut 283)
 *   topOffset        — hauteur du header (panneau démarre en-dessous)
 */
export default function GameInfoPanel({
  api, token, gameInfo, board, appId,
  locked, onLockChange,
  side = 'left',
  onSideChange,
  sidebarWidth = 283,
  topOffset = 0,
}) {
  const { t } = useLang();
  const [open, setOpen]               = useState(false);
  const [news, setNews]               = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [expanded, setExpanded]       = useState({});

  // Fetch news when appId changes
  useEffect(() => {
    if (!appId || !token) { setNews([]); return; }
    setNewsLoading(true);
    setNews([]);
    fetch(`${api}/steam/news/${appId}`, { headers: authHeaders(token) })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => setNews(d.items || []))
      .catch(() => setNews([]))
      .finally(() => setNewsLoading(false));
  }, [appId, token, api]);

  // Keep open when locked
  useEffect(() => { if (locked) setOpen(true); }, [locked]);

  // Reset expanded items when game changes
  useEffect(() => { setExpanded({}); }, [appId]);

  const handleTabClick = () => { if (locked) return; setOpen(v => !v); };

  const handleLockToggle = (e) => {
    e.stopPropagation();
    const next = !locked;
    onLockChange(next);
    if (next) setOpen(true);
  };

  const handleSideToggle = (e) => {
    e.stopPropagation();
    onSideChange?.(side === 'left' ? 'right' : 'left');
  };

  const isOpen = open || locked;
  const isLeft = side === 'left';

  const bannerUrl = board?.headerImg || (appId ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg` : null);
  const gameName  = gameInfo?.name || board?.name || '';

  const reviewScore = gameInfo?.reviewScore ?? 0;
  const reviewColor = reviewScore >= 8 ? '#4cd882' : reviewScore >= 5 ? '#f5c518' : '#f87575';
  const reviewEmoji = reviewScore >= 8 ? '👍' : reviewScore >= 5 ? '😐' : '👎';

  // Vertical center of panel area (below header)
  const tabTop = `calc(${topOffset}px + (100vh - ${topOffset}px) / 2)`;

  // Tab positioning: left side sticks out from sidebar right edge; right side from viewport right edge
  const tabTransform = isLeft
    ? `translateY(-50%) translateX(${isOpen ? GAME_INFO_PANEL_WIDTH : 0}px)`
    : `translateY(-50%) translateX(${isOpen ? -GAME_INFO_PANEL_WIDTH : 0}px)`;

  // Panel slide: left side slides from left, right side from right
  const panelTransform = isLeft
    ? (isOpen ? 'translateX(0)' : 'translateX(-100%)')
    : (isOpen ? 'translateX(0)' : 'translateX(100%)');

  const tabHeight = isOpen ? 88 : 64;

  const accentColor = locked ? '#e8813a' : 'rgba(255,255,255,0.65)';
  const dimColor    = locked ? '#e8813a' : 'rgba(255,255,255,0.4)';

  return (
    <>
      {/* ── Backdrop — click outside to close (open + not locked) ── */}
      {isOpen && !locked && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 19, background: 'transparent' }}
        />
      )}

      {/* ── Pull tab ── */}
      <div
        style={{
          position: 'fixed',
          top: tabTop,
          ...(isLeft ? { left: sidebarWidth } : { right: 0 }),
          transform: tabTransform,
          transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1), height 0.2s ease, background 0.2s',
          zIndex: 26,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          width: 26,
          height: tabHeight,
          background: locked ? 'rgba(232,129,58,0.12)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${locked ? 'rgba(232,129,58,0.35)' : 'rgba(255,255,255,0.06)'}`,
          ...(isLeft
            ? { borderLeft: 'none', borderRadius: '0 10px 10px 0', boxShadow: '3px 0 10px rgba(0,0,0,0.35)' }
            : { borderRight: 'none', borderRadius: '10px 0 0 10px', boxShadow: '-3px 0 10px rgba(0,0,0,0.35)' }),
          gap: 0,
          userSelect: 'none',
        }}
      >
        {/* Newspaper icon — always visible, top zone */}
        <div
          onClick={handleTabClick}
          title={isOpen ? (locked ? t('ginfo.locked') : t('ginfo.close')) : t('ginfo.open')}
          style={{ cursor: locked ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', flex: 1, paddingTop: 6 }}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
            <path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/>
          </svg>
        </div>

        {/* Side-switch — always visible */}
        <div
          onClick={handleSideToggle}
          title={isLeft ? t('ginfo.move_right') : t('ginfo.move_left')}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', flex: 1 }}
        >
          {/* ↔ swap icon — distinct from chevron */}
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke={dimColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 16l-4-4 4-4M17 8l4 4-4 4M3 12h18"/>
          </svg>
        </div>

        {/* Lock toggle — only visible when open */}
        <div
          onClick={isOpen ? handleLockToggle : undefined}
          title={locked ? t('ginfo.unlock') : t('ginfo.lock')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
            height: isOpen ? 24 : 0,
            opacity: isOpen ? 1 : 0,
            overflow: 'hidden',
            transition: 'height 0.2s ease, opacity 0.2s ease',
            cursor: 'pointer',
            color: locked ? '#e8813a' : 'rgba(255,255,255,0.5)',
          }}
        >
          <LockIcon locked={locked} size={14} />
        </div>

      </div>

      {/* ── Sliding panel ── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          ...(isLeft ? { left: sidebarWidth } : { right: 0 }),
          top: topOffset,
          bottom: 0,
          width: GAME_INFO_PANEL_WIDTH,
          transform: panelTransform,
          transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)',
          zIndex: 20,
          display: 'flex', flexDirection: 'column',
          background: 'var(--surface)',
          ...(isLeft
            ? { borderRight: '1px solid var(--border)' }
            : { borderLeft: '1px solid var(--border)' }),
          boxShadow: isOpen
            ? (isLeft ? '6px 0 28px rgba(0,0,0,0.55)' : '-6px 0 28px rgba(0,0,0,0.55)')
            : 'none',
          overflow: 'hidden',
        }}
      >
        {/* ── Game banner ── */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {bannerUrl ? (
            <img src={bannerUrl} alt="" style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: 150, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🎮</div>
          )}
          {/* Game name overlay */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.88))',
            padding: '30px 14px 10px',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gameName}</div>
          </div>
          {/* Steam link button */}
          {appId && (
            <div style={{ position: 'absolute', top: 8, right: 8 }}>
              <a
                href={`https://store.steampowered.com/app/${appId}`}
                target="_blank" rel="noreferrer"
                title={t('ginfo.steam_link')}
                style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
              >
                <svg viewBox="0 0 496 512" xmlns="http://www.w3.org/2000/svg" style={{ width: 14, height: 14, fill: '#c7d5e0' }}>
                  <path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.7-76.3-239-180.4l95.2 39.3c6.4 32.1 34.9 56.4 68.9 56.4 38.2 0 69.1-31.1 68.9-69.3l84.5-60.2c52.1 1.3 95.8-40.9 95.8-93.5 0-51.6-42-93.5-93.7-93.5s-93.7 42-93.7 93.5v1.2L176.6 279c-15.5-.9-30.7 3.4-43.5 12.1L0 236.1C10.2 108.4 117.1 8 247.6 8 384.8 8 496 119 496 256z"/>
                </svg>
              </a>
            </div>
          )}
        </div>

        {/* ── Game stats ── */}
        {gameInfo && (
          <div style={{
            padding: '10px 14px', flexShrink: 0,
            borderBottom: '1px solid var(--border)',
            display: 'flex', flexWrap: 'wrap', gap: 8,
          }}>
            {/* Players */}
            {gameInfo.playerCount !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3db86a', boxShadow: '0 0 5px #3db86a88', display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontWeight: 700, color: '#fff' }}>{gameInfo.playerCount.toLocaleString('fr-FR')}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{t('ginfo.in_game')}</span>
              </div>
            )}
            {/* Review */}
            {gameInfo.reviewScoreDesc && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
                <span style={{ fontSize: 16 }}>{reviewEmoji}</span>
                <span style={{ fontWeight: 700, color: reviewColor }}>{gameInfo.reviewScoreDesc}</span>
                {gameInfo.positivePercent !== null && <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12 }}>({gameInfo.positivePercent}%)</span>}
              </div>
            )}
            {/* Price */}
            {gameInfo.price && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, marginLeft: 'auto' }}>
                {gameInfo.discount > 0 && <span style={{ background: '#4c6b22', color: '#a4d007', fontWeight: 900, fontSize: 12, padding: '1px 5px', borderRadius: 3 }}>-{gameInfo.discount}%</span>}
                <span style={{ fontWeight: 700, color: gameInfo.discount > 0 ? '#a4d007' : '#fff' }}>{gameInfo.price}</span>
              </div>
            )}
            {/* Metacritic */}
            {gameInfo.metacritic !== null && (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 14 }}
                onClick={() => gameInfo.metacriticUrl && window.open(gameInfo.metacriticUrl, '_blank')}
              >
                <div style={{ width: 25, height: 25, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: '#000', background: gameInfo.metacritic >= 75 ? '#6c3' : gameInfo.metacritic >= 50 ? '#fc3' : '#f00' }}>
                  {gameInfo.metacritic}
                </div>
              </div>
            )}
            {/* Badges */}
            <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {gameInfo.earlyAccess && <span style={{ fontSize: 13, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(220,50,50,0.18)', color: '#ff5555', border: '2px solid rgba(220,50,50,0.85)' }}>{t('ginfo.early_access')}</span>}
              {gameInfo.comingSoon && !gameInfo.earlyAccess && <span style={{ fontSize: 13, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(245,197,24,0.12)', color: '#f5c518', border: '2px solid rgba(245,197,24,0.75)' }}>{t('ginfo.coming_soon')}</span>}
              {gameInfo.multiplayerLabel && <span style={{ fontSize: 13, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(71,167,245,0.15)', color: '#47a7f5', border: '2px solid rgba(71,167,245,0.75)' }}>👥 {gameInfo.multiplayerLabel}</span>}
              {(gameInfo.genres || []).map(g => <span key={g} style={{ fontSize: 13, padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '2px solid rgba(255,255,255,0.25)' }}>{g}</span>)}
            </div>
            {/* Developer + date */}
            {(gameInfo.developer || gameInfo.releaseDate) && (
              <div style={{ width: '100%', display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                {gameInfo.developer && <span style={{ color: 'rgba(255,255,255,0.42)' }}>🛠 {gameInfo.developer}</span>}
                {gameInfo.developer && gameInfo.releaseDate && <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>}
                {gameInfo.releaseDate && <span style={{ color: 'rgba(255,255,255,0.35)' }}>📅 {gameInfo.releaseDate}</span>}
              </div>
            )}
          </div>
        )}

        {/* ── News section ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {/* Section header */}
          <div style={{ padding: '8px 14px 6px', display: 'flex', alignItems: 'center', gap: 7, borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
              <path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('ginfo.news_header')}</span>
            {newsLoading && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{t('ginfo.loading')}</span>}
            {!newsLoading && news.length > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{t('ginfo.news_count', { count: news.length })}</span>}
          </div>

          {!newsLoading && news.length === 0 && (
            <div style={{ padding: '28px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              {appId ? t('ginfo.no_news') : t('ginfo.no_game')}
            </div>
          )}

          {news.map(item => {
            const isExpanded = expanded[item.gid];
            const shortContent = truncate(item.contents, 260);
            const hasMore = item.contents.length > 260;
            const ts = item.tags || [];
            const ytId = item.youtube || null;
            const imgUrl = !ytId ? (item.image || null) : null;
            return (
              <div
                key={item.gid}
                style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background .12s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Tags */}
                {ts.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginBottom: 5, flexWrap: 'wrap' }}>
                    {ts.map(tag => {
                      const s = tagStyle(tag);
                      return <span key={tag} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: s.bg, color: s.color, border: `2px solid ${s.border}`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{tag}</span>;
                    })}
                  </div>
                )}
                {/* Title */}
                <a href={item.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'block', marginBottom: 7 }}>
                  <div
                    style={{ fontSize: 15, fontWeight: 700, color: '#c6d4df', lineHeight: 1.3, transition: 'color .12s' }}
                    onMouseEnter={e => e.target.style.color = '#fff'}
                    onMouseLeave={e => e.target.style.color = '#c6d4df'}
                  >{item.title}</div>
                </a>
                {/* YouTube embed */}
                {ytId && (
                  <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', marginBottom: 8, borderRadius: 6, overflow: 'hidden', background: '#000' }}>
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                      title={item.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                    />
                  </div>
                )}
                {/* Image preview */}
                {imgUrl && (
                  <a href={item.url} target="_blank" rel="noreferrer" style={{ display: 'block', marginBottom: 8 }}>
                    <img
                      src={imgUrl}
                      alt=""
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                      style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 6, display: 'block' }}
                    />
                  </a>
                )}
                {/* Content */}
                {item.contents && (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.48)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {isExpanded ? item.contents : shortContent}
                  </div>
                )}
                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>{fmtDate(item.date)}</span>
                  {item.author && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>· {item.author}</span>}
                  <div style={{ flex: 1 }} />
                  {hasMore && (
                    <button
                      onClick={() => setExpanded(prev => ({ ...prev, [item.gid]: !prev[item.gid] }))}
                      style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700 }}
                    >
                      {isExpanded ? 'Réduire ↑' : 'Lire ↓'}
                    </button>
                  )}
                  <a href={item.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'rgba(71,167,245,0.7)', textDecoration: 'none', fontWeight: 700 }}>↗</a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
