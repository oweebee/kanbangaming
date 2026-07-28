import { useState, useEffect, useCallback, useRef } from 'react';
import { useLang } from '../i18n.js';
import { authHeaders, formatDateShort, matchesFilter } from '../utils.js';
import { genreColor, isSteamAccessBlocked, SteamAccessNotice, SteamGlyph, Tag } from './SteamUI.jsx';

const API = '/api';
const PAGE_SIZE = 20;
const SCROLL_THRESHOLD = 120; // px avant le bas pour déclencher le chargement suivant

export default function LibraryNewsPanel({ token, personaName, currentUser, filterText = '' }) {
  const { t } = useLang();
  const steamBlocked = isSteamAccessBlocked(currentUser);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [noSteam, setNoSteam] = useState(false);
  const itemsLenRef = useRef(0);
  itemsLenRef.current = items.length;

  const h = authHeaders(token);

  const fetchPage = useCallback(async (offset, force = false) => {
    const url = `${API}/steam/library/news?offset=${offset}&limit=${PAGE_SIZE}${force ? '&force=1' : ''}`;
    const res = await fetch(url, { headers: h });
    if (res.status === 400) { setNoSteam(true); return { items: [], hasMore: false }; }
    if (!res.ok) throw new Error('Erreur API');
    return res.json();
  }, [token]);

  const loadInitial = useCallback(async (force = false) => {
    setLoading(true); setError(''); setNoSteam(false);
    try {
      const data = await fetchPage(0, force);
      setItems(data.items || []);
      setHasMore(!!data.hasMore);
    } catch (e) {
      setError(t('libnews.load_error'));
    } finally {
      setLoading(false);
    }
  }, [fetchPage, t]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  // Charge le lot suivant uniquement quand on scrolle au-delà des éléments déjà
  // chargés — rien n'est régénéré ni re-fetché pour le contenu non affiché.
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchPage(itemsLenRef.current);
      setItems(prev => [...prev, ...(data.items || [])]);
      setHasMore(!!data.hasMore);
    } catch {
      // silencieux : nouvelle tentative au prochain scroll
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore, loadingMore]);

  const onScroll = e => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD) loadMore();
  };

  // Filtre nom du jeu OU titre de la news — match sur l'un des deux suffit.
  const visibleItems = items.filter(item => matchesFilter(item.gameName, filterText) || matchesFilter(item.title, filterText));
  const noMatch = items.length > 0 && visibleItems.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Section : News Bibliothèque */}
      <div style={{ padding: '14px 14px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h12v12H4z"/><path d="M16 8h4v10a2 2 0 0 1-2 2H6"/><line x1="7" y1="7" x2="13" y2="7"/><line x1="7" y1="10" x2="13" y2="10"/><line x1="7" y1="13" x2="10" y2="13"/>
          </svg>
          {personaName ? t('libnews.header_named', { name: personaName }) : t('libnews.header')}
          {!loading && !noSteam && items.length > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface2)', borderRadius: 99, padding: '1px 6px', fontWeight: 600 }}>
              {visibleItems.length}
            </span>
          )}
          {!noSteam && (
            <button
              onClick={() => loadInitial(true)}
              disabled={loading}
              title={t('libnews.force_reload')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: loading ? 'default' : 'pointer', padding: 0, display: 'flex', alignItems: 'center', opacity: loading ? 0.4 : 0.6, marginLeft: 'auto' }}
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}>
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div onScroll={onScroll} style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 10px' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', opacity: 0.3 + i * 0.05 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ width: 55, height: 35, borderRadius: 4, background: 'var(--surface2)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 3, marginBottom: 5, width: '35%' }} />
                    <div style={{ height: 10, background: 'var(--surface2)', borderRadius: 3, width: '75%' }} />
                  </div>
                </div>
                <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 3, width: '90%' }} />
              </div>
            ))}
          </div>
        )}

        {!loading && noSteam && (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔗</div>
            {t('libnews.no_steam')}
          </div>
        )}

        {!loading && !noSteam && error && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>😞</div>
            {error}
            <br />
            <button onClick={() => loadInitial(false)} style={{ marginTop: 10, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px', color: 'var(--text)', fontSize: 11, cursor: 'pointer' }}>
              {t('libnews.retry')}
            </button>
          </div>
        )}

        {!loading && !noSteam && !error && items.length === 0 && steamBlocked && (
          <SteamAccessNotice />
        )}

        {!loading && !noSteam && !error && items.length === 0 && !steamBlocked && (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📰</div>
            {t('libnews.empty')}
          </div>
        )}

        {!loading && !noSteam && !error && noMatch && (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔎</div>
            {t('filter.no_results')}
          </div>
        )}

        {!loading && !noSteam && !error && visibleItems.map(item => {
          // Couleur de bordure selon le genre du jeu — même logique/fonction
          // partagée que les cartes de "Sorties à venir" (SteamUI.jsx).
          const gc = genreColor(item.genres);
          const cardBg = `linear-gradient(var(--surface), var(--surface)) padding-box, linear-gradient(135deg, ${gc}, ${gc}55) border-box`;
          const cardBgHover = `linear-gradient(var(--surface2), var(--surface2)) padding-box, linear-gradient(135deg, ${gc}, ${gc}55) border-box`;
          return (
            <a
              key={`${item.appid}-${item.gid}`}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'block',
                margin: '0 10px 8px',
                padding: '8px 10px',
                borderRadius: 8,
                border: '2px solid transparent',
                background: cardBg,
                textDecoration: 'none',
                transition: 'background .12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = cardBgHover}
              onMouseLeave={e => e.currentTarget.style.background = cardBg}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 55, height: 35, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: 'var(--surface2)' }}>
                  <img src={item.headerImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ flex: 1, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                      {item.gameName}
                    </span>
                    {/* Tag Bibliothèque (bleu Steam) / Wishlist (or) — même encadré/police que les
                        autres tags de l'app (Tag, SteamUI.jsx), icône Steam commune — aligné à droite */}
                    <Tag
                      color={item.inLibrary ? '#66c0f4' : '#f5c518'}
                      size={8}
                      icon={<SteamGlyph size={8} color={item.inLibrary ? '#66c0f4' : '#f5c518'} />}
                      style={{ marginLeft: 'auto', textTransform: 'uppercase', letterSpacing: '0.02em' }}
                    >
                      {item.inLibrary ? t('libnews.tag_library') : t('libnews.tag_wishlist')}
                    </Tag>
                  </div>
                  {/* Même taille que le titre des boards (HomeBoardCard, App.jsx) : fontSize 13 */}
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.3 }}>
                    {item.title}
                  </div>
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap', paddingTop: 1 }}>
                  {formatDateShort(new Date(item.date * 1000))}
                </div>
              </div>
              {item.summary && (
                // Même taille que le descriptif des cartes "Sorties à venir" (UpcomingPanel) : fontSize 11
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, marginTop: 5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.summary}
                </div>
              )}
            </a>
          );
        })}

        {loadingMore && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--text-muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: 'spin 1s linear infinite' }}>
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
