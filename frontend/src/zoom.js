import { useState, useEffect } from 'react';

// ── Niveaux de zoom supportés ──────────────────────────────────────────────
// Réduit l'échelle globale de l'interface (comme le zoom de Teams/Discord)
// pour afficher plus de surface sur les écrans basse résolution.
export const ZOOM_STEPS = [80, 85, 90, 95, 100];
export const DEFAULT_ZOOM = 100;

// ── État global (module-level, même schéma que i18n.js) ───────────────────
let _zoom = DEFAULT_ZOOM;
let _userId = null;
const _subscribers = new Set();

function _clampZoom(value) {
  const n = Number(value);
  return ZOOM_STEPS.includes(n) ? n : DEFAULT_ZOOM;
}

function _applyZoom(value) {
  // CSS "zoom" sur <html> : redimensionne tout le rendu (texte, paddings,
  // icônes…) comme le zoom natif du navigateur, SANS toucher window.innerWidth
  // (donc aucun impact sur la détection mobile useMobile()) et SANS créer de
  // containing block pour les éléments position:fixed — contrairement à
  // transform: scale() qui casserait le footer et les modales fixed.
  // Compatible Chromium desktop + WebView Android (même moteur de rendu).
  //
  // PAS de compensation de width/height : vérifié empiriquement (DevTools,
  // getBoundingClientRect vs window.visualViewport) que <html> avec zoom
  // seul (width/height:auto) remplit DÉJÀ exactement la fenêtre réelle à
  // tous les niveaux de zoom — html/body/#root mesurent pile width/height
  // du viewport. Une ancienne version compensait manuellement la taille
  // (100/value % en width/height), ce qui faisait au contraire DÉBORDER
  // <html> au-delà du viewport réel (ex. 3011px de large pour une fenêtre
  // de 2560px à 85%) : c'était la cause des bugs de colonne manquante,
  // de décalage à droite et de scroll de page parasite. On efface aussi
  // tout style résiduel d'une session précédente qui aurait stocké ces
  // valeurs (rétrocompatibilité).
  if (typeof document !== 'undefined' && document.documentElement) {
    const html = document.documentElement;
    html.style.zoom = `${value}%`;
    html.style.width = '';
    html.style.height = '';
  }
}

/** Appelé au login / au chargement de l'auth sauvegardée (même schéma que initUserLang) */
export function initUserZoom(userId) {
  _userId = userId || null;
  try {
    const stored = localStorage.getItem(`zoom_${_userId || 'guest'}`);
    _zoom = stored ? _clampZoom(stored) : DEFAULT_ZOOM;
  } catch {
    _zoom = DEFAULT_ZOOM;
  }
  _applyZoom(_zoom);
  _subscribers.forEach(fn => fn(_zoom));
}

/** Changer le niveau de zoom (stocké par userId) */
export function setZoom(value) {
  const z = _clampZoom(value);
  _zoom = z;
  _applyZoom(z);
  try { localStorage.setItem(`zoom_${_userId || 'guest'}`, String(z)); } catch {}
  _subscribers.forEach(fn => fn(z));
}

export function getZoom() {
  return _zoom;
}

/** Hook React — s'abonne aux changements de zoom */
export function useZoom() {
  const [zoom, setZoomState] = useState(_zoom);
  useEffect(() => {
    const handler = z => setZoomState(z);
    _subscribers.add(handler);
    return () => _subscribers.delete(handler);
  }, []);
  return { zoom, setZoom };
}
