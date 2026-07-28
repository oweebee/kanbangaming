/**
 * SteamEncart — bande horizontale d'infos Steam (joueurs en ligne, avis,
 * Metacritic, prix, genres, studio, date de sortie).
 * Utilisé dans les deux branches header (board personnel & board public).
 *
 * Le cartouche se centre automatiquement dans l'espace disponible entre le
 * contenu de gauche (icône/nom/boutons) et celui de droite (filtre/boutons,
 * recherche globale) grâce à un unique wrapper flex:1 (justifyContent:center).
 * Si l'espace dispo est trop petit pour l'afficher sans qu'il chevauche un
 * autre élément du header, il est automatiquement masqué.
 *
 * Mesure de la place disponible : header.scrollWidth ne marche PAS pour ça,
 * même en retirant temporairement le wrapper flex:1 du flux — scrollWidth
 * sature toujours à clientWidth dès qu'il n'y a pas de vrai débordement
 * (scrollWidth ne reflète que l'overflow, jamais le "sous-remplissage" d'un
 * conteneur). Comme le cas normal est justement "le reste du header ne
 * remplit pas toute la largeur" (c'est pour ça qu'il y a de la place pour le
 * cartouche), scrollWidth==clientWidth quasi systématiquement → espace dispo
 * calculé à 0 → cartouche masqué en permanence. (Bug réel constaté, pas
 * théorique : c'est exactement ce qui faisait que le cartouche restait
 * invisible malgré le retrait du wrapper.)
 * On mesure donc directement la largeur réellement utilisée par les AUTRES
 * enfants du header : on retire le wrapper du flux (display:none), le moteur
 * flex re-tasse alors automatiquement les enfants restants (ceux qui étaient
 * après le wrapper remontent combler le vide), puis on lit le bord droit du
 * dernier enfant visible — ça donne la largeur naturelle exacte (gaps inclus)
 * quel que soit l'espace dispo, sans dépendre de scrollWidth. Ce toggle est
 * fait de façon synchrone dans useLayoutEffect (avant le paint du navigateur)
 * donc invisible à l'écran.
 */
import { useState, useRef, useLayoutEffect } from 'react';
import { useLang } from '../i18n.js';

// Marge de sécurité (px) au-delà de la largeur naturelle du cartouche.
const FIT_SAFETY_MARGIN = 28;

export default function SteamEncart({ gameInfo }) {
  const { t } = useLang();
  const [fits, setFits]   = useState(true);
  const wrapperRef = useRef(null); // wrapper flex:1 toujours rendu — slot centré du cartouche
  const measureRef = useRef(null); // clone invisible hors-flux, donne la largeur naturelle du cartouche en continu

  useLayoutEffect(() => {
    if (!gameInfo) return; // rien à afficher/mesurer
    const wrapper   = wrapperRef.current;
    const header    = wrapper?.parentElement;
    const measureEl = measureRef.current;
    if (!wrapper || !header || !measureEl) return;

    function recompute() {
      const naturalWidth = measureEl.offsetWidth;
      // Retrait temporaire du wrapper (hors-flux) : les autres enfants du header
      // se re-tassent automatiquement (ceux après le wrapper remontent). On lit
      // alors le bord droit le plus à droite parmi les enfants visibles restants
      // pour obtenir la largeur naturelle exacte qu'ils occupent (gaps compris) —
      // scrollWidth ne convient pas ici (cf. commentaire en tête de fichier).
      const prevDisplay = wrapper.style.display;
      wrapper.style.display = 'none';
      const headerLeft = header.getBoundingClientRect().left;
      let usedWidth = 0;
      for (const child of header.children) {
        if (child === wrapper) continue;
        const r = child.getBoundingClientRect();
        if (r.width === 0) continue; // enfant vide/masqué, ignoré
        const right = r.right - headerLeft;
        if (right > usedWidth) usedWidth = right;
      }
      wrapper.style.display = prevDisplay;
      const available = header.clientWidth - usedWidth;
      setFits(available >= naturalWidth + FIT_SAFETY_MARGIN);
    }

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(header);
    return () => ro.disconnect();
  }, [gameInfo]);

  const showCartouche = !!gameInfo && fits;

  let cartouche = null;
  if (gameInfo) {
    const score = gameInfo.reviewScore ?? 0;
    const reviewColor = score >= 8 ? '#4cd882' : score >= 5 ? '#f5c518' : '#f87575';
    const reviewBg    = score >= 8 ? 'rgba(60,200,100,.1)' : score >= 5 ? 'rgba(245,197,24,.1)' : 'rgba(248,117,117,.1)';
    const reviewEmoji = score >= 8 ? '👍' : score >= 5 ? '😐' : '👎';

    cartouche = (
      <div style={{
        display: 'flex', alignItems: 'stretch',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10, overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        fontSize: 12, flexShrink: 0,
      }}>
        {/* Joueurs en ligne */}
        {gameInfo.playerCount !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3db86a', boxShadow: '0 0 6px #3db86a88', display: 'inline-block', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{gameInfo.playerCount.toLocaleString('fr-FR')}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', lineHeight: 1 }}>{t('ginfo.in_game')}</div>
            </div>
          </div>
        )}

        {/* Avis */}
        {gameInfo.reviewScoreDesc && (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: reviewBg, borderRight: (gameInfo.metacritic !== null || gameInfo.price) ? '1px solid rgba(255,255,255,0.08)' : undefined, cursor: 'pointer' }}
            onClick={() => window.open(`https://store.steampowered.com/app/${gameInfo.appid}/#app_reviews_hash`, '_blank')}
            title={t('ginfo.see_reviews')}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{reviewEmoji}</span>
            <div>
              <div style={{ fontWeight: 700, color: reviewColor, lineHeight: 1.2 }}>{gameInfo.reviewScoreDesc}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', lineHeight: 1 }}>
                {gameInfo.positivePercent !== null ? t('ginfo.positive_pct', { percent: gameInfo.positivePercent }) : ''}
                {gameInfo.totalReviews ? ` · ${gameInfo.totalReviews.toLocaleString('fr-FR')}` : ''}
              </div>
            </div>
          </div>
        )}

        {/* Metacritic */}
        {gameInfo.metacritic !== null && (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRight: gameInfo.price ? '1px solid rgba(255,255,255,0.08)' : undefined, cursor: gameInfo.metacriticUrl ? 'pointer' : 'default' }}
            onClick={() => gameInfo.metacriticUrl && window.open(gameInfo.metacriticUrl, '_blank')}
            title={gameInfo.metacriticUrl ? t('ginfo.see_metacritic') : undefined}
          >
            <div style={{ width: 26, height: 26, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: '#000', background: gameInfo.metacritic >= 75 ? '#6c3' : gameInfo.metacritic >= 50 ? '#fc3' : '#f00', flexShrink: 0 }}>
              {gameInfo.metacritic}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', lineHeight: 1.3 }}>Meta<br/>critic</div>
          </div>
        )}

        {/* Prix */}
        {gameInfo.price && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px' }}>
            {gameInfo.discount > 0 && (
              <span style={{ background: '#4c6b22', color: '#a4d007', fontWeight: 900, fontSize: 10, padding: '1px 4px', borderRadius: 3, flexShrink: 0 }}>
                -{gameInfo.discount}%
              </span>
            )}
            <div>
              {gameInfo.discount > 0 && gameInfo.priceInitial && (
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textDecoration: 'line-through', lineHeight: 1 }}>{gameInfo.priceInitial}</div>
              )}
              <div style={{ fontWeight: 700, color: gameInfo.discount > 0 ? '#a4d007' : '#fff', lineHeight: 1.2 }}>{gameInfo.price}</div>
            </div>
          </div>
        )}

        {/* Colonne droite : badges + studio/date */}
        {(gameInfo.genres?.length || gameInfo.multiplayerLabel || gameInfo.earlyAccess || gameInfo.comingSoon || gameInfo.developer || gameInfo.releaseDate) && (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, padding: '5px 11px', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
              {gameInfo.earlyAccess && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(220,50,50,0.18)', color: '#ff5555', border: '2px solid rgba(220,50,50,0.85)', whiteSpace: 'nowrap' }}>{t('ginfo.early_access')}</span>
              )}
              {gameInfo.comingSoon && !gameInfo.earlyAccess && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(245,197,24,0.12)', color: '#f5c518', border: '2px solid rgba(245,197,24,0.75)', whiteSpace: 'nowrap' }}>{t('ginfo.coming_soon')}</span>
              )}
              {gameInfo.multiplayerLabel && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(71,167,245,0.15)', color: '#47a7f5', border: '2px solid rgba(71,167,245,0.75)', whiteSpace: 'nowrap' }}>👥 {gameInfo.multiplayerLabel}</span>
              )}
              {(gameInfo.genres || []).map(g => (
                <span key={g} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: '2px solid rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>{g}</span>
              ))}
            </div>
            {(gameInfo.developer || gameInfo.releaseDate) && (
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {gameInfo.developer && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>🛠 {gameInfo.developer}</span>}
                {gameInfo.developer && gameInfo.releaseDate && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>·</span>}
                {gameInfo.releaseDate && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', whiteSpace: 'nowrap' }}>📅 {gameInfo.releaseDate}</span>}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Mesureur invisible — toujours présent hors-flux (position fixed) quand un gameInfo
          existe, permet de connaître la largeur naturelle du cartouche même quand il est
          actuellement masqué (sert à savoir s'il rentrerait à nouveau après un resize). */}
      {gameInfo && (
        <div ref={measureRef} style={{ position: 'fixed', top: -9999, left: -9999, visibility: 'hidden', pointerEvents: 'none', display: 'flex' }} aria-hidden="true">
          {cartouche}
        </div>
      )}
      {/* Wrapper flex:1 toujours rendu — slot centré du cartouche. Vide (juste un espace
          flexible), il reproduit le comportement d'origine quand gameInfo est absent. */}
      <div ref={wrapperRef} style={{ display: 'flex', flex: '1 1 0', minWidth: 0, justifyContent: 'center' }}>
        {showCartouche && cartouche}
      </div>
    </>
  );
}
