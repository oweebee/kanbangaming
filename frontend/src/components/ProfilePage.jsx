import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { useLang, LANG_META, SUPPORTED_LANGS } from '../i18n.js';
import { useZoom } from '../zoom.js';
import { formatDateLong, authHeaders } from '../utils.js';
import TrashPanel from './TrashPanel.jsx';
import ZoomSlider from './ZoomSlider.jsx';
import ModalCard from './ModalCard.jsx';
import { isSteamAccessBlocked, SteamAccessNotice } from './SteamUI.jsx';

const API = '/api';
const TABS = ['profile', 'stats', 'trash', 'wishlist'];
const N    = TABS.length;

export default function ProfilePage({ token, currentUser, onClose, onSaveSteam }) {
  const { t, lang, setLang } = useLang();
  const { zoom, setZoom } = useZoom();
  const [activeTab, setActiveTab] = useState('profile');

  // ── Slide track (même logique que SwipeTabs) ──────────────────────────────
  const containerRef = useRef(null);
  const trackRef     = useRef(null);
  const dragRef      = useRef({ active: false, startX: 0, startY: 0, startTime: 0, isHorizontal: null, w: 0 });
  const activeIdxRef = useRef(0);

  useEffect(() => { activeIdxRef.current = TABS.indexOf(activeTab); }, [activeTab]);

  const snapToIndex = useCallback((idx, animate = true) => {
    const el  = containerRef.current;
    const trk = trackRef.current;
    if (!el || !trk) return;
    trk.style.transition = animate ? 'transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none';
    trk.style.transform  = `translateX(${-idx * el.offsetWidth}px)`;
  }, []);

  useLayoutEffect(() => { snapToIndex(0, false); }, []);
  useEffect(() => { snapToIndex(TABS.indexOf(activeTab), true); }, [activeTab, snapToIndex]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onStart = (e) => {
      const d = dragRef.current;
      d.active = true; d.isHorizontal = null;
      d.startX = e.touches[0].clientX; d.startY = e.touches[0].clientY;
      d.startTime = Date.now(); d.w = el.offsetWidth;
      if (trackRef.current) trackRef.current.style.transition = 'none';
    };
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d.active) return;
      const dx = e.touches[0].clientX - d.startX;
      const dy = e.touches[0].clientY - d.startY;
      if (d.isHorizontal === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5))
        d.isHorizontal = Math.abs(dx) > Math.abs(dy);
      if (!d.isHorizontal) return;
      e.preventDefault();
      const base = -activeIdxRef.current * d.w;
      let x = base + dx;
      if (x > 0)               x = dx * 0.15;
      if (x < -(N - 1) * d.w) x = -(N - 1) * d.w + (x + (N - 1) * d.w) * 0.15;
      if (trackRef.current) trackRef.current.style.transform = `translateX(${x}px)`;
    };
    const onEnd = (e) => {
      const d = dragRef.current;
      if (!d.active) return;
      d.active = false;
      if (!d.isHorizontal) return;
      const dx      = e.changedTouches[0].clientX - d.startX;
      const dt      = Date.now() - d.startTime;
      const isFlick = dt < 300 && Math.abs(dx) > 25;
      let idx = activeIdxRef.current;
      if ((dx < -d.w * 0.3 || (isFlick && dx < 0)) && idx < N - 1) idx++;
      else if ((dx > d.w * 0.3 || (isFlick && dx > 0)) && idx > 0) idx--;
      if (idx !== activeIdxRef.current) setActiveTab(TABS[idx]);
      else snapToIndex(activeIdxRef.current, true);
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove',  onMove,  { passive: false });
    el.addEventListener('touchend',   onEnd,   { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove',  onMove);
      el.removeEventListener('touchend',   onEnd);
    };
  }, [snapToIndex]);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Steam ─────────────────────────────────────────────────────────────────
  const [steamId, setSteamId] = useState('');
  const [savedSteamId, setSavedSteamId] = useState('');
  const [editingSteam, setEditingSteam] = useState(false);
  const [steamPreview, setSteamPreview] = useState(null);
  const [steamSaving, setSteamSaving] = useState(false);
  const [steamMsg, setSteamMsg] = useState('');

  // ── Steam : clé API personnelle (optionnelle, alternative au profil public) ──
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [editingApiKey, setEditingApiKey] = useState(false);
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeyMsg, setApiKeyMsg] = useState('');

  // ── Steam wishlist ──────────────────────────────────────────────────────────
  const [wishlist, setWishlist]         = useState(null); // null = not yet fetched
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistError, setWishlistError]     = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/user/profile`, { headers: authHeaders(token) });
        if (!res.ok) {
          let msg = `Erreur ${res.status}`;
          try { const d = await res.json(); msg = d.error || msg; } catch {}
          throw new Error(msg);
        }
        const data = await res.json();
        setProfile(data);
        setSteamId(data.steamId || '');
        setSavedSteamId(data.steamId || '');
        setHasApiKey(!!data.hasSteamApiKey);
        if (data.steamAvatar) setSteamPreview({ avatar: data.steamAvatar, personaName: data.steamPersonaName });
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    }
    load();
  }, [token]);

  async function handleSaveSteam(e) {
    e.preventDefault();
    setSteamSaving(true); setSteamMsg('');
    const res = await fetch(`${API}/user/settings`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ steamId }),
    });
    setSteamSaving(false);
    if (res.ok) {
      const data = await res.json();
      setSavedSteamId(steamId);
      setEditingSteam(false);
      if (data.steamAvatar) {
        setSteamPreview({ avatar: data.steamAvatar, personaName: data.steamPersonaName });
        setProfile(p => ({ ...p, steamId: steamId, steamAvatar: data.steamAvatar, steamPersonaName: data.steamPersonaName }));
      } else {
        setSteamPreview(null);
        setProfile(p => ({ ...p, steamId: steamId, steamAvatar: null, steamPersonaName: null }));
      }
      setSteamMsg(t('profile.steam_saved'));
      if (onSaveSteam) onSaveSteam({ steamAvatar: data.steamAvatar, steamPersonaName: data.steamPersonaName });
      setTimeout(() => setSteamMsg(''), 2500);
    } else {
      let errMsg = t('common.error');
      try { const d = await res.json(); errMsg = d.error || errMsg; } catch {}
      setSteamMsg(errMsg);
    }
  }

  async function handleSaveApiKey(e) {
    e.preventDefault();
    setApiKeySaving(true); setApiKeyMsg('');
    const res = await fetch(`${API}/user/settings`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ steamApiKey: apiKeyInput }),
    });
    setApiKeySaving(false);
    if (res.ok) {
      const data = await res.json();
      setHasApiKey(!!data.hasSteamApiKey);
      setEditingApiKey(false);
      setApiKeyInput('');
      setApiKeyMsg(data.hasSteamApiKey ? t('profile.apikey_saved') : t('profile.apikey_removed'));
      setTimeout(() => setApiKeyMsg(''), 3000);
    } else {
      let errMsg = t('common.error');
      try { const d = await res.json(); errMsg = d.error || errMsg; } catch {}
      setApiKeyMsg(errMsg);
    }
  }

  async function handleRemoveApiKey() {
    setApiKeySaving(true); setApiKeyMsg('');
    const res = await fetch(`${API}/user/settings`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ steamApiKey: '' }),
    });
    setApiKeySaving(false);
    if (res.ok) {
      setHasApiKey(false);
      setEditingApiKey(false);
      setApiKeyInput('');
      setApiKeyMsg(t('profile.apikey_removed'));
      setTimeout(() => setApiKeyMsg(''), 3000);
    }
  }

  const hasSteam = !!savedSteamId;
  const isSteamAuth = profile?.steamAuth === true;
  const steamBlocked = isSteamAccessBlocked(profile);

  useEffect(() => {
    if (activeTab !== 'wishlist' || wishlist !== null || !hasSteam) return;
    setWishlistLoading(true);
    setWishlistError(false);
    fetch(`${API}/steam/wishlist/full`, { headers: authHeaders(token) })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setWishlist(data); setWishlistLoading(false); })
      .catch(() => { setWishlistError(true); setWishlistLoading(false); });
  }, [activeTab, wishlist, hasSteam, token]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <ModalCard style={{ borderRadius: 16, width: '100%', maxWidth: 480, height: '85vh', minHeight: 500, maxHeight: 920, display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,.6)', overflow: 'hidden' }}>

        {/* Avatar header */}
        <div style={{ position: 'relative', background: 'linear-gradient(135deg, #0e1117 0%, #1a1f2e 100%)', padding: '32px 24px 20px', textAlign: 'center', flexShrink: 0 }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,.08)', border: 'none', borderRadius: '50%', width: 30, height: 30, color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

          {(steamPreview?.avatar || profile?.steamAvatar) ? (
            <img src={steamPreview?.avatar || profile?.steamAvatar} alt="" style={{ width: 80, height: 80, borderRadius: 8, border: '3px solid var(--accent)', marginBottom: 12 }} />
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: 8, background: 'var(--surface3)', border: '3px solid var(--border)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>👤</div>
          )}

          <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--text)', marginBottom: 4 }}>
            {steamPreview?.personaName || profile?.steamPersonaName || profile?.username || currentUser.username}
          </div>
          {(steamPreview?.personaName || profile?.steamPersonaName) && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{profile?.username || currentUser.username}</div>
          )}
          {profile?.steamAuth && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, background: 'rgba(28,58,89,0.7)', border: '1px solid rgba(71,167,245,0.35)', borderRadius: 20, padding: '3px 10px' }}>
              <svg viewBox="0 0 496 512" xmlns="http://www.w3.org/2000/svg" style={{ width: 10, height: 10, fill: '#47a7f5' }}>
                <path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.7-76.3-239-180.4l95.2 39.3c6.4 32.1 34.9 56.4 68.9 56.4 38.2 0 69.1-31.1 68.9-69.3l84.5-60.2c52.1 1.3 95.8-40.9 95.8-93.5 0-51.6-42-93.5-93.7-93.5s-93.7 42-93.7 93.5v1.2L176.6 279c-15.5-.9-30.7 3.4-43.5 12.1L0 236.1C10.2 108.4 117.1 8 247.6 8 384.8 8 496 119 496 256z"/>
              </svg>
              <span style={{ fontSize: 10, color: '#47a7f5', fontWeight: 700, letterSpacing: '0.04em' }}>{t('profile.steam_connexion')}</span>
            </div>
          )}
        </div>

        {/* Onglets Profil / Corbeille */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--surface1)' }}>
          {[
            { id: 'profile',   label: t('profile.tab_profile')   },
            { id: 'stats',     label: t('profile.tab_stats')     },
            { id: 'trash',     label: t('profile.tab_trash')     },
            { id: 'wishlist',  label: t('profile.tab_wishlist')  },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                flex: 1, background: 'none', border: 'none',
                borderBottom: activeTab === id ? '2px solid var(--accent)' : '2px solid transparent',
                padding: '10px 6px', marginBottom: -1,
                color: activeTab === id ? 'var(--text)' : 'var(--text-muted)',
                fontSize: 12, fontWeight: activeTab === id ? 700 : 400,
                cursor: 'pointer', transition: 'color .15s',
              }}
            >{label}</button>
          ))}
        </div>

        {/* Body — track glissant (swipe avec effet visuel) */}
        <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <div ref={trackRef} style={{ display: 'flex', width: `${N * 100}%`, height: '100%', willChange: 'transform' }}>

            {/* ── Onglet Profil (index 0) ── */}
            <div style={{ width: `${100 / N}%`, height: '100%', flexShrink: 0, overflowY: 'auto', padding: '20px 24px', boxSizing: 'border-box' }}>
          {/* ── Onglet Profil ── */}
          {(<>
          {loading && <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>{t('common.loading')}</p>}
          {error && <p style={{ color: '#f88', textAlign: 'center' }}>{error}</p>}

          {profile && (
            <>
              {/* ── Langue ── */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  🌐 {t('profile.language')}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SUPPORTED_LANGS.map(l => {
                    const meta = LANG_META[l];
                    const active = lang === l;
                    return (
                      <button key={l} onClick={() => setLang(l)} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 400,
                        background: active ? 'var(--accent)' : 'var(--surface2)',
                        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                        color: active ? '#fff' : 'var(--text)',
                        transition: 'all .15s',
                      }}>
                        <span style={{ fontSize: 16 }}>{meta.flag}</span>
                        {meta.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Section Steam ── */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg viewBox="0 0 496 512" xmlns="http://www.w3.org/2000/svg" style={{ width: 12, height: 12, fill: 'currentColor' }}>
                    <path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.7-76.3-239-180.4l95.2 39.3c6.4 32.1 34.9 56.4 68.9 56.4 38.2 0 69.1-31.1 68.9-69.3l84.5-60.2c52.1 1.3 95.8-40.9 95.8-93.5 0-51.6-42-93.5-93.7-93.5s-93.7 42-93.7 93.5v1.2L176.6 279c-15.5-.9-30.7 3.4-43.5 12.1L0 236.1C10.2 108.4 117.1 8 247.6 8 384.8 8 496 119 496 256z"/>
                  </svg>
                  {t('profile.steam_section')}
                </div>

                {hasSteam && !editingSteam && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface2)', border: '1px solid rgba(61,184,106,0.35)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                    {steamPreview?.avatar
                      ? <img src={steamPreview.avatar} alt="" style={{ width: 40, height: 40, borderRadius: 6, border: '2px solid var(--accent)', flexShrink: 0 }} />
                      : <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👤</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{steamPreview?.personaName || t('profile.steam_linked')}</div>
                      <div style={{ fontSize: 10, color: 'rgba(61,184,106,0.8)', marginTop: 1 }}>✓ {t('profile.steam_linked')}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{savedSteamId}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end', flexShrink: 0 }}>
                      <a href={`https://steamcommunity.com/profiles/${savedSteamId}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>{t('profile.steam_profile')}</a>
                      <a href={`https://steamcommunity.com/profiles/${savedSteamId}/games`} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>{t('profile.steam_library')}</a>
                      <a href="https://store.steampowered.com/account/remotestorage" target="_blank" rel="noreferrer" style={{ fontSize: 11, fontWeight: 700, color: '#66c0f4', textDecoration: 'none' }}>{t('profile.steam_cloud_saves')}</a>
                    </div>
                    {!isSteamAuth && (
                      <button onClick={() => setEditingSteam(true)}
                        style={{ background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 12px', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>
                        ✏ {t('common.edit')}
                      </button>
                    )}
                  </div>
                )}

                {!isSteamAuth && (!hasSteam || editingSteam) && (
                  <form onSubmit={handleSaveSteam} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ background: 'rgba(180,130,0,0.1)', border: '1px solid rgba(200,150,0,0.35)', borderRadius: 9, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {t('profile.steam_warn')}{' '}
                        <a href="https://help.steampowered.com/fr/faqs/view/588C-C67D-0251-C276" target="_blank" rel="noreferrer" style={{ color: '#47a7f5', textDecoration: 'underline' }}>{t('profile.steam_how')}</a>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t('profile.steam_id_label')} — <a href="https://steamid.io" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: 400 }}>steamid.io ↗</a>
                      </label>
                      <input autoFocus value={steamId} onChange={e => setSteamId(e.target.value)} placeholder="Ex: 76561197969409733"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'monospace' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button type="submit" disabled={steamSaving || !steamId.trim()}
                        style={{ padding: '8px 18px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, cursor: (steamSaving || !steamId.trim()) ? 'not-allowed' : 'pointer', opacity: (steamSaving || !steamId.trim()) ? 0.6 : 1 }}>
                        {steamSaving ? t('profile.saving_steam') : t('profile.save_steam')}
                      </button>
                      {editingSteam && (
                        <button type="button" onClick={() => { setSteamId(savedSteamId); setEditingSteam(false); setSteamMsg(''); }}
                          style={{ padding: '8px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>
                          {t('common.cancel')}
                        </button>
                      )}
                      {steamMsg && <span style={{ fontSize: 12, color: steamMsg.startsWith('✓') ? '#3db86a' : '#f88' }}>{steamMsg}</span>}
                    </div>
                  </form>
                )}

                {steamMsg && hasSteam && !editingSteam && (
                  <div style={{ fontSize: 12, color: '#3db86a', padding: '8px 12px', background: 'rgba(61,184,106,0.1)', border: '1px solid rgba(61,184,106,0.3)', borderRadius: 7 }}>{steamMsg}</div>
                )}
              </div>

              {/* ── Clé API Steam personnelle (optionnel) ── */}
              {/* Alternative au profil public : voir profile.steam_warn ci-dessus. Quand cette clé est
                  configurée, getUserSteamCreds() (backend) lui donne priorité sur la clé globale de l'app
                  pour CE compte uniquement, ce qui lève les restrictions de confidentialité Steam. */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  🔑 {t('profile.apikey_section')}
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>
                  {t('profile.apikey_intro')}
                </div>

                {hasApiKey && !editingApiKey && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface2)', border: '1px solid rgba(61,184,106,0.35)', borderRadius: 10, padding: '12px 14px' }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>🔑</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{t('profile.apikey_configured')}</div>
                      <div style={{ fontSize: 10, color: 'rgba(61,184,106,0.8)', marginTop: 1 }}>✓ {t('profile.apikey_active')}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => { setApiKeyInput(''); setEditingApiKey(true); setApiKeyMsg(''); }}
                        style={{ background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 12px', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                        ✏ {t('common.edit')}
                      </button>
                      <button onClick={handleRemoveApiKey} disabled={apiKeySaving}
                        style={{ background: 'var(--surface3)', border: '1px solid rgba(220,80,80,0.35)', borderRadius: 7, padding: '6px 12px', color: '#e88', fontSize: 11, cursor: apiKeySaving ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                        {t('profile.apikey_remove')}
                      </button>
                    </div>
                  </div>
                )}

                {(!hasApiKey || editingApiKey) && (
                  <form onSubmit={handleSaveApiKey} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ background: 'rgba(71,167,245,0.08)', border: '1px solid rgba(71,167,245,0.3)', borderRadius: 9, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>ℹ️</span>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {t('profile.apikey_guard_note')}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t('profile.apikey_label')} — <a href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: 400 }}>{t('profile.apikey_get_link')} ↗</a>
                      </label>
                      <input autoFocus value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} placeholder={t('profile.apikey_placeholder')}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'monospace' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <button type="submit" disabled={apiKeySaving || !apiKeyInput.trim()}
                        style={{ padding: '8px 18px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, cursor: (apiKeySaving || !apiKeyInput.trim()) ? 'not-allowed' : 'pointer', opacity: (apiKeySaving || !apiKeyInput.trim()) ? 0.6 : 1 }}>
                        {apiKeySaving ? t('profile.apikey_saving') : t('profile.apikey_save')}
                      </button>
                      {(editingApiKey || hasApiKey) && (
                        <button type="button" onClick={() => { setApiKeyInput(''); setEditingApiKey(false); setApiKeyMsg(''); }}
                          style={{ padding: '8px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>
                          {t('common.cancel')}
                        </button>
                      )}
                      {apiKeyMsg && <span style={{ fontSize: 12, color: apiKeyMsg.startsWith('✓') ? '#3db86a' : '#f88' }}>{apiKeyMsg}</span>}
                    </div>
                  </form>
                )}

                {apiKeyMsg && hasApiKey && !editingApiKey && (
                  <div style={{ fontSize: 12, color: '#3db86a', marginTop: 8, padding: '8px 12px', background: 'rgba(61,184,106,0.1)', border: '1px solid rgba(61,184,106,0.3)', borderRadius: 7 }}>{apiKeyMsg}</div>
                )}
              </div>

              {/* ── Zoom interface ── */}
              <div>
                <ZoomSlider value={zoom} onChange={setZoom} />
              </div>
            </>
          )}
          </>)}
            </div>

            {/* ── Onglet Stats (index 1) ── */}
            <div style={{ width: `${100 / N}%`, height: '100%', flexShrink: 0, overflowY: 'auto', padding: '20px 24px', boxSizing: 'border-box' }}>
              {profile && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>KangBanGaming</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      ['🗂️', profile.stats.boardCount, t('profile.stat_boards')],
                      ['🌐', profile.stats.publicBoardCount, t('profile.stat_public')],
                      ['🎮', profile.stats.steamLibraryCount, t('profile.stat_games')],
                      ['✨', profile.stats.customCards, t('profile.stat_custom')],
                      ['💖', profile.stats.steamWishlistCount, t('profile.stat_wishlist')],
                      ['⏰', profile.stats.withDeadlineCount, t('profile.stat_deadlines')],
                      ['📝', profile.stats.notesCount, t('profile.stat_notes')],
                      ['⭐', profile.stats.followedBoardsCount, t('profile.stat_followed')],
                      ['🏆', profile.stats.busiestBoardName || '—', t('profile.stat_busiest')],
                      ['⏳', profile.stats.accountAgeDays !== null ? t('profile.stat_days_value', { days: profile.stats.accountAgeDays }) : '—', t('profile.stat_age')],
                    ].map(([icon, value, label]) => (
                      <div key={label} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                        <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Onglet Corbeille (index 2) ── */}
            <div style={{ width: `${100 / N}%`, height: '100%', flexShrink: 0, overflowY: 'auto', padding: '20px 24px', boxSizing: 'border-box' }}>
              <TrashPanel token={token} />
            </div>

            {/* ── Onglet Wishlist Steam (index 3) ── */}
            <div style={{ width: `${100 / N}%`, height: '100%', flexShrink: 0, overflowY: 'auto', padding: '20px 24px', boxSizing: 'border-box' }}>
              {/* Notice : affichée seulement si le module est réellement bloqué (profil privé + pas de clé perso) */}
              {hasSteam && steamBlocked && <SteamAccessNotice compact style={{ marginBottom: 16 }} />}

              {!hasSteam && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 40 }}>
                  {t('profile.wishlist_no_steam')}
                </div>
              )}

              {hasSteam && wishlistLoading && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 40 }}>
                  {t('profile.wishlist_loading')}
                </div>
              )}

              {hasSteam && wishlistError && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 40 }}>
                  {t('profile.wishlist_error')}
                </div>
              )}

              {/* Si le module est bloqué (profil privé), la notice ci-dessus explique déjà
                  pourquoi la liste est vide — afficher "wishlist vide" serait trompeur car
                  on ne sait pas si elle l'est réellement (cf. même logique que DeadlinePanel). */}
              {hasSteam && !steamBlocked && !wishlistLoading && !wishlistError && wishlist !== null && wishlist.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 40 }}>
                  {t('profile.wishlist_empty')}
                </div>
              )}

              {hasSteam && !wishlistLoading && !wishlistError && wishlist && wishlist.length > 0 && (() => {
                const today = new Date(); today.setHours(0,0,0,0);
                const sorted = [...wishlist].sort((a, b) => {
                  const da = a.release_date ? new Date(a.release_date) : null;
                  const db = b.release_date ? new Date(b.release_date) : null;
                  const af = da && da >= today, bf = db && db >= today;
                  if (af && bf) return da - db;       // futures : plus proche d'abord
                  if (af) return -1; if (bf) return 1;
                  if (da && db) return db - da;       // passées : plus récente d'abord
                  if (da) return -1; if (db) return 1;
                  return (a.name || '').localeCompare(b.name || '');
                });
                const fmtDate = iso => iso ? (formatDateLong(iso) || iso) : null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {sorted.map(item => {
                      const d = item.release_date ? new Date(item.release_date) : null;
                      const isFuture = d && d >= today;
                      const isPast = d && d < today;
                      const daysLeft = isFuture ? Math.ceil((d - today) / 86400000) : null;
                      const dateColor = isFuture
                        ? (daysLeft <= 30 ? '#f5a500' : 'var(--text-muted)')
                        : isPast ? '#3db86a' : 'var(--text-muted)';
                      const dateLabel = isFuture
                        ? (daysLeft <= 30 ? `Dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}` : fmtDate(item.release_date))
                        : isPast ? fmtDate(item.release_date) : '—';
                      return (
                        <a key={item.appid}
                          href={`https://store.steampowered.com/app/${item.appid}/`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', textDecoration: 'none', transition: 'border-color .15s' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                        >
                          <img src={item.header_img} alt="" loading="lazy"
                            style={{ width: 72, height: 34, objectFit: 'cover', borderRadius: 4, flexShrink: 0, background: 'var(--surface)' }}
                            onError={e => { e.currentTarget.style.display = 'none'; }}
                          />
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                            {item.name}
                          </span>
                          {/* Largeur toujours réservée (même quand pas en promo) pour que la
                              colonne date reste alignée d'une ligne à l'autre. */}
                          <span style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title={item.onSale ? t('profile.wishlist_on_sale') : undefined}>
                            {item.onSale && (
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#6ed94a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                                <line x1="7" y1="7" x2="7.01" y2="7"/>
                              </svg>
                            )}
                          </span>
                          <span style={{ fontSize: 11, color: dateColor, flexShrink: 0, fontWeight: isFuture && daysLeft <= 30 ? 700 : 400 }}>
                            {dateLabel}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

          </div>{/* /track */}
        </div>{/* /container */}

      </ModalCard>
    </div>
  );
}
