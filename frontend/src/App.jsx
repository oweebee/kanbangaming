import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { initUserLang, useLang } from './i18n.js';
import { initUserZoom } from './zoom.js';
import { resolveSingleSteamCardImg, authHeaders, matchesFilter } from './utils.js';
import KanbanBoard from './components/KanbanBoard.jsx';
import NowPlayingBanner from './components/NowPlayingBanner.jsx';
import MobileBoard from './components/MobileBoard.jsx';
import GameModal from './components/GameModal.jsx';
import TaskModal from './components/TaskModal.jsx';
import SearchModal from './components/SearchModal.jsx';
import LoginPage from './components/LoginPage.jsx';
// RegisterPage removed — Steam-only login
import AdminPanel from './components/AdminPanel.jsx';
import BoardAccessModal from './components/BoardAccessModal.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import AppInfoModal from './components/AppInfoModal.jsx';
import GameStatsWidget from './components/GameStatsWidget.jsx';
import GlobalSearch from './components/GlobalSearch.jsx';
import FilterField from './components/FilterField.jsx';
import SteamEncart from './components/SteamEncart.jsx';
import BoardIcon from './components/BoardIcon.jsx';
import { EmojiPicker } from './components/EmojiPicker.jsx';
import GameInfoPanel, { GAME_INFO_PANEL_WIDTH } from './components/GameInfoPanel.jsx';
import DeadlinePanel from './components/DeadlinePanel.jsx';
import UpcomingPanel from './components/UpcomingPanel.jsx';
import LibraryNewsPanel from './components/LibraryNewsPanel.jsx';
import MobileHomeSlider from './components/MobileHomeSlider.jsx';

const DISCORD_FALLBACK_ICON = 'https://cdn.discordapp.com/icons/983316258302877747/ebcf20448ef8818f93e8f31afad9f8d9.webp?size=64';
const DISCORD_FALLBACK_URL  = 'https://discord.gg/9mXpM9wv';

function DiscordServerIcon({ size = 22, borderColor = 'var(--surface1)', iconUrl = '' }) {
  const [err, setErr] = useState(false);
  const src = iconUrl || null; // pas de fallback hardcodé : si iconUrl vide → logo générique
  if (err || !src) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#5865f2', marginLeft: -(size * 0.2), position: 'relative', zIndex: 2, border: `1.5px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      <svg viewBox="0 0 127.14 96.36" xmlns="http://www.w3.org/2000/svg" style={{ width: '70%', height: '70%', fill: '#fff' }}><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg>
    </div>
  );
  return <img src={src} alt="" onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: '50%', marginLeft: -(size * 0.2), position: 'relative', zIndex: 2, border: `1.5px solid ${borderColor}`, flexShrink: 0 }} />;
}

/**
 * Hook pour les séparateurs redimensionnables (col-resize).
 * @param {React.RefObject} ref       – ref du div séparateur
 * @param {React.RefObject} dragging  – ref booléen (en cours de drag)
 * @param {'x'|'y'} axis             – 'x' = horizontal (col), 'y' = vertical (row)
 * @param {(clientX: number, rect: DOMRect) => void} onMove – callback appelé à chaque mouvement
 * @returns handlers onMouseDown + onTouchStart à passer au div
 */
function useSplitter(ref, dragging, onMove) {
  function start(getClient) {
    dragging.current = true;
    const container = ref.current?.parentElement;
    const move = e => { if (!dragging.current || !container) return; onMove(getClient(e), container.getBoundingClientRect()); };
    const up   = () => { dragging.current = false; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup',   up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend',  up);
  }
  return {
    onMouseDown: e => { e.preventDefault(); start(ev => ({ clientX: ev.clientX, clientY: ev.clientY })); },
    onTouchStart: e => { e.preventDefault(); start(ev => ({ clientX: ev.touches[0].clientX, clientY: ev.touches[0].clientY })); },
  };
}

function useMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const h = e => setMobile(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return mobile;
}

// Détecte le mode PWA installée (standalone) — PAS juste "écran étroit" (isMobile
// ci-dessus se base sur la largeur et vaut aussi true dans un onglet mobile
// classique). display-mode:standalone couvre Android (Chrome/WebView) ; iOS
// Safari ne l'expose pas et utilise à la place navigator.standalone (API dépréciée
// mais toujours seule solution fiable sur iOS ajouté à l'écran d'accueil).
function useIsPWA() {
  const detect = () => (
    (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) ||
    (typeof navigator !== 'undefined' && navigator.standalone === true)
  );
  const [isPWA, setIsPWA] = useState(detect);
  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    const h = () => setIsPWA(detect());
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return isPWA;
}

// ── Helpers boards ────────────────────────────────────────────────────────────
function getSteamAppId(gameIconUrl) {
  return gameIconUrl?.match(/apps\/(\d+)\//)?.[1] || null;
}
// Couleur basée sur les genres Steam officiels (tous testés ensemble)
function getSteamGenreColor(genres) {
  const g = (Array.isArray(genres) ? genres.join(' ') : (genres || '')).toLowerCase();
  if (g.includes('mmo') || g.includes('massively'))   return '#2870b0';
  if (g.includes('rpg') || g.includes('role'))        return '#9455cc';
  if (g.includes('hack') || g.includes('slash'))      return '#c03030';
  if (g.includes('action') || g.includes('shooter'))  return '#e8573a';
  if (g.includes('strategy'))                         return '#2ea86e';
  if (g.includes('simulation') || g.includes('sim'))  return '#3da8c8';
  if (g.includes('sport'))                            return '#40c840';
  if (g.includes('racing'))                           return '#e87820';
  if (g.includes('adventure'))                        return '#d4a020';
  if (g.includes('puzzle') || g.includes('casual'))   return '#e040b0';
  if (g.includes('horror'))                           return '#882299';
  if (g.includes('fighting'))                         return '#e06020';
  if (g.includes('indie'))                            return '#5090d0';
  return null; // genre inconnu → le caller utilisera le fallback Steam blue
}

const API = import.meta.env.VITE_API_URL || '/api';

function HomeBoardCard({ board, isPublic, isFav, onToggleFav, onClick, typeColor = '#66c0f4', isHidden = false, onHide, onUnhide, compact = false }) {
  const [favHover, setFavHover] = useState(false);
  const { t } = useLang();

  if (compact) {
    return (
      <div
        onClick={onClick}
        style={{
          background: isFav
            ? `linear-gradient(var(--surface1), var(--surface1)) padding-box, linear-gradient(to right, ${isPublic ? '#3db86a' : '#f5c518'} 0%, ${typeColor} 100%) border-box`
            : 'var(--surface1)',
          border: isFav ? '2px solid transparent' : `2px solid ${typeColor}`,
          borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 10px', cursor: 'pointer', minWidth: 0, overflow: 'hidden',
          opacity: isHidden ? 0.5 : 1, filter: isHidden ? 'saturate(0.3)' : 'none',
        }}
      >
        <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {(board.headerImg || board.gameIcon)
            ? <img src={board.headerImg || board.gameIcon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 18 }}>{board.emoji || '🎮'}</span>
          }
        </div>
        {isFav && <svg viewBox="0 0 24 24" width="9" height="9" fill="#f5c518" stroke="#f5c518" strokeWidth="1.5" style={{ flexShrink: 0 }}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
        <span style={{ flex: 1, fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{board.name}</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: (isPublic || board.public) ? '#3db86a' : '#f5a500', border: `1.5px solid ${(isPublic || board.public) ? '#3db86a' : '#f5a500'}`, borderRadius: 4, padding: '1px 4px', flexShrink: 0 }}>
          {(isPublic || board.public) ? t('hbc.public') : t('hbc.private')}
        </span>
        {(onHide || onUnhide) && (
          <button onClick={e => { e.stopPropagation(); isHidden ? onUnhide() : onHide(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {isHidden ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></> : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>}
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        background: isFav
          ? `linear-gradient(var(--surface1), var(--surface1)) padding-box, linear-gradient(to right, ${isPublic ? '#3db86a' : '#f5c518'} 0%, ${typeColor} 100%) border-box`
          : 'var(--surface1)',
        border: isFav ? '2px solid transparent' : `2px solid ${typeColor}`,
        borderRadius: 12,
        display: 'flex', flexDirection: 'column',
        opacity: isHidden ? 0.5 : 1,
        filter: isHidden ? 'saturate(0.3)' : 'none',
        transition: 'opacity .15s, filter .15s',
      }}
    >
      {/* Banner — clickable + bouton masquage flottant */}
      <div style={{ position: 'relative', width: '100%', height: 110, flexShrink: 0 }}>
        <div
          onClick={onClick}
          style={{ width: '100%', height: '100%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', borderRadius: '10px 10px 0 0' }}
        >
          {(board.headerImg || board.gameIcon) ? (
            <img src={board.headerImg || board.gameIcon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 44 }}>{board.emoji || '🎮'}</span>
          )}
        </div>
        {(onHide || onUnhide) && (
          <button
            onClick={e => { e.stopPropagation(); isHidden ? onUnhide() : onHide(); }}
            title={isHidden ? t('hbc.unhide_title') : t('hbc.hide_title')}
            style={{
              position: 'absolute', top: 6, right: 6,
              background: isHidden ? 'rgba(60,150,240,0.75)' : 'rgba(0,0,0,0.45)',
              border: 'none', borderRadius: 6, padding: '4px 5px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isHidden ? '#fff' : 'rgba(255,255,255,0.75)',
              backdropFilter: 'blur(4px)',
              transition: 'background .15s',
            }}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {isHidden
                ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
              }
            </svg>
          </button>
        )}
      </div>
      {/* Info */}
      <div
        onClick={onClick}
        style={{ padding: '10px 12px 6px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
      >
        {isFav && <svg viewBox="0 0 24 24" width="10" height="10" fill="#f5c518" stroke="#f5c518" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
        <span style={{ flex: 1, fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{board.name}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: (isPublic || board.public) ? '#3db86a' : '#f5a500', border: `2px solid ${(isPublic || board.public) ? '#3db86a' : '#f5a500'}`, borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>
          {(isPublic || board.public) ? t('hbc.public') : t('hbc.private')}
        </span>
      </div>
      {/* Action bar — 2 boutons + icône masquage flottant sur la bannière */}
      <div style={{ display: 'flex', gap: 6, padding: '0 10px 10px' }}>
        {/* Bouton principal : Afficher */}
        <button
          onClick={onClick}
          style={{
            flex: 1, background: 'var(--accent)', border: 'none',
            borderRadius: 8, padding: '7px 0',
            color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >{t('hbc.show')}</button>
        {/* Bouton secondaire : Suivre / Suivi / Épingler */}
        {onToggleFav && (
          <button
            onClick={e => { e.stopPropagation(); onToggleFav(isFav); }}
            onMouseEnter={() => setFavHover(true)}
            onMouseLeave={() => setFavHover(false)}
            style={{
              background: isFav
                ? (favHover ? 'rgba(220,50,50,.15)' : 'rgba(245,197,24,.10)')
                : 'var(--surface2)',
              border: isFav
                ? (favHover ? '1px solid rgba(220,50,50,.5)' : '1px solid rgba(245,197,24,.5)')
                : '1px solid var(--border)',
              borderRadius: 8, padding: '7px 10px', cursor: 'pointer',
              color: isFav ? (favHover ? '#e05555' : '#f5c518') : 'var(--text-muted)',
              fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
              transition: 'background .15s, border-color .15s, color .15s',
            }}
          >
            {isPublic
              ? (isFav
                ? (favHover
                  ? <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  : <svg viewBox="0 0 24 24" width="14" height="14" fill="#f5c518" stroke="#f5c518" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)
                : <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)
              : (isFav
                ? (favHover
                  ? <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  : <svg viewBox="0 0 24 24" width="14" height="14" fill="#f5c518" stroke="#f5c518" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>)
                : <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>)
            }
          </button>
        )}
      </div>
    </div>
  );
}

function getSavedAuth() {
  try {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return token && user ? { token, user } : null;
  } catch { return null; }
}
export default function App() {
  const isMobile = useMobile();
  const isPWA = useIsPWA();
  const { t, lang } = useLang();

  // Auth
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [steamLoginError, setSteamLoginError] = useState('');

  // Config publique (Discord, etc.)
  const [discordConfig, setDiscordConfig] = useState({ discordUrl: '', discordIconUrl: '' });
  useEffect(() => {
    fetch('/api/config').then(r => r.ok ? r.json() : null).then(d => { if (d) setDiscordConfig(d); }).catch(() => {});
  }, []);

  // Modals
  const [showAdmin, setShowAdmin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAppInfo, setShowAppInfo] = useState(false);

  // Favorites (public boards pinned to sidebar)
  const [favBoards, setFavBoards] = useState([]);
  // Personal board favorites (IDs only)
  const [personalFavIds, setPersonalFavIds] = useState([]);
  // Collaborative public board currently open (null = own boards mode)
  const [publicBoardMode, setPublicBoardMode] = useState(null); // { id, name, ownerUsername, canEdit, isOwner }
  // Basé sur perms.isOwner (autorité backend) une fois connu ; avant le premier chargement
  // des permissions, on retombe sur la comparaison de username pour un affichage immédiat.
  const isOwnPublicBoard = !!(publicBoardMode && currentUser && (
    publicBoardMode.isOwner !== undefined ? publicBoardMode.isOwner : publicBoardMode.ownerUsername === currentUser.username
  ));
  // Lecture seule tant que le statut n'est pas connu (canEdit===false explicitement) sur un board d'un autre user
  const canEditPublicBoard = isOwnPublicBoard || !publicBoardMode || publicBoardMode.canEdit !== false;
  const [showAccessModal, setShowAccessModal] = useState(false);

  // Home view
  const [showHome, setShowHome] = useState(true);
  // Toujours ouvrir sur deadlines — on switche sur boards seulement si deadlines est vide
  const [mobileHomeTab, setMobileHomeTab] = useState('deadlines');
  const setMobileHomeTabPersist = (tab) => { setMobileHomeTab(tab); };
  const mobileHomeTabs = ['deadlines', 'boards', 'libnews', 'upcoming'];
  const [homePublicBoards, setHomePublicBoards] = useState([]);
  const [deadlineRefreshKey, setDeadlineRefreshKey] = useState(0);
  // Home section drag order (IDs) — persisted in localStorage
  const [homePublicOrder, setHomePublicOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('homePublicOrder') || 'null') || []; } catch { return []; }
  });
  const [homeFavOrder, setHomeFavOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('homeFavOrder') || 'null') || []; } catch { return []; }
  });
  const [homeOtherOrder, setHomeOtherOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('homeOtherOrder') || 'null') || []; } catch { return []; }
  });
  const [homeFollowedOrder, setHomeFollowedOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('homeFollowedOrder') || 'null') || []; } catch { return []; }
  });
  const [homePublicCollapsed,   setHomePublicCollapsed]   = useState(false);
  const [homeFollowedCollapsed, setHomeFollowedCollapsed] = useState(false);
  const [homeFavCollapsed,      setHomeFavCollapsed]      = useState(false);
  const [homeOtherCollapsed,    setHomeOtherCollapsed]    = useState(false);
  const [homeDragId, setHomeDragId] = useState(null);
  const [homeDragOver, setHomeDragOver] = useState(null);
  const homeTouchTimerRef = useRef(null);
  const homeTouchDragRef  = useRef({ active: false, id: null, section: null, overId: null });
  // Resizable splitter between DeadlinePanel and boards columns
  // (valeur validée : une entrée localStorage corrompue/NaN ferait disparaître
  // toute la mise en page — on retombe sur le défaut si hors plage saine)
  const [homeSplitPct, setHomeSplitPct] = useState(() => {
    try {
      const v = parseFloat(localStorage.getItem('homeSplitPct') || '25');
      return (Number.isFinite(v) && v > 5 && v < 95) ? v : 25;
    } catch { return 25; }
  });
  const homeSplitterDragging = useRef(false);
  const homeSplitterRef = useRef(null);
  // Resizable splitter between boards et la colonne News Bibliothèque (même garde-fou)
  const [homeNewsWidth, setHomeNewsWidth] = useState(() => {
    try {
      const v = parseFloat(localStorage.getItem('homeNewsWidth') || '300');
      return (Number.isFinite(v) && v >= 220 && v <= 480) ? v : 300;
    } catch { return 300; }
  });
  const homeNewsSplitterDragging = useRef(false);
  const homeNewsSplitterRef = useRef(null);
  // Resizable splitter between boards and UpcomingPanel (même garde-fou)
  const [homeUpcomingWidth, setHomeUpcomingWidth] = useState(() => {
    try {
      const v = parseFloat(localStorage.getItem('homeUpcomingWidth') || '340');
      return (Number.isFinite(v) && v >= 220 && v <= 560) ? v : 340;
    } catch { return 340; }
  });
  const homeUpcomingSplitterDragging = useRef(false);
  const homeUpcomingSplitterRef = useRef(null);

  // Board state
  const [boards, setBoards] = useState([]);
  const [boardOrder, setBoardOrder] = useState([]);  // persisted drag order
  const [boardDragId, setBoardDragId] = useState(null);
  const [boardDragOverId, setBoardDragOverId] = useState(null);
  const [favOrder, setFavOrder] = useState([]);
  const [favDragId, setFavDragId] = useState(null);
  const [favDragOverId, setFavDragOverId] = useState(null);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [columns, setColumns] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedGameDefaultTab, setSelectedGameDefaultTab] = useState('infos');
  const [editingGame,  setEditingGame]  = useState(null);
  // Toujours désactivé par défaut (jamais persisté) : sinon, dès qu'on l'active une
  // fois pour jeter un œil aux archives, il reste "activé" pour toujours — sur tous
  // les boards, même après un rechargement de la page. Le useEffect ci-dessous le
  // remet aussi à false à chaque changement de board (pas de fuite d'un board à l'autre).
  const [showArchived, setShowArchived] = useState(false);
  const toggleShowArchived = () => setShowArchived(v => !v);
  useEffect(() => {
    setShowArchived(false);
  }, [activeBoardId, publicBoardMode?.id]);
  // ── Masquage cartes (localStorage par user+board) ──────────────────────────
  const [hiddenCardIds, setHiddenCardIds] = useState(() => new Set());
  const [showHiddenCards, setShowHiddenCards] = useState(false);
  // ── Masquage boards (localStorage par user) ────────────────────────────────
  const [hiddenBoardIds, setHiddenBoardIds] = useState(() => new Set());
  const [showHiddenBoards, setShowHiddenBoards] = useState(false);
  // ── Masquage échéances (localStorage par user) ─────────────────────────────
  const [hiddenDeadlineIds, setHiddenDeadlineIds] = useState(() => new Set());
  const [showHiddenDeadlines, setShowHiddenDeadlines] = useState(false);
  // ── Filtre (FilterField.jsx) — accueil (global) + board ouvert (local) ────
  // homeFilterText : un seul état, partagé par la sidebar ET les 4 sections de
  // l'accueil (boards, échéances, news, jeux à venir) — filtre global unique.
  // cardFilterText : indépendant, propre au board actuellement ouvert ; remis à
  // zéro à chaque changement de board pour ne pas "fuiter" d'un board à l'autre
  // (même logique que showArchived plus haut).
  const [homeFilterText, setHomeFilterText] = useState('');
  const [cardFilterText, setCardFilterText] = useState('');
  useEffect(() => {
    setCardFilterText('');
  }, [activeBoardId, publicBoardMode?.id]);
  const [infoPanelLocked, setInfoPanelLockedRaw] = useState(() => {
    try { return JSON.parse(localStorage.getItem('infoPanelLocked') || 'false'); } catch { return false; }
  });
  const setInfoPanelLocked = (val) => {
    setInfoPanelLockedRaw(val);
    try { localStorage.setItem('infoPanelLocked', JSON.stringify(val)); } catch {}
  };
  const [infoPanelSide, setInfoPanelSideRaw] = useState(() => {
    try { return localStorage.getItem('infoPanelSide') || 'left'; } catch { return 'left'; }
  });
  const setInfoPanelSide = (val) => {
    setInfoPanelSideRaw(val);
    try { localStorage.setItem('infoPanelSide', val); } catch {}
  };
  const [searchTargetCol, setSearchTargetCol] = useState(null);
  const [appUsers, setAppUsers] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [newBoardName, setNewBoardName] = useState('');
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [emojiPickerFor, setEmojiPickerFor] = useState(null);
  const [emojiPickerAnchor, setEmojiPickerAnchor] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

  // Board name inline edit
  const [editingBoardName, setEditingBoardName] = useState(false);
  const [boardNameInput, setBoardNameInput] = useState('');

  // Steam game info for active board
  const [gameInfo, setGameInfo] = useState(null);

  // Vue compacte — persistée PAR board (clé = board courant, ou 'home' sur la page d'accueil),
  // pour que l'activer sur une board ne l'impose pas aux autres ni à l'accueil.
  const [compactViewMap, setCompactViewMap] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('compactViewMap') || '{}');
      // Migration depuis l'ancien réglage global unique (clé 'compactView') : on ne perd pas
      // la préférence existante de l'utilisateur, elle devient juste celle de l'accueil.
      if (saved.home === undefined && localStorage.getItem('compactView') === '1') saved.home = true;
      return saved;
    } catch { return {}; }
  });
  const compactKey = publicBoardMode ? `pub:${publicBoardMode.id}` : activeBoardId ? `board:${activeBoardId}` : 'home';
  const compactView = !!compactViewMap[compactKey];
  const toggleCompact = () => setCompactViewMap(prev => {
    const next = { ...prev, [compactKey]: !prev[compactKey] };
    localStorage.setItem('compactViewMap', JSON.stringify(next));
    return next;
  });

  // Global search: pending game to open after board loads
  const [pendingOpenGameId, setPendingOpenGameId] = useState(null);

  // Couleurs de genre Steam par appid (lazy-fetched)
  const [boardGenreColors, setBoardGenreColors] = useState({});
  const fetchedGenreIds = useRef(new Set());

  // Board game search
  const [boardSearchQuery, setBoardSearchQuery] = useState('');
  const [boardSearchResults, setBoardSearchResults] = useState([]);
  const [boardSearchLoading, setBoardSearchLoading] = useState(false);
  const [selectedBoardGame, setSelectedBoardGame] = useState(null);
  const [showBoardSearch, setShowBoardSearch] = useState(false);
  const boardDebounce = useRef(null);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(64);
  useEffect(() => {
    if (!headerRef.current) return;
    const obs = new ResizeObserver(entries => setHeaderHeight(entries[0].contentRect.height));
    obs.observe(headerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    // Détection langue navigateur pour l'état non-authentifié
    initUserLang(null);
    initUserZoom(null);

    // Retour depuis Steam OpenID — token dans l'URL
    const params = new URLSearchParams(window.location.search);
    const steamToken = params.get('steam_token');
    const steamError = params.get('steam_error');
    if (steamToken) {
      try {
        const payload = JSON.parse(atob(steamToken.split('.')[1]));
        const steamUser = { id: payload.id, username: payload.username, role: payload.role };
        localStorage.setItem('token', steamToken);
        localStorage.setItem('user', JSON.stringify(steamUser));
        setCurrentUser(steamUser);
        setToken(steamToken);
        initUserLang(steamUser.id);
        initUserZoom(steamUser.id);
        window.history.replaceState({}, '', window.location.pathname);
        // Récupérer steamAvatar + steamPersonaName depuis /api/auth/me
        fetch('/api/auth/me', { headers: authHeaders(steamToken) })
          .then(r => r.ok ? r.json() : null)
          .then(fresh => {
            if (fresh) {
              const full = { ...steamUser, steamAvatar: fresh.steamAvatar || null, steamPersonaName: fresh.steamPersonaName || null };
              setCurrentUser(full);
              localStorage.setItem('user', JSON.stringify(full));
            }
          }).catch(() => {});
        return;
      } catch { /* ignore */ }
    }
    if (steamError) {
      setSteamLoginError(
        steamError === 'suspended' ? 'steam.err.suspended' :
        steamError === 'pending'   ? 'steam.err.pending'   :
        steamError === 'invalid'   ? 'steam.err.invalid'   :
        'steam.err.default'
      );
      window.history.replaceState({}, '', window.location.pathname);
    }

    const saved = getSavedAuth();
    if (!saved) return;
    setCurrentUser(saved.user);
    setToken(saved.token);
    initUserLang(saved.user.id);
    initUserZoom(saved.user.id);
    // Rafraîchir le rôle depuis le serveur (ex: si un admin a changé le rôle pendant la session)
    fetch('/api/auth/me', { headers: authHeaders(saved.token) })
      .then(r => r.ok ? r.json() : null)
      .then(fresh => {
        if (fresh && fresh.role !== saved.user.role) {
          const updated = { ...saved.user, role: fresh.role };
          setCurrentUser(updated);
          localStorage.setItem('user', JSON.stringify({ user: updated, token: saved.token }));
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = (user, tok) => { setCurrentUser(user); setToken(tok); initUserLang(user.id); initUserZoom(user.id); };
  const handleSteamSave = ({ steamAvatar, steamPersonaName }) => {
    setCurrentUser(prev => ({ ...prev, steamAvatar: steamAvatar || null, steamPersonaName: steamPersonaName || null }));
    // Persist to localStorage
    const saved = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...saved, steamAvatar: steamAvatar || null, steamPersonaName: steamPersonaName || null }));
  };
  const handleLogout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    setCurrentUser(null); setToken(null); setBoards([]); setActiveBoardId(null);
    setColumns([]); setGames([]); setGameInfo(null); setSearch('');
    setFavBoards([]); setPersonalFavIds([]); setPublicBoardMode(null);
    setShowHome(true);
  };

  const fetchFavorites = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/user/favorites`, { headers: authHeaders(token) });
      if (res.ok) setFavBoards(await res.json());
    } catch {}
  }, [token]);

  const fetchPersonalFavorites = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/user/personal-favorites`, { headers: authHeaders(token) });
      if (res.ok) setPersonalFavIds(await res.json());
    } catch {}
  }, [token]);

  const togglePersonalFavorite = async (boardId, isFav) => {
    const method = isFav ? 'DELETE' : 'POST';
    await fetch(`${API}/user/personal-favorites/${boardId}`, { method, headers: authHeaders(token) });
    setPersonalFavIds(prev => isFav ? prev.filter(id => id !== boardId) : [...prev, boardId]);
  };

  const toggleFavorite = async (boardId, boardData, isFav) => {
    const method = isFav ? 'DELETE' : 'POST';
    await fetch(`${API}/user/favorites/${boardId}`, { method, headers: authHeaders(token) });
    if (isFav) {
      setFavBoards(prev => prev.filter(b => b.id !== boardId));
    } else {
      setFavBoards(prev => [...prev, { ...boardData, isFavorite: true }]);
    }
  };

  // Returns the right API base for the active board context
  const boardApi = publicBoardMode ? `/api/public/boards/${publicBoardMode.id}` : null;

  // Garde-fou frontend : bloque les actions de modification quand l'accès est en lecture seule.
  // (Le backend refuse de toute façon en 403 — ceci évite juste une UI optimiste trompeuse.)
  const assertCanEdit = () => {
    if (publicBoardMode && !canEditPublicBoard) {
      alert(t('access.readonly_alert'));
      return false;
    }
    return true;
  };

  const openPublicBoard = async (board) => {
    setPublicBoardMode(board);
    setShowHome(false);
    setActiveBoardId(null);
    setGames([]); // clear immediately so stale personal board games don't leak into Steam info effect
    setLoading(true);
    try {
      const h = authHeaders(token);
      const [permRes, cols, gms] = await Promise.all([
        fetch(`${API}/public/boards/${board.id}/permissions`, { headers: h }),
        fetch(`${API}/public/boards/${board.id}/columns`, { headers: h }).then(r => r.json()),
        fetch(`${API}/public/boards/${board.id}/games`, { headers: h }).then(r => r.json()),
      ]);
      if (permRes.status === 403) {
        alert(t('access.revoked_alert'));
        closePublicBoard();
        return;
      }
      const perms = await permRes.json().catch(() => ({}));
      setColumns(cols);
      setGames(gms);
      setPublicBoardMode(prev => prev ? { ...prev, canEdit: perms.canEdit !== false, isOwner: !!perms.isOwner } : prev);
      // Repli : si le board n'a pas sa propre image et contient EXACTEMENT une carte Steam,
      // on affiche l'image de cette carte (board réellement "lié" à un seul jeu). Si plusieurs
      // jeux différents sont présents (board perso/backlog), on ne montre rien (emoji affiché à la place).
      const singleSteamCard = resolveSingleSteamCardImg(gms);
      if (!board.headerImg && !board.gameIcon && singleSteamCard) {
        setPublicBoardMode(prev => prev ? { ...prev, headerImg: singleSteamCard.header_img, gameIcon: prev.gameIcon || singleSteamCard.icon_img || null } : prev);
      }
    } catch {} finally { setLoading(false); }
  };

  const closePublicBoard = () => {
    setPublicBoardMode(null);
    setActiveBoardId(null);
    setColumns([]); setGames([]);
    setShowHome(true);
  };

  const refreshPublicBoard = async () => {
    if (!publicBoardMode) return;
    setLoading(true);
    try {
      const h = authHeaders(token);
      const [permRes, cols, gms] = await Promise.all([
        fetch(`${API}/public/boards/${publicBoardMode.id}/permissions`, { headers: h }),
        fetch(`${API}/public/boards/${publicBoardMode.id}/columns`, { headers: h }).then(r => r.json()),
        fetch(`${API}/public/boards/${publicBoardMode.id}/games`, { headers: h }).then(r => r.json()),
      ]);
      if (permRes.status === 403) {
        alert(t('access.revoked_alert'));
        closePublicBoard();
        return;
      }
      const perms = await permRes.json().catch(() => ({}));
      setColumns(cols);
      setGames(gms);
      setPublicBoardMode(prev => prev ? { ...prev, canEdit: perms.canEdit !== false, isOwner: !!perms.isOwner } : prev);
    } catch {} finally { setLoading(false); }
  };

  // Appelé après un transfert de propriété réussi (BoardAccessModal) : on reste sur le
  // board (l'ancien propriétaire garde l'accès) mais on recharge les permissions pour
  // faire disparaître le bouton "Gestion des accès", et on rafraîchit listes/favoris.
  const handleBoardTransferred = () => {
    setShowAccessModal(false);
    refreshPublicBoard();
    fetchBoards(); fetchFavorites(); fetchPersonalFavorites();
    fetch(`${API}/public/boards`, { headers: authHeaders(token) }).then(r => r.ok ? r.json() : []).then(setHomePublicBoards).catch(() => {});
  };

  const fetchBoards = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API}/boards`, { headers: authHeaders(token) });
    if (res.status === 401) { handleLogout(); return; }
    const data = await res.json();
    setBoards(data);
  }, [token]);

  const saveBoardName = async () => {
    const name = boardNameInput.trim();
    setEditingBoardName(false);
    if (!name || !activeBoardId || name === activeBoard?.name) return;
    await fetch(`${API}/boards/${activeBoardId}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ name }),
    });
    setBoards(prev => prev.map(b => b.id === activeBoardId ? { ...b, name } : b));
  };

  const fetchGames = useCallback(async (boardId) => {
    if (!boardId || !token) return;
    setLoading(true);
    try { const res = await fetch(`${API}/boards/${boardId}/games`, { headers: authHeaders(token) }); setGames(await res.json()); }
    catch { setGames([]); } finally { setLoading(false); }
  }, [token]);

  // Open a game from global search after its board's games have loaded
  useEffect(() => {
    if (!pendingOpenGameId || games.length === 0) return;
    const game = games.find(g => g.appid === pendingOpenGameId);
    if (game) { setSelectedGame(game); setPendingOpenGameId(null); }
  }, [games, pendingOpenGameId]);

  const handleSearchGoToBoard = (boardId, result) => {
    if (result?.isPublic) {
      openPublicBoard({ id: boardId, name: result.boardName, ownerUsername: result.ownerUsername, gameIcon: result.boardIcon, headerImg: result.boardHeaderImg });
    } else {
      setActiveBoardId(boardId);
      setShowHome(false);
      setPublicBoardMode(null);
    }
  };

  const handleSearchOpenGame = (boardId, gameId, result) => {
    if (result?.isPublic) {
      openPublicBoard({ id: boardId, name: result.boardName, ownerUsername: result.ownerUsername, gameIcon: result.boardIcon, headerImg: result.boardHeaderImg });
      setPendingOpenGameId(gameId);
    } else {
      setActiveBoardId(boardId);
      setShowHome(false);
      setPublicBoardMode(null);
      setPendingOpenGameId(gameId);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/users/list`, { headers: authHeaders(token) })
      .then(r => r.ok ? r.json() : []).then(setAppUsers).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (token && currentUser) {
      fetchBoards(); fetchFavorites(); fetchPersonalFavorites();
      try { const saved = JSON.parse(localStorage.getItem(`boardOrder_${currentUser.id}`) || 'null'); if (Array.isArray(saved)) setBoardOrder(saved); } catch {}
      try { const saved = JSON.parse(localStorage.getItem(`favOrder_${currentUser.id}`) || 'null'); if (Array.isArray(saved)) setFavOrder(saved); } catch {}
      try { const saved = JSON.parse(localStorage.getItem(`hiddenBoards_${currentUser.id}`) || '[]'); setHiddenBoardIds(new Set(saved)); } catch {}
      try { const saved = JSON.parse(localStorage.getItem(`hiddenDeadlines_${currentUser.id}`) || '[]'); setHiddenDeadlineIds(new Set(saved)); } catch {}
    }
  }, [token]);
  useEffect(() => {
    if (!showHome || !token) return;
    fetch(`${API}/public/boards`, { headers: authHeaders(token) })
      .then(r => r.ok ? r.json() : []).then(setHomePublicBoards).catch(() => {});
  }, [showHome, token]);
  // ── Bouton retour Android / geste retour mobile ──────────────────────────
  useEffect(() => {
    // Injecter une entrée factice dans l'historique pour intercepter le retour
    window.history.pushState({ kbg: true }, '');

    const handlePopState = () => {
      // Ré-injecter immédiatement pour rester sur la même "page"
      window.history.pushState({ kbg: true }, '');

      // Fermer la couche la plus haute, par ordre de priorité
      if (showDrawer)      { setShowDrawer(false);     return; }
      if (editingGame)     { setEditingGame(null);     return; }
      if (showSearch)      { setShowSearch(false); setSearchTargetCol(null); return; }
      if (showNewBoard)    { setShowNewBoard(false);   return; }
      if (showBoardSearch) { setShowBoardSearch(false); return; }
      if (showAdmin)       { setShowAdmin(false);      return; }
      if (showAccessModal) { setShowAccessModal(false); return; }
      if (showProfile)     { setShowProfile(false);    return; }
      if (showAppInfo)     { setShowAppInfo(false);    return; }
      if (selectedGame)    { setSelectedGame(null); setSelectedGameDefaultTab('infos'); return; }
      if (gameInfo)        { setGameInfo(null);        return; }
      if (publicBoardMode) { setPublicBoardMode(null); setShowHome(true); setColumns([]); setGames([]); return; }
      if (activeBoardId)   { setActiveBoardId(null); setShowHome(true); setColumns([]); setGames([]); setGameInfo(null); return; }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showDrawer, editingGame, showSearch, showNewBoard, showBoardSearch, showAdmin, showAccessModal, showProfile, showAppInfo, selectedGame, gameInfo, publicBoardMode, activeBoardId]);

  // Sync columns whenever activeBoardId OR boards changes (avoids race where boards loads after activeBoardId effect)
  useEffect(() => {
    if (!activeBoardId) return;
    const board = boards.find(b => b.id === activeBoardId);
    if (board) setColumns(board.columns || []);
  }, [activeBoardId, boards]);

  // Fetch games only when the active board changes; also unlock the info panel
  useEffect(() => {
    if (!activeBoardId) return;
    fetchGames(activeBoardId);
    setInfoPanelLocked(false);
  }, [activeBoardId]);


  // Fetch genres Steam pour colorier les liserets des boards ET les cartes jeux
  useEffect(() => {
    if (!token) return;
    const fetchGenre = (appid) => {
      if (!appid || fetchedGenreIds.current.has(appid)) return;
      fetchedGenreIds.current.add(appid);
      fetch(`${API}/steam/gameinfo/${appid}`, { headers: authHeaders(token) })
        .then(r => r.json())
        .then(info => {
          const color = getSteamGenreColor(info.genres);
          if (color) setBoardGenreColors(prev => ({ ...prev, [appid]: color }));
        })
        .catch(() => { fetchedGenreIds.current.delete(appid); });
    };
    // Icônes de boards
    [...boards, ...favBoards].forEach(b => fetchGenre(getSteamAppId(b.gameIcon)));
    // Cartes jeux individuelles dans le kanban
    games.forEach(g => {
      if (g.type === 'custom') return;
      const appid = g.appid != null ? String(g.appid) : null;
      fetchGenre(appid);
    });
  }, [boards, favBoards, games, token]);

  // Charger cartes masquées quand le board actif change
  useEffect(() => {
    if (!currentUser?.id || !activeBoardId) { setHiddenCardIds(new Set()); setShowHiddenCards(false); return; }
    try {
      const saved = JSON.parse(localStorage.getItem(`hiddenCards_${currentUser.id}_${activeBoardId}`) || '[]');
      setHiddenCardIds(new Set(saved));
    } catch { setHiddenCardIds(new Set()); }
    setShowHiddenCards(false);
  }, [currentUser?.id, activeBoardId]);

  // Helpers masquage cartes
  const hideCard = (appid) => {
    if (!currentUser?.id || !activeBoardId) return;
    setHiddenCardIds(prev => {
      const next = new Set(prev); next.add(String(appid));
      try { localStorage.setItem(`hiddenCards_${currentUser.id}_${activeBoardId}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  };
  const unhideCard = (appid) => {
    if (!currentUser?.id || !activeBoardId) return;
    setHiddenCardIds(prev => {
      const next = new Set(prev); next.delete(String(appid));
      try { localStorage.setItem(`hiddenCards_${currentUser.id}_${activeBoardId}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  // Helpers masquage boards
  const hideBoard = (boardId) => {
    if (!currentUser?.id) return;
    setHiddenBoardIds(prev => {
      const next = new Set(prev); next.add(boardId);
      try { localStorage.setItem(`hiddenBoards_${currentUser.id}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  };
  const unhideBoard = (boardId) => {
    if (!currentUser?.id) return;
    setHiddenBoardIds(prev => {
      const next = new Set(prev); next.delete(boardId);
      try { localStorage.setItem(`hiddenBoards_${currentUser.id}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const hideDeadline = (key) => {
    if (!currentUser?.id) return;
    setHiddenDeadlineIds(prev => {
      const next = new Set(prev); next.add(key);
      try { localStorage.setItem(`hiddenDeadlines_${currentUser.id}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  };
  const unhideDeadline = (key) => {
    if (!currentUser?.id) return;
    setHiddenDeadlineIds(prev => {
      const next = new Set(prev); next.delete(key);
      try { localStorage.setItem(`hiddenDeadlines_${currentUser.id}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  // Memoize Steam appId — only changes when board identity/image changes, NOT on every card update.
  // Having games in a useMemo (vs useEffect) means the effect only re-fires when the *string value* changes.
  const activeSteamAppIdForFetch = useMemo(() => {
    const board = boards.find(b => b.id === activeBoardId);
    // Repli sur l'unique carte Steam du board si ni le board ni le mode public n'ont de
    // headerImg/gameIcon propre — même heuristique que activeBoardSteamCards/activeBoardHeaderImg
    // plus bas dans le composant (board perso ET public, pas seulement public comme avant).
    const hasOwnImg = !!(board?.headerImg || board?.gameIcon || publicBoardMode?.headerImg || publicBoardMode?.gameIcon);
    const singleSteamCard = !hasOwnImg ? resolveSingleSteamCardImg(games) : null;
    const headerImg = board?.headerImg
      || publicBoardMode?.headerImg
      || singleSteamCard?.header_img
      || null;
    return headerImg?.match(/apps\/(\d+)\//)?.[1]
      || publicBoardMode?.gameIcon?.match(/apps\/(\d+)\//)?.[1]
      || board?.gameIcon?.match(/apps\/(\d+)\//)?.[1]
      || null;
  }, [activeBoardId, boards, publicBoardMode, games]);

  // Fetch Steam game info — only re-runs when the appId string actually changes
  useEffect(() => {
    if (!activeSteamAppIdForFetch || !token) { setGameInfo(null); return; }
    fetch(`${API}/steam/gameinfo/${activeSteamAppIdForFetch}`, { headers: authHeaders(token) })
      .then(r => r.ok ? r.json() : null).then(setGameInfo).catch(() => setGameInfo(null));
  }, [activeSteamAppIdForFetch, token]);

  // Board game search
  const searchBoardGames = useCallback(async (q) => {
    if (!q.trim() || !token) { setBoardSearchResults([]); return; }
    setBoardSearchLoading(true);
    try {
      const res = await fetch(`${API}/steam/search?q=${encodeURIComponent(q)}`, { headers: authHeaders(token) });
      setBoardSearchResults((await res.json()).slice(0, 6));
    } catch { setBoardSearchResults([]); } finally { setBoardSearchLoading(false); }
  }, [token]);

  const handleBoardSearchInput = (val) => {
    setBoardSearchQuery(val);
    clearTimeout(boardDebounce.current);
    boardDebounce.current = setTimeout(() => searchBoardGames(val), 350);
  };
  const selectBoardGame = (game) => { setSelectedBoardGame(game); setNewBoardName(game.name); setShowBoardSearch(false); setBoardSearchQuery(''); setBoardSearchResults([]); };
  const clearBoardGame = () => { setSelectedBoardGame(null); setNewBoardName(''); };
  const resetNewBoard = () => { setShowNewBoard(false); setNewBoardName(''); setSelectedBoardGame(null); setBoardSearchQuery(''); setBoardSearchResults([]); setShowBoardSearch(false); };

  // Boards CRUD
  const createBoard = async () => {
    const name = newBoardName.trim();
    if (!name) return;
    try {
      const res = await fetch(`${API}/boards`, {
        method: 'POST', headers: authHeaders(token),
        body: JSON.stringify({ name, emoji: '', gameIcon: selectedBoardGame ? (selectedBoardGame.icon_img || selectedBoardGame.header_img) : null, headerImg: selectedBoardGame ? selectedBoardGame.header_img : null, gameBoard: !!selectedBoardGame, lang }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert(t('err.board_create') + (e.error || res.status)); return; }
      const board = await res.json();
      setBoards(prev => [...prev, board]);
      setActiveBoardId(board.id); setColumns(board.columns || []); setGames([]);
      resetNewBoard();
    } catch (err) { alert(t('err.board_network') + err.message); }
  };

  const setBoardEmoji = async (boardId, emoji) => {
    await fetch(`${API}/boards/${boardId}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ emoji }) });
    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, emoji } : b));
  };

  const toggleBoardPublic = async (boardId, isPublic) => {
    try {
      const res = await fetch(`${API}/boards/${boardId}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ public: isPublic }) });
      if (!res.ok) { alert(t('err.board_visibility', { code: res.status })); return; }
      setBoards(prev => prev.map(b => b.id === boardId ? { ...b, public: isPublic } : b));
      // Un board qu'on repasse en privé doit ressortir immédiatement de "Mes boards" :
      // sortedBoards masque tout board présent dans favBoards (suivi), et rien ne
      // rafraîchissait cette liste après le toggle. Un board suivi pendant qu'il était
      // public restait donc invisible partout (ni "Mes boards", ni "Boards publics
      // suivis" puisqu'il n'est plus public serveur) jusqu'au prochain rechargement complet.
      if (!isPublic) setFavBoards(prev => prev.filter(b => b.id !== boardId));
    } catch (e) {
      alert(t('err.board_visibility_network'));
    }
  };

  const deleteBoard = async (boardId) => {
    if (!confirm(t('err.del_board'))) return;
    try {
      const res = await fetch(`${API}/boards/${boardId}`, { method: 'DELETE', headers: authHeaders(token) });
      if (!res.ok) {
        console.error('[deleteBoard] HTTP', res.status);
        alert(t('err.board_delete', { code: res.status }));
        return;
      }
    } catch (e) {
      console.error('[deleteBoard] network error', e);
      alert(t('err.board_delete_network'));
      return;
    }
    // Suppression confirmée côté serveur (board passé en corbeille) → on peut retirer de l'UI.
    const remaining = boards.filter(b => b.id !== boardId);
    setBoards(remaining);
    if (activeBoardId === boardId) { setActiveBoardId(remaining[0]?.id || null); setColumns(remaining[0]?.columns || []); setGames([]); }
  };

  // Helper: returns the correct board API base URL (public vs personal)
  const getBoardApi = useCallback(
    () => publicBoardMode ? `${API}/public/boards/${publicBoardMode.id}` : `${API}/boards/${activeBoardId}`,
    [publicBoardMode, activeBoardId],
  );

  // Columns CRUD
  const addColumn = async () => {
    if (!assertCanEdit()) return;
    try {
      const boardApi = getBoardApi();
      const res = await fetch(`${boardApi}/columns`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ label: t('col.new_label') }) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert(t('err.col_create') + (e.error || res.status)); return; }
      const col = await res.json();
      setColumns(prev => [...prev, col]);
      if (!publicBoardMode) setBoards(prev => prev.map(b => b.id === activeBoardId ? { ...b, columns: [...(b.columns || []), col] } : b));
    } catch (err) { alert(t('err.col_network') + err.message); }
  };
  const renameColumn = async (colId, label) => {
    if (!assertCanEdit()) return;
    const boardApi = getBoardApi();
    await fetch(`${boardApi}/columns/${colId}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ label }) });
    const updated = columns.map(c => c.id === colId ? { ...c, label } : c);
    setColumns(updated);
    if (!publicBoardMode) setBoards(prev => prev.map(b => b.id === activeBoardId ? { ...b, columns: updated } : b));
  };
  const setColumnEmoji = async (colId, emoji) => {
    if (!assertCanEdit()) return;
    const boardApi = getBoardApi();
    await fetch(`${boardApi}/columns/${colId}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ emoji }) });
    const updated = columns.map(c => c.id === colId ? { ...c, emoji } : c);
    setColumns(updated);
    if (!publicBoardMode) setBoards(prev => prev.map(b => b.id === activeBoardId ? { ...b, columns: updated } : b));
  };
  const deleteColumn = async (colId) => {
    if (!assertCanEdit()) return;
    if (!confirm(t('col.del_confirm'))) return;
    const boardApi = getBoardApi();
    await fetch(`${boardApi}/columns/${colId}`, { method: 'DELETE', headers: authHeaders(token) });
    const updated = columns.filter(c => c.id !== colId);
    setColumns(updated);
    if (!publicBoardMode) {
      setBoards(prev => prev.map(b => b.id === activeBoardId ? { ...b, columns: updated } : b));
      fetchGames(activeBoardId);
    } else {
      const res = await fetch(`${API}/public/boards/${publicBoardMode.id}/games`, { headers: authHeaders(token) });
      if (res.ok) setGames(await res.json());
    }
  };

  // Games CRUD
  const addGame = async (game, targetColId) => {
    if (!assertCanEdit()) return;
    const colId = targetColId || columns[0]?.id;
    const boardApi = getBoardApi();
    try {
      const res = await fetch(`${boardApi}/games`, {
        method: 'POST', headers: authHeaders(token),
        body: JSON.stringify({ appid: game.appid, name: game.name, header_img: game.header_img, icon_img: game.icon_img, column: colId, type: game.type || 'steam', emoji: game.emoji || null, color: game.color ?? null, taskType: game.taskType || null, dueDate: game.dueDate || null, startDate: game.startDate || null, endDate: game.endDate || null, urgent: game.urgent ?? false, assignees: game.assignees ?? [], notes: game.notes ?? [], progress: game.progress ?? null }),
      });
      if (!res.ok) {
        console.error('[addGame] HTTP', res.status);
        alert(t('err.card_add', { code: res.status }));
        return;
      }
    } catch (e) {
      console.error('[addGame] network error', e);
      alert(t('err.card_add_network'));
      return;
    }
    resyncGames();
    if (game.dueDate || game.startDate || game.endDate) setDeadlineRefreshKey(k => k + 1);
  };
  // Resynchronise l'état local avec le serveur après un échec (mode perso ou public)
  const resyncGames = () => {
    if (publicBoardMode) {
      const boardApi = getBoardApi();
      fetch(`${boardApi}/games`, { headers: authHeaders(token) }).then(res => res.ok && res.json()).then(data => data && setGames(data));
    } else {
      fetchGames(activeBoardId);
    }
  };

  const removeGame = async (appid) => {
    if (!assertCanEdit()) return;
    const boardApi = getBoardApi();
    try {
      const res = await fetch(`${boardApi}/games/${appid}`, { method: 'DELETE', headers: authHeaders(token) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[removeGame] HTTP', res.status, err);
        alert(t('err.card_delete', { code: res.status }));
        return;
      }
    } catch (e) {
      console.error('[removeGame] network error', e);
      alert(t('err.card_delete_network'));
      return;
    }
    // Suppression confirmée côté serveur (carte passée en corbeille) → on peut retirer de l'UI.
    setGames(prev => prev.filter(g => g.appid !== appid));
  };

  const archiveGame = async (appid) => {
    if (!assertCanEdit()) return;
    setGames(prev => prev.map(g => g.appid === appid ? { ...g, archived: true } : g));
    // Dès qu'on archive, on repasse l'affichage des archivées à OFF par défaut :
    // la carte qu'on vient d'archiver (et toutes les autres déjà archivées)
    // disparaît immédiatement ; le bouton reste dispo pour les réafficher manuellement.
    setShowArchived(false);
    const boardApi = getBoardApi();
    try {
      const res = await fetch(`${boardApi}/games/${appid}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ archived: true }) });
      if (!res.ok) {
        console.error('[archiveGame] HTTP', res.status);
        alert(t('err.archive', { code: res.status }));
        resyncGames();
      }
    } catch (e) {
      console.error('[archiveGame] network error', e);
      alert(t('err.archive_network'));
      resyncGames();
    }
  };

  const unarchiveGame = async (appid) => {
    if (!assertCanEdit()) return;
    setGames(prev => prev.map(g => g.appid === appid ? { ...g, archived: false } : g));
    const boardApi = getBoardApi();
    try {
      const res = await fetch(`${boardApi}/games/${appid}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ archived: false }) });
      if (!res.ok) {
        console.error('[unarchiveGame] HTTP', res.status);
        alert(t('err.restore', { code: res.status }));
        resyncGames();
      }
    } catch (e) {
      console.error('[unarchiveGame] network error', e);
      alert(t('err.restore_network'));
      resyncGames();
    }
  };

  const reorderGamesInColumn = useCallback(async (colId, orderedAppids) => {
    if (!assertCanEdit()) return;
    setGames(prev => prev.map(g => {
      const idx = orderedAppids.indexOf(g.appid);
      if (idx !== -1) return { ...g, sortOrder: idx, column: colId };
      return g;
    }));
    const boardApi = getBoardApi();
    await fetch(`${boardApi}/columns/${colId}/games/reorder`, {
      method: 'PATCH', headers: authHeaders(token),
      body: JSON.stringify({ order: orderedAppids }),
    });
  }, [activeBoardId, token, publicBoardMode]);

  const updateGame = async (updatedGame) => {
    if (!assertCanEdit()) return;
    const boardApi = getBoardApi();
    const { appid, name, emoji, color, taskType, dueDate, startDate, endDate, urgent, assignees, notes, progress } = updatedGame;
    await fetch(`${boardApi}/games/${appid}`, {
      method: 'PATCH', headers: authHeaders(token),
      body: JSON.stringify({ name, emoji, color: color ?? null, taskType: taskType ?? null, dueDate: dueDate ?? null, startDate: startDate ?? null, endDate: endDate ?? null, urgent: urgent ?? false, assignees: assignees ?? [], notes: notes ?? [], progress: progress ?? null }),
    });
    setGames(prev => prev.map(g => g.appid === appid ? { ...g, ...updatedGame } : g));
    if (updatedGame.dueDate || updatedGame.startDate || updatedGame.endDate) setDeadlineRefreshKey(k => k + 1);
  };

  // Generic field patch — used by TaskModal for immediate note/urgent/assignee saves
  const patchGame = async (appid, fields) => {
    if (!assertCanEdit()) return;
    // Auto-done when progress hits 100
    if (fields.progress === 100 && !fields.hasOwnProperty('done')) fields = { ...fields, done: true };
    const boardApi = getBoardApi();
    const url = `${boardApi}/games/${appid}`;
    try {
      const res = await fetch(url, {
        method: 'PATCH', headers: authHeaders(token),
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[patchGame] HTTP', res.status, err);
        if (fields.notes !== undefined) {
          alert(t('err.notes_save', { code: res.status }));
          return;
        }
      }
    } catch (e) {
      console.error('[patchGame] network error', e);
      if (fields.notes !== undefined) {
        alert(t('err.notes_save_network'));
        return;
      }
      return;
    }
    setGames(prev => prev.map(g => g.appid === appid ? { ...g, ...fields } : g));
    // Rafraîchir le panel Échéances si un champ qui l'affecte a changé
    if ('done' in fields || 'urgent' in fields || 'dueDate' in fields || 'startDate' in fields || 'endDate' in fields) {
      setDeadlineRefreshKey(k => k + 1);
    }
  };
  // Soft-delete atomique d'une note — contourne patchGame, endpoint dédié
  const softDeleteNote = async (appid, noteId) => {
    if (!assertCanEdit()) throw new Error('read-only');
    const boardApi = getBoardApi();
    const res = await fetch(`${boardApi}/games/${appid}/notes/${noteId}/trash`, {
      method: 'POST', headers: authHeaders(token),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || res.status); }
    const { deletedAt } = await res.json();
    setGames(prev => prev.map(g => g.appid === appid
      ? { ...g, notes: (g.notes || []).map(n => n.id === noteId ? { ...n, deletedAt } : n) }
      : g
    ));
  };

  // Open card directly on the Notes tab (from badge click)
  const handleCardNotesClick = (game) => {
    setSelectedGame(game);
    setSelectedGameDefaultTab('notes');
  };

  const moveGame = useCallback(async (appid, column) => {
    if (!assertCanEdit()) return;
    setGames(prev => prev.map(g => g.appid === appid ? { ...g, column } : g));
    const boardApi = getBoardApi();
    await fetch(`${boardApi}/games/${appid}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ column }) });
  }, [activeBoardId, token, publicBoardMode]);

  const reorderColumns = async (orderedIds) => {
    if (!assertCanEdit()) return;
    // Optimistic update
    const reordered = orderedIds.map(id => columns.find(c => c.id === id)).filter(Boolean);
    setColumns(reordered);
    if (!publicBoardMode) setBoards(prev => prev.map(b => b.id === activeBoardId ? { ...b, columns: reordered } : b));
    const boardApi = getBoardApi();
    await fetch(`${boardApi}/columns/reorder`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ order: orderedIds }) });
  };

  // Auth screens
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} steamError={steamLoginError} discordConfig={discordConfig} />;
  }

  const filtered = games.filter(g => g.name?.toLowerCase().includes(search.toLowerCase()));
  const filteredForBoard = filtered.filter(g => {
    if (!showArchived && g.archived) return false;
    if (!showHiddenCards && hiddenCardIds.has(String(g.appid))) return false;
    return true;
  });
  const byColumn = columns.reduce((acc, col) => {
    acc[col.id] = filteredForBoard
      .filter(g => g.column === col.id)
      .sort((a, b) => {
        const sa = a.sortOrder ?? new Date(a.addedAt || 0).getTime();
        const sb = b.sortOrder ?? new Date(b.addedAt || 0).getTime();
        return sa - sb;
      });
    return acc;
  }, {});
  const knownColIds = new Set(columns.map(c => c.id));
  const activeBoard = boards.find(b => b.id === activeBoardId);
  // Banner image : headerImg propre au board, sinon image de la carte Steam UNIQUE du board
  // (board réellement "lié" à un seul jeu — pas de repli si plusieurs jeux différents/backlog).
  const activeBoardSingleSteamCard = activeBoard && !activeBoard.headerImg && !activeBoard.gameIcon
    ? resolveSingleSteamCardImg(games)
    : null;
  const activeBoardHeaderImg = activeBoard?.headerImg || activeBoardSingleSteamCard?.header_img || null;
  // Extract Steam appid from banner URL
  const activeSteamAppId = activeBoardHeaderImg?.match(/apps\/(\d+)\//)?.[1] || null;
  // true when the active board was created from a Steam game (task board)
  const isTaskBoard = !!(publicBoardMode ? publicBoardMode.gameIcon : activeBoard?.gameIcon);
  const orphans = filteredForBoard.filter(g => !knownColIds.has(g.column));
  if (orphans.length > 0 && columns[0]) byColumn[columns[0].id] = [...(byColumn[columns[0].id] || []), ...orphans];
  const archiveCount = games.filter(g => g.archived).length;
  const hiddenCount  = hiddenCardIds.size;

  // Reactive displayed game — stays in sync when patchGame mutates the games array
  const displayedGame = selectedGame
    ? (games.find(g => g.appid === selectedGame.appid) || selectedGame)
    : null;

  // Sorted boards (respects drag order)
  const sortedBoardsRaw = boardOrder.length > 0
    ? [...boards].sort((a, b) => {
        const ai = boardOrder.indexOf(a.id);
        const bi = boardOrder.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
    : boards;

  // Un de mes boards passé en public ET que je suis (suivi) ne doit plus apparaître
  // dans "Épinglés"/"Mes boards" : il vit désormais uniquement dans "Boards publics
  // suivis" — même logique que l'épinglage, qui retire déjà un board de "Mes boards"
  // pour l'afficher dans sa propre section.
  const myFollowedPublicIds = new Set(favBoards.map(f => f.id));
  const sortedBoards = sortedBoardsRaw.filter(b => !myFollowedPublicIds.has(b.id));

  // Public boards split: followed vs non-followed
  const followedPublicBoards = homePublicBoards.filter(b => favBoards.some(f => f.id === b.id));
  const nonFollowedPublicBoards = homePublicBoards.filter(b => !favBoards.some(f => f.id === b.id));

  const handleBoardDrop = (targetId) => {
    if (!boardDragId || boardDragId === targetId) { setBoardDragId(null); setBoardDragOverId(null); return; }
    const base = boardOrder.length > 0 ? boardOrder : sortedBoards.map(b => b.id);
    const fromIdx = base.indexOf(boardDragId) !== -1 ? base.indexOf(boardDragId) : sortedBoards.findIndex(b => b.id === boardDragId);
    const toIdx   = base.indexOf(targetId)   !== -1 ? base.indexOf(targetId)   : sortedBoards.findIndex(b => b.id === targetId);
    const newOrder = [...base];
    // ensure all current board IDs are in newOrder
    sortedBoards.forEach(b => { if (!newOrder.includes(b.id)) newOrder.push(b.id); });
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    setBoardOrder(newOrder);
    localStorage.setItem(`boardOrder_${currentUser.id}`, JSON.stringify(newOrder));
    setBoardDragId(null); setBoardDragOverId(null);
  };

  // Sorted favBoards (respects drag order)
  const sortedFavBoards = favOrder.length > 0
    ? [...favBoards].sort((a, b) => {
        const ai = favOrder.indexOf(a.id);
        const bi = favOrder.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
    : favBoards;

  const handleFavDrop = (targetId) => {
    if (!favDragId || favDragId === targetId) { setFavDragId(null); setFavDragOverId(null); return; }
    const base = favOrder.length > 0 ? favOrder : sortedFavBoards.map(b => b.id);
    const fromIdx = base.indexOf(favDragId) !== -1 ? base.indexOf(favDragId) : sortedFavBoards.findIndex(b => b.id === favDragId);
    const toIdx   = base.indexOf(targetId)   !== -1 ? base.indexOf(targetId)   : sortedFavBoards.findIndex(b => b.id === targetId);
    const newOrder = [...base];
    sortedFavBoards.forEach(b => { if (!newOrder.includes(b.id)) newOrder.push(b.id); });
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    setFavOrder(newOrder);
    localStorage.setItem(`favOrder_${currentUser.id}`, JSON.stringify(newOrder));
    setFavDragId(null); setFavDragOverId(null);
  };

  const openBoard = (b) => {
    setActiveBoardId(b.id);
    setColumns(b.columns || []);
    setShowHome(false);
    setPublicBoardMode(null);
    fetchGames(b.id);
  };

  // Navigue vers le board d'une tâche d'Échéances (perso ou public suivi), sans
  // ouvrir de carte précise — utilisé par le clic sur le cartouche "nom du board"
  // ET par handleDeadlineOpen ci-dessous (qui enchaîne avec l'ouverture de la carte).
  const navigateToTaskBoard = (task) => {
    if (task.isPublic) {
      openPublicBoard({ id: task.boardId, name: task.boardName, ownerUsername: task.ownerUsername, gameIcon: task.boardIcon, headerImg: task.boardHeaderImg });
    } else {
      const b = boards.find(b => b.id === task.boardId);
      if (b) openBoard(b);
      else { setActiveBoardId(task.boardId); setShowHome(false); setPublicBoardMode(null); fetchGames(task.boardId); }
    }
  };

  // Ouvrir une tâche depuis DeadlinePanel : naviguer vers le board puis ouvrir la carte
  const handleDeadlineOpen = (task) => {
    setPendingOpenGameId(task.gameId);
    navigateToTaskBoard(task);
  };

  // ── Home section drag-to-reorder helpers ──────────────────────────────────
  function applySectionOrder(items, order) {
    if (!order || order.length === 0) return items;
    const map = new Map(items.map(b => [b.id, b]));
    const sorted = order.map(id => map.get(id)).filter(Boolean);
    const extra = items.filter(b => !order.includes(b.id));
    return [...sorted, ...extra];
  }

  function handleHomeDrop(section, overId, setOrder, storageKey) {
    if (!homeDragId || homeDragId === overId) return;
    setOrder(prev => {
      const base = applySectionOrder(
        section === 'public' ? nonFollowedPublicBoards
        : section === 'followed' ? followedPublicBoards
        : section === 'fav' ? sortedBoards.filter(b => personalFavIds.includes(b.id))
        : sortedBoards.filter(b => !personalFavIds.includes(b.id)),
        prev
      ).map(b => b.id);
      const from = base.indexOf(homeDragId);
      const to = base.indexOf(overId);
      if (from === -1 || to === -1) return prev;
      const next = [...base];
      next.splice(from, 1);
      next.splice(to, 0, homeDragId);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
    setHomeDragId(null);
    setHomeDragOver(null);
  }

  function finishHomeTouchDrop() {
    if (homeTouchDragRef.current.scrollBlocker) {
      document.removeEventListener('touchmove', homeTouchDragRef.current.scrollBlocker);
      homeTouchDragRef.current.scrollBlocker = null;
    }
    const { id, section, overId } = homeTouchDragRef.current;
    homeTouchDragRef.current = { active: false, id: null, section: null, overId: null };
    setHomeDragId(null); setHomeDragOver(null);
    if (!id || !overId || id === overId) return;
    const isPublic = section === 'public', isFav = section === 'fav', isFollowed = section === 'followed';
    const setOrder  = isPublic ? setHomePublicOrder  : isFollowed ? setHomeFollowedOrder  : isFav ? setHomeFavOrder  : setHomeOtherOrder;
    const key       = isPublic ? 'homePublicOrder'   : isFollowed ? 'homeFollowedOrder'   : isFav ? 'homeFavOrder'   : 'homeOtherOrder';
    const curOrder  = isPublic ? homePublicOrder      : isFollowed ? homeFollowedOrder      : isFav ? homeFavOrder      : homeOtherOrder;
    const sectionItems = isPublic ? nonFollowedPublicBoards
      : isFollowed ? followedPublicBoards
      : isFav ? sortedBoards.filter(b => personalFavIds.includes(b.id))
      : sortedBoards.filter(b => !personalFavIds.includes(b.id));
    setOrder(() => {
      const base = applySectionOrder(sectionItems, curOrder).map(b => b.id);
      const from = base.indexOf(id), to = base.indexOf(overId);
      if (from === -1 || to === -1) return curOrder;
      const next = [...base]; next.splice(from, 1); next.splice(to, 0, id);
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  // ── Couleur de type pour les boards ──────────────────────────────────────────
  // Board perso → orange vif #FF8C1A (choisi par Oweebee) — remplace l'ancien
  // cuivre/marron #c87830
  // Steam → couleur genre si connue, sinon bleu Steam #66c0f4
  const getBoardTypeColor = (b) => {
    if (!b?.gameIcon) return '#FF8C1A';
    const appid = getSteamAppId(b.gameIcon);
    return (appid && boardGenreColors[appid]) || '#66c0f4';
  };

  // ── Vue accueil mobile : onglets ─────────────────────────────────────────
  const boardsContent = (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 14px' }}>
      {hiddenBoardIds.size > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <button onClick={() => setShowHiddenBoards(v => !v)} style={{ background: showHiddenBoards ? 'rgba(40,120,200,0.22)' : 'var(--surface2)', border: showHiddenBoards ? '1px solid rgba(60,150,240,0.6)' : '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: showHiddenBoards ? '#70b8ff' : 'var(--text-muted)', fontSize: 11 }}>
            {t('board.hidden_toggle', { count: hiddenBoardIds.size })}
          </button>
        </div>
      )}
      {/* Boards publics (non-suivis) */}
      <div style={{ marginBottom: homePublicCollapsed ? 12 : 28 }}>
        <div onClick={() => setHomePublicCollapsed(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: homePublicCollapsed ? 0 : 12, cursor: 'pointer', userSelect: 'none' }}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#3db86a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="7" r="4"/><path d="M4 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M15 3.13a4 4 0 0 1 0 7.75"/><path d="M20 21v-2a4 4 0 0 0-3-3.85"/></svg>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#3db86a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('board.public_section')}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface2)', borderRadius: 99, padding: '1px 6px' }}>{nonFollowedPublicBoards.length}</span>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#3db86a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform .2s', transform: homePublicCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0, opacity: 0.7 }}><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        {!homePublicCollapsed && (nonFollowedPublicBoards.length === 0
          ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('board.no_public')}</div>
          : <div style={{ display: 'grid', gridTemplateColumns: compactView ? '1fr' : 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {applySectionOrder(nonFollowedPublicBoards, homePublicOrder).filter(b => showHiddenBoards ? true : !hiddenBoardIds.has(b.id)).filter(b => matchesFilter(b.name, homeFilterText)).map(b => (
                <div
                  key={b.id}
                  data-hbd-id={b.id}
                  onTouchStart={() => {
                    clearTimeout(homeTouchTimerRef.current);
                    homeTouchDragRef.current = { active: false, id: b.id, section: 'public', overId: null, scrollBlocker: null };
                    homeTouchTimerRef.current = setTimeout(() => {
                      homeTouchDragRef.current.active = true;
                      setHomeDragId(b.id);
                      if (navigator.vibrate) navigator.vibrate(40);
                      const blocker = (ev) => ev.preventDefault();
                      homeTouchDragRef.current.scrollBlocker = blocker;
                      document.addEventListener('touchmove', blocker, { passive: false });
                    }, 400);
                  }}
                  onTouchMove={e => {
                    if (!homeTouchDragRef.current.active) { clearTimeout(homeTouchTimerRef.current); return; }
                    const touch = e.touches[0];
                    const el = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('[data-hbd-id]');
                    const overId = el?.getAttribute('data-hbd-id') ?? null;
                    homeTouchDragRef.current.overId = overId;
                    setHomeDragOver(overId ? `public_${overId}` : null);
                  }}
                  onTouchEnd={e => {
                    clearTimeout(homeTouchTimerRef.current);
                    if (!homeTouchDragRef.current.active) { homeTouchDragRef.current.active = false; return; }
                    e.preventDefault();
                    finishHomeTouchDrop();
                  }}
                  onContextMenu={e => e.preventDefault()}
                  style={{ opacity: homeDragId === b.id ? 0.4 : 1, outline: homeDragOver === `public_${b.id}` && homeDragId !== b.id ? '2px dashed var(--accent)' : 'none', borderRadius: 12, transition: 'opacity .15s, transform .15s, box-shadow .15s', transform: homeDragId === b.id ? 'rotate(2deg) scale(1.03)' : 'none', boxShadow: homeDragId === b.id ? '0 8px 28px rgba(0,0,0,0.55)' : 'none' }}
                >
                  <HomeBoardCard board={b} isPublic isFav={false} onToggleFav={cur => toggleFavorite(b.id, b, cur)} onClick={() => openPublicBoard(b)} typeColor={getBoardTypeColor(b)} isHidden={hiddenBoardIds.has(b.id)} onHide={() => hideBoard(b.id)} onUnhide={() => unhideBoard(b.id)} compact={compactView} />
                </div>
              ))}
            </div>
        )}
      </div>
      <div style={{ borderTop: '1px solid var(--border)', marginBottom: 24 }} />

      {/* Boards publics suivis */}
      {followedPublicBoards.length > 0 && (
        <div style={{ marginBottom: homeFollowedCollapsed ? 12 : 28 }}>
          <div onClick={() => setHomeFollowedCollapsed(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: homeFollowedCollapsed ? 0 : 12, cursor: 'pointer', userSelect: 'none' }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#70b8ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/></svg>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#70b8ff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('board.followed_public')}</span>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="#70b8ff" stroke="#70b8ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface2)', borderRadius: 99, padding: '1px 6px' }}>{followedPublicBoards.length}</span>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#70b8ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform .2s', transform: homeFollowedCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0, opacity: 0.7 }}><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          {!homeFollowedCollapsed && <div style={{ display: 'grid', gridTemplateColumns: compactView ? '1fr' : 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {applySectionOrder(followedPublicBoards, homeFollowedOrder).filter(b => showHiddenBoards ? true : !hiddenBoardIds.has(b.id)).filter(b => matchesFilter(b.name, homeFilterText)).map(b => (
              <div
                key={b.id}
                data-hbd-id={b.id}
                onTouchStart={() => {
                  clearTimeout(homeTouchTimerRef.current);
                  homeTouchDragRef.current = { active: false, id: b.id, section: 'followed', overId: null, scrollBlocker: null };
                  homeTouchTimerRef.current = setTimeout(() => {
                    homeTouchDragRef.current.active = true;
                    setHomeDragId(b.id);
                    if (navigator.vibrate) navigator.vibrate(40);
                    const blocker = (ev) => ev.preventDefault();
                    homeTouchDragRef.current.scrollBlocker = blocker;
                    document.addEventListener('touchmove', blocker, { passive: false });
                  }, 400);
                }}
                onTouchMove={e => {
                  if (!homeTouchDragRef.current.active) { clearTimeout(homeTouchTimerRef.current); return; }
                  const touch = e.touches[0];
                  const el = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('[data-hbd-id]');
                  const overId = el?.getAttribute('data-hbd-id') ?? null;
                  homeTouchDragRef.current.overId = overId;
                  setHomeDragOver(overId ? `followed_${overId}` : null);
                }}
                onTouchEnd={e => {
                  clearTimeout(homeTouchTimerRef.current);
                  if (!homeTouchDragRef.current.active) { homeTouchDragRef.current.active = false; return; }
                  e.preventDefault();
                  finishHomeTouchDrop();
                }}
                onContextMenu={e => e.preventDefault()}
                style={{ opacity: homeDragId === b.id ? 0.4 : 1, outline: homeDragOver === `followed_${b.id}` && homeDragId !== b.id ? '2px dashed #70b8ff' : 'none', borderRadius: 12, transition: 'opacity .15s, transform .15s, box-shadow .15s', transform: homeDragId === b.id ? 'rotate(2deg) scale(1.03)' : 'none', boxShadow: homeDragId === b.id ? '0 8px 28px rgba(0,0,0,0.55)' : 'none' }}
              >
                <HomeBoardCard board={b} isPublic isFav onToggleFav={cur => toggleFavorite(b.id, b, cur)} onClick={() => openPublicBoard(b)} typeColor={getBoardTypeColor(b)} isHidden={hiddenBoardIds.has(b.id)} onHide={() => hideBoard(b.id)} onUnhide={() => unhideBoard(b.id)} compact={compactView} />
              </div>
            ))}
          </div>}
        </div>
      )}
      <div style={{ borderTop: '1px solid var(--border)', marginBottom: 24 }} />
      {/* Mes boards */}
      {(() => {
        const favSet = new Set(personalFavIds);
        const favBoards2 = sortedBoards.filter(b => favSet.has(b.id));
        const otherBoards = sortedBoards.filter(b => !favSet.has(b.id));
        return (<>
          {favBoards2.length > 0 && (
            <div style={{ marginBottom: homeFavCollapsed ? 12 : 24 }}>
              <div onClick={() => setHomeFavCollapsed(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: homeFavCollapsed ? 0 : 12, cursor: 'pointer', userSelect: 'none' }}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="#f5c518" stroke="#f5c518" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#f5c518', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('board.pinned_section')}</span>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface2)', borderRadius: 99, padding: '1px 6px' }}>{favBoards2.length}</span>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#f5c518" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform .2s', transform: homeFavCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0, opacity: 0.7 }}><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {!homeFavCollapsed && <div style={{ display: 'grid', gridTemplateColumns: compactView ? '1fr' : 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {applySectionOrder(favBoards2, homeFavOrder).filter(b => showHiddenBoards ? true : !hiddenBoardIds.has(b.id)).filter(b => matchesFilter(b.name, homeFilterText)).map(b => (
                  <div
                    key={b.id}
                    data-hbd-id={b.id}
                    onTouchStart={() => {
                      clearTimeout(homeTouchTimerRef.current);
                      homeTouchDragRef.current = { active: false, id: b.id, section: 'fav', overId: null, scrollBlocker: null };
                      homeTouchTimerRef.current = setTimeout(() => {
                        homeTouchDragRef.current.active = true;
                        setHomeDragId(b.id);
                        if (navigator.vibrate) navigator.vibrate(40);
                        const blocker = (ev) => ev.preventDefault();
                        homeTouchDragRef.current.scrollBlocker = blocker;
                        document.addEventListener('touchmove', blocker, { passive: false });
                      }, 400);
                    }}
                    onTouchMove={e => {
                      if (!homeTouchDragRef.current.active) { clearTimeout(homeTouchTimerRef.current); return; }
                      const touch = e.touches[0];
                      const el = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('[data-hbd-id]');
                      const overId = el?.getAttribute('data-hbd-id') ?? null;
                      homeTouchDragRef.current.overId = overId;
                      setHomeDragOver(overId ? `fav_${overId}` : null);
                    }}
                    onTouchEnd={e => {
                      clearTimeout(homeTouchTimerRef.current);
                      if (!homeTouchDragRef.current.active) { homeTouchDragRef.current.active = false; return; }
                      e.preventDefault();
                      finishHomeTouchDrop();
                    }}
                    onContextMenu={e => e.preventDefault()}
                    style={{ opacity: homeDragId === b.id ? 0.4 : 1, outline: homeDragOver === `fav_${b.id}` && homeDragId !== b.id ? '2px dashed #f5c518' : 'none', borderRadius: 12, transition: 'opacity .15s, transform .15s, box-shadow .15s', transform: homeDragId === b.id ? 'rotate(2deg) scale(1.03)' : 'none', boxShadow: homeDragId === b.id ? '0 8px 28px rgba(0,0,0,0.55)' : 'none' }}
                  >
                    <HomeBoardCard board={b} isFav onToggleFav={cur => togglePersonalFavorite(b.id, cur)} onClick={() => openBoard(b)} typeColor={getBoardTypeColor(b)} isHidden={hiddenBoardIds.has(b.id)} onHide={() => hideBoard(b.id)} onUnhide={() => unhideBoard(b.id)} compact={compactView} />
                  </div>
                ))}
              </div>}
            </div>
          )}
          <div>
            <div onClick={() => setHomeOtherCollapsed(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: homeOtherCollapsed ? 0 : 12, cursor: 'pointer', userSelect: 'none' }}>
              <span style={{ fontSize: 13 }}>🔒</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#f5a500', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('board.my_boards')}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface2)', borderRadius: 99, padding: '1px 6px' }}>{otherBoards.length}</span>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#f5a500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform .2s', transform: homeOtherCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0, opacity: 0.7 }}><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            {!homeOtherCollapsed && (boards.length === 0
              ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('board.create_start')}</div>
              : otherBoards.length === 0
                ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('board.all_pinned')}</div>
                : <div style={{ display: 'grid', gridTemplateColumns: compactView ? '1fr' : 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                    {applySectionOrder(otherBoards, homeOtherOrder).filter(b => showHiddenBoards ? true : !hiddenBoardIds.has(b.id)).filter(b => matchesFilter(b.name, homeFilterText)).map(b => (
                      <div
                        key={b.id}
                        data-hbd-id={b.id}
                        onTouchStart={() => {
                          clearTimeout(homeTouchTimerRef.current);
                          homeTouchDragRef.current = { active: false, id: b.id, section: 'other', overId: null, scrollBlocker: null };
                          homeTouchTimerRef.current = setTimeout(() => {
                            homeTouchDragRef.current.active = true;
                            setHomeDragId(b.id);
                            if (navigator.vibrate) navigator.vibrate(40);
                            const blocker = (ev) => ev.preventDefault();
                            homeTouchDragRef.current.scrollBlocker = blocker;
                            document.addEventListener('touchmove', blocker, { passive: false });
                          }, 400);
                        }}
                        onTouchMove={e => {
                          if (!homeTouchDragRef.current.active) { clearTimeout(homeTouchTimerRef.current); return; }
                          const touch = e.touches[0];
                          const el = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('[data-hbd-id]');
                          const overId = el?.getAttribute('data-hbd-id') ?? null;
                          homeTouchDragRef.current.overId = overId;
                          setHomeDragOver(overId ? `other_${overId}` : null);
                        }}
                        onTouchEnd={e => {
                          clearTimeout(homeTouchTimerRef.current);
                          if (!homeTouchDragRef.current.active) { homeTouchDragRef.current.active = false; return; }
                          e.preventDefault();
                          finishHomeTouchDrop();
                        }}
                        onContextMenu={e => e.preventDefault()}
                        style={{ opacity: homeDragId === b.id ? 0.4 : 1, outline: homeDragOver === `other_${b.id}` && homeDragId !== b.id ? '2px dashed #f5a500' : 'none', borderRadius: 12, transition: 'opacity .15s, transform .15s, box-shadow .15s', transform: homeDragId === b.id ? 'rotate(2deg) scale(1.03)' : 'none', boxShadow: homeDragId === b.id ? '0 8px 28px rgba(0,0,0,0.55)' : 'none' }}
                      >
                        <HomeBoardCard board={b} isFav={false} onToggleFav={cur => togglePersonalFavorite(b.id, cur)} onClick={() => openBoard(b)} typeColor={getBoardTypeColor(b)} isHidden={hiddenBoardIds.has(b.id)} onHide={() => hideBoard(b.id)} onUnhide={() => unhideBoard(b.id)} compact={compactView} />
                      </div>
                    ))}
                  </div>
            )}
          </div>
        </>);
      })()}
    </div>
  );

  const mobileHomeView = (
    <MobileHomeSlider
      tab={mobileHomeTab}
      onTabChange={setMobileHomeTabPersist}
      tabLabels={[
        { id: 'deadlines', label: t('home.deadlines_tab') },
        { id: 'boards',    label: t('home.boards_tab')    },
        { id: 'libnews',   label: t('home.libnews_tab')   },
        { id: 'upcoming',  label: t('home.upcoming_tab')  },
      ]}
    >
      {/* Panneau 0 : Échéances */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 14px' }}>
        <DeadlinePanel token={token} currentUser={currentUser} onOpenTask={handleDeadlineOpen} refreshKey={deadlineRefreshKey} hiddenDeadlineIds={hiddenDeadlineIds} showHiddenDeadlines={showHiddenDeadlines} onHideDeadline={hideDeadline} onUnhideDeadline={unhideDeadline} onToggleShowHidden={() => setShowHiddenDeadlines(v => !v)} compact={compactView} onEmpty={() => setMobileHomeTab('boards')} filterText={homeFilterText} getBoardColor={getBoardTypeColor} onOpenBoard={navigateToTaskBoard} />
      </div>
      {/* Panneau 1 : Boards */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {boardsContent}
      </div>
      {/* Panneau 2 : News Bibliothèque */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <LibraryNewsPanel token={token} personaName={currentUser?.steamPersonaName} currentUser={currentUser} filterText={homeFilterText} />
      </div>
      {/* Panneau 3 : Upcoming */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <UpcomingPanel token={token} filterText={homeFilterText} />
      </div>
    </MobileHomeSlider>
  );

  const homeView = (
    <div style={{ flex: 1, display: 'flex', overflowX: 'auto', overflowY: 'hidden' }}>

      {/* ── Colonne gauche : Échéances ── */}
      <div style={{ width: `${homeSplitPct}%`, minWidth: 0, flexShrink: 0, overflowY: 'auto', padding: '28px 20px' }}>
        <DeadlinePanel token={token} currentUser={currentUser} onOpenTask={handleDeadlineOpen} refreshKey={deadlineRefreshKey} hiddenDeadlineIds={hiddenDeadlineIds} showHiddenDeadlines={showHiddenDeadlines} onHideDeadline={hideDeadline} onUnhideDeadline={unhideDeadline} onToggleShowHidden={() => setShowHiddenDeadlines(v => !v)} compact={compactView} onEmpty={() => setMobileHomeTab('boards')} filterText={homeFilterText} getBoardColor={getBoardTypeColor} onOpenBoard={navigateToTaskBoard} />
      </div>

      {/* ── Séparateur redimensionnable ── */}
      <div
        ref={homeSplitterRef}
        {...useSplitter(homeSplitterRef, homeSplitterDragging, (client, rect) => {
          const raw = ((client.clientX - rect.left) / rect.width) * 100;
          const minPct = (224 / rect.width) * 100;
          const clamped = Math.max(minPct, Math.min(100 - minPct, raw));
          setHomeSplitPct(clamped);
          try { localStorage.setItem('homeSplitPct', String(clamped)); } catch {}
        })}
        style={{ width: 6, flexShrink: 0, cursor: 'col-resize', background: 'var(--border)', position: 'relative', transition: 'background .15s', userSelect: 'none', touchAction: 'none' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)'}
        onMouseLeave={e => { if (!homeSplitterDragging.current) e.currentTarget.style.background = 'var(--border)'; }}
      >
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', gap: 3, pointerEvents: 'none' }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--text-muted)', opacity: 0.5 }} />)}
        </div>
      </div>

      {/* ── Colonne centrale : Boards ── */}
      <div style={{ flex: 1, minWidth: 280, overflowY: 'auto', padding: '28px 28px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Toggle boards masqués — apparaît si des boards sont masqués */}
        {hiddenBoardIds.size > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button
              onClick={() => setShowHiddenBoards(v => !v)}
              style={{
                background: showHiddenBoards ? 'rgba(40,120,200,0.22)' : 'var(--surface2)',
                border: showHiddenBoards ? '1px solid rgba(60,150,240,0.6)' : '1px solid var(--border)',
                borderRadius: 6, padding: '6px 12px', cursor: 'pointer',
                color: showHiddenBoards ? '#70b8ff' : 'var(--text-muted)',
                fontSize: 11, fontWeight: showHiddenBoards ? 700 : 400,
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {showHiddenBoards
                  ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                  : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                }
              </svg>
              {t('board.hidden_toggle', { count: hiddenBoardIds.size })}
            </button>
          </div>
        )}
        {/* Boards publics de la communauté (non-suivis) */}
        <div style={{ marginBottom: homePublicCollapsed ? 16 : 36 }}>
          <div onClick={() => setHomePublicCollapsed(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: homePublicCollapsed ? 0 : 14, cursor: 'pointer', userSelect: 'none' }}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#3db86a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10" cy="7" r="4"/><path d="M4 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M15 3.13a4 4 0 0 1 0 7.75"/><path d="M20 21v-2a4 4 0 0 0-3-3.85"/>
            </svg>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#3db86a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('board.public_section')}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface2)', borderRadius: 99, padding: '1px 7px' }}>{nonFollowedPublicBoards.length}</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#3db86a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform .2s', transform: homePublicCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0, opacity: 0.7 }}><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          {!homePublicCollapsed && (nonFollowedPublicBoards.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '16px 0' }}>{t('board.no_public_long')}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: compactView ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {applySectionOrder(nonFollowedPublicBoards, homePublicOrder).filter(b => showHiddenBoards ? true : !hiddenBoardIds.has(b.id)).filter(b => matchesFilter(b.name, homeFilterText)).map(b => (
                <div key={b.id}
                  draggable
                  onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setHomeDragId(b.id); }}
                  onDragEnd={() => { setHomeDragId(null); setHomeDragOver(null); }}
                  onDragOver={e => { e.preventDefault(); setHomeDragOver(`pub_${b.id}`); }}
                  onDrop={e => { e.preventDefault(); handleHomeDrop('public', b.id, setHomePublicOrder, 'homePublicOrder'); }}
                  style={{ opacity: homeDragId === b.id ? 0.4 : 1, outline: homeDragOver === `pub_${b.id}` && homeDragId !== b.id ? '2px dashed var(--accent)' : 'none', borderRadius: 12, cursor: 'grab', transition: 'opacity .15s, transform .15s, box-shadow .15s', transform: homeDragId === b.id ? 'rotate(2deg) scale(1.03)' : 'none', boxShadow: homeDragId === b.id ? '0 8px 28px rgba(0,0,0,0.55)' : 'none' }}
                >
                  <HomeBoardCard board={b} isPublic
                    isFav={false}
                    onToggleFav={(cur) => toggleFavorite(b.id, b, cur)}
                    onClick={() => openPublicBoard(b)}
                    typeColor={getBoardTypeColor(b)}
                    isHidden={hiddenBoardIds.has(b.id)}
                    onHide={() => hideBoard(b.id)}
                    onUnhide={() => unhideBoard(b.id)}
                    compact={compactView} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Séparateur */}
        <div style={{ borderTop: '1px solid var(--border)', marginBottom: 32 }} />

        {/* Boards publics suivis */}
        {followedPublicBoards.length > 0 && (
          <>
            <div style={{ marginBottom: homeFollowedCollapsed ? 16 : 36 }}>
              <div onClick={() => setHomeFollowedCollapsed(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: homeFollowedCollapsed ? 0 : 14, cursor: 'pointer', userSelect: 'none' }}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#70b8ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/></svg>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#70b8ff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('board.followed_public')}</span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="#70b8ff" stroke="#70b8ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface2)', borderRadius: 99, padding: '1px 7px' }}>{followedPublicBoards.length}</span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#70b8ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform .2s', transform: homeFollowedCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0, opacity: 0.7 }}><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {!homeFollowedCollapsed && (
                <div style={{ display: 'grid', gridTemplateColumns: compactView ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {applySectionOrder(followedPublicBoards, homeFollowedOrder).filter(b => showHiddenBoards ? true : !hiddenBoardIds.has(b.id)).filter(b => matchesFilter(b.name, homeFilterText)).map(b => (
                    <div key={b.id}
                      draggable
                      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setHomeDragId(b.id); }}
                      onDragEnd={() => { setHomeDragId(null); setHomeDragOver(null); }}
                      onDragOver={e => { e.preventDefault(); setHomeDragOver(`followed_${b.id}`); }}
                      onDrop={e => { e.preventDefault(); handleHomeDrop('followed', b.id, setHomeFollowedOrder, 'homeFollowedOrder'); }}
                      style={{ opacity: homeDragId === b.id ? 0.4 : 1, outline: homeDragOver === `followed_${b.id}` && homeDragId !== b.id ? '2px dashed #70b8ff' : 'none', borderRadius: 12, cursor: 'grab', transition: 'opacity .15s, transform .15s, box-shadow .15s', transform: homeDragId === b.id ? 'rotate(2deg) scale(1.03)' : 'none', boxShadow: homeDragId === b.id ? '0 8px 28px rgba(0,0,0,0.55)' : 'none' }}
                    >
                      <HomeBoardCard board={b} isPublic isFav onToggleFav={(cur) => toggleFavorite(b.id, b, cur)} onClick={() => openPublicBoard(b)} typeColor={getBoardTypeColor(b)} isHidden={hiddenBoardIds.has(b.id)} onHide={() => hideBoard(b.id)} onUnhide={() => unhideBoard(b.id)} compact={compactView} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', marginBottom: 32 }} />
          </>
        )}

        {/* Mes boards */}
        {(() => {
          const favSet = new Set(personalFavIds);
          const favBoards2 = sortedBoards.filter(b => favSet.has(b.id));
          const otherBoards = sortedBoards.filter(b => !favSet.has(b.id));
          return (
            <>
              {favBoards2.length > 0 && (
                <div style={{ marginBottom: homeFavCollapsed ? 16 : 28 }}>
                  <div onClick={() => setHomeFavCollapsed(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: homeFavCollapsed ? 0 : 14, cursor: 'pointer', userSelect: 'none' }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="#f5c518" stroke="#f5c518" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#f5c518', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('board.pinned_section')}</span>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface2)', borderRadius: 99, padding: '1px 7px' }}>{favBoards2.length}</span>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#f5c518" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform .2s', transform: homeFavCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0, opacity: 0.7 }}><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  {!homeFavCollapsed && (
                    <div style={{ display: 'grid', gridTemplateColumns: compactView ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                      {applySectionOrder(favBoards2, homeFavOrder).filter(b => showHiddenBoards ? true : !hiddenBoardIds.has(b.id)).filter(b => matchesFilter(b.name, homeFilterText)).map(b => (
                        <div key={b.id}
                          draggable
                          onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setHomeDragId(b.id); }}
                          onDragEnd={() => { setHomeDragId(null); setHomeDragOver(null); }}
                          onDragOver={e => { e.preventDefault(); setHomeDragOver(`fav_${b.id}`); }}
                          onDrop={e => { e.preventDefault(); handleHomeDrop('fav', b.id, setHomeFavOrder, 'homeFavOrder'); }}
                          style={{ opacity: homeDragId === b.id ? 0.4 : 1, outline: homeDragOver === `fav_${b.id}` && homeDragId !== b.id ? '2px dashed #f5c518' : 'none', borderRadius: 12, cursor: 'grab', transition: 'opacity .15s, transform .15s, box-shadow .15s', transform: homeDragId === b.id ? 'rotate(2deg) scale(1.03)' : 'none', boxShadow: homeDragId === b.id ? '0 8px 28px rgba(0,0,0,0.55)' : 'none' }}
                        >
                          <HomeBoardCard board={b} isFav onToggleFav={(cur) => togglePersonalFavorite(b.id, cur)} onClick={() => openBoard(b)} typeColor={getBoardTypeColor(b)} isHidden={hiddenBoardIds.has(b.id)} onHide={() => hideBoard(b.id)} onUnhide={() => unhideBoard(b.id)} compact={compactView} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div>
                <div onClick={() => setHomeOtherCollapsed(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: homeOtherCollapsed ? 0 : 14, cursor: 'pointer', userSelect: 'none' }}>
                  <span style={{ fontSize: 14 }}>🔒</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#f5a500', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('board.my_boards')}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface2)', borderRadius: 99, padding: '1px 7px' }}>{otherBoards.length}</span>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#f5a500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform .2s', transform: homeOtherCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0, opacity: 0.7 }}><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                {!homeOtherCollapsed && (boards.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '16px 0' }}>{t('board.create_start')}</div>
                ) : otherBoards.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '8px 0' }}>{t('board.all_pinned')}</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: compactView ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                    {applySectionOrder(otherBoards, homeOtherOrder).filter(b => showHiddenBoards ? true : !hiddenBoardIds.has(b.id)).filter(b => matchesFilter(b.name, homeFilterText)).map(b => (
                      <div key={b.id}
                        draggable
                        onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setHomeDragId(b.id); }}
                        onDragEnd={() => { setHomeDragId(null); setHomeDragOver(null); }}
                        onDragOver={e => { e.preventDefault(); setHomeDragOver(`other_${b.id}`); }}
                        onDrop={e => { e.preventDefault(); handleHomeDrop('other', b.id, setHomeOtherOrder, 'homeOtherOrder'); }}
                        style={{ opacity: homeDragId === b.id ? 0.4 : 1, outline: homeDragOver === `other_${b.id}` && homeDragId !== b.id ? '2px dashed #f5a500' : 'none', borderRadius: 12, cursor: 'grab', transition: 'opacity .15s, transform .15s, box-shadow .15s', transform: homeDragId === b.id ? 'rotate(2deg) scale(1.03)' : 'none', boxShadow: homeDragId === b.id ? '0 8px 28px rgba(0,0,0,0.55)' : 'none' }}
                      >
                        <HomeBoardCard board={b} isFav={false} onToggleFav={(cur) => togglePersonalFavorite(b.id, cur)} onClick={() => openBoard(b)} typeColor={getBoardTypeColor(b)} isHidden={hiddenBoardIds.has(b.id)} onHide={() => hideBoard(b.id)} onUnhide={() => unhideBoard(b.id)} compact={compactView} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </div>
      </div>

      {/* ── Séparateur : Boards / News Bibliothèque ── */}
      <div
        ref={homeNewsSplitterRef}
        {...useSplitter(homeNewsSplitterRef, homeNewsSplitterDragging, (client, rect) => {
          // Largeur News = distance entre le curseur et la frontière fixe News/Upcoming
          // (laquelle dépend de la largeur courante d'Upcoming + son propre séparateur).
          const rightEdge = rect.right - homeUpcomingWidth - 6;
          const clamped = Math.max(220, Math.min(480, rightEdge - client.clientX));
          setHomeNewsWidth(clamped);
          try { localStorage.setItem('homeNewsWidth', String(clamped)); } catch {}
        })}
        style={{ width: 6, flexShrink: 0, cursor: 'col-resize', background: 'var(--border)', position: 'relative', transition: 'background .15s', userSelect: 'none', touchAction: 'none' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)'}
        onMouseLeave={e => { if (!homeNewsSplitterDragging.current) e.currentTarget.style.background = 'var(--border)'; }}
      >
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', gap: 3, pointerEvents: 'none' }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--text-muted)', opacity: 0.5 }} />)}
        </div>
      </div>

      {/* ── Colonne News Bibliothèque ── */}
      {/* maxWidth en % : même garde-fou que pour Upcoming, voir commentaire ci-dessous. */}
      <div style={{ width: homeNewsWidth, maxWidth: '30%', flexShrink: 0, overflow: 'hidden' }}>
        <LibraryNewsPanel token={token} personaName={currentUser?.steamPersonaName} currentUser={currentUser} filterText={homeFilterText} />
      </div>

      {/* ── Séparateur 2 : News Bibliothèque / Sorties à venir ── */}
      <div
        ref={homeUpcomingSplitterRef}
        {...useSplitter(homeUpcomingSplitterRef, homeUpcomingSplitterDragging, (client, rect) => {
          const clamped = Math.max(220, Math.min(560, rect.right - client.clientX));
          setHomeUpcomingWidth(clamped);
          try { localStorage.setItem('homeUpcomingWidth', String(clamped)); } catch {}
        })}
        style={{ width: 6, flexShrink: 0, cursor: 'col-resize', background: 'var(--border)', position: 'relative', transition: 'background .15s', userSelect: 'none', touchAction: 'none' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)'}
        onMouseLeave={e => { if (!homeUpcomingSplitterDragging.current) e.currentTarget.style.background = 'var(--border)'; }}
      >
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', gap: 3, pointerEvents: 'none' }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--text-muted)', opacity: 0.5 }} />)}
        </div>
      </div>

      {/* ── Colonne droite : Sorties à venir ── */}
      {/* maxWidth en % (et non en px/vw) : reste cohérent avec la compensation de zoom
          (zoom.js) et empêche cette colonne d'être poussée hors champ par overflow
          si homeUpcomingWidth (px stockable jusqu'à 560) dépasse la largeur dispo. */}
      <div style={{ width: homeUpcomingWidth, maxWidth: '45%', flexShrink: 0, overflow: 'hidden' }}>
        <UpcomingPanel token={token} filterText={homeFilterText} />
      </div>

    </div>
  );

  // ── Sidebar ───────────────────────────────────────────────────────────────

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{ padding: '14px 14px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
          <svg viewBox="0 0 496 512" xmlns="http://www.w3.org/2000/svg" style={{ width: 35, height: 35, position: 'relative', zIndex: 1 }}>
            <defs>
              <clipPath id="logoClip">
                <path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.7-76.3-239-180.4l95.2 39.3c6.4 32.1 34.9 56.4 68.9 56.4 38.2 0 69.1-31.1 68.9-69.3l84.5-60.2c52.1 1.3 95.8-40.9 95.8-93.5 0-51.6-42-93.5-93.7-93.5s-93.7 42-93.7 93.5v1.2L176.6 279c-15.5-.9-30.7 3.4-43.5 12.1L0 236.1C10.2 108.4 117.1 8 247.6 8 384.8 8 496 119 496 256zM155.7 384.3l-30.5-12.6a52.79 52.79 0 0 0 27.2 25.8c26.9 11.2 57.8-1.6 69-28.4 5.4-13 5.5-27.3.1-40.3-5.4-13-15.5-23.2-28.5-28.6-12.7-5.3-26.4-5.5-38.8-1.4l31.5 13c19.8 8.2 29.2 30.9 20.9 50.7-8.3 19.9-31 29.2-50.9 21zm173.8-129.9c-34.4 0-62.4-28-62.4-62.3s28-62.3 62.4-62.3 62.4 28 62.4 62.3-27.9 62.3-62.4 62.3zm.1-15.6c25.9 0 46.9-21 46.9-46.8 0-25.9-21-46.8-46.9-46.8s-46.9 21-46.9 46.8c.1 25.8 21.1 46.8 46.9 46.8z" />
              </clipPath>
            </defs>
            <circle cx="248" cy="256" r="244" fill="#000" />
            <path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.7-76.3-239-180.4l95.2 39.3c6.4 32.1 34.9 56.4 68.9 56.4 38.2 0 69.1-31.1 68.9-69.3l84.5-60.2c52.1 1.3 95.8-40.9 95.8-93.5 0-51.6-42-93.5-93.7-93.5s-93.7 42-93.7 93.5v1.2L176.6 279c-15.5-.9-30.7 3.4-43.5 12.1L0 236.1C10.2 108.4 117.1 8 247.6 8 384.8 8 496 119 496 256zM155.7 384.3l-30.5-12.6a52.79 52.79 0 0 0 27.2 25.8c26.9 11.2 57.8-1.6 69-28.4 5.4-13 5.5-27.3.1-40.3-5.4-13-15.5-23.2-28.5-28.6-12.7-5.3-26.4-5.5-38.8-1.4l31.5 13c19.8 8.2 29.2 30.9 20.9 50.7-8.3 19.9-31 29.2-50.9 21zm173.8-129.9c-34.4 0-62.4-28-62.4-62.3s28-62.3 62.4-62.3 62.4 28 62.4 62.3-27.9 62.3-62.4 62.3zm.1-15.6c25.9 0 46.9-21 46.9-46.8 0-25.9-21-46.8-46.9-46.8s-46.9 21-46.9 46.8c.1 25.8 21.1 46.8 46.9 46.8z" fill="var(--accent)" stroke="var(--accent-dim)" strokeWidth="9" strokeLinejoin="round" />
            <g clipPath="url(#logoClip)">
              <ellipse cx="180" cy="130" rx="100" ry="80" fill="#e8813a" />
            </g>
          </svg>
          {discordConfig.discordUrl && <DiscordServerIcon size={35} borderColor="#111" iconUrl={discordConfig.discordIconUrl} />}
        </div>
        <span onClick={() => { setShowHome(true); setActiveBoardId(null); setPublicBoardMode(null); }} style={{ fontWeight: 800, fontSize: 16, letterSpacing: '0.04em', color: 'var(--text)', flex: 1, cursor: 'pointer' }}>KangBanGaming</span>
        {isMobile && <button onClick={() => setShowDrawer(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>}
      </div>

      {/* Tableau de Board — home nav button */}
      <div style={{ padding: '8px 8px 4px' }}>
        <button
          onClick={() => { setShowHome(true); setActiveBoardId(null); setPublicBoardMode(null); if (isMobile) setShowDrawer(false); }}
          style={{
            width: '100%',
            background: showHome && !activeBoardId && !publicBoardMode
              ? 'linear-gradient(135deg, rgba(192,87,10,0.22) 0%, rgba(192,87,10,0.10) 100%)'
              : 'linear-gradient(135deg, rgba(192,87,10,0.12) 0%, rgba(192,87,10,0.04) 100%)',
            border: showHome && !activeBoardId && !publicBoardMode
              ? '1.5px solid var(--accent)'
              : '1.5px solid rgba(192,87,10,0.35)',
            borderRadius: 9,
            padding: '8px 10px',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'background .15s, border-color .15s, box-shadow .15s',
            boxShadow: showHome && !activeBoardId && !publicBoardMode
              ? '0 0 0 2px rgba(192,87,10,0.18), 0 2px 8px rgba(0,0,0,0.3)'
              : '0 1px 4px rgba(0,0,0,0.2)',
          }}
        >
          {/* Icon: grid/home */}
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
          </svg>
          <span style={{
            color: 'var(--accent)',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '0.02em',
            flex: 1,
          }}>{t('board.dashboard')}</span>
          {showHome && !activeBoardId && !publicBoardMode && (
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, opacity: 0.9 }} />
          )}
        </button>
      </div>

      {/* ⭐ Épinglés — section indépendante à taille fixe, affichée en premier (toujours en
          haut) ; ne partage plus son scroll avec "Mes boards" (avant : les deux défilaient
          ensemble en un seul bloc). Sa propre liste est plafonnée (maxHeight + scroll interne)
          en tout dernier recours, seulement si "Mes boards" a déjà cédé toute la place qu'elle
          peut céder. */}
      {personalFavIds.length > 0 && sortedBoards.some(b => personalFavIds.includes(b.id)) && (
        <div style={{ padding: '6px 6px 0', flexShrink: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#f5c518', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 6px 2px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg viewBox="0 0 24 24" width="8" height="8" fill="#f5c518" stroke="#f5c518" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            {t('board.pinned_section')}
          </div>
          <div style={{ maxHeight: '28vh', overflowY: 'auto' }}>
          {sortedBoards.filter(b => personalFavIds.includes(b.id)).filter(b => showHiddenBoards ? true : !hiddenBoardIds.has(b.id)).filter(b => matchesFilter(b.name, homeFilterText)).map(b => (
          <div key={b.id}
            draggable
            onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setBoardDragId(b.id); }}
            onDragEnd={() => { setBoardDragId(null); setBoardDragOverId(null); }}
            onDragOver={e => { e.preventDefault(); setBoardDragOverId(b.id); }}
            onDrop={e => { e.preventDefault(); handleBoardDrop(b.id); }}
            onClick={() => { setActiveBoardId(b.id); setColumns(b.columns || []); setEmojiPickerFor(null); setShowHome(false); setPublicBoardMode(null); if (isMobile) setShowDrawer(false); }}
            style={{
              padding: '6px 8px', borderRadius: 7, cursor: 'grab', marginBottom: 2,
              background: boardDragOverId === b.id && boardDragId !== b.id ? 'var(--accent-dim)' : activeBoardId === b.id ? 'var(--accent-dim)' : 'transparent',
              borderLeft: activeBoardId === b.id ? '3px solid var(--accent)' : boardDragOverId === b.id && boardDragId !== b.id ? '3px solid #3db86a' : '3px solid transparent',
              color: activeBoardId === b.id ? 'var(--text)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: 5,
              opacity: boardDragId === b.id ? 0.4 : 1,
              transition: 'background .12s, opacity .12s', position: 'relative',
            }}
          >
            {b.gameIcon ? (
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(90deg, #f5c518 50%, ${getBoardTypeColor(b)} 50%)`, padding: 2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={b.gameIcon} alt="" style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(90deg, #f5c518 50%, ${getBoardTypeColor(b)} 50%)`, padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button
                    onClick={e => { e.stopPropagation(); if (emojiPickerFor === b.id) { setEmojiPickerFor(null); setEmojiPickerAnchor(null); } else { setEmojiPickerFor(b.id); setEmojiPickerAnchor(e.currentTarget); } }}
                    style={{ background: 'var(--border)', border: 'none', borderRadius: 8, width: 34, height: 34, fontSize: b.emoji ? 24 : 11, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >{b.emoji || '+'}</button>
                </div>
                {emojiPickerFor === b.id && (
                  <EmojiPicker current={b.emoji || ''} onSelect={emoji => { setBoardEmoji(b.id, emoji); setEmojiPickerFor(null); setEmojiPickerAnchor(null); }} onClose={() => { setEmojiPickerFor(null); setEmojiPickerAnchor(null); }} anchorEl={emojiPickerAnchor} clearLabel={t('board.emoji_no')} />
                )}
              </div>
            )}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 700, opacity: hiddenBoardIds.has(b.id) ? 0.45 : 1 }}>{b.name}</span>
            {/* Désépingler (déjà épinglé dans cette section) */}
            <button
              onClick={e => { e.stopPropagation(); togglePersonalFavorite(b.id, true); }}
              title={t('hbc.pinned')}
              style={{ background: 'none', border: 'none', fontSize: 11, padding: 0, cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="#f5c518" stroke="#f5c518" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </button>
            {/* Public toggle */}
            <button
              onClick={e => { e.stopPropagation(); toggleBoardPublic(b.id, !b.public); }}
              title={b.public ? t('board.make_private_title') : t('board.make_public_title')}
              style={{ background: 'none', border: 'none', fontSize: 11, padding: 0, cursor: 'pointer', flexShrink: 0, opacity: b.public ? 1 : 0.3, lineHeight: 1 }}
            >{b.public ? (
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="7" r="4"/><path d="M4 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M15 3.13a4 4 0 0 1 0 7.75"/><path d="M20 21v-2a4 4 0 0 0-3-3.85"/>
              </svg>
            ) : (<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--text-muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>)}</button>
            <button onClick={e => { e.stopPropagation(); deleteBoard(b.id); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, padding: 0, opacity: 0.4, cursor: 'pointer', flexShrink: 0 }}>✕</button>
          </div>
          ))}
          </div>
        </div>
      )}

      {/* Mes boards — première zone à se réduire et à afficher sa propre barre de défilement
          quand la place manque (priorité de scroll n°1). Les sections épinglés (au-dessus) et
          boards publics suivis / formulaire nouveau board (en dessous) gardent leur taille
          naturelle et ne défilent qu'en dernier recours, une fois cette zone déjà réduite à son
          minimum. */}
      <div style={{ flex: 1, minHeight: 140, overflowY: 'auto', padding: '6px 6px' }}>
        {/* Séparateur épinglés / autres */}
        {personalFavIds.length > 0 && sortedBoards.some(b => personalFavIds.includes(b.id)) && sortedBoards.some(b => !personalFavIds.includes(b.id)) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 4px 2px', margin: '2px 0 4px' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{t('board.my_boards_sep')}</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
        )}

        {/* Non-pinned boards */}
        {sortedBoards.filter(b => !personalFavIds.includes(b.id)).filter(b => showHiddenBoards ? true : !hiddenBoardIds.has(b.id)).filter(b => matchesFilter(b.name, homeFilterText)).map(b => (
          <div key={b.id}
            draggable
            onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setBoardDragId(b.id); }}
            onDragEnd={() => { setBoardDragId(null); setBoardDragOverId(null); }}
            onDragOver={e => { e.preventDefault(); setBoardDragOverId(b.id); }}
            onDrop={e => { e.preventDefault(); handleBoardDrop(b.id); }}
            onClick={() => { setActiveBoardId(b.id); setColumns(b.columns || []); setEmojiPickerFor(null); setShowHome(false); setPublicBoardMode(null); if (isMobile) setShowDrawer(false); }}
            style={{
              padding: '6px 8px', borderRadius: 7, cursor: 'grab', marginBottom: 2,
              background: boardDragOverId === b.id && boardDragId !== b.id ? 'var(--accent-dim)' : activeBoardId === b.id ? 'var(--accent-dim)' : 'transparent',
              borderLeft: activeBoardId === b.id ? '3px solid var(--accent)' : boardDragOverId === b.id && boardDragId !== b.id ? '3px solid #3db86a' : '3px solid transparent',
              color: activeBoardId === b.id ? 'var(--text)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: 5,
              opacity: boardDragId === b.id ? 0.4 : 1,
              transition: 'background .12s, opacity .12s', position: 'relative',
            }}
          >
            {b.gameIcon ? (
              <div style={{ width: 38, height: 38, borderRadius: 10, background: getBoardTypeColor(b), padding: 2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={b.gameIcon} alt="" style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: getBoardTypeColor(b), padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button
                    onClick={e => { e.stopPropagation(); if (emojiPickerFor === b.id) { setEmojiPickerFor(null); setEmojiPickerAnchor(null); } else { setEmojiPickerFor(b.id); setEmojiPickerAnchor(e.currentTarget); } }}
                    style={{ background: 'var(--border)', border: 'none', borderRadius: 8, width: 34, height: 34, fontSize: b.emoji ? 24 : 11, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >{b.emoji || '+'}</button>
                </div>
                {emojiPickerFor === b.id && (
                  <EmojiPicker current={b.emoji || ''} onSelect={emoji => { setBoardEmoji(b.id, emoji); setEmojiPickerFor(null); setEmojiPickerAnchor(null); }} onClose={() => { setEmojiPickerFor(null); setEmojiPickerAnchor(null); }} anchorEl={emojiPickerAnchor} clearLabel={t('board.emoji_no')} />
                )}
              </div>
            )}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 700 }}>{b.name}</span>
            {/* Épingler (pas encore épinglé, on est dans "Mes boards") */}
            <button
              onClick={e => { e.stopPropagation(); togglePersonalFavorite(b.id, false); }}
              title={t('hbc.pin')}
              style={{ background: 'none', border: 'none', fontSize: 11, padding: 0, cursor: 'pointer', flexShrink: 0, opacity: 0.4, lineHeight: 1 }}
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </button>
            <button
              onClick={e => { e.stopPropagation(); toggleBoardPublic(b.id, !b.public); }}
              title={b.public ? t('board.make_private_title') : t('board.make_public_title')}
              style={{ background: 'none', border: 'none', fontSize: 11, padding: 0, cursor: 'pointer', flexShrink: 0, opacity: b.public ? 1 : 0.3, lineHeight: 1 }}
            >{b.public ? (
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="7" r="4"/><path d="M4 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M15 3.13a4 4 0 0 1 0 7.75"/><path d="M20 21v-2a4 4 0 0 0-3-3.85"/>
              </svg>
            ) : (<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--text-muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>)}</button>
            <button onClick={e => { e.stopPropagation(); deleteBoard(b.id); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, padding: 0, opacity: 0.4, cursor: 'pointer', flexShrink: 0 }}>✕</button>
          </div>
        ))}

        {/* Bouton boards masqués */}
        {hiddenBoardIds.size > 0 && (
          <button
            onClick={() => setShowHiddenBoards(v => !v)}
            style={{
              width: '100%', marginTop: 4, padding: '5px 8px',
              background: showHiddenBoards ? 'rgba(40,120,200,0.18)' : 'none',
              border: showHiddenBoards ? '1px solid rgba(60,150,240,0.5)' : '1px dashed rgba(255,255,255,0.12)',
              borderRadius: 6, color: showHiddenBoards ? '#70b8ff' : 'var(--text-muted)',
              fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              fontWeight: showHiddenBoards ? 700 : 400,
            }}
          >
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {showHiddenBoards ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></> : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>}
            </svg>
            {t('board.hidden_toggle', { count: hiddenBoardIds.size })}
          </button>
        )}
      </div>

      {/* Followed public boards — section secondaire à taille fixe (label toujours visible) ;
          sa propre liste est plafonnée (maxHeight + scroll interne) pour ne jamais pouvoir
          écraser "Mes boards" au-dessus si beaucoup de boards publics sont suivis. */}
      {favBoards.length > 0 && (
        <div style={{ padding: '4px 6px 0', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '4px 2px 4px 4px', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {t('board.followed_public')}
          </div>
          <div style={{ maxHeight: '32vh', overflowY: 'auto' }}>
          {sortedFavBoards.filter(b => showHiddenBoards ? true : !hiddenBoardIds.has(b.id)).filter(b => matchesFilter(b.name, homeFilterText)).map(b => (
            <div key={b.id}
              draggable
              onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setFavDragId(b.id); }}
              onDragEnd={() => { setFavDragId(null); setFavDragOverId(null); }}
              onDragOver={e => { e.preventDefault(); setFavDragOverId(b.id); }}
              onDrop={e => { e.preventDefault(); handleFavDrop(b.id); }}
              onClick={() => { openPublicBoard(b); if (isMobile) setShowDrawer(false); }}
              style={{
                padding: '6px 8px', borderRadius: 7, cursor: 'grab', marginBottom: 2,
                background: favDragOverId === b.id && favDragId !== b.id ? 'var(--accent-dim)' : 'transparent',
                borderLeft: favDragOverId === b.id && favDragId !== b.id ? '3px solid #3db86a' : '3px solid transparent',
                color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5,
                opacity: favDragId === b.id ? 0.4 : 1,
                transition: 'background .12s, opacity .12s',
              }}
              onMouseEnter={e => { if (favDragOverId !== b.id) e.currentTarget.style.background = 'var(--surface2)'; }}
              onMouseLeave={e => { if (favDragOverId !== b.id) e.currentTarget.style.background = 'transparent'; }}
            >
              {b.gameIcon ? (
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(90deg, #3db86a 50%, ${getBoardTypeColor(b)} 50%)`, padding: 2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={b.gameIcon} alt="" style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                </div>
              ) : (
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(90deg, #3db86a 50%, ${getBoardTypeColor(b)} 50%)`, padding: 2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{b.emoji || '🎮'}</div>
                </div>
              )}
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 700, opacity: hiddenBoardIds.has(b.id) ? 0.45 : 1 }}>{b.name}</span>
              {/* Ne plus suivre — repasse le board dans "Mes boards" si on en est le créateur
                  (sortedBoards le réintègre automatiquement dès qu'il sort de favBoards),
                  ou disparaît simplement de cette section sinon. */}
              <button
                onClick={e => { e.stopPropagation(); toggleFavorite(b.id, b, true); }}
                title={t('hbc.unfollow')}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}
              >
                <svg viewBox="0 0 24 24" width="10" height="10" fill="var(--accent)" stroke="var(--accent)" strokeWidth="1.5" style={{ opacity: 0.7 }}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </button>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* New board form */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
        {showNewBoard ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {selectedBoardGame && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', borderRadius: 6, padding: '5px 8px' }}>
                <img src={selectedBoardGame.icon_img || selectedBoardGame.header_img} alt="" style={{ width: 22, height: 22, objectFit: 'cover', borderRadius: 5, flexShrink: 0, border: '1px solid var(--border)' }} />
                <span style={{ flex: 1, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{selectedBoardGame.name}</span>
                <button onClick={clearBoardGame} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>✕</button>
              </div>
            )}
            {!selectedBoardGame && (
              <div style={{ position: 'relative' }}>
                {showBoardSearch ? (
                  <>
                    <input autoFocus value={boardSearchQuery} onChange={e => handleBoardSearchInput(e.target.value)} placeholder={t('board.search_game_ph')}
                      style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                    {(boardSearchLoading || boardSearchResults.length > 0) && (
                      <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 200, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 2, boxShadow: '0 -8px 20px rgba(0,0,0,.5)', maxHeight: 200, overflowY: 'auto' }}>
                        {boardSearchLoading && <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)' }}>{t('board.searching')}</div>}
                        {[...boardSearchResults].reverse().map(g => (
                          <div key={g.appid} onClick={() => selectBoardGame(g)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface3)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                            <img src={g.header_img} alt="" style={{ width: 42, height: 24, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <button onClick={() => setShowBoardSearch(true)} style={{ width: '100%', background: 'var(--surface2)', border: '1px dashed var(--border)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg viewBox="0 0 496 512" xmlns="http://www.w3.org/2000/svg" style={{ width: 12, height: 12, fill: 'var(--accent)', flexShrink: 0 }}><path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.7-76.3-239-180.4l95.2 39.3c6.4 32.1 34.9 56.4 68.9 56.4 38.2 0 69.1-31.1 68.9-69.3l84.5-60.2c52.1 1.3 95.8-40.9 95.8-93.5 0-51.6-42-93.5-93.7-93.5s-93.7 42-93.7 93.5v1.2L176.6 279c-15.5-.9-30.7 3.4-43.5 12.1L0 236.1C10.2 108.4 117.1 8 247.6 8 384.8 8 496 119 496 256z"/></svg>
                    {t('board.search_game')}
                  </button>
                )}
              </div>
            )}
            <input autoFocus={!showBoardSearch} value={newBoardName} onChange={e => setNewBoardName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createBoard()} placeholder={t('board.new_placeholder')}
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 12, outline: 'none' }} />
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={createBoard} style={{ flex: 1, background: 'var(--accent)', border: 'none', borderRadius: 5, padding: '5px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{t('board.create_btn')}</button>
              <button onClick={resetNewBoard} style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 5, padding: '5px', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>{t('common.cancel')}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowNewBoard(true)} style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: 7, padding: '9px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{t('board.new')}</button>
        )}
      </div>

      {/* User footer */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 5 }}>
        {currentUser.steamAvatar ? (
          <img src={currentUser.steamAvatar} alt="" style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid var(--border)', flexShrink: 0, cursor: 'pointer' }} onClick={() => setShowProfile(true)} title={t('nav.my_profile')} />
        ) : (
          <div style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--surface3)', border: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }} onClick={() => setShowProfile(true)} title={t('nav.my_profile')}>
            👤
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser.steamPersonaName || currentUser.username}
          </div>
          {currentUser.role === 'admin' && <div style={{ fontSize: 9, color: '#f5a500', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>admin</div>}
        </div>
        <button onClick={() => setShowProfile(true)} title={t('nav.my_profile')} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 5, height: 24, padding: '0 7px', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', flexShrink: 0, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>{t('nav.profile')}</button>
        {currentUser.role === 'admin' && (
          <button onClick={() => setShowAdmin(true)} title={t('nav.admin_panel')} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 5, height: 24, padding: '0 7px', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>⚙️</button>
        )}
        <button onClick={() => setShowAppInfo(true)} title={t('nav.info')} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 5, height: 24, padding: '0 7px', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </button>
        <button onClick={handleLogout} title={t('nav.logout')} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 5, height: 24, padding: '0 7px', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
            <line x1="12" y1="2" x2="12" y2="12"/>
          </svg>
        </button>
      </div>
    </>
  );

  // ── Mobile layout ─────────────────────────────────────────────────────────

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {showDrawer && (
          <>
            <div onClick={() => setShowDrawer(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200 }} />
            <aside style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 288, background: '#111', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', zIndex: 201, boxShadow: '4px 0 24px rgba(0,0,0,.5)' }}>
              {sidebarContent}
            </aside>
          </>
        )}
        {/* zoom (pas transform:scale) : même technique que zoom.js pour l'échelle
            globale de l'app — zoom agrandit réellement la boîte dans le flux
            (donc la hauteur du header grandit d'elle-même, tous les boutons
            avec) et ne crée pas de containing block pour les éléments
            position:fixed (le footer plus bas resterait ancré à l'écran avec
            transform:scale, ce qui n'est pas le cas ici). Cible précisément le
            mode PWA installée (isPWA), pas juste un écran étroit — un onglet
            mobile classique garde la taille normale, seule l'app installée
            (où les zones de tap sont sinon trop petites au doigt) est agrandie. */}
        <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, zoom: isPWA ? 1.2 : 1 }}>
          <button onClick={() => setShowDrawer(true)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>☰</button>
          {publicBoardMode ? (
            <>
              <BoardIcon img={publicBoardMode.headerImg || publicBoardMode.gameIcon} emoji={publicBoardMode.emoji} size={30} maxWidth={100} fontSize={20} />
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{publicBoardMode.name}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#3db86a', border: '2px solid #3db86a', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>{t('common.public')}</span>
              <button onClick={toggleCompact} title={t('nav.compact')} style={{ background: compactView ? 'rgba(192,87,10,0.15)' : 'rgba(255,255,255,.06)', border: compactView ? '1px solid var(--accent)' : '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: compactView ? 'var(--accent)' : 'var(--text-muted)', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>⊟</button>
              {archiveCount > 0 && (
                <button
                  onClick={toggleShowArchived}
                  title={showArchived ? t('nav.hide_archives') : t('nav.show_archives')}
                  style={{ background: showArchived ? 'rgba(120,80,160,0.25)' : 'rgba(255,255,255,.06)', border: showArchived ? '1px solid rgba(160,100,220,0.6)' : '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: showArchived ? '#c090f0' : 'var(--text-muted)', fontSize: 11, cursor: 'pointer', flexShrink: 0, fontWeight: showArchived ? 700 : 400 }}
                >📦 {archiveCount}</button>
              )}
              <button onClick={refreshPublicBoard} title={t('nav.refresh')} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}>↻</button>
              {isOwnPublicBoard && (
                <button onClick={() => setShowAccessModal(true)} title={t('access.title')} style={{ background: 'rgba(255,255,255,.08)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}>🔐</button>
              )}
            </>
          ) : showHome ? (
            <>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', flex: 1 }}>Tableau de Board</span>
              <button onClick={toggleCompact} title={t('nav.compact')} style={{ background: compactView ? 'rgba(192,87,10,0.15)' : 'rgba(255,255,255,.06)', border: compactView ? '1px solid var(--accent)' : '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: compactView ? 'var(--accent)' : 'var(--text-muted)', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>⊟</button>
              <button
                onClick={() => { fetchBoards(); fetchFavorites(); fetchPersonalFavorites(); fetch(`${API}/public/boards`, { headers: authHeaders(token) }).then(r => r.ok ? r.json() : []).then(setHomePublicBoards).catch(() => {}); }}
                title="Rafraîchir"
                style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}
              >↻</button>
            </>
          ) : (
            <>
              {activeBoard && <BoardIcon img={activeBoardHeaderImg || activeBoard.gameIcon} emoji={activeBoard.emoji} size={30} maxWidth={100} fontSize={16} />}
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeBoard?.name || 'KangBanGaming'}</span>
              {activeBoard && (
                <span style={{ fontSize: 10, fontWeight: 700, color: activeBoard.public ? '#3db86a' : '#f5a500', border: `2px solid ${activeBoard.public ? '#3db86a' : '#f5a500'}`, borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>
                  {activeBoard.public ? t('common.public') : t('common.private')}
                </span>
              )}
              <button onClick={toggleCompact} title={t('nav.compact')} style={{ background: compactView ? 'rgba(192,87,10,0.15)' : 'rgba(255,255,255,.06)', border: compactView ? '1px solid var(--accent)' : '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: compactView ? 'var(--accent)' : 'var(--text-muted)', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>⊟</button>
              {activeBoardId && archiveCount > 0 && (
                <button
                  onClick={toggleShowArchived}
                  title={showArchived ? t('nav.hide_archives') : t('nav.show_archives')}
                  style={{ background: showArchived ? 'rgba(120,80,160,0.25)' : 'rgba(255,255,255,.06)', border: showArchived ? '1px solid rgba(160,100,220,0.6)' : '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: showArchived ? '#c090f0' : 'var(--text-muted)', fontSize: 11, cursor: 'pointer', flexShrink: 0, fontWeight: showArchived ? 700 : 400 }}
                >📦 {archiveCount}</button>
              )}
            </>
          )}
          {/* Filtre + Loupe — mêmes composants et même logique de bascule que sur
              desktop (voir plus bas, header desktop) : absents jusqu'ici du header
              mobile, alors que MobileBoard/MobileHomeSlider savent déjà appliquer
              filterText — il manquait uniquement le bouton pour le renseigner.
              Placés en dernier dans la ligne d'icônes : le titre juste avant
              (troncature "…" déjà en place) absorbe le rétrécissement sur petit
              écran plutôt que de pousser ces boutons hors champ. */}
          {showHome && !publicBoardMode ? (
            <FilterField value={homeFilterText} onChange={setHomeFilterText} title={t('filter.title')} placeholder={t('filter.placeholder')} />
          ) : (activeBoardId || publicBoardMode) ? (
            <FilterField value={cardFilterText} onChange={setCardFilterText} title={t('filter.title')} placeholder={t('filter.placeholder')} />
          ) : null}
          <GlobalSearch token={token} onGoToBoard={handleSearchGoToBoard} onOpenGame={handleSearchOpenGame} />
        </header>
        {showHome && !publicBoardMode ? (
          mobileHomeView
        ) : publicBoardMode ? (
          <MobileBoard columns={columns} byColumn={byColumn} onCardClick={g => { setSelectedGameDefaultTab('infos'); setSelectedGame(g); }} onArchiveGame={archiveGame} onUnarchiveGame={unarchiveGame} onDeleteGame={removeGame} onEditGame={setEditingGame} isTaskBoard={isTaskBoard} onToggleDone={(appid, done) => patchGame(appid, { done })} onToggleUrgent={(appid, urgent) => patchGame(appid, { urgent })} onUpdateAssignees={(appid, assignees) => patchGame(appid, { assignees })} onClickNotes={handleCardNotesClick} genreColors={boardGenreColors} hiddenCardIds={new Set()} showHiddenCards={false} onHideCard={undefined} onUnhideCard={undefined} compact={compactView} moveGame={moveGame} onReorderGames={reorderGamesInColumn} onAddToColumn={colId => { setSearchTargetCol(colId); setShowSearch(true); }} filterText={cardFilterText} />
        ) : !activeBoardId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Crée un board pour commencer</div>
        ) : (
          <MobileBoard columns={columns} byColumn={byColumn} onCardClick={g => { setSelectedGameDefaultTab('infos'); setSelectedGame(g); }} onArchiveGame={archiveGame} onUnarchiveGame={unarchiveGame} onDeleteGame={removeGame} onEditGame={setEditingGame} isTaskBoard={isTaskBoard} onToggleDone={(appid, done) => patchGame(appid, { done })} onToggleUrgent={(appid, urgent) => patchGame(appid, { urgent })} onUpdateAssignees={(appid, assignees) => patchGame(appid, { assignees })} onClickNotes={handleCardNotesClick} genreColors={boardGenreColors} hiddenCardIds={new Set()} showHiddenCards={false} onHideCard={undefined} onUnhideCard={undefined} compact={compactView} moveGame={moveGame} onReorderGames={reorderGamesInColumn} onAddToColumn={colId => { setSearchTargetCol(colId); setShowSearch(true); }} filterText={cardFilterText} />
        )}
        {(activeBoardId || publicBoardMode) && (
          <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '8px 12px', display: 'flex', gap: 8, flexShrink: 0 }}>
            {canEditPublicBoard ? (
              <button onClick={addColumn} style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px', color: 'var(--text-muted)', fontSize: 12 }}>+ Colonne</button>
            ) : (
              <span style={{ flex: 1, textAlign: 'center', padding: '8px', color: '#d99a3d', fontSize: 11, fontWeight: 700 }}>{t('access.readonly_badge')}</span>
            )}
            {archiveCount > 0 && (
              <button
                onClick={toggleShowArchived}
                style={{
                  background: showArchived ? 'rgba(120,80,160,0.25)' : 'var(--surface2)',
                  border: showArchived ? '1px solid rgba(160,100,220,0.6)' : '1px solid var(--border)',
                  borderRadius: 6, padding: '8px 12px', color: showArchived ? '#c090f0' : 'var(--text-muted)',
                  fontSize: 11, cursor: 'pointer', fontWeight: showArchived ? 700 : 400, flexShrink: 0,
                }}
              >
                📦 {archiveCount}
              </button>
            )}
          </div>
        )}
        <footer style={{ position: 'fixed', bottom: 0, right: 0, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, color: 'var(--text-muted)' }}><span>by Oweebee</span><a href={discordConfig.discordUrl || DISCORD_FALLBACK_URL} target="_blank" rel="noreferrer" style={{ color: '#7289da', textDecoration: 'none', fontSize: 9 }}>Discord</a><a href="https://github.com/oweebee/kangbangaming" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 9 }}>GitHub</a></footer>
        {showSearch && <SearchModal api={API} token={token} boardGames={games} onAdd={g => addGame(g, searchTargetCol)} onRemove={removeGame} onClose={() => { setShowSearch(false); setSearchTargetCol(null); }} customOnly={isTaskBoard} isTaskBoard={isTaskBoard} appUsers={appUsers} currentUser={currentUser} />}
        {editingGame && <SearchModal api={API} token={token} boardGames={games} onAdd={addGame} onRemove={removeGame} onClose={() => setEditingGame(null)} customOnly={isTaskBoard} isTaskBoard={isTaskBoard} appUsers={appUsers} currentUser={currentUser} initialGame={editingGame} onSave={async g => { await updateGame(g); setEditingGame(null); }} />}
        {displayedGame && displayedGame.type === 'custom'
          ? <TaskModal game={displayedGame} appUsers={appUsers} onPatchGame={patchGame} onSoftDeleteNote={softDeleteNote} onClose={() => { setSelectedGame(null); setSelectedGameDefaultTab('infos'); }} onEdit={() => { setEditingGame(displayedGame); setSelectedGame(null); setSelectedGameDefaultTab('infos'); }} isTaskBoard={isTaskBoard} token={token} defaultTab={selectedGameDefaultTab} currentUser={currentUser} />
          : displayedGame && <GameModal game={displayedGame} onClose={() => { setSelectedGame(null); setSelectedGameDefaultTab('infos'); }} api={API} token={token} onPatchGame={patchGame} onSoftDeleteNote={softDeleteNote} defaultTab={selectedGameDefaultTab === 'notes' ? 'notes' : 'info'} currentUser={currentUser} appUsers={appUsers} />
        }
        {showAdmin && <AdminPanel token={token} currentUser={currentUser} onClose={() => setShowAdmin(false)} />}
        {showAccessModal && isOwnPublicBoard && publicBoardMode && <BoardAccessModal token={token} boardId={publicBoardMode.id} boardName={publicBoardMode.name} onClose={() => setShowAccessModal(false)} onTransferred={handleBoardTransferred} />}


        {showAppInfo && <AppInfoModal onClose={() => setShowAppInfo(false)} />}
        {showProfile && <ProfilePage token={token} currentUser={currentUser} onClose={() => setShowProfile(false)} onSaveSteam={handleSteamSave} />}
        {(publicBoardMode?.gameIcon || activeBoard?.gameIcon) && <NowPlayingBanner gameIconUrl={publicBoardMode?.gameIcon || activeBoard?.gameIcon} token={token} />}
      </div>
    );
  }

  // ── Desktop layout ────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar — z-index 22 so it appears above the GameInfoPanel (z-index 20) */}
      <aside style={{ width: 283, background: '#111', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'relative', zIndex: 22 }}>
        {sidebarContent}
      </aside>
      {/* GameInfoPanel — pulls from behind sidebar, tab always visible */}
      {isTaskBoard && !isMobile && (
        <GameInfoPanel
          api={API}
          token={token}
          gameInfo={gameInfo}
          board={publicBoardMode || activeBoard}
          appId={activeSteamAppIdForFetch}
          locked={infoPanelLocked}
          onLockChange={setInfoPanelLocked}
          side={infoPanelSide}
          onSideChange={setInfoPanelSide}
          sidebarWidth={283}
          topOffset={headerHeight}
        />
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* position:relative + zIndex:24 so header appears above the GameInfoPanel (z-index 20) */}
        <header ref={headerRef} style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, position: 'relative', zIndex: 24 }}>
          {publicBoardMode ? (
            <>
              {/* Board icon — clickable if Steam game, same as personal board ; repli emoji auto si image cassée */}
              <BoardIcon img={publicBoardMode.headerImg || publicBoardMode.gameIcon} emoji={publicBoardMode.emoji} />
              {/* Board name — big, same as personal board */}
              <span style={{ fontWeight: 700, fontSize: 24, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flexShrink: 1 }}>{publicBoardMode.name}</span>
              {/* "Board Public" badge — same style as Public badge on personal boards */}
              <span style={{ fontSize: 11, fontWeight: 700, color: '#3db86a', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, border: '2px solid #3db86a', borderRadius: 5, padding: '2px 7px' }}>
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10" cy="7" r="4"/><path d="M4 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M15 3.13a4 4 0 0 1 0 7.75"/><path d="M20 21v-2a4 4 0 0 0-3-3.85"/>
                </svg> Public
              </span>
              {canEditPublicBoard && (
                <button onClick={addColumn} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>{t('board.add_col')}</button>
              )}
              {publicBoardMode && !canEditPublicBoard && (
                <span title={t('access.readonly_alert')} style={{ fontSize: 11, fontWeight: 700, color: '#d99a3d', border: '1px solid rgba(217,154,61,0.5)', borderRadius: 5, padding: '3px 8px', flexShrink: 0 }}>{t('access.readonly_badge')}</span>
              )}
              <button onClick={toggleCompact} style={{ background: compactView ? 'rgba(192,87,10,0.15)' : 'var(--surface2)', border: compactView ? '1px solid var(--accent)' : '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', color: compactView ? 'var(--accent)' : 'var(--text-muted)', fontSize: 12, cursor: 'pointer', flexShrink: 0, fontWeight: compactView ? 700 : 400 }}>{t('nav.compact')}</button>
              {archiveCount > 0 && (
                <button
                  onClick={toggleShowArchived}
                  style={{
                    background: showArchived ? 'rgba(120,80,160,0.25)' : 'var(--surface2)',
                    border: showArchived ? '1px solid rgba(160,100,220,0.6)' : '1px solid var(--border)',
                    borderRadius: 6, padding: '6px 12px', color: showArchived ? '#c090f0' : 'var(--text-muted)',
                    fontSize: 12, cursor: 'pointer', flexShrink: 0, fontWeight: showArchived ? 700 : 400,
                  }}
                  title={showArchived ? t('nav.hide_archives') : t('nav.show_archives')}
                >
                  {t('nav.archives')}{archiveCount > 0 ? ` (${archiveCount})` : ''}
                </button>
              )}
              <button onClick={refreshPublicBoard} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 11px', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ fontSize: 15, lineHeight: 1 }}>↻</span> {t('nav.refresh').replace('↻ ', '')}</button>
              {/* Encart infos Steam (joueurs, avis, prix, tags…) — visible uniquement si le board est lié à un jeu Steam ;
                  le composant gère lui-même son centrage (spacers internes) + son masquage si pas assez de place */}
              <SteamEncart gameInfo={gameInfo} />
              <input type="search" placeholder={t('nav.filter_ph')} value={search} onChange={e => setSearch(e.target.value)}
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--text)', fontSize: 12, outline: 'none', maxWidth: 180 }} />
              {isOwnPublicBoard && (
                <button onClick={() => setShowAccessModal(true)} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>🔐 {t('access.title')}</button>
              )}
            </>
          ) : showHome ? (
            <>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Tableau de Board</span>
              {/* Compact à gauche, collé au titre — même position que sur les boards (cohérence) */}
              <button onClick={toggleCompact} style={{ background: compactView ? 'rgba(192,87,10,0.15)' : 'var(--surface2)', border: compactView ? '1px solid var(--accent)' : '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', color: compactView ? 'var(--accent)' : 'var(--text-muted)', fontSize: 12, cursor: 'pointer', flexShrink: 0, fontWeight: compactView ? 700 : 400 }}>{t('nav.compact')}</button>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => { fetchBoards(); fetchFavorites(); fetchPersonalFavorites(); fetch(`${API}/public/boards`, { headers: authHeaders(token) }).then(r => r.ok ? r.json() : []).then(setHomePublicBoards).catch(() => {}); }}
                title="Rafraîchir"
                style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 11px', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}
              >↻</button>
            </>
          ) : (
            <>
              {/* Board icon — clickable if Steam game ; repli emoji auto si image cassée */}
              {activeBoard && <BoardIcon img={activeBoardHeaderImg || activeBoard.gameIcon} emoji={activeBoard.emoji} />}
              <button onClick={() => { setActiveBoardId(null); setShowHome(true); }} title="Accueil" style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 18, cursor: 'pointer', padding: '2px 5px', opacity: 0.75, fontWeight: 700 }}>←</button>
              {/* Board name — double-click to edit inline */}
              {editingBoardName ? (
                <input
                  autoFocus
                  value={boardNameInput}
                  onChange={e => setBoardNameInput(e.target.value)}
                  onBlur={saveBoardName}
                    onKeyDown={e => { if (e.key === 'Enter') saveBoardName(); if (e.key === 'Escape') setEditingBoardName(false); }}
                  style={{ fontWeight: 700, fontSize: 24, color: 'var(--text)', background: 'transparent', border: 'none', borderBottom: '2px solid var(--accent)', outline: 'none', minWidth: 0, flexShrink: 1, padding: '0 2px' }}
                />
              ) : (
                <span
                  onDoubleClick={() => { setBoardNameInput(activeBoard?.name || ''); setEditingBoardName(true); }}
                  title="Double-cliquer pour renommer"
                  style={{ fontWeight: 700, fontSize: 24, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flexShrink: 1, cursor: 'text', userSelect: 'none' }}
                >{activeBoard?.name || '—'}</span>
              )}
              {activeBoard && (
                <span
                  onClick={() => toggleBoardPublic(activeBoard.id, !activeBoard.public)}
                  title={activeBoard.public ? 'Public — cliquer pour rendre privé' : 'Privé — cliquer pour rendre public'}
                  style={{ fontSize: 11, fontWeight: 700, color: activeBoard.public ? '#3db86a' : '#f5a500', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, border: `2px solid ${activeBoard.public ? '#3db86a' : '#f5a500'}`, borderRadius: 5, padding: '2px 7px' }}
                >
                  {activeBoard.public ? (
                    <><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="10" cy="7" r="4"/><path d="M4 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M15 3.13a4 4 0 0 1 0 7.75"/><path d="M20 21v-2a4 4 0 0 0-3-3.85"/>
                    </svg> Public</>
                  ) : '🔒 Privé'}
                </span>
              )}
              {(activeBoardId || publicBoardMode) && (
                <button onClick={addColumn} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>{t('board.add_col')}</button>
              )}
              {(activeBoardId || publicBoardMode) && (
                <button onClick={toggleCompact} style={{ background: compactView ? 'rgba(192,87,10,0.15)' : 'var(--surface2)', border: compactView ? '1px solid var(--accent)' : '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', color: compactView ? 'var(--accent)' : 'var(--text-muted)', fontSize: 12, cursor: 'pointer', flexShrink: 0, fontWeight: compactView ? 700 : 400 }}>{t('nav.compact')}</button>
              )}
              {(activeBoardId || publicBoardMode) && archiveCount > 0 && (
                <button
                  onClick={toggleShowArchived}
                  style={{
                    background: showArchived ? 'rgba(120,80,160,0.25)' : 'var(--surface2)',
                    border: showArchived ? '1px solid rgba(160,100,220,0.6)' : '1px solid var(--border)',
                    borderRadius: 6, padding: '5px 10px', color: showArchived ? '#c090f0' : 'var(--text-muted)',
                    fontSize: 11, cursor: 'pointer', flexShrink: 0, fontWeight: showArchived ? 700 : 400,
                  }}
                  title={showArchived ? t('nav.hide_archives') : t('nav.show_archives')}
                >
                  {t('nav.archives')}{archiveCount > 0 ? ` (${archiveCount})` : ''}
                </button>
              )}
              {activeBoardId && (
                <button onClick={() => { if (activeBoardId) fetchGames(activeBoardId); }} title={t('nav.refresh')} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 9px', color: 'var(--text-muted)', fontSize: 15, cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>↻</button>
              )}
              {/* Encart infos Steam (joueurs, avis, prix, tags…) — visible uniquement si le board est lié à un jeu Steam ;
                  le composant gère lui-même son centrage (spacers internes) + son masquage si pas assez de place.
                  Positionné après le bouton archives (et pas avant) pour rester cohérent avec l'ordre des boutons
                  côté board public. */}
              <SteamEncart gameInfo={gameInfo} />
            </>
          )}
          {/* Filtre — toujours positionné juste à gauche de la loupe, même comportement
              (clic pour déplier). Deux instances indépendantes du même composant :
              accueil (filtre global : boards + sidebar + news + jeux à venir + échéances)
              ou board ouvert (filtre local : cartes de ce board uniquement). */}
          {showHome && !publicBoardMode ? (
            <FilterField value={homeFilterText} onChange={setHomeFilterText} title={t('filter.title')} placeholder={t('filter.placeholder')} />
          ) : (activeBoardId || publicBoardMode) ? (
            <FilterField value={cardFilterText} onChange={setCardFilterText} title={t('filter.title')} placeholder={t('filter.placeholder')} />
          ) : null}
          {/* Search — always visible on every page */}
          <GlobalSearch token={token} onGoToBoard={handleSearchGoToBoard} onOpenGame={handleSearchOpenGame} />
        </header>
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {showHome && !publicBoardMode ? (
          homeView
        ) : publicBoardMode ? (
          loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Chargement...</div>
          ) : (
            <KanbanBoard columns={columns} byColumn={byColumn} dragging={dragging} setDragging={setDragging} moveGame={moveGame} onCardClick={g => { setSelectedGameDefaultTab('infos'); setSelectedGame(g); }} onArchiveGame={archiveGame} onUnarchiveGame={unarchiveGame} onDeleteGame={removeGame} onEditGame={setEditingGame} onRenameColumn={renameColumn} onDeleteColumn={deleteColumn} onSetEmoji={setColumnEmoji} onReorderColumns={reorderColumns} onAddToColumn={colId => { setSearchTargetCol(colId); setShowSearch(true); }} onReorderGames={reorderGamesInColumn} isTaskBoard={isTaskBoard} appUsers={appUsers} compactView={compactView} leftOffset={infoPanelLocked && infoPanelSide === 'left' ? GAME_INFO_PANEL_WIDTH : 0} rightOffset={infoPanelLocked && infoPanelSide === 'right' ? GAME_INFO_PANEL_WIDTH : 0} onToggleDone={(appid, done) => patchGame(appid, { done })} onToggleUrgent={(appid, urgent) => patchGame(appid, { urgent })} onUpdateAssignees={(appid, assignees) => patchGame(appid, { assignees })} onClickNotes={handleCardNotesClick} genreColors={boardGenreColors} hiddenCardIds={new Set()} showHiddenCards={false} onHideCard={undefined} onUnhideCard={undefined} filterText={cardFilterText} />
          )
        ) : !activeBoardId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Crée un board pour commencer</div>
        ) : loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Chargement...</div>
        ) : (
          <KanbanBoard columns={columns} byColumn={byColumn} dragging={dragging} setDragging={setDragging} moveGame={moveGame} onCardClick={g => { setSelectedGameDefaultTab('infos'); setSelectedGame(g); }} onArchiveGame={archiveGame} onUnarchiveGame={unarchiveGame} onDeleteGame={removeGame} onEditGame={setEditingGame} onRenameColumn={renameColumn} onDeleteColumn={deleteColumn} onSetEmoji={setColumnEmoji} onReorderColumns={reorderColumns} onAddToColumn={colId => { setSearchTargetCol(colId); setShowSearch(true); }} onReorderGames={reorderGamesInColumn} isTaskBoard={isTaskBoard} appUsers={appUsers} compactView={compactView} leftOffset={infoPanelLocked && infoPanelSide === 'left' ? GAME_INFO_PANEL_WIDTH : 0} rightOffset={infoPanelLocked && infoPanelSide === 'right' ? GAME_INFO_PANEL_WIDTH : 0} onToggleDone={(appid, done) => patchGame(appid, { done })} onToggleUrgent={(appid, urgent) => patchGame(appid, { urgent })} onUpdateAssignees={(appid, assignees) => patchGame(appid, { assignees })} onClickNotes={handleCardNotesClick} genreColors={boardGenreColors} hiddenCardIds={new Set()} showHiddenCards={false} onHideCard={undefined} onUnhideCard={undefined} filterText={cardFilterText} />
        )}
        </div>
      </div>
      <footer style={{ position: 'fixed', bottom: 0, right: 0, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--text-muted)' }}>
        <span>by Oweebee</span>
        <a href={discordConfig.discordUrl || DISCORD_FALLBACK_URL} target="_blank" rel="noreferrer" style={{ color: '#7289da', textDecoration: 'none' }}>Discord</a>
        <a href="https://github.com/oweebee/kangbangaming" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>GitHub</a>
      </footer>
      {showSearch && <SearchModal api={API} token={token} boardGames={games} onAdd={g => addGame(g, searchTargetCol)} onRemove={removeGame} onClose={() => { setShowSearch(false); setSearchTargetCol(null); }} customOnly={isTaskBoard} isTaskBoard={isTaskBoard} appUsers={appUsers} currentUser={currentUser} />}
      {editingGame && <SearchModal api={API} token={token} boardGames={games} onAdd={addGame} onRemove={removeGame} onClose={() => setEditingGame(null)} customOnly={isTaskBoard} isTaskBoard={isTaskBoard} appUsers={appUsers} currentUser={currentUser} initialGame={editingGame} onSave={async g => { await updateGame(g); setEditingGame(null); }} />}
      {displayedGame && displayedGame.type === 'custom'
        ? <TaskModal game={displayedGame} appUsers={appUsers} onPatchGame={patchGame} onClose={() => { setSelectedGame(null); setSelectedGameDefaultTab('infos'); }} onEdit={() => { setEditingGame(displayedGame); setSelectedGame(null); setSelectedGameDefaultTab('infos'); }} isTaskBoard={isTaskBoard} token={token} defaultTab={selectedGameDefaultTab} currentUser={currentUser} />
        : displayedGame && <GameModal game={displayedGame} onClose={() => { setSelectedGame(null); setSelectedGameDefaultTab('infos'); }} api={API} token={token} onPatchGame={patchGame} defaultTab={selectedGameDefaultTab === 'notes' ? 'notes' : 'info'} currentUser={currentUser} appUsers={appUsers} />
      }
      {showAdmin && <AdminPanel token={token} currentUser={currentUser} onClose={() => setShowAdmin(false)} />}
      {showAccessModal && isOwnPublicBoard && publicBoardMode && <BoardAccessModal token={token} boardId={publicBoardMode.id} boardName={publicBoardMode.name} onClose={() => setShowAccessModal(false)} />}
      {showAppInfo && <AppInfoModal onClose={() => setShowAppInfo(false)} />}
      {showProfile && <ProfilePage token={token} currentUser={currentUser} onClose={() => setShowProfile(false)} onSaveSteam={handleSteamSave} />}
      {activeBoard?.gameIcon && !showHome && <NowPlayingBanner gameIconUrl={activeBoard.gameIcon} token={token} />}
      {/* Game stats widget — shown only when viewing a Steam-based board */}
      {isTaskBoard && !showHome && !isMobile && (
        <GameStatsWidget
          api={API}
          token={token}
          board={publicBoardMode || activeBoard}
          rightOffset={infoPanelLocked && infoPanelSide === 'right' ? GAME_INFO_PANEL_WIDTH + 30 : 0}
        />
      )}
    </div>
  );
}
