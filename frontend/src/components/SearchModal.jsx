import { useState, useCallback, useRef } from 'react';
import { TASK_TYPES, getTaskType } from '../taskTypes.jsx';
import NotesSection from './NotesSection.jsx';
import ProgressSlider from './ProgressSlider.jsx';
import { StatusToggles, DatePicker, AssigneeEditor } from './CardControls.jsx';
import ModalBackdrop from './ModalBackdrop.jsx';
import { useLang } from '../i18n.js';
import { authHeaders } from '../utils.js';
import { EmojiPicker } from './EmojiPicker.jsx';

function LibraryBadge() {
  const { t } = useLang();
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: '#1b2838', color: '#c7d5e0',
      fontSize: 11, fontWeight: 600,
      padding: '2px 8px', borderRadius: 4, flexShrink: 0,
    }}>
      <svg width="9" height="9" viewBox="0 0 256 256" fill="#c7d5e0"><circle cx="128" cy="128" r="128"/></svg>
      {t('search.library_badge')}
    </span>
  );
}

// ── SearchModal ───────────────────────────────────────────────────────────────
// props:
//   api, token, boardGames, onAdd, onRemove, onClose  — always
//   customOnly   — hide Steam tab (task board context)
//   initialGame  — when set, opens in edit mode (pre-fills fields)
//   onSave       — called with updated game object in edit mode

export default function SearchModal({ api, token, boardGames, onAdd, onRemove, onClose, customOnly, initialGame, onSave, isTaskBoard, appUsers = [], currentUser }) {
  const { t } = useLang();
  const isEditMode = !!initialGame;

  const [tab, setTab] = useState(customOnly || isEditMode ? 'custom' : 'steam');
  const [customSubTab, setCustomSubTab] = useState('fiche'); // 'fiche' | 'notes'

  // Steam search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(new Set(boardGames.map(g => g.appid)));
  const debounce = useRef(null);

  // Custom card fields — pre-fill from initialGame in edit mode
  const [customName,     setCustomName]     = useState(initialGame?.name      || '');
  const [customEmoji,    setCustomEmoji]    = useState(initialGame?.emoji     || '🎮');
  const [customColor,    setCustomColor]    = useState(initialGame?.color     || '#66c0f4');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [customTaskType, setCustomTaskType] = useState(initialGame?.taskType  || null);

  // Date fields
  const [dateMode, setDateMode] = useState(
    initialGame?.startDate ? 'period' : initialGame?.dueDate ? 'single' : 'none'
  );
  const [dueDate,    setDueDate]    = useState(initialGame?.dueDate    || '');
  const [startDate,  setStartDate]  = useState(initialGame?.startDate  || '');
  const [endDate,    setEndDate]    = useState(initialGame?.endDate    || '');
  const [dueTime,    setDueTime]    = useState(initialGame?.dueTime    || '');
  const [startTime,  setStartTime]  = useState(initialGame?.startTime  || '');
  const [endTime,    setEndTime]    = useState(initialGame?.endTime    || '');

  // Extra fields
  const [urgent,    setUrgent]    = useState(!!initialGame?.urgent);
  const [done,      setDone]      = useState(!!initialGame?.done);
  const [assignees, setAssignees] = useState(initialGame?.assignees || []);
  const [notes,     setNotes]     = useState(initialGame?.notes     || []);
  const [notesDraft, setNotesDraft] = useState('');
  const [progress,  setProgress]  = useState(initialGame?.progress ?? null);
  const reqHeaders = token ? authHeaders(token) : {};

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setSearchError(''); return; }
    setLoading(true); setSearchError('');
    try {
      const res = await fetch(`${api}/steam/search?q=${encodeURIComponent(q)}`, { headers: reqHeaders });
      const data = await res.json().catch(() => null);
      // Le backend renvoie un OBJET {error} en cas d'echec, pas un tableau.
      // Sans ce garde, setResults({error}) faisait planter results.map() plus
      // bas au rendu ("j.map is not a function") au lieu d'afficher l'erreur.
      if (!res.ok || !Array.isArray(data)) {
        setResults([]);
        setSearchError(data?.error || `HTTP ${res.status}`);
        return;
      }
      setResults(data);
    } catch (e) { setResults([]); setSearchError(e.message || 'network'); }
    finally { setLoading(false); }
  }, [api, token]);

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(q), 350);
  };

  const handleAdd = (game) => {
    onAdd(game);
    setAdded(prev => new Set([...prev, game.appid]));
    onClose();
  };

  const handleRemove = (game) => {
    if (onRemove) onRemove(game.appid);
    setAdded(prev => { const s = new Set(prev); s.delete(game.appid); return s; });
  };

  const handleSubmitCustom = () => {
    if (!customName.trim()) return;
    // Auto-save unsaved note draft
    const finalNotes = notesDraft.trim()
      ? [...notes, { id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, text: notesDraft.trim(), createdAt: new Date().toISOString(), editedAt: null }]
      : notes;
    const gameData = {
      appid:     initialGame?.appid || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name:      customName.trim(),
      type:      'custom',
      emoji:     customEmoji,
      color:     !isTaskBoard ? customColor : undefined,
      header_img: null,
      icon_img:  null,
      taskType:  customTaskType,
      dueDate:   dateMode === 'single' ? (dueDate || null) : null,
      startDate: dateMode === 'period' ? (startDate || null) : null,
      endDate:   dateMode === 'period' ? (endDate || null) : null,
      dueTime:   dateMode === 'single' ? (dueTime || null) : null,
      startTime: dateMode === 'period' ? (startTime || null) : null,
      endTime:   dateMode === 'period' ? (endTime || null) : null,
      urgent,
      done,
      assignees,
      notes: finalNotes,
      progress,
    };
    if (isEditMode && onSave) {
      onSave({ ...initialGame, ...gameData });
    } else {
      onAdd(gameData);
    }
    onClose();
  };

  // Fermeture via la croix OU le fond assombri : en mode édition d'une carte perso
  // avec un nom valide, on enregistre d'abord (même effet que le bouton "Enregistrer")
  // avant de fermer — sinon un clic à l'extérieur perdait silencieusement les
  // modifs en cours. En mode création (pas encore de carte existante) ou onglet
  // Steam (rien à "enregistrer" par ce biais), on ferme simplement comme avant.
  const handleClose = () => {
    if (isEditMode && tab === 'custom' && customName.trim()) {
      handleSubmitCustom();
    } else {
      onClose();
    }
  };

  const tabStyle = (active) => ({
    flex: 1, padding: '11px 0', background: 'none',
    border: 'none', borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    color: active ? 'var(--text)' : 'var(--text-muted)',
    fontWeight: active ? 700 : 400, fontSize: 15, cursor: 'pointer',
    transition: 'all .15s',
  });

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '11px 14px',
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text)', fontSize: 15, outline: 'none',
  };

  // Live preview derived values
  const previewTt = customTaskType ? getTaskType(customTaskType) : null;
  const PreviewIcon = previewTt?.FallbackIcon;

  return (
    <ModalBackdrop onClose={handleClose}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, width: 600, maxWidth: '90vw',
        // Hauteur dictée par le contenu (pas de valeur fixe) : exploite la place dispo à
        // l'écran, plafonnée à 90vh — barre de défilement interne seulement si le contenu
        // dépasse réellement cette limite.
        maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 17 }}>
              {isEditMode ? t('search.header_edit') : t('search.header_add')}
            </span>
            <button onClick={handleClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
          {/* Tabs — hidden in edit mode or customOnly */}
          {!customOnly && !isEditMode && (
            <div style={{ display: 'flex' }}>
              <button style={tabStyle(tab === 'steam')} onClick={() => setTab('steam')}>
                <svg viewBox="0 0 496 512" xmlns="http://www.w3.org/2000/svg" style={{ width: 13, height: 13, fill: 'currentColor', marginRight: 5, verticalAlign: 'middle' }}>
                  <path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.7-76.3-239-180.4l95.2 39.3c6.4 32.1 34.9 56.4 68.9 56.4 38.2 0 69.1-31.1 68.9-69.3l84.5-60.2c52.1 1.3 95.8-40.9 95.8-93.5 0-51.6-42-93.5-93.7-93.5s-93.7 42-93.7 93.5v1.2L176.6 279c-15.5-.9-30.7 3.4-43.5 12.1L0 236.1C10.2 108.4 117.1 8 247.6 8 384.8 8 496 119 496 256z"/>
                </svg>
                {t('search.tab_steam')}
              </button>
              <button style={tabStyle(tab === 'custom')} onClick={() => setTab('custom')}>
                {t('search.tab_custom')}
              </button>
            </div>
          )}
        </div>

        {/* ── Steam tab ── */}
        {tab === 'steam' && (
          <>
            <div style={{ padding: '14px 20px 10px', flexShrink: 0 }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <svg viewBox="0 0 496 512" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', left: 13, width: 15, height: 15, fill: 'var(--accent)', pointerEvents: 'none', flexShrink: 0 }}>
                  <path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.7-76.3-239-180.4l95.2 39.3c6.4 32.1 34.9 56.4 68.9 56.4 38.2 0 69.1-31.1 68.9-69.3l84.5-60.2c52.1 1.3 95.8-40.9 95.8-93.5 0-51.6-42-93.5-93.7-93.5s-93.7 42-93.7 93.5v1.2L176.6 279c-15.5-.9-30.7 3.4-43.5 12.1L0 236.1C10.2 108.4 117.1 8 247.6 8 384.8 8 496 119 496 256z"/>
                </svg>
                <input
                  autoFocus type="search"
                  placeholder={t('search.steam_ph')}
                  value={query} onChange={handleInput}
                  style={{ ...inputStyle, paddingLeft: 38 }}
                />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
              {loading && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 36, fontSize: 14 }}>{t('search.loading')}</div>}
              {!loading && searchError && (
                <div style={{ textAlign: 'center', color: '#ff6b6b', padding: 36, fontSize: 14, lineHeight: 1.6 }}>
                  {t('search.error')}<br/>
                  <span style={{ fontSize: 12, opacity: .8 }}>{searchError}</span>
                </div>
              )}
              {!loading && !searchError && query && results.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 36, fontSize: 14 }}>{t('search.no_results')}</div>
              )}
              {!loading && !query && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 36, fontSize: 14, lineHeight: 1.8 }}>
                  {t('search.hint').split('\n').map((line, i) => <span key={i}>{line}{i === 0 && <br/>}</span>)}
                </div>
              )}
              {results.map(game => {
                const isAdded = added.has(game.appid);
                return (
                  <div key={game.appid} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <img src={game.header_img} alt={game.name}
                      style={{ width: 104, height: 49, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }}
                      onError={e => { e.target.style.display = 'none'; }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{game.name}</span>
                        {game.in_library && <LibraryBadge />}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {game.in_library && game.playtime_hours > 0 ? `⏱ ${game.playtime_hours}h` : game.in_library ? t('search.never_played') : ''}
                      </div>
                    </div>
                    {isAdded ? (
                      <button onClick={() => handleRemove(game)}
                        style={{ background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 12px', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
                        {t('search.remove')}
                      </button>
                    ) : (
                      <button onClick={() => handleAdd(game)}
                        style={{ background: 'var(--accent)', border: 'none', borderRadius: 7, padding: '6px 12px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                        {t('search.add')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Custom / edit tab ── */}
        {tab === 'custom' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* ── Sous-onglets Fiche / Notes — visibles aussi à la création pour permettre
                 d'ajouter une première note dès la création de la carte/tâche ── */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 22px', flexShrink: 0 }}>
            {[
              { id: 'fiche', label: t('search.subtab_sheet') },
              { id: 'notes', label: `${t('game.tab_notes').replace('📝 ', '')}${notes.length > 0 ? ` (${notes.length})` : ''}` },
            ].map(tab => (
              <button key={tab.id} onClick={() => setCustomSubTab(tab.id)} style={{
                background: 'none', border: 'none',
                borderBottom: customSubTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                padding: '9px 14px', color: customSubTab === tab.id ? 'var(--text)' : 'var(--text-muted)',
                fontWeight: customSubTab === tab.id ? 700 : 400, fontSize: 13,
                cursor: 'pointer', marginBottom: -1, transition: 'color .15s',
              }}>{tab.label}</button>
            ))}
          </div>

          {/* ── Fiche / Notes empilés dans la même cellule de grille : les deux restent
                 montés en permanence, seule la visibilité change. Ainsi la hauteur de la
                 modale est dictée par le plus grand des deux (systématiquement "Fiche",
                 plus complet) et ne varie plus quand on change d'onglet — avant, passer sur
                 "Notes" (souvent vide à la création) faisait rapetisser toute la modale. ── */}
          <div style={{ flex: 1, display: 'grid', overflow: 'hidden' }}>
          <div style={{
            gridArea: '1 / 1', overflowY: 'auto', padding: '20px 22px 16px', display: 'flex', flexDirection: 'column', gap: 18,
            visibility: customSubTab === 'fiche' ? 'visible' : 'hidden',
            pointerEvents: customSubTab === 'fiche' ? 'auto' : 'none',
          }}>
            {!isEditMode && (
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>
                {t('search.custom_desc')}
              </p>
            )}

            {/* ── Live preview ── */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{
                background: 'var(--surface2)',
                // Aperçu en temps réel : type de tâche > couleur perso choisie (boards personnalisés) > bordure neutre par défaut
                border: previewTt ? `1.5px solid ${previewTt.border}` : !isTaskBoard ? `1.5px solid ${customColor}` : '1px solid var(--border)',
                borderRadius: 9, width: 185, overflow: 'hidden',
              }}>
                <div style={{ width: '100%', position: 'relative' }}>
                  {previewTt ? (
                    previewTt.img ? (
                      <img src={previewTt.img} alt={previewTt.label} style={{ width: '100%', height: 'auto', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#111,#1a1a1a)' }}>
                        {PreviewIcon ? <PreviewIcon /> : <span style={{ fontSize: 32 }}>{previewTt.emoji}</span>}
                      </div>
                    )
                  ) : (
                    <div style={{ width: '100%', height: 100, background: 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50 }}>
                      {customEmoji}
                    </div>
                  )}
                  {previewTt && (
                    <div style={{
                      position: 'absolute', bottom: 5, left: 7,
                      background: previewTt.badgeBg, color: previewTt.badgeText,
                      fontSize: 9, fontWeight: 700, padding: '2px 7px',
                      borderRadius: 4, letterSpacing: '0.04em',
                    }}>{(previewTt.labelKey ? t(previewTt.labelKey) : previewTt.label).toUpperCase()}</div>
                  )}
                </div>
                <div style={{ padding: '8px 10px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: customName ? 'var(--text)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {customName || (customOnly ? t('search.ph_task') : t('search.ph_card'))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Emoji picker — hidden when type is set ── */}
            {!customTaskType && (
              <div>
                <label style={{ display: 'block', fontSize: 14, color: 'var(--text-muted)', marginBottom: 9 }}>{t('search.icon_label')}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={() => setShowEmojiPicker(p => !p)}
                    style={{
                      width: 50, height: 50, fontSize: 26, background: 'var(--surface2)',
                      border: '2px solid var(--accent)', borderRadius: 9, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >{customEmoji}</button>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('search.icon_click')}</span>
                </div>
                {showEmojiPicker && (
                  <div style={{ marginTop: 10 }}>
                    <EmojiPicker current={customEmoji} onSelect={e => { setCustomEmoji(e); setShowEmojiPicker(false); }}
                      columns={10} gap={4} btnSize={34} emojiFontSize={18} maxHeight={260} padding={10}
                      catMarginBottom={10} catFontSize={10} catFontWeight={700} catLetterSpacing="0.06em" catLabelMarginBottom={5} />
                  </div>
                )}
              </div>
            )}

            {/* ── Name ── */}
            <div>
              <label style={{ display: 'block', fontSize: 14, color: 'var(--text-muted)', marginBottom: 7 }}>
                {customOnly ? t('search.name_task') : t('search.name_card')}
              </label>
              <input
                autoFocus
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmitCustom()}
                placeholder={customOnly ? t('search.input_ph_task') : t('search.input_ph_card')}
                style={inputStyle}
              />
            </div>

            {/* ── Couleur de la carte (boards personnalisés uniquement) ── */}
            {!isTaskBoard && (
              <div>
                <label style={{ display: 'block', fontSize: 14, color: 'var(--text-muted)', marginBottom: 9 }}>
                  {t('search.color_label')}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="color"
                    value={customColor}
                    onChange={e => setCustomColor(e.target.value)}
                    style={{ width: 40, height: 32, padding: 2, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['#66c0f4','#f5c518','#3db86a','#e05555','#c090f0','#f0a030','#55b8e0','#e87890'].map(c => (
                      <button key={c} onClick={() => setCustomColor(c)} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: customColor === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{customColor}</span>
                </div>
              </div>
            )}

            {/* ── Task type selector (Steam boards only) ── */}
            {customOnly && (
              <div>
                <label style={{ display: 'block', fontSize: 14, color: 'var(--text-muted)', marginBottom: 10 }}>
                  {t('search.type_label')} <span style={{ opacity: 0.55 }}>{t('search.optional')}</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {TASK_TYPES.map(taskTy => {
                    const active = customTaskType === taskTy.id;
                    return (
                      <button key={taskTy.id}
                        onClick={() => setCustomTaskType(active ? null : taskTy.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          padding: '8px 14px',
                          background: active ? taskTy.bg : 'var(--surface2)',
                          border: active ? `2px solid ${taskTy.border}` : '2px solid var(--border)',
                          borderRadius: 22,
                          color: active ? taskTy.textColor : 'var(--text-muted)',
                          fontSize: 13, fontWeight: active ? 700 : 500,
                          cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
                          boxShadow: active ? `0 0 8px ${taskTy.border}` : 'none',
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{taskTy.emoji}</span>
                        <span>{taskTy.labelKey ? t(taskTy.labelKey) : taskTy.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Date ── */}
            <DatePicker
              dateMode={dateMode}
              onDateModeChange={setDateMode}
              dueDate={dueDate}
              onDueDateChange={setDueDate}
              dueTime={dueTime}
              onDueTimeChange={setDueTime}
              startDate={startDate}
              onStartDateChange={setStartDate}
              startTime={startTime}
              onStartTimeChange={setStartTime}
              endDate={endDate}
              onEndDateChange={setEndDate}
              endTime={endTime}
              onEndTimeChange={setEndTime}
            />

            {/* ── Terminée + Urgent ── */}
            <StatusToggles
              isDone={done}
              onToggleDone={() => setDone(v => !v)}
              isUrgent={urgent}
              onToggleUrgent={() => setUrgent(v => !v)}
            />

            {/* ── Assignées (boards Steam seulement) ── */}
            {isTaskBoard && appUsers.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: 14, color: 'var(--text-muted)', marginBottom: 10 }}>
                  {t('search.assignees')} <span style={{ opacity: 0.55 }}>{t('search.optional')}</span>
                </label>
                <AssigneeEditor
                  assignees={assignees}
                  appUsers={appUsers}
                  onUpdateAssignees={setAssignees}
                />
              </div>
            )}

            {/* ── Progress ── */}
            <ProgressSlider value={progress} onChange={setProgress} compact />

          </div>
          {/* end panneau Fiche */}

          {/* ── Sous-onglet Notes ── */}
          <div style={{
            gridArea: '1 / 1', overflowY: 'auto', padding: '16px 22px',
            visibility: customSubTab === 'notes' ? 'visible' : 'hidden',
            pointerEvents: customSubTab === 'notes' ? 'auto' : 'none',
          }}>
            <NotesSection notes={notes} onSave={setNotes} onDraftChange={setNotesDraft} compact={false} token={token} currentUser={currentUser} appUsers={appUsers} />
          </div>
          </div> {/* end grille Fiche/Notes */}

          {/* ── Submit sticky — uniquement en création. En édition, la croix et le clic
                 hors zone enregistrent déjà automatiquement (cf. handleClose) : un bouton
                 "Enregistrer" séparé y serait redondant. En création on le garde : fermer
                 la modale par erreur ne doit jamais créer une carte/tâche involontairement. ── */}
          {!isEditMode && (
            <div style={{ flexShrink: 0, padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
              <button
                onClick={handleSubmitCustom}
                disabled={!customName.trim()}
                style={{
                  width: '100%', padding: '14px', background: 'var(--accent)', border: 'none', borderRadius: 9,
                  color: '#fff', fontWeight: 700, fontSize: 17,
                  cursor: customName.trim() ? 'pointer' : 'not-allowed',
                  opacity: customName.trim() ? 1 : 0.5,
                }}
              >
                {customOnly ? t('search.create_task') : t('search.create_card')}
              </button>
            </div>
          )}
          </div>
        )}
      </div>
    </ModalBackdrop>
  );
}
