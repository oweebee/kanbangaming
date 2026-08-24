// ── Utilitaires partagés ──────────────────────────────────────────────────────
import { getLang } from './i18n.js';

/**
 * Formatte un temps de jeu en minutes vers "Xh Ym" ou "X min".
 * @param {number|null} minutes
 * @param {string} [fallback] - texte si jamais joué (défaut : null)
 */
export function formatPlaytime(minutes, fallback = null) {
  if (!minutes || minutes === 0) return fallback;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Formatage de dates — locale alignée sur la langue active de l'app ─────────
// (et non sur la langue du navigateur/OS, qui peut différer du choix de l'user)
const LOCALE_BY_LANG = {
  fr: 'fr-FR', en: 'en-US', es: 'es-ES', de: 'de-DE', ru: 'ru-RU', zh: 'zh-CN',
};

function _appLocale() {
  return LOCALE_BY_LANG[getLang()] || 'fr-FR';
}

/**
 * Formate une date (ISO string, timestamp ou Date) en date courte, sans année.
 * ex (fr): "3 janv." — ex (en): "Jan 3"
 */
export function formatDateShort(input) {
  if (!input) return '';
  try {
    const d = input instanceof Date ? input : new Date(input);
    return d.toLocaleDateString(_appLocale(), { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

/**
 * Formate une date (ISO string, timestamp ou Date) en date courte avec année.
 * ex (fr): "3 janv. 2026" — ex (en): "Jan 3, 2026"
 */
export function formatDateLong(input) {
  if (!input) return '';
  try {
    const d = input instanceof Date ? input : new Date(input);
    return d.toLocaleDateString(_appLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

/**
 * Formate une date (ISO string, timestamp ou Date) en date complète avec jour de semaine.
 * ex (fr): "ven. 3 janvier 2026"
 */
export function formatDateFull(input) {
  if (!input) return '';
  try {
    const d = input instanceof Date ? input : new Date(input);
    return d.toLocaleDateString(_appLocale(), { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return ''; }
}

// ── Résolution de l'image "Steam" de repli d'un board ─────────────────────────
// Repli : si un board n'a pas sa propre image et contient EXACTEMENT une carte
// Steam exploitable, on affiche l'image de cette carte (board réellement "lié"
// à un seul jeu). Si plusieurs jeux différents sont présents (board perso/
// backlog), on ne montre rien (emoji affiché à la place). Logique partagée par
// App.jsx (board perso, board public, board actif).

/** Cartes "Steam" exploitables pour une image de board : non supprimées, pas custom, avec header_img. */
export function findSteamCardsWithImage(games) {
  return (games || []).filter(g => !g.deletedAt && g.type !== 'custom' && g.header_img);
}

/** Renvoie la carte Steam unique d'une liste de jeux, ou null si zéro ou plusieurs. */
export function resolveSingleSteamCardImg(games) {
  const cards = findSteamCardsWithImage(games);
  return cards.length === 1 ? cards[0] : null;
}

/**
 * Nombre de jours entre aujourd'hui et une date ISO.
 * Négatif = dans le passé.
 * On ignore volontairement l'heure/fuseau de la chaîne (ex: un ISO complet type
 * "2026-07-15T00:00:00.000Z") et on ne garde que le jour calendaire (YYYY-MM-DD),
 * reconstruit en LOCAL — même logique que parseD/parseLocalDate ailleurs dans
 * l'app. Sans ça, une date sérialisée en UTC pouvait retomber sur le jour
 * précédent selon le fuseau du serveur qui l'avait générée (ex : sorties Steam à
 * venir toutes affichées avec "-1j" au lieu du bon jour).
 */
export function daysUntil(isoDate) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const m = String(isoDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0)
    : (() => { const dd = new Date(isoDate); dd.setHours(0, 0, 0, 0); return dd; })();
  return Math.round((d - today) / 86400000);
}

/**
 * En-têtes HTTP standard pour les requêtes authentifiées vers l'API.
 * Utilisé par tous les fetch() de l'app (App.jsx + composants).
 */
export function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

/**
 * Convertit une couleur hex (#RGB ou #RRGGBB) en rgba() avec l'alpha demandé.
 * Retourne un gris neutre si l'entrée n'est pas un hex valide (fallback sûr,
 * n'arrive jamais en pratique mais évite un crash sur une donnée inattendue).
 * Partagé pour tout endroit qui a besoin d'un fond "teinté" à partir d'une
 * couleur de board/genre/type (ex: cartouche board perso dans les Échéances).
 */
export function hexToRgba(hex, alpha = 1) {
  if (!hex || typeof hex !== 'string') return `rgba(128,128,128,${alpha})`;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return `rgba(128,128,128,${alpha})`;
  const num = parseInt(h, 16);
  const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

// Ponctuation ignorée par matchesFilter (et son jumeau backend normalizeForFilter,
// server.js) : sigles pointés ("S.T.A.L.K.E.R." → "stalker"), apostrophes
// ("Marvel's Spider-Man" → "marvels spiderman"), tirets, guillemets… Les ESPACES
// ne sont volontairement PAS dans cette liste : "Dune Awakening" tapé sans les
// deux mots collés ne doit pas matcher "Dune: Awakening" comme un seul bloc — on
// veut de l'approximatif sur la PONCTUATION, pas une recherche floue générale qui
// remonterait trop de bruit.
const FILTER_PUNCT_RE = /[.,:;'’‘`"“”«»_()[\]{}!?-]/g;

/**
 * Test de correspondance pour le champ Filtre (FilterField.jsx) — insensible à la
 * casse, aux accents (ex: "zelda" matche "Zeldä") et à la ponctuation (ex:
 * "stalker" matche "S.T.A.L.K.E.R."). Une chaîne de filtre vide ou blanche ne
 * filtre rien (tout correspond). Partagé par toute l'app (accueil, sidebar,
 * boards, news, jeux à venir) pour garantir un comportement identique partout
 * sans dupliquer la logique.
 * IMPORTANT : tenu identique à normalizeForFilter() dans backend/src/server.js
 * (utilisé par la recherche globale /api/search et le filtre News paginé) — les
 * deux DOIVENT rester en phase, sinon "stalker" trouverait S.T.A.L.K.E.R. dans un
 * board mais pas dans la recherche globale, ou l'inverse.
 */
export function matchesFilter(text, filterText) {
  if (!filterText || !filterText.trim()) return true;
  if (!text) return false;
  // Retire les diacritiques (accents) après décomposition NFD, sans regex Unicode
  // (plage de points de code 0x0300–0x036F = marques combinantes), pour rester
  // robuste indépendamment de l'environnement d'exécution.
  const norm = (s) => {
    const decomposed = s.toString().normalize('NFD');
    let out = '';
    for (let i = 0; i < decomposed.length; i++) {
      const code = decomposed.charCodeAt(i);
      if (code < 0x0300 || code > 0x036f) out += decomposed[i];
    }
    return out.toLowerCase().replace(FILTER_PUNCT_RE, '');
  };
  return norm(text).includes(norm(filterText.trim()));
}
