// ── Composants et utilitaires Steam partagés ──────────────────────────────────

import { useLang } from '../i18n.js';

export const GENRE_COLORS = {
  'Action': '#e05555', 'Action-Adventure': '#e07040', 'Adventure': '#55b8e0',
  'RPG': '#c090f0', 'Role-Playing Games (RPG)': '#c090f0',
  'Strategy': '#f5c518', 'Turn-Based Strategy': '#f5c518',
  'Simulation': '#3db86a', 'Sports': '#f0a030', 'Racing': '#f07030',
  'Puzzle': '#55e0d0', 'Horror': '#a03030', 'Casual': '#e878a0',
  'Indie': '#66c0f4', 'Free to Play': '#66c0f4', 'Massively Multiplayer': '#8060d0',
  'Early Access': '#f5a500', 'Violent': '#c03030', 'Gore': '#c03030',
  'Anime': '#e87890', 'Platformer': '#55d0a0',
};

export function genreColor(genres) {
  if (!genres?.length) return '#66c0f4';
  for (const g of genres) {
    if (GENRE_COLORS[g]) return GENRE_COLORS[g];
  }
  return '#66c0f4';
}

// Catégories Steam → label FR court
const CAT_FR = {
  'Single-player': 'Solo', 'Multi-player': 'Multi', 'Co-op': 'Co-op',
  'Online Co-op': 'Co-op en ligne', 'Local Co-op': 'Co-op local',
  'PvP': 'PvP', 'Online PvP': 'PvP en ligne', 'Local PvP': 'PvP local',
  'Cross-Platform Multiplayer': 'Multi multi-plateforme',
  'Shared/Split Screen Co-op': 'Écran partagé', 'Shared/Split Screen PvP': 'Écran partagé',
  'MMO': 'MMO',
};
const CAT_PRIORITY = ['Single-player', 'Multi-player', 'Co-op', 'Online Co-op', 'Local Co-op', 'PvP', 'Online PvP', 'MMO'];

export function playerTags(categories) {
  if (!categories?.length) return [];
  return CAT_PRIORITY.filter(c => categories.includes(c)).map(c => CAT_FR[c]).slice(0, 3);
}

const REVIEW_FR = {
  'Overwhelmingly Positive': 'Vraiment positif', 'Very Positive': 'Très positif',
  'Positive': 'Positif', 'Mostly Positive': 'Plutôt positif', 'Mixed': 'Mitigé',
  'Mostly Negative': 'Plutôt négatif', 'Negative': 'Négatif',
  'Very Negative': 'Très négatif', 'Overwhelmingly Negative': 'Extrêmement négatif',
};

export function ReviewBadge({ score, desc, total }) {
  if (!desc || !total) return null;
  const s = score ?? 0;
  const color = s >= 8 ? '#4cd882' : s >= 5 ? '#f5c518' : '#f87575';
  const fr = REVIEW_FR[desc] || desc;
  return (
    <span style={{ fontSize: 10, color, background: `${color}15`, border: `1px solid ${color}35`, borderRadius: 3, padding: '1px 6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
      ★ {fr}
    </span>
  );
}

export function DaysBadge({ days }) {
  let bg, color, label;
  if (days === 0)       { bg = 'rgba(30,120,50,0.25)';  color = '#4cd882';         label = "Aujourd'hui !"; }
  else if (days <= 3)   { bg = 'rgba(60,200,100,0.18)'; color = '#4cd882';         label = `Dans ${days}j`; }
  else if (days <= 7)   { bg = 'rgba(180,140,10,0.2)';  color = '#f5c518';         label = `Dans ${days}j`; }
  else if (days <= 14)  { bg = 'rgba(180,100,10,0.2)';  color = '#f0a030';         label = `Dans ${days}j`; }
  else                  { bg = 'rgba(100,100,100,0.18)'; color = 'var(--text-muted)'; label = `Dans ${days}j`; }
  return (
    <span style={{ background: bg, color, borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {label}
    </span>
  );
}

export function WishlistDot() {
  return (
    <span title="Dans ta wishlist Steam" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#f5c518', background: 'rgba(245,197,24,0.18)', border: '1px solid rgba(245,197,24,0.5)', borderRadius: 5, padding: '3px 8px', whiteSpace: 'nowrap', animation: 'wishlistPulse 2s ease-in-out infinite', boxShadow: '0 0 8px rgba(245,197,24,0.3)' }}>
      <svg viewBox="0 0 24 24" width="11" height="11" fill="#f5c518" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      Wishlist
    </span>
  );
}

// Icône glyph Steam (logo officiel) — réutilisable partout où l'on doit indiquer
// une provenance/donnée Steam (tag bibliothèque/wishlist news, badge "Steam Wishlist"...).
export function SteamGlyph({ size = 10, color = '#66c0f4', style }) {
  return (
    <svg viewBox="0 0 496 512" xmlns="http://www.w3.org/2000/svg" style={{ width: size, height: size, fill: color, flexShrink: 0, ...style }}>
      <path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.7-76.3-239-180.4l95.2 39.3c6.4 32.1 34.9 56.4 68.9 56.4 38.2 0 69.1-31.1 68.9-69.3l84.5-60.2c52.1 1.3 95.8-40.9 95.8-93.5 0-51.6-42-93.5-93.7-93.5s-93.7 42-93.7 93.5v1.2L176.6 279c-15.5-.9-30.7 3.4-43.5 12.1L0 236.1C10.2 108.4 117.1 8 247.6 8 384.8 8 496 119 496 256z"/>
    </svg>
  );
}

// Tag rectangulaire standard (bordure colorée, fond transparent, police bold) —
// même style que les badges Public/Privé (HomeBoardCard, AdminPanel). Réutilisé pour
// tous les petits tags de catégorie/genre/source (UpcomingPanel, LibraryNewsPanel...)
// afin que tous les tags de l'app partagent le même encadré et la même police.
export function Tag({ color = 'var(--accent)', size = 10, borderWidth = 1.5, icon, children, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: size, fontWeight: 700, color,
      border: `${borderWidth}px solid ${color}`, borderRadius: 4,
      padding: '1px 5px', whiteSpace: 'nowrap', flexShrink: 0,
      ...style,
    }}>
      {icon}
      {children}
    </span>
  );
}

// Calcule si un module dépendant de données Steam privées (bibliothèque, succès,
// wishlist) est bloqué : profil Steam non public ET pas de clé API personnelle.
// `user` = objet currentUser (ou équivalent /api/user/profile|/api/user/settings) —
// doit exposer hasSteamId (ou steamId), steamPublic, hasSteamApiKey.
export function isSteamAccessBlocked(user) {
  if (!user) return false;
  const hasSteamId = user.hasSteamId ?? !!user.steamId;
  if (!hasSteamId) return false; // pas encore lié à Steam → pas le même cas (cf. message "lier Steam")
  if (user.hasSteamApiKey) return false; // clé perso = toujours débloqué
  return user.steamPublic === false; // bloqué seulement si on SAIT que le profil est privé
}

// Notice brève réutilisable : pourquoi un module Steam reste vide + comment débloquer.
// compact=true → bandeau fin une ligne (à insérer au-dessus d'une liste qui contient
// déjà d'autres données non-Steam, ex. DeadlinePanel) plutôt qu'un état vide centré.
export function SteamAccessNotice({ icon = '🔒', style, compact = false }) {
  const { t } = useLang();
  if (compact) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, lineHeight: 1.5,
        color: 'var(--text-muted)', background: 'rgba(245,197,24,0.07)', border: '1px solid rgba(245,197,24,0.25)',
        borderRadius: 6, padding: '6px 9px', marginBottom: 10, ...style,
      }}>
        <span style={{ flexShrink: 0 }}>{icon}</span>
        <span>
          {t('steam.blocked_notice')}{' '}
          <a href="https://help.steampowered.com/fr/faqs/view/588C-C67D-0251-C276" target="_blank" rel="noreferrer" style={{ color: '#66c0f4' }}>{t('profile.steam_how')}</a>
          {' '}{t('steam.blocked_or')}{' '}
          <a href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noreferrer" style={{ color: '#66c0f4' }}>{t('profile.apikey_get_link')}</a>
        </span>
      </div>
    );
  }
  return (
    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6, ...style }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      {t('steam.blocked_notice')}{' '}
      <a href="https://help.steampowered.com/fr/faqs/view/588C-C67D-0251-C276" target="_blank" rel="noreferrer" style={{ color: '#66c0f4' }}>{t('profile.steam_how')}</a>
      {' '}{t('steam.blocked_or')}{' '}
      <a href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noreferrer" style={{ color: '#66c0f4' }}>{t('profile.apikey_get_link')}</a>
    </div>
  );
}
