/**
 * Carte de contenu partagée par toutes les modales (Login, Profil, Admin, Infos app…).
 * Centralise le style fond/bordure/ombre commun à tous les call sites ; chaque appelant
 * passe le reste (dimensions, padding, display, overflow…) via la prop `style`, qui
 * surcharge les valeurs par défaut.
 *
 * Props:
 *   children – contenu de la carte
 *   style    – objet de style fusionné après les valeurs par défaut (peut tout surcharger)
 *   ...rest  – props HTML additionnelles (onClick, etc.) passées au div racine
 */
export default function ModalCard({ children, style = {}, ...rest }) {
  return (
    <div
      {...rest}
      style={{
        background: 'var(--surface1)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        boxShadow: '0 8px 40px rgba(0,0,0,.5)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
