import { useState, useEffect, useRef } from 'react';
import { authHeaders } from '../utils.js';

const API = '/api';

// ── Détecteurs de services connus ─────────────────────────────────────────────

function getYouTubeId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getSpotifyEmbed(url) {
  // https://open.spotify.com/track/xxx → https://open.spotify.com/embed/track/xxx
  const m = url.match(/open\.spotify\.com\/(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
}

function getTwitchChannel(url) {
  const m = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)(?:\/|$)/);
  return m && m[1] !== 'videos' ? m[1] : null;
}

function getTwitchVod(url) {
  const m = url.match(/twitch\.tv\/videos\/(\d+)/);
  return m ? m[1] : null;
}

function getSoundcloudEmbed(url) {
  if (/soundcloud\.com/.test(url)) return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`;
  return null;
}

function getTwitterHandle(url) {
  // Twitter/X links → pas d'iframe simple, on fait OG preview
  return null;
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function LinkPreview({ url, token }) {
  const [og, setOg]         = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(false);
  const [visible, setVisible] = useState(false);    // lazy: render only when in viewport
  const ref = useRef(null);

  // Embed détecté côté client (pas besoin de fetch)
  const ytId     = getYouTubeId(url);
  const spEmbed  = getSpotifyEmbed(url);
  const twitchCh = getTwitchChannel(url);
  const twitchVod = getTwitchVod(url);
  const scEmbed  = getSoundcloudEmbed(url);
  const isEmbed  = !!(ytId || spEmbed || twitchCh || twitchVod || scEmbed);

  // IntersectionObserver pour lazy load
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { rootMargin: '200px' });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  // Fetch OG seulement pour les URLs non-embed
  useEffect(() => {
    if (!visible || isEmbed || !token) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(`${API}/og-preview?url=${encodeURIComponent(url)}`, {
      headers: authHeaders(token),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled) return;
        if (data && (data.title || data.image)) setOg(data);
        else setError(true);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [visible, url, token, isEmbed]);

  // ── Rendus embed connus ───────────────────────────────────────────────────

  if (ytId) return (
    <div ref={ref} style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', background: '#000', aspectRatio: '16/9', maxWidth: '100%' }}>
      {visible && (
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?modestbranding=1&rel=0`}
          title="YouTube"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        />
      )}
    </div>
  );

  if (spEmbed) return (
    <div ref={ref} style={{ marginTop: 8, borderRadius: 12, overflow: 'hidden' }}>
      {visible && (
        <iframe
          src={spEmbed}
          title="Spotify"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{ width: '100%', height: 80, border: 'none', display: 'block' }}
        />
      )}
    </div>
  );

  if (twitchCh || twitchVod) {
    const twitchSrc = twitchCh
      ? `https://player.twitch.tv/?channel=${twitchCh}&parent=${window.location.hostname}&autoplay=false`
      : `https://player.twitch.tv/?video=${twitchVod}&parent=${window.location.hostname}&autoplay=false`;
    return (
      <div ref={ref} style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', background: '#0e0e10', aspectRatio: '16/9', maxWidth: '100%' }}>
        {visible && (
          <iframe
            src={twitchSrc}
            title="Twitch"
            allowFullScreen
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        )}
      </div>
    );
  }

  if (scEmbed) return (
    <div ref={ref} style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden' }}>
      {visible && (
        <iframe
          src={scEmbed}
          title="SoundCloud"
          allow="autoplay"
          style={{ width: '100%', height: 80, border: 'none', display: 'block' }}
        />
      )}
    </div>
  );

  // ── OG preview card (Twitter, articles, tout le reste) ────────────────────

  return (
    <div ref={ref} style={{ marginTop: 8 }}>
      {loading && (
        <div style={{
          height: 54, borderRadius: 8,
          background: 'var(--surface2)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 14, height: 14,
            border: '2px solid var(--accent)', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'lpspin .55s linear infinite',
          }} />
        </div>
      )}
      {!loading && !error && og && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          onClick={e => e.stopPropagation()}
          style={{
            display: 'flex', gap: 0,
            textDecoration: 'none', color: 'inherit',
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 8, overflow: 'hidden',
            transition: 'border-color .15s, box-shadow .15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {/* Image */}
          {og.image && (
            <div style={{ width: 100, flexShrink: 0, overflow: 'hidden', background: '#111' }}>
              <img
                src={og.image}
                alt=""
                onError={e => { e.currentTarget.parentElement.style.display = 'none'; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          )}
          {/* Texte */}
          <div style={{ padding: '9px 11px', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
            {og.siteName && (
              <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85 }}>
                {og.siteName}
              </div>
            )}
            {og.title && (
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {og.title}
              </div>
            )}
            {og.description && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {og.description}
              </div>
            )}
          </div>
        </a>
      )}
      <style>{`@keyframes lpspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
