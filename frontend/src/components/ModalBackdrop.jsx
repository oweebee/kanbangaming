import { useState } from 'react';

/**
 * Backdrop commun pour toutes les modales.
 * Props:
 *   onClose  – appelé quand on clique sur le fond
 *   zIndex   – z-index du backdrop (défaut : 100)
 *   children – contenu de la modale
 */
export default function ModalBackdrop({ onClose, zIndex = 100, children }) {
  const [phase, setPhase] = useState('in'); // 'in' | 'out'

  const handleClose = () => {
    setPhase('out');
    setTimeout(onClose, 180);
  };

  return (
    <>
      <div
        onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex, padding: 20,
          backdropFilter: 'blur(4px)',
          animation: phase === 'in' ? 'backdrop-in .18s ease' : 'backdrop-out .18s ease forwards',
        }}
      >
        {/* Wrapper d'animation — ne perturbe pas le flex centering.
            width:'100%' est nécessaire : sans ça, ce div (flex item du backdrop,
            donc en shrink-to-fit sur son axe principal) n'a pas de largeur définie,
            et un enfant en `width:'100%'` (tous les ModalCard) se retrouve à
            résoudre son pourcentage contre un parent "auto" → le navigateur
            recalcule alors la largeur "shrink-to-fit" en fonction du contenu
            RÉELLEMENT affiché à cet instant. Résultat concret : une modale à
            onglets (Panneau Admin, Profil…) changeait de largeur à chaque
            changement d'onglet, selon que le contenu de l'onglet actif était
            plus ou moins large. En donnant une largeur définie à ce wrapper,
            le `width:'100%' + maxWidth:…` de chaque ModalCard redevient stable
            quel que soit le contenu affiché à l'intérieur.
            Ce wrapper occupe donc TOUTE la largeur du backdrop (pas seulement
            la largeur de la carte modale) : un clic dans la zone sombre à
            gauche/droite de la carte tombe sur CE div, pas sur le backdrop
            lui-même. D'où le onClick dupliqué ici (même garde-fou
            target===currentTarget) — sans lui, cliquer à côté d'une carte
            étroite (mais dans sa bande verticale) ne fermait jamais la modale. */}
        <div
          onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
          style={{
            width: '100%',
            transformOrigin: 'center center',
            animation: phase === 'in'
              ? 'modal-zoom-in .22s cubic-bezier(0.34,1.56,0.64,1)'
              : 'modal-zoom-out .18s ease forwards',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
