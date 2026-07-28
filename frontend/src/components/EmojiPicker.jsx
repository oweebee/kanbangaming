// ── Sélecteur d'emoji partagé ──────────────────────────────────────────────────
// Utilisé partout où l'utilisateur choisit un emoji (icône de board dans le menu
// de gauche, icône de colonne, icône de carte perso) : App.jsx, KanbanBoard.jsx,
// SearchModal.jsx. Auparavant chacun avait sa propre copie de EMOJI_CATS + son
// propre composant quasi-identique → regroupé ici pour éviter la redondance et
// pouvoir ajouter une même fonctionnalité (favoris/derniers utilisés) partout
// à la fois, sans rien dupliquer.
import { useState, useRef, useEffect } from 'react';
import { useLang } from '../i18n.js';

export const EMOJI_CATS = [
  { label: '🎮 Gaming', emojis: ['🎮','🕹️','👾','🎲','🃏','🧩','🎯','🏹','⚔️','🗡️','🛡️','🪃','🔫','💣','🧲','🪄','🎪','🎡','🎠','🎢'] },
  { label: '🏆 Progression', emojis: ['🏆','🥇','🥈','🥉','🎖️','🏅','⭐','🌟','💫','✨','💥','🔥','❄️','⚡','🌊','💎','💍','👑','🎗️','🏁'] },
  { label: '📋 Tâches', emojis: ['📋','📌','📍','🔖','📎','🖇️','📏','📐','✏️','🖊️','🖋️','📝','📄','📃','📑','📊','📈','📉','🗂️','🗃️'] },
  { label: '💼 Pro', emojis: ['💼','🗄️','🖥️','💻','⌨️','🖱️','🖨️','📱','☎️','📞','📟','📠','🔍','🔎','🔬','🔭','📡','🛰️','⚙️','🔧'] },
  { label: '💻 IT', emojis: ['💻','🖥️','⌨️','🖱️','🖨️','💾','💿','📀','📱','☎️','📟','📠','🔌','🔋','🧮','📡','🛰️','🤖','👾','🔍'] },
  { label: '🛠️ Bricolage', emojis: ['🔨','🪛','🔧','🪚','🪓','⛏️','🧰','🔩','⚙️','🧱','🪜','🧲','📐','📏','✂️','🪣','🧯','🗜️','🪝','🔗'] },
  { label: '🚦 Statuts', emojis: ['✅','❌','⚠️','🚫','⛔','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔶','🔷','🔸','🔹','💤','⏳'] },
  { label: '🔔 Signaux', emojis: ['🔔','🔕','📣','📢','🚨','🚩','🏴','🏳️','🚀','💡','🔦','🕯️','🔒','🔓','🔑','🗝️','🪝','🔗','📡','🛜'] },
  { label: '🌍 Nature', emojis: ['🌍','🌲','🌳','🌴','🌵','🌾','🍀','🌸','🌺','🌻','🌹','🍁','🍂','🍃','🌿','☘️','🪨','🌙','☀️','⛅'] },
  { label: '🎨 Créa', emojis: ['🎨','🖌️','✏️','📸','🎬','🎵','🎶','🎸','🎹','🎺','🎻','🥁','🎤','🎧','🎭','🎪','🎠','🎡','🎢','🎠'] },
  { label: '💬 Social', emojis: ['💬','💭','🗯️','❤️','🧡','💛','💚','💙','💜','🖤','🤍','💕','💞','💓','💗','💖','💘','💝','👍','👎'] },
  { label: '🧠 Divers', emojis: ['🧠','👀','💪','🤝','🙌','👏','🤜','🏃','🧑‍💻','👷','🧑‍🎨','🦁','🐺','🦊','🐉','🦄','👻','💀','🤖','👽'] },
];

// ── Favoris / derniers utilisés — partagé par TOUS les pickers de l'app ──────
const RECENT_KEY = 'kbg_recentEmojis';
const RECENT_STORE_MAX = 32; // gardé plus large que ce qui est affiché (2 lignes), au cas où columns change

function loadRecentEmojis() {
  try {
    const arr = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function saveRecentEmoji(emoji) {
  if (!emoji) return; // ne pas polluer les favoris avec un "effacer"
  try {
    const next = [emoji, ...loadRecentEmojis().filter(e => e !== emoji)].slice(0, RECENT_STORE_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

/**
 * Picker d'emoji générique.
 * - Mode "flottant" (avec anchorEl) : positionné en position:fixed à côté du bouton,
 *   se ferme au clic extérieur. Utilisé pour l'icône de board / colonne.
 * - Mode "inline" (sans anchorEl) : bloc statique dans le flux, pas de fermeture
 *   au clic extérieur (c'est l'appelant qui gère l'ouverture/fermeture). Utilisé
 *   pour l'icône de carte perso.
 */
export function EmojiPicker({
  current, onSelect, onClose, anchorEl,
  columns = 8, gap = 2, btnSize = 28, emojiFontSize = 15,
  width, maxHeight = 340, padding = '8px 8px 4px',
  background = 'var(--surface2)', borderRadius = 10,
  boxShadow = '0 8px 24px rgba(0,0,0,.6)',
  clearLabel, headerLabel,
  catMarginBottom = 8, catFontSize = 10, catFontWeight = 700,
  catLetterSpacing = '0.06em', catLabelMarginBottom = 4, catOpacity = 1,
}) {
  const { t } = useLang();
  const ref = useRef();
  const floating = !!anchorEl;
  const [coords, setCoords] = useState({ left: -9999, top: -9999 });
  const [recent, setRecent] = useState(() => loadRecentEmojis());

  useEffect(() => {
    if (!floating) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose?.(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [floating, onClose]);

  useEffect(() => {
    if (!floating || !ref.current) return;
    const tr = anchorEl.getBoundingClientRect();
    const pickerW = width || 260;
    const pickerH = Math.min(maxHeight, window.innerHeight - 32);
    let left = tr.right + 8;
    if (left + pickerW > window.innerWidth - 8) left = tr.left - pickerW - 8;
    let top = tr.top;
    if (top + pickerH > window.innerHeight - 16) top = window.innerHeight - pickerH - 16;
    if (top < 8) top = 8;
    setCoords({ left, top });
  }, [floating, anchorEl, width, maxHeight]);

  const handleSelect = (emoji) => {
    if (emoji) { saveRecentEmoji(emoji); setRecent(loadRecentEmojis()); }
    onSelect(emoji);
  };

  const btnStyle = (e) => ({
    background: current === e ? 'var(--accent-dim)' : 'none',
    border: current === e ? '1px solid var(--accent)' : '1px solid transparent',
    borderRadius: 5, width: btnSize, height: btnSize, fontSize: emojiFontSize,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  });
  const catLabelStyle = {
    fontSize: catFontSize, fontWeight: catFontWeight, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: catLetterSpacing,
    marginBottom: catLabelMarginBottom, paddingLeft: 2, opacity: catOpacity,
  };
  const recentToShow = recent.slice(0, columns * 2);

  return (
    <div ref={ref} style={floating ? {
      position: 'fixed', left: coords.left, top: coords.top, zIndex: 9999,
      background, border: '1px solid var(--border)', borderRadius, padding,
      boxShadow, width, maxHeight, overflowY: 'auto',
    } : {
      background, border: '1px solid var(--border)', borderRadius, padding,
      maxHeight, overflowY: 'auto', width,
    }}>
      {headerLabel && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{headerLabel}</span>
          {clearLabel && (
            <button onClick={() => handleSelect('')} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}>{clearLabel}</button>
          )}
        </div>
      )}
      {!headerLabel && clearLabel && (
        <div style={{ marginBottom: 6 }}>
          <button onClick={() => handleSelect('')} style={{ ...btnStyle(''), width: 'auto', padding: '0 10px', fontSize: 11, color: 'var(--text-muted)' }}>{clearLabel}</button>
        </div>
      )}
      {recentToShow.length > 0 && (
        <div style={{ marginBottom: catMarginBottom }}>
          <div style={catLabelStyle}>{t('emoji.recent')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap }}>
            {recentToShow.map(e => (
              <button key={`recent-${e}`} onClick={() => handleSelect(e)} style={btnStyle(e)}>{e}</button>
            ))}
          </div>
        </div>
      )}
      {EMOJI_CATS.map(cat => (
        <div key={cat.label} style={{ marginBottom: catMarginBottom }}>
          <div style={catLabelStyle}>{cat.label}</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap }}>
            {cat.emojis.map(e => (
              <button key={e} onClick={() => handleSelect(e)} style={btnStyle(e)}>{e}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
