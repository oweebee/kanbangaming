import { useState, useEffect, useCallback, useRef } from 'react';
import { useLang } from '../i18n.js';
import { genreColor, playerTags, ReviewBadge, DaysBadge, WishlistDot, Tag } from './SteamUI.jsx';
import { daysUntil, formatDateShort, authHeaders, matchesFilter } from '../utils.js';

const API = '/api';

function formatDate(isoDate) {
  return formatDateShort(isoDate);
}

function FeaturedCard({ token, wishlist = new Set(), filterText = '' }) {
  const [items, setItems] = useState([]);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);
  const h = authHeaders(token);

  useEffect(() => {
    fetch(`${API}/steam/featured`, { headers: h })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length) setItems(data); })
      .catch(() => {});
  }, [token]);

  // Liste filtrée par nom — la rotation/les dots se basent sur cette liste,
  // pas sur `items` brute, pour rester cohérents avec le filtre actif.
  const visibleItems = items.filter(g => matchesFilter(g.name, filterText));

  useEffect(() => {
    if (visibleItems.length < 2) return;
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % visibleItems.length), 5000);
    return () => clearInterval(timerRef.current);
  }, [visibleItems.length]);

  // Filtre actif sans aucune correspondance : on masque la carte en silence
  // (carrousel d'un seul élément à la fois, pas de liste → pas de message "aucun résultat" ici).
  if (!visibleItems.length) return null;
  const game = visibleItems[idx % visibleItems.length];
  const gc = genreColor(game.genres);

  return (
    <div style={{ padding: '0 10px 0' }}>
      <a
        href={`https://store.steampowered.com/app/${game.appid}/`}
        target="_blank" rel="noreferrer"
        style={{
          display: 'block', textDecoration: 'none', overflow: 'hidden', borderRadius: 10,
          border: '2px solid transparent',
          background: `linear-gradient(var(--surface), var(--surface)) padding-box, linear-gradient(135deg, ${gc}, ${gc}55) border-box`,
          transition: 'background .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = `linear-gradient(var(--surface2), var(--surface2)) padding-box, linear-gradient(135deg, ${gc}, ${gc}55) border-box`}
        onMouseLeave={e => e.currentTarget.style.background = `linear-gradient(var(--surface), var(--surface)) padding-box, linear-gradient(135deg, ${gc}, ${gc}55) border-box`}
      >
        {/* Image bannière */}
        <div style={{ width: '100%', height: 124, overflow: 'hidden', position: 'relative', background: 'var(--surface2)' }}>
          <img src={game.headerImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.75) 100%)' }} />
          {/* Dots navigation */}
          {visibleItems.length > 1 && (
            <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 4 }}>
              {visibleItems.map((_, i) => (
                <div key={i} onClick={e => { e.preventDefault(); e.stopPropagation(); clearInterval(timerRef.current); setIdx(i); }}
                  style={{ width: i === idx ? 14 : 5, height: 5, borderRadius: 3, background: i === idx ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all .2s' }} />
              ))}
            </div>
          )}
          {wishlist.has(Number(game.appid)) && (
            <div style={{ position: 'absolute', top: 8, left: 8 }}><WishlistDot /></div>
          )}
          {/* Nom */}
          <div style={{ position: 'absolute', bottom: 9, left: 10, right: 50, fontSize: 13, fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {game.name}
          </div>
        </div>
        {/* Détails — hauteur fixe pour que la carte ne change pas de taille selon le jeu */}
        <div style={{ padding: '7px 11px 9px', height: 97, boxSizing: 'border-box', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
            {game.developers?.length > 0 && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                👤 {game.developers[0]}
              </div>
            )}
            <ReviewBadge score={game.reviewScore} desc={game.reviewScoreDesc} total={game.reviewTotal} />
          </div>
          {(game.genres?.length > 0 || playerTags(game.categories).length > 0) && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', overflow: 'hidden', marginBottom: 4 }}>
              {game.genres?.slice(0, 2).map(g => (
                <Tag key={g} color={gc} size={10}>{g}</Tag>
              ))}
              {playerTags(game.categories).slice(0, 2).map(pt => (
                <Tag key={pt} color="#66c0f4" size={10}>{pt}</Tag>
              ))}
            </div>
          )}
          {game.shortDescription && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {game.shortDescription}
            </div>
          )}
        </div>
      </a>
    </div>
  );
}


// Clé localStorage pour le filtre de genres — persiste entre les sessions/refresh
// (pas de date d'expiration : le user peut revenir dans plusieurs jours, son
// filtre reste tel quel jusqu'à ce qu'il le change lui-même).
const GENRE_FILTER_KEY = 'kbg_upcomingGenreFilter';

function loadGenreFilter() {
  try { return new Set(JSON.parse(localStorage.getItem(GENRE_FILTER_KEY) || '[]')); }
  catch { return new Set(); }
}

export default function UpcomingPanel({ token, filterText = '' }) {
  const { t } = useLang();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastFetch, setLastFetch] = useState(null);
  const [wishlist, setWishlist] = useState(new Set());
  const [genreFilter, setGenreFilter] = useState(loadGenreFilter);
  const [showGenreMenu, setShowGenreMenu] = useState(false);
  const genreMenuRef = useRef(null);

  const h = authHeaders(token);

  useEffect(() => {
    if (!showGenreMenu) return;
    const handler = e => { if (genreMenuRef.current && !genreMenuRef.current.contains(e.target)) setShowGenreMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showGenreMenu]);

  const toggleGenre = (g) => {
    setGenreFilter(prev => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g); else next.add(g);
      try { localStorage.setItem(GENRE_FILTER_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  };
  const resetGenreFilter = () => {
    setGenreFilter(new Set());
    try { localStorage.removeItem(GENRE_FILTER_KEY); } catch {}
  };

  const fetchUpcoming = useCallback(async (force = false) => {
    setLoading(true); setError('');
    try {
      const url = force ? `${API}/steam/upcoming?force=1` : `${API}/steam/upcoming`;
      const res = await fetch(url, { headers: h });
      if (!res.ok) throw new Error('Erreur API');
      const data = await res.json();
      setGames(data);
      setLastFetch(new Date());
    } catch (e) {
      setError(t('upcoming.load_error'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchUpcoming(); }, [fetchUpcoming]);

  useEffect(() => {
    fetch(`${API}/steam/wishlist`, { headers: h })
      .then(r => r.json())
      .then(ids => { if (Array.isArray(ids)) setWishlist(new Set(ids)); })
      .catch(() => {});
  }, [token]);

  // Genres disponibles pour le filtre — dérivés des jeux réellement chargés (pas
  // une liste figée : si Steam catégorise un jour un jeu en "Survival", il
  // apparaîtra tout seul ici), triés alphabétiquement. Casual / Free to Play /
  // Utilities exclus à la demande (pas des "styles de jeu" pertinents ici).
  const EXCLUDED_GENRES = new Set(['Casual', 'Free to Play', 'Utilities']);
  const availableGenres = [...new Set(games.flatMap(g => g.genres || []))]
    .filter(g => !EXCLUDED_GENRES.has(g))
    .sort((a, b) => a.localeCompare(b));

  // Solo / Coop ne sont pas des "genres" Steam mais des catégories de jeu
  // (game.categories, déjà récupérées côté backend) — traitées comme des
  // pseudo-genres à clé interne dans le même filtre, avec leur propre logique
  // de correspondance ci-dessous (matchesGenreFilter).
  const PSEUDO_SOLO = '__solo__';
  const PSEUDO_COOP = '__coop__';
  const matchesGenreFilter = (g) => {
    if (genreFilter.size === 0) return true;
    return [...genreFilter].some(sel => {
      if (sel === PSEUDO_SOLO) return (g.categories || []).includes('Single-player');
      if (sel === PSEUDO_COOP) return (g.categories || []).some(c => ['Co-op', 'Online Co-op', 'Local Co-op'].includes(c));
      return (g.genres || []).includes(sel);
    });
  };

  // Filtre nom du jeu (recherche globale accueil) + filtre genre/solo-coop
  // (persistant, choisi via le bouton filtre) — la section "à venir" affiche
  // visibleGames ; FeaturedCard se filtre lui-même en interne (nom seulement).
  const visibleGames = games
    .filter(g => matchesFilter(g.name, filterText))
    .filter(matchesGenreFilter);
  const noMatch = games.length > 0 && visibleGames.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Section : Populaires & Recommandés */}
      <div style={{ padding: '14px 14px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          {t('upcoming.popular')}
        </div>
      </div>

      {/* Featured */}
      <FeaturedCard token={token} wishlist={wishlist} filterText={filterText} />

      {/* Section : Sorties à venir */}
      <div style={{ padding: '14px 14px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {t('upcoming.releases')}
          {!loading && visibleGames.length > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface2)', borderRadius: 99, padding: '1px 6px', fontWeight: 600 }}>
              {visibleGames.length}
            </span>
          )}

          {/* Filtre par genre + refresh, groupés à droite */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', position: 'relative' }} ref={genreMenuRef}>
            <button
              onClick={() => setShowGenreMenu(v => !v)}
              title={t('upcoming.filter_genres')}
              style={{
                background: genreFilter.size > 0 ? 'rgba(102,192,244,0.16)' : 'none',
                border: genreFilter.size > 0 ? '1px solid rgba(102,192,244,0.5)' : '1px solid transparent',
                borderRadius: 5, color: genreFilter.size > 0 ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center', gap: 3,
                opacity: genreFilter.size > 0 ? 1 : 0.6,
              }}
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              {genreFilter.size > 0 && (
                <span style={{ fontSize: 9, fontWeight: 700 }}>{genreFilter.size}</span>
              )}
            </button>

            {showGenreMenu && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, zIndex: 50,
                marginTop: 6, width: 200,
                background: 'var(--surface2)', border: '2px solid var(--border)',
                borderRadius: 8, maxHeight: 260, overflowY: 'auto',
                boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
              }}>
                <div
                  onClick={resetGenreFilter}
                  style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, color: genreFilter.size === 0 ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface3)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  {t('upcoming.filter_reset')}
                </div>

                {/* Solo / Coop — pas des genres Steam mais des catégories de jeu
                    (game.categories), affichées à part avant la liste des genres. */}
                {[
                  { key: PSEUDO_SOLO, label: t('upcoming.filter_solo'), color: '#55b8e0' },
                  { key: PSEUDO_COOP, label: t('upcoming.filter_coop'), color: '#3db86a' },
                ].map(({ key, label, color }) => {
                  const active = genreFilter.has(key);
                  return (
                    <div key={key}
                      onClick={() => toggleGenre(key)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 12.5, color: active ? 'var(--text)' : 'var(--text-muted)', fontWeight: active ? 700 : 400 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface3)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <span style={{
                        width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                        border: `1.5px solid ${color}`, background: active ? color : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {active && <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </span>
                      {label}
                    </div>
                  );
                })}
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }} />

                {availableGenres.length === 0 && (
                  <div style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                    {t('upcoming.filter_none')}
                  </div>
                )}
                {availableGenres.map(g => {
                  const active = genreFilter.has(g);
                  const gc = genreColor([g]);
                  return (
                    <div key={g}
                      onClick={() => toggleGenre(g)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 12.5, color: active ? 'var(--text)' : 'var(--text-muted)', fontWeight: active ? 700 : 400 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface3)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <span style={{
                        width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                        border: `1.5px solid ${gc}`, background: active ? gc : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {active && <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </span>
                      {g}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => fetchUpcoming(true)}
              disabled={loading}
              title={t('upcoming.force_reload')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: loading ? 'default' : 'pointer', padding: 0, display: 'flex', alignItems: 'center', opacity: loading ? 0.4 : 0.6 }}
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}>
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 12px' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', opacity: 0.3 + i * 0.05 }}>
                <div style={{ width: 54, height: 36, borderRadius: 5, background: 'var(--surface2)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 10, background: 'var(--surface2)', borderRadius: 3, marginBottom: 5, width: '75%' }} />
                  <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 3, width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>😞</div>
            {error}
            <br />
            <button onClick={fetchUpcoming} style={{ marginTop: 10, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px', color: 'var(--text)', fontSize: 11, cursor: 'pointer' }}>
              {t('upcoming.retry')}
            </button>
          </div>
        )}

        {!loading && !error && games.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🎮</div>
            {t('upcoming.empty').split('\n').map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}
          </div>
        )}

        {!loading && !error && noMatch && (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔎</div>
            {t('filter.no_results')}
          </div>
        )}

        {!loading && !error && visibleGames.map((game, idx) => {
          const days = daysUntil(game.releaseDate);
          const isToday = days === 0;
          const isVeryClose = days <= 3 && !isToday;

          const gc = genreColor(game.genres);
          const borderStyle = {
            border: '2px solid transparent',
            borderRadius: 10,
            background: `linear-gradient(var(--surface), var(--surface)) padding-box, linear-gradient(135deg, ${gc}, ${gc}55) border-box`,
          };

          // Carte élargie (image + tags + description + bordure teintée au genre)
          // pour CHAQUE sortie, pas seulement celles du jour — c'est le rendu d'origine,
          // une liste compacte sans encadré avait été introduite par erreur.
          return (
            // margin (pas padding sur un wrapper) — même espacement vertical entre
            // cartes que le panneau News juste à côté (margin: '0 10px 8px') : un
            // wrapper à padding top+bottom doublait l'espace visuel entre 2 cartes.
            <a
              key={game.appid}
              href={`https://store.steampowered.com/app/${game.appid}/`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'block', margin: '0 10px 8px', textDecoration: 'none', overflow: 'hidden', ...borderStyle }}
              onMouseEnter={e => e.currentTarget.style.background = `linear-gradient(${isToday ? 'rgba(30,120,50,0.1)' : 'var(--surface2)'}, ${isToday ? 'rgba(30,120,50,0.1)' : 'var(--surface2)'}) padding-box, linear-gradient(135deg, ${gc}, ${gc}55) border-box`}
              onMouseLeave={e => e.currentTarget.style.background = `linear-gradient(var(--surface), var(--surface)) padding-box, linear-gradient(135deg, ${gc}, ${gc}55) border-box`}
            >
                {/* Bannière image */}
                <div style={{ width: '100%', height: 90, overflow: 'hidden', position: 'relative', background: 'var(--surface2)' }}>
                  <img src={game.headerImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} onError={e => { e.target.style.display = 'none'; }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7) 100%)' }} />
                  {/* Badge jours (ou "Aujourd'hui !" quand days === 0) */}
                  <div style={{ position: 'absolute', top: 7, right: 8 }}>
                    <DaysBadge days={days} />
                  </div>
                  {game.type === 'dlc' && (
                    <div style={{ position: 'absolute', top: 7, left: 8 }}>
                      <Tag color="#d0b0ff" size={8} style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>DLC</Tag>
                    </div>
                  )}
                  {wishlist.has(Number(game.appid)) && (
                    <div style={{ position: 'absolute', top: 8, left: 8 }}><WishlistDot /></div>
                  )}
                  {/* Nom par-dessus l'image */}
                  <div style={{ position: 'absolute', bottom: 7, left: 10, right: 10, fontSize: 12, fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {game.name}
                  </div>
                </div>
                {/* Détails */}
                <div style={{ padding: '7px 12px 9px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                    {game.developers?.length > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        👤 {game.developers[0]}
                      </div>
                    )}
                    <ReviewBadge score={game.reviewScore} desc={game.reviewScoreDesc} total={game.reviewTotal} />
                  </div>
                  {(game.genres?.length > 0 || playerTags(game.categories).length > 0) && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 5 }}>
                      {game.genres?.map(g => (
                        <Tag key={g} color={gc} size={10}>{g}</Tag>
                      ))}
                      {playerTags(game.categories).map(pt => (
                        <Tag key={pt} color="#66c0f4" size={10}>{pt}</Tag>
                      ))}
                    </div>
                  )}
                  {game.shortDescription && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {game.shortDescription}
                    </div>
                  )}
                </div>
              </a>
          );
        })}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes wishlistPulse {
          0%, 100% { box-shadow: 0 0 6px rgba(245,197,24,0.3); opacity: 1; }
          50% { box-shadow: 0 0 14px rgba(245,197,24,0.7); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
