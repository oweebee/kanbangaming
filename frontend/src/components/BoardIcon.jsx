import { useState, useEffect } from 'react';

/**
 * BoardIcon — icône affichée en en-tête de board : image Steam (cliquable vers la fiche
 * du jeu) si une image valide est disponible, sinon repli automatique sur l'emoji du board
 * (ou 🎮 par défaut).
 *
 * Centralise un motif qui était dupliqué à 4 endroits (header desktop perso/public, header
 * mobile perso/public) et corrige un cas où une image cassée (URL morte) restait invisible
 * sans jamais basculer sur l'emoji de repli — onError bascule maintenant proprement.
 *
 * Props :
 *   img      — URL de l'image (headerImg / gameIcon du board), ou null/undefined
 *   emoji    — emoji de repli du board
 *   size     — hauteur de l'image en px (défaut 53, desktop)
 *   maxWidth — largeur max de l'image en px (défaut 220)
 *   fontSize — taille de l'emoji de repli en px (défaut 36)
 */
export default function BoardIcon({ img, emoji, size = 53, maxWidth = 220, fontSize = 36 }) {
  const [failed, setFailed] = useState(false);
  // Réinitialise l'état d'échec quand l'image change (changement de board)
  useEffect(() => { setFailed(false); }, [img]);

  const steamAppId = img?.match(/apps\/(\d+)\//)?.[1];

  if (!img || failed) {
    return <span style={{ fontSize, flexShrink: 0 }}>{emoji || '🎮'}</span>;
  }

  return (
    <img
      src={img} alt=""
      onError={() => setFailed(true)}
      onClick={steamAppId ? () => window.open(`https://store.steampowered.com/app/${steamAppId}`, '_blank') : undefined}
      title={steamAppId ? 'Voir sur Steam' : undefined}
      style={{ height: size, width: 'auto', maxWidth, objectFit: 'contain', borderRadius: 6, flexShrink: 0, border: '1px solid var(--border)', cursor: steamAppId ? 'pointer' : 'default' }}
    />
  );
}
