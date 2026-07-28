import { useState, useEffect, useRef } from 'react';
import GameCard from './GameCard.jsx';
import { useLang } from '../i18n.js';
import { isSteamAccessBlocked, SteamAccessNotice, SteamGlyph } from './SteamUI.jsx';
import { authHeaders, matchesFilter, hexToRgba } from '../utils.js';

const API = '/api';

// ── Catégoriser ────────────────────────────────────────────────────────────────

// parseD : gère "YYYY-MM-DD", ISO complet, ou tout autre format Date-valide.
// Toujours renvoie minuit LOCAL pour que les comparaisons soient cohérentes.
function parseD(s) {
  if (!s) return null;
  let d;
  // Format "YYYY-MM-DD" → on force minuit local explicitement
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, day] = s.split('-').map(Number);
    d = new Date(y, m - 1, day, 0, 0, 0, 0);
  } else {
    d = new Date(s);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0); // normalise à minuit local
  }
  return isNaN(d.getTime()) ? null : d;
}

function categorize(task) {
  const now   = new Date(); now.setHours(0, 0, 0, 0);
  const today = now.getTime();
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowt = tomorrow.getTime();
  const in7   = new Date(now); in7.setDate(in7.getDate() + 7);
  const in7t  = in7.getTime();

  if (task.done) return null;

  function classifyFuture(refDate) {
    const t = refDate.getTime();
    if (t === tomorrowt) return 'tomorrow';
    if (t <= in7t)        return 'upcoming';
    return null;
  }

  if (task.startDate && task.endDate) {
    const start = parseD(task.startDate), end = parseD(task.endDate);
    if (!start || !end) return null;
    if (today > end.getTime())    return { cat: 'overdue',  refDate: end };
    if (today >= start.getTime()) return { cat: 'active',   refDate: end };
    const cat = classifyFuture(start);
    return cat ? { cat, refDate: start } : null;
  }
  if (task.dueDate) {
    const due = parseD(task.dueDate);
    if (!due) return null;
    const duet = due.getTime();
    if (today > duet)   return { cat: 'overdue',  refDate: due };
    if (today === duet) return { cat: 'active',   refDate: due };
    const cat = classifyFuture(due);
    return cat ? { cat, refDate: due } : null;
  }
  if (task.startDate) {
    const start = parseD(task.startDate);
    if (!start) return null;
    const st = start.getTime();
    if (today > st)   return { cat: 'overdue',  refDate: start };
    if (today === st) return { cat: 'active',   refDate: start };
    const cat = classifyFuture(start);
    return cat ? { cat, refDate: start } : null;
  }
  return null;
}

// CAT_META labels are now fetched via t() inside components

const OverdueIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#e05555" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="rgba(224,85,85,0.2)"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

// ── Convertit un task API → objet game attendu par GameCard ───────────────────
function taskToGame(task) {
  return {
    appid:            task.gameId,
    name:             task.name,
    header_img:       task.header_img  || null,
    icon_img:         task.icon_img    || null,
    type:             task.type        || 'steam',
    taskType:         task.taskType    || null,
    emoji:            task.emoji       || null,
    progress:         typeof task.progress === 'number' ? task.progress : null,
    done:             !!task.done,
    urgent:           !!task.urgent,
    dueDate:          task.dueDate     || null,
    startDate:        task.startDate   || null,
    endDate:          task.endDate     || null,
    archived:         false,
    playtime_minutes: null,
    notes:            [],
  };
}

// ── Section ────────────────────────────────────────────────────────────────────
function Section({ cat, tasks, onOpenTask, hiddenDeadlineIds, showHiddenDeadlines, onHideDeadline, onUnhideDeadline, compact = false, filterText = '', getBoardColor, onOpenBoard }) {
  const { t } = useLang();
  const CAT_META = {
    overdue:  { label: t('deadline.cat_warning'),  color: '#e05555', icon: null },
    active:   { label: t('deadline.cat_today'),    color: '#3db86a', icon: '📍' },
    tomorrow: { label: t('deadline.cat_tomorrow'), color: '#e09020', icon: '📅' },
    upcoming: { label: t('deadline.cat_7days'),    color: '#c9a010', icon: '🕐' },
  };
  const [collapsed, setCollapsed] = useState(false);
  const [order, setOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`dlOrder_${cat}`) || 'null') || []; } catch { return []; }
  });
  const [dragKey,      setDragKey]      = useState(null);
  const [dragOver,     setDragOver]     = useState(null);
  const [touchDragKey, setTouchDragKey] = useState(null);
  const [touchDragOver,setTouchDragOver]= useState(null);
  const touchTimerRef = useRef(null);
  const touchDragRef  = useRef({ active: false, key: null, overKey: null, scrollBlocker: null, pendingX: 0, pendingY: 0 });
  const meta = CAT_META[cat];
  if (tasks.length === 0) return null;

  const taskKey = t => t._isWishlist ? `wishlist__${t._steamAppid}` : `${t.boardId}__${t.gameId}`;

  function applyOrder(items) {
    if (!order || order.length === 0) return items;
    const map = new Map(items.map(t => [taskKey(t), t]));
    const sorted = order.map(k => map.get(k)).filter(Boolean);
    const extra = items.filter(t => !order.includes(taskKey(t)));
    return [...sorted, ...extra];
  }

  function applyReorder(fromKey, toKey) {
    if (!fromKey || fromKey === toKey) return;
    const base = applyOrder(tasks).map(taskKey);
    const from = base.indexOf(fromKey);
    const to   = base.indexOf(toKey);
    if (from === -1 || to === -1) return;
    const next = [...base];
    next.splice(from, 1);
    next.splice(to, 0, fromKey);
    try { localStorage.setItem(`dlOrder_${cat}`, JSON.stringify(next)); } catch {}
    setOrder(next);
  }

  function handleDrop(overId) {
    applyReorder(dragKey, overId);
    setDragKey(null); setDragOver(null);
  }

  function finishTouchDrop() {
    const { key, overKey, scrollBlocker } = touchDragRef.current;
    if (scrollBlocker) { document.removeEventListener('touchmove', scrollBlocker); }
    touchDragRef.current = { active: false, key: null, overKey: null, scrollBlocker: null, pendingX: 0, pendingY: 0 };
    setTouchDragKey(null); setTouchDragOver(null);
    applyReorder(key, overKey);
  }

  function cancelTouchDrag() {
    clearTimeout(touchTimerRef.current);
    const { scrollBlocker } = touchDragRef.current;
    if (scrollBlocker) { document.removeEventListener('touchmove', scrollBlocker); }
    touchDragRef.current = { active: false, key: null, overKey: null, scrollBlocker: null, pendingX: 0, pendingY: 0 };
    setTouchDragKey(null); setTouchDragOver(null);
  }

  const allSorted = applyOrder(tasks);
  const visible = allSorted.filter(t => showHiddenDeadlines ? true : !hiddenDeadlineIds.has(taskKey(t)));
  const sorted = visible.filter(t => matchesFilter(t.name, filterText));
  // Vide "vraiment" (rien à afficher même sans le filtre, ex: tout masqué via le
  // bouton œil) vs vide "à cause du filtre" (filterText a tout exclu) — seul ce
  // 2e cas affiche le message dédié ; le 1er reste silencieux comme avant.
  const noMatch = visible.length > 0 && sorted.length === 0;

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        onClick={() => setCollapsed(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: collapsed ? 0 : 10, cursor: 'pointer', userSelect: 'none' }}
      >
        {cat === 'overdue' ? <OverdueIcon /> : <span style={{ fontSize: 11 }}>{meta.icon}</span>}
        <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1 }}>
          {meta.label}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface2)', borderRadius: 99, padding: '1px 6px' }}>
          {tasks.length}
        </span>
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke={meta.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform .2s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0, opacity: 0.75 }}><polyline points="6 9 12 15 18 9"/></svg>
      </div>

      {!collapsed && noMatch ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 11, padding: '4px 2px 2px' }}>{t('filter.no_results')}</div>
      ) : !collapsed && (
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
          {sorted.map((task, i) => {
            const game = taskToGame(task);
            const key = taskKey(task);
            // Couleur du board associé (perso/Steam), même logique que le menu de gauche
            // et l'accueil (getBoardTypeColor : orange perso par défaut, ou couleur de genre
            // si board lié à un jeu Steam) — réutilisée telle quelle, pas redéveloppée.
            const boardColor = !task._isWishlist && getBoardColor ? getBoardColor({ gameIcon: task.boardIcon }) : null;
            const isTouchDragging = touchDragKey === key;
            const isTouchOver     = touchDragOver === key && touchDragKey !== key;
            return (
              <div
                key={`${key}-${i}`}
                data-dlkey={key}
                // Le drag-to-reorder (souris + tactile) est géré ICI, sur ce wrapper, pour
                // TOUTES les cartes — y compris la wishlist (auparavant exclue : on ne
                // pouvait pas du tout la saisir). Le clic simple (ouvrir la fiche Steam)
                // continue de fonctionner normalement en plus du drag : un clic sans
                // déplacement de souris déclenche toujours onClick, drag et click ne
                // s'excluent pas mutuellement.
                draggable
                onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragKey(key); }}
                onDragEnd={() => { setDragKey(null); setDragOver(null); }}
                onDragOver={e => { e.preventDefault(); setDragOver(key); }}
                onDrop={e => { e.preventDefault(); handleDrop(key); }}
                onContextMenu={e => e.preventDefault()}
                onTouchStart={e => {
                  clearTimeout(touchTimerRef.current);
                  touchDragRef.current = { active: false, key, overKey: null, scrollBlocker: null, pendingX: e.touches[0].clientX, pendingY: e.touches[0].clientY };
                  touchTimerRef.current = setTimeout(() => {
                    touchDragRef.current.active = true;
                    setTouchDragKey(key);
                    if (navigator.vibrate) navigator.vibrate(40);
                    const blocker = (ev) => ev.preventDefault();
                    touchDragRef.current.scrollBlocker = blocker;
                    document.addEventListener('touchmove', blocker, { passive: false });
                  }, 400);
                }}
                onTouchMove={e => {
                  const d = touchDragRef.current;
                  if (!d.active) {
                    const dx = Math.abs(e.touches[0].clientX - d.pendingX);
                    const dy = Math.abs(e.touches[0].clientY - d.pendingY);
                    if (dx > 5 || dy > 5) clearTimeout(touchTimerRef.current);
                    return;
                  }
                  const touch = e.touches[0];
                  const el = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('[data-dlkey]');
                  const overKey = el?.getAttribute('data-dlkey') ?? null;
                  d.overKey = overKey;
                  setTouchDragOver(overKey);
                }}
                onTouchEnd={e => {
                  clearTimeout(touchTimerRef.current);
                  if (!touchDragRef.current.active) { touchDragRef.current.active = false; return; }
                  e.preventDefault();
                  finishTouchDrop();
                }}
                onTouchCancel={cancelTouchDrag}
                onClick={task._isWishlist ? () => window.open(`https://store.steampowered.com/app/${task._steamAppid}/`, '_blank') : undefined}
                style={{
                  position: 'relative',
                  display: 'flex', flexDirection: 'column', gap: 4,
                  opacity: (dragKey === key || isTouchDragging) ? 0.4 : 1,
                  outline: (dragOver === key && dragKey !== key) || isTouchOver ? `2px dashed ${meta.color}` : 'none',
                  borderRadius: 8, cursor: 'grab',
                  // Même bascule (rotation + léger zoom) + ombre que les cartes de boards
                  // de la 2e colonne de l'accueil (App.jsx, drag home) — cohérence visuelle
                  // du geste de drag partout dans l'app. Avant, seul le drag tactile avait
                  // cet effet ici ; le drag souris ne faisait qu'estomper l'opacité.
                  transform: (dragKey === key || isTouchDragging) ? 'rotate(2deg) scale(1.03)' : 'none',
                  boxShadow: (dragKey === key || isTouchDragging) ? '0 8px 28px rgba(0,0,0,0.55)' : 'none',
                  transition: 'opacity .15s, transform .15s, box-shadow .15s',
                }}
              >
                {/* Conteneur dédié à la carte seule (sans la barre "Steam Wishlist" en
                    dessous) : permet d'ancrer le bouton masquer en bas de la carte,
                    peu importe sa hauteur réelle (titre sur 1 ou 2 lignes). Le badge
                    WISHLIST flottant a été retiré — la barre "Steam Wishlist" en
                    dessous (dorée) sert maintenant seule d'indicateur wishlist. */}
                <div style={{ position: 'relative' }}>
                  {/* Bouton masquer — flottant en haut à droite de l'image, même style que
                      celui des boards publics/perso (HomeBoardCard) : fond noir semi-transp.
                      + blur, pour rester cohérent partout où on peut "masquer" une carte.
                      DeadlinePanel gère ce bouton pour TOUTES les cartes (wishlist + perso) —
                      GameCard ne reçoit plus onHide/onUnhide ici, pour ne pas en afficher un
                      second dans sa rangée de boutons inline. Position FIXE (ne bouge jamais) :
                      c'est le badge "URGENT" (ou tout autre badge existant/futur dans ce même
                      coin) qui se décale vers la gauche via badgeOffset passé à GameCard
                      ci-dessous, pas l'inverse. */}
                  {(onHideDeadline || onUnhideDeadline) && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (hiddenDeadlineIds.has(key)) { if (onUnhideDeadline) onUnhideDeadline(key); }
                        else { if (onHideDeadline) onHideDeadline(key); }
                      }}
                      title={hiddenDeadlineIds.has(key) ? t('card.show') : t('card.hide')}
                      style={{
                        position: 'absolute', top: 6, right: 6, zIndex: 10,
                        background: hiddenDeadlineIds.has(key) ? 'rgba(60,150,240,0.75)' : 'rgba(0,0,0,0.45)',
                        border: 'none', borderRadius: 6, padding: '4px 5px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: hiddenDeadlineIds.has(key) ? '#fff' : 'rgba(255,255,255,0.75)',
                        backdropFilter: 'blur(4px)',
                        transition: 'background .15s, right .15s',
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        {hiddenDeadlineIds.has(key)
                          ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                          : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                        }
                      </svg>
                    </button>
                  )}
                  <GameCard
                    game={game}
                    onClick={task._isWishlist
                      ? () => window.open(`https://store.steampowered.com/app/${task._steamAppid}/`, '_blank')
                      : () => onOpenTask(task)
                    }
                    readOnly={task._isWishlist}
                    isTaskBoard={!task._isWishlist && task.type === 'custom'}
                    onDragStart={() => {}}
                    onDragEnd={() => {}}
                    // Le drag-and-drop (souris + tactile) est géré par le wrapper englobant
                    // ci-dessus (draggable + onDragStart/onDragOver/onDrop), pas par GameCard
                    // lui-même — dragDisabled évite que GameCard ajoute SON PROPRE draggable
                    // natif imbriqué dans celui du wrapper (deux éléments draggable="true"
                    // imbriqués = le drop n'aboutissait à rien, bug corrigé ici).
                    dragDisabled
                    genreColor={task._isWishlist ? null : (task.type === 'custom' ? (task.color || null) : null)}
                    isHidden={hiddenDeadlineIds.has(key)}
                    // onHide/onUnhide volontairement PAS passés : le bouton masquer est géré
                    // par le bouton flottant ci-dessus (position + style HomeBoardCard), pour
                    // toutes les cartes de ce panneau — sinon GameCard afficherait un second
                    // bouton masquer dans sa rangée de boutons inline.
                    // badgeOffset : décale le badge URGENT/archivé (même coin haut-droite) pour
                    // qu'il ne passe jamais sous le bouton masquer, qui lui ne bouge pas.
                    badgeOffset={34}
                    compact={compact}
                    // Même hauteur d'image pour tous les types de carte : la vraie cause du
                    // décalage n'était pas l'image mais le TITRE, qui ne réservait de la place
                    // que pour le nombre de lignes réel (1 ou 2) — un titre court gardait donc
                    // une carte plus basse. titleMinHeight ci-dessous force 2 lignes de haut
                    // en permanence (uniquement ici, dans les Échéances), donc plus besoin de
                    // compenser via headerHeight : toutes les cartes (perso, wishlist, Steam)
                    // ont maintenant la même hauteur, peu importe la longueur du titre.
                    headerHeight={88}
                    titleMinHeight={37}
                  />
                </div>
                {/* Nom du board / source — doré pour la wishlist (remplace l'ancien badge
                    flottant sur la carte, retiré). Pour une carte wishlist en promo, ce
                    cartouche cède un quart de sa largeur (à droite) à un second cartouche
                    "Promo". */}
                <div style={{ display: 'flex', gap: 4 }}>
                  <div
                    onClick={!task._isWishlist && onOpenBoard ? e => { e.stopPropagation(); onOpenBoard(task); } : undefined}
                    title={!task._isWishlist && onOpenBoard ? t('deadline.open_board') : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '3px 6px',
                      // Board perso/Steam : fond alpha + bordure teintés à la couleur du board
                      // associé (même couleur que son icône dans le menu de gauche/l'accueil),
                      // au lieu du gris neutre — en plus du nom déjà affiché. Cliquer dessus
                      // navigue vers ce board (comme le cartouche wishlist ouvre la page Steam).
                      background: task._isWishlist ? 'rgba(245,197,24,0.15)' : (boardColor ? hexToRgba(boardColor, 0.15) : 'var(--surface2)'),
                      borderRadius: 5,
                      border: task._isWishlist ? '1px solid rgba(245,197,24,0.45)' : `1px solid ${boardColor ? hexToRgba(boardColor, 0.45) : 'var(--border)'}`,
                      flex: (task._isWishlist && task.onSale) ? '0 1 75%' : '1 1 auto',
                      minWidth: 0,
                      cursor: !task._isWishlist && onOpenBoard ? 'pointer' : undefined,
                    }}>
                    {task._isWishlist ? (
                      <>
                        {/* size=14 pour matcher exactement le format de l'icône de board perso
                            ci-dessous (img 14x14 ou emoji dans une boîte 14x14) — avant, un
                            SVG à 11px vs un fallback emoji à line-height non maîtrisée créait
                            un écart de hauteur entre les deux cartouches. */}
                        <SteamGlyph size={14} color="#f5c518" />
                        <span style={{ fontSize: 10, color: '#f5c518', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, lineHeight: 1 }}>
                          Steam Wishlist
                        </span>
                      </>
                    ) : (
                      <>
                        {task.boardIcon
                          ? <img src={task.boardIcon} alt="" style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0 }} />
                          : <span style={{ width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, lineHeight: 1, flexShrink: 0 }}>📋</span>
                        }
                        {/* Texte du cartouche aussi teinté à la couleur du board (et en gras),
                            même traitement que le texte doré du cartouche wishlist — thème
                            cohérent entre les deux types de cartes. */}
                        <span style={{
                          fontSize: 10, color: boardColor || 'var(--text-muted)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                          fontWeight: 700, lineHeight: 1,
                        }}>
                          {task.boardName}
                        </span>

                      </>
                    )}
                  </div>
                  {task._isWishlist && task.onSale && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '3px 4px',
                      background: 'rgba(90,190,60,0.16)',
                      borderRadius: 5,
                      border: '1px solid rgba(90,190,60,0.5)',
                      flex: '0 0 25%', minWidth: 0,
                    }}>
                      <span style={{ fontSize: 10, color: '#6ed94a', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t('deadline.promo')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────
export default function DeadlinePanel({ token, currentUser, onOpenTask, refreshKey = 0, hiddenDeadlineIds = new Set(), showHiddenDeadlines = false, onHideDeadline, onUnhideDeadline, onToggleShowHidden, compact = false, onEmpty, filterText = '', getBoardColor, onOpenBoard }) {
  const { t } = useLang();
  const steamBlocked = isSteamAccessBlocked(currentUser);
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [apiCount, setApiCount] = useState(null); // nb brut renvoyé par l'API
  const [manualKey, setManualKey] = useState(0);
  const [wishlistItems, setWishlistItems] = useState([]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API}/deadlines`, { headers: authHeaders(token) })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setApiCount(data.length);
        setTasks(data);
        setLoading(false);
        if (data.length === 0 && onEmpty) onEmpty();
      })
      .catch(() => { setApiCount(0); setLoading(false); if (onEmpty) onEmpty(); });
  }, [token, refreshKey, manualKey]);

  // Wishlist Steam deadline items (profil public uniquement)
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/steam/wishlist/deadline`, { headers: authHeaders(token) })
      .then(r => r.ok ? r.json() : [])
      .then(data => setWishlistItems(Array.isArray(data) ? data : []))
      .catch(() => setWishlistItems([]));
  }, [token, refreshKey, manualKey]);

  const categorized = { overdue: [], active: [], tomorrow: [], upcoming: [] };
  for (const task of tasks) {
    if (task.urgentOnly && !task.done) {
      // Tâches urgentes sans date → section Attention ! (après les tâches échues)
      categorized.overdue.push({ ...task, _refDate: new Date() });
    } else {
      const c = categorize(task);
      if (c && categorized[c.cat]) categorized[c.cat].push({ ...task, _refDate: c.refDate });
    }
  }
  // Merge wishlist items as pseudo-tasks
  for (const item of wishlistItems) {
    if (!item.release_date) continue;
    const fakeTask = {
      boardId: 'wishlist', gameId: item.appid,
      name: item.name, header_img: item.header_img, icon_img: null,
      type: 'steam', taskType: null, emoji: null, progress: null,
      done: false, urgent: false,
      dueDate: item.release_date, startDate: null, endDate: null,
      boardName: 'Steam Wishlist', boardIcon: null, ownerUsername: null,
      _isWishlist: true, _steamAppid: item.appid, onSale: !!item.onSale,
    };
    const c = categorize(fakeTask);
    if (c && categorized[c.cat]) categorized[c.cat].push({ ...fakeTask, _refDate: c.refDate });
  }

  for (const cat of Object.keys(categorized)) {
    categorized[cat].sort((a, b) => a._refDate - b._refDate);
  }

  const total = categorized.overdue.length + categorized.active.length + categorized.tomorrow.length + categorized.upcoming.length;
  // Compte uniquement les items cachés qui sont actuellement dans le scope des échéances
  const taskKeyFn = t => t._isWishlist ? `wishlist__${t._steamAppid}` : `${t.boardId}__${t.gameId}`;
  const allCategorizedKeys = new Set([
    ...categorized.overdue,
    ...categorized.active,
    ...categorized.tomorrow,
    ...categorized.upcoming,
  ].map(taskKeyFn));
  const hiddenCount = [...hiddenDeadlineIds].filter(k => allCategorizedKeys.has(k)).length;

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#47a7f5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#47a7f5', textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>{t('deadline.header')}</span>
        {total > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: categorized.overdue.length > 0 ? '#e05555' : 'var(--text-muted)',
            background: categorized.overdue.length > 0 ? 'rgba(200,40,40,0.12)' : 'var(--surface2)',
            borderRadius: 99, padding: '1px 7px',
            border: categorized.overdue.length > 0 ? '1px solid rgba(200,40,40,0.3)' : 'none',
          }}>{total}</span>
        )}
        {/* Masquées (N) */}
        {hiddenCount > 0 && onToggleShowHidden && (
          <button
            onClick={onToggleShowHidden}
            title={showHiddenDeadlines ? t('deadline.hide_hidden') : t('deadline.show_hidden')}
            style={{
              background: showHiddenDeadlines ? 'rgba(40,120,200,0.22)' : 'var(--surface2)',
              border: showHiddenDeadlines ? '1px solid rgba(60,150,240,0.6)' : '1px solid var(--border)',
              borderRadius: 6, padding: '3px 7px', cursor: 'pointer',
              color: showHiddenDeadlines ? '#70b8ff' : 'var(--text-muted)',
              fontSize: 10, fontWeight: showHiddenDeadlines ? 700 : 400,
              display: 'flex', alignItems: 'center', gap: 3,
            }}
          >
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {showHiddenDeadlines
                ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
              }
            </svg>
            {hiddenCount}
          </button>
        )}
        {/* Bouton actualiser */}
        <button
          onClick={() => setManualKey(k => k + 1)}
          title={t('deadline.refresh')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex', alignItems: 'center', opacity: loading ? 0.4 : 0.7 }}
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
      </div>

      {!loading && steamBlocked && <SteamAccessNotice compact />}

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', padding: '20px 0' }}>{t('deadline.loading')}</div>
      ) : total === 0 ? (
        // Si l'accès Steam est bloqué, le bandeau SteamAccessNotice ci-dessus explique déjà
        // pourquoi le module est vide — afficher en plus "✅ Rien à faire" serait contradictoire
        // (on ne peut pas garantir l'absence d'échéances wishlist masquées par Steam).
        steamBlocked ? null : (
          <div style={{ textAlign: 'center', padding: '28px 8px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 26, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{t('deadline.empty')}</div>
            {apiCount !== null && apiCount > 0 && (
              <div style={{ fontSize: 10, marginTop: 6, color: '#c9a010', background: 'rgba(200,160,0,0.08)', border: '1px solid rgba(200,160,0,0.25)', borderRadius: 6, padding: '5px 10px' }}>
                {t('deadline.count_hint', { apiCount })}
              </div>
            )}
            {(apiCount === 0) && (
              <div style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}>{t('deadline.add_hint')}</div>
            )}
          </div>
        )
      ) : (
        <>
          <Section cat="overdue"  tasks={categorized.overdue}   onOpenTask={onOpenTask} hiddenDeadlineIds={hiddenDeadlineIds} showHiddenDeadlines={showHiddenDeadlines} onHideDeadline={onHideDeadline} onUnhideDeadline={onUnhideDeadline} compact={compact} filterText={filterText} getBoardColor={getBoardColor} onOpenBoard={onOpenBoard} />
          <Section cat="active"   tasks={categorized.active}    onOpenTask={onOpenTask} hiddenDeadlineIds={hiddenDeadlineIds} showHiddenDeadlines={showHiddenDeadlines} onHideDeadline={onHideDeadline} onUnhideDeadline={onUnhideDeadline} compact={compact} filterText={filterText} getBoardColor={getBoardColor} onOpenBoard={onOpenBoard} />
          <Section cat="tomorrow" tasks={categorized.tomorrow}  onOpenTask={onOpenTask} hiddenDeadlineIds={hiddenDeadlineIds} showHiddenDeadlines={showHiddenDeadlines} onHideDeadline={onHideDeadline} onUnhideDeadline={onUnhideDeadline} compact={compact} filterText={filterText} getBoardColor={getBoardColor} onOpenBoard={onOpenBoard} />
          <Section cat="upcoming" tasks={categorized.upcoming}  onOpenTask={onOpenTask} hiddenDeadlineIds={hiddenDeadlineIds} showHiddenDeadlines={showHiddenDeadlines} onHideDeadline={onHideDeadline} onUnhideDeadline={onUnhideDeadline} compact={compact} filterText={filterText} getBoardColor={getBoardColor} onOpenBoard={onOpenBoard} />
          </>
      )}
    </>
  );
}
