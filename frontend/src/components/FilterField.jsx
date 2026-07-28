import { useState, useRef, useEffect } from 'react';

// ── Champ "Filtre" partagé ─────────────────────────────────────────────────
// Bouton icône + champ qui s'étend au clic, sur le même modèle UX que
// GlobalSearch.jsx (même style, même positionnement flottant). Différence
// volontaire : ici la valeur du filtre est un état persistant et continu
// (appliqué en direct sur des listes déjà en mémoire, pas une recherche
// serveur ponctuelle) — donc fermer le panneau (clic extérieur / Échap)
// replie juste le champ, sans effacer le filtre actif. Un petit point
// lumineux sur l'icône indique qu'un filtre reste actif même repliée.
//
// Composant 100% contrôlé : le parent possède la valeur (value/onChange) et
// décide donc seul de ce qu'il filtre. Réutilisé pour le filtre global de
// l'accueil (boards + sidebar + news + jeux à venir + échéances) et pour le
// filtre local d'un board ouvert (cartes Kanban) — une seule implémentation,
// deux instances indépendantes.
export default function FilterField({ value, onChange, placeholder, title }) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const active = expanded || !!value;

  const handleIconClick = () => {
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.currentTarget.blur();
      setExpanded(false);
    }
  };

  // Fermer (replier) au clic extérieur — ne touche pas à la valeur du filtre.
  useEffect(() => {
    const fn = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>

      {/* Icône filtre (entonnoir) — seul élément dans le flux du header */}
      <button
        onClick={handleIconClick}
        title={title}
        style={{
          background: active ? 'rgba(192,87,10,0.18)' : 'none',
          border: active ? '1px solid var(--accent)' : '1px solid transparent',
          borderRadius: 8,
          width: 30, height: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0, position: 'relative',
          transition: 'background .15s, border-color .15s',
        }}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
          stroke={active ? 'var(--accent)' : 'var(--text-muted)'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 3H2l8 9.46V19l4 2v-7.54L22 3z" />
        </svg>
        {!!value && !expanded && (
          <span style={{
            position: 'absolute', top: 3, right: 3, width: 6, height: 6,
            borderRadius: '50%', background: 'var(--accent)',
          }} />
        )}
      </button>

      {/* Panneau flottant : juste le champ (pas de dropdown de résultats ici) */}
      {expanded && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 2001 }}>
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={value}
              onChange={e => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                display: 'block',
                background: 'var(--surface)',
                border: '1px solid var(--accent)',
                borderRadius: 8,
                padding: '7px 30px 7px 12px',
                color: 'var(--text)', fontSize: 13, outline: 'none',
                width: 220,
                boxShadow: '0 6px 24px rgba(0,0,0,0.7)',
              }}
            />
            {!!value && (
              <button
                onClick={() => { onChange(''); inputRef.current?.focus(); }}
                title="✕"
                style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  fontSize: 14, cursor: 'pointer', padding: 2, lineHeight: 1,
                }}
              >✕</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
