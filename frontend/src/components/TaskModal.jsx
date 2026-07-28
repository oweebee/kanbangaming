import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getTaskType } from '../taskTypes.jsx';
import NotesSection from './NotesSection.jsx';
import ProgressSlider, { progressColor } from './ProgressSlider.jsx';
import { StatusToggles, DatePicker, AssigneeEditor } from './CardControls.jsx';
import ModalBackdrop from './ModalBackdrop.jsx';
import SwipeTabs from './SwipeTabs.jsx';
import { useLang } from '../i18n.js';
import { formatDateFull, formatDateShort } from '../utils.js';

// ── Date helpers ──────────────────────────────────────────────────────────────

function parseLocalDate(str) {
  if (!str) return null;
  return new Date(str + 'T00:00:00');
}

function formatDate(d) {
  return formatDateFull(d);
}

function formatShortDate(d) {
  return formatDateShort(d);
}

function getDateInfo(game) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (game.startDate && game.endDate) {
    const start = parseLocalDate(game.startDate);
    const end   = parseLocalDate(game.endDate);
    const label = formatShortDate(start) + ' → ' + formatShortDate(end);
    const detail = formatDate(start) + ' → ' + formatDate(end);
    if (today < start) return { label, detail, status: 'future',  color: '#c9a010', bg: 'rgba(180,140,10,0.15)', border: 'rgba(180,140,10,0.45)' };
    if (today > end)   return { label, detail, status: 'past',    color: '#c03030', bg: 'rgba(160,20,20,0.15)',  border: 'rgba(160,20,20,0.45)' };
    return            { label, detail, status: 'active',  color: '#2a8a3a', bg: 'rgba(30,120,50,0.15)',  border: 'rgba(30,120,50,0.45)' };
  }

  if (game.dueDate) {
    const due   = parseLocalDate(game.dueDate);
    const label = formatShortDate(due);
    const detail = formatDate(due);
    if (today.getTime() === due.getTime()) return { label, detail, status: 'active', color: '#2a8a3a', bg: 'rgba(30,120,50,0.15)',  border: 'rgba(30,120,50,0.45)' };
    if (today < due)                       return { label, detail, status: 'future', color: '#c9a010', bg: 'rgba(180,140,10,0.15)', border: 'rgba(180,140,10,0.45)' };
    return                                 { label, detail, status: 'past',   color: '#c03030', bg: 'rgba(160,20,20,0.15)',  border: 'rgba(160,20,20,0.45)' };
  }

  return null;
}

// STATUS_LABEL is now handled via i18n t() calls inside components

// ── Assignee row ──────────────────────────────────────────────────────────────

function AssigneeRow({ assignees = [], appUsers = [], borderColor = 'var(--border)' }) {
  const { t } = useLang();
  const [popup, setPopup] = useState(null); // { user, rect }
  const timerRef = useRef(null);

  const users = assignees
    .map(id => appUsers.find(u => u.id === id))
    .filter(Boolean);

  if (users.length === 0) return null;

  const popupWidth = 160;
  const popupHeight = 80;
  const gap = 8;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>{t('task.assignees')}</span>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        {users.map(user => {
          const initials = user.username?.[0]?.toUpperCase() || '?';
          const isHovered = popup?.user?.id === user.id;
          return (
            <div
              key={user.id}
              style={{ position: 'relative' }}
              onMouseEnter={e => {
                clearTimeout(timerRef.current);
                const rect = e.currentTarget.getBoundingClientRect();
                setPopup({ user, rect });
              }}
              onMouseLeave={() => { timerRef.current = setTimeout(() => setPopup(null), 80); }}
              onClick={() => user.steamId && window.open(`https://steamcommunity.com/profiles/${user.steamId}`, '_blank')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '2px solid var(--border)', borderRadius: 20, padding: '4px 10px 4px 5px', cursor: user.steamId ? 'pointer' : 'default' }}>
                {user.steamAvatar ? (
                  <img src={user.steamAvatar} alt="" style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, border: `1.5px solid ${borderColor}` }} />
                ) : (
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0, border: `1.5px solid ${borderColor}` }}>{initials}</div>
                )}
                <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{user.steamPersonaName || user.username}</span>
                {user.steamId && (
                  <svg viewBox="0 0 496 512" xmlns="http://www.w3.org/2000/svg" style={{ width: 9, height: 9, fill: 'var(--text-muted)', opacity: 0.5, flexShrink: 0 }}>
                    <path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.7-76.3-239-180.4l95.2 39.3c6.4 32.1 34.9 56.4 68.9 56.4 38.2 0 69.1-31.1 68.9-69.3l84.5-60.2c52.1 1.3 95.8-40.9 95.8-93.5 0-51.6-42-93.5-93.7-93.5s-93.7 42-93.7 93.5v1.2L176.6 279c-15.5-.9-30.7 3.4-43.5 12.1L0 236.1C10.2 108.4 117.1 8 247.6 8 384.8 8 496 119 496 256z"/>
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Portal popup — renders in body to bypass overflow clipping */}
      {popup && createPortal(
        <div style={{
          position: 'fixed',
          left: Math.min(
            Math.max(8, popup.rect.left + popup.rect.width / 2 - popupWidth / 2),
            window.innerWidth - popupWidth - 8
          ),
          top: popup.rect.top - popupHeight - gap < 8
            ? popup.rect.bottom + gap
            : popup.rect.top - popupHeight - gap,
          width: popupWidth,
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 9, padding: '10px 12px',
          zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.55)',
          pointerEvents: 'auto',
          cursor: popup.user.steamId ? 'pointer' : 'default',
        }}
        onClick={() => popup.user.steamId && window.open(`https://steamcommunity.com/profiles/${popup.user.steamId}`, '_blank')}
        onMouseEnter={() => clearTimeout(timerRef.current)}
        onMouseLeave={() => { timerRef.current = setTimeout(() => setPopup(null), 80); }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: popup.user.steamId ? 8 : 0 }}>
            {popup.user.steamAvatar ? (
              <img src={popup.user.steamAvatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff', flexShrink: 0 }}>
                {popup.user.username?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{popup.user.username}</div>
              {popup.user.steamPersonaName && popup.user.steamPersonaName !== popup.user.username && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{popup.user.steamPersonaName}</div>
              )}
            </div>
          </div>
          {popup.user.steamId && (
            <div style={{ textAlign: 'center', fontSize: 10, color: '#c7d5e0', background: '#1b2838', borderRadius: 5, padding: '4px 8px', letterSpacing: '0.02em' }}>
              <svg viewBox="0 0 496 512" xmlns="http://www.w3.org/2000/svg" style={{ width: 9, height: 9, fill: '#c7d5e0', marginRight: 4, verticalAlign: 'middle' }}>
                <path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.7-76.3-239-180.4l95.2 39.3c6.4 32.1 34.9 56.4 68.9 56.4 38.2 0 69.1-31.1 68.9-69.3l84.5-60.2c52.1 1.3 95.8-40.9 95.8-93.5 0-51.6-42-93.5-93.7-93.5s-93.7 42-93.7 93.5v1.2L176.6 279c-15.5-.9-30.7 3.4-43.5 12.1L0 236.1C10.2 108.4 117.1 8 247.6 8 384.8 8 496 119 496 256z"/>
              </svg>
              {t('task.steam_profile')}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

// ── TaskModal ─────────────────────────────────────────────────────────────────

export default function TaskModal({ game, onClose, onEdit, appUsers = [], onPatchGame, onSoftDeleteNote, isTaskBoard, token, defaultTab = 'infos', currentUser }) {
  const { t } = useLang();
  const tt        = game.taskType ? getTaskType(game.taskType) : null;
  const TtIcon    = tt?.FallbackIcon;
  const [ttImgError, setTtImgError] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const dateInfo  = getDateInfo(game);
  const isUrgent  = !!game.urgent;
  const isDone    = !!game.done;
  const notesCount = (game.notes || []).filter(n => !n.deletedAt).length;
  const customColor = !tt && game.color ? game.color : null;
  const cardBorderColor = isDone ? 'rgba(61,184,106,0.6)' : isUrgent ? 'rgba(220,60,60,0.6)' : tt ? tt.border : customColor || 'var(--border)';

  // Couleur de la carte (boards personnalisés uniquement)
  const [cardColor,  setCardColor]  = useState(game.color || '#66c0f4');
  const handleColorChange = (c) => { setCardColor(c); if (onPatchGame) onPatchGame(game.appid, { color: c }); };

  // Date state — éditable directement depuis la modal
  const [dateMode,   setDateMode]   = useState(game.startDate ? 'period' : game.dueDate ? 'single' : 'none');
  const [dueDate,    setDueDate]    = useState(game.dueDate    || '');
  const [startDate,  setStartDate]  = useState(game.startDate  || '');
  const [endDate,    setEndDate]    = useState(game.endDate    || '');
  const [dueTime,    setDueTime]    = useState(game.dueTime    || '');
  const [startTime,  setStartTime]  = useState(game.startTime  || '');
  const [endTime,    setEndTime]    = useState(game.endTime    || '');

  const handleSaveNotes    = (notes)    => { if (onPatchGame) onPatchGame(game.appid, { notes }); };
  const handleSaveProgress = (progress) => {
    if (onPatchGame) {
      const updates = { progress };
      if (progress === 100) updates.done = true;
      else if (isDone) updates.done = false; // annule l'auto-done si on redescend en-dessous de 100%
      onPatchGame(game.appid, updates);
    }
  };
  const handleToggleDone   = () => { if (onPatchGame) onPatchGame(game.appid, { done: !isDone }); };
  const handleToggleUrgent = () => { if (onPatchGame) onPatchGame(game.appid, { urgent: !isUrgent }); };
  const handleUpdateAssignees = (assignees) => { if (onPatchGame) onPatchGame(game.appid, { assignees }); };

  const handleDateModeChange  = (mode) => {
    setDateMode(mode);
    if (mode === 'none')   { setDueDate(''); setStartDate(''); setEndDate(''); setDueTime(''); setStartTime(''); setEndTime(''); if (onPatchGame) onPatchGame(game.appid, { dueDate: null, startDate: null, endDate: null, dueTime: null, startTime: null, endTime: null }); }
    if (mode === 'single') { setStartDate(''); setEndDate(''); setStartTime(''); setEndTime(''); }
    if (mode === 'period') { setDueDate(''); setDueTime(''); }
  };
  const handleDueDateChange    = (v) => { setDueDate(v);    if (onPatchGame) onPatchGame(game.appid, { dueDate: v || null }); };
  const handleStartDateChange  = (v) => { setStartDate(v);  if (onPatchGame) onPatchGame(game.appid, { startDate: v || null }); };
  const handleEndDateChange    = (v) => { setEndDate(v);    if (onPatchGame) onPatchGame(game.appid, { endDate: v || null }); };
  const handleDueTimeChange    = (v) => { setDueTime(v);    if (onPatchGame) onPatchGame(game.appid, { dueTime: v || null }); };
  const handleStartTimeChange  = (v) => { setStartTime(v);  if (onPatchGame) onPatchGame(game.appid, { startTime: v || null }); };
  const handleEndTimeChange    = (v) => { setEndTime(v);    if (onPatchGame) onPatchGame(game.appid, { endTime: v || null }); };

  return (
    <ModalBackdrop onClose={onClose}>
      <div style={{
        background: 'var(--surface)',
        border: isUrgent ? '2px solid rgba(220,60,60,0.6)' : tt ? `2px solid ${tt.border}` : `2px solid ${customColor || 'var(--border)'}`,
        borderRadius: 14, width: '100%', maxWidth: 500,
        height: '88vh', minHeight: 420, maxHeight: 800, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: isUrgent ? '0 0 30px rgba(220,40,40,0.15)' : undefined,
      }}>

        {/* ── Header illustration / emoji ── */}
        <div style={{
          position: 'relative', flexShrink: 0,
          background: tt ? 'linear-gradient(135deg,#111 0%,#1a1a1a 100%)' : 'linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', minHeight: tt?.img && !ttImgError ? 0 : 148,
        }}>
          {tt ? (
            tt.img && !ttImgError ? (
              <img src={tt.img} alt={tt.label} onError={() => setTtImgError(true)}
                style={{ width: '100%', height: 'auto', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', height: 148, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {TtIcon ? <TtIcon /> : <span style={{ fontSize: 60 }}>{tt.emoji}</span>}
              </div>
            )
          ) : (
            <span style={{ fontSize: 60, lineHeight: 1, userSelect: 'none' }}>{game.emoji || '🎮'}</span>
          )}

          {/* Gradient fade-to-surface at bottom */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--surface) 0%, transparent 55%)' }} />

          {/* Type badge top-left */}
          {tt && (
            <div style={{
              position: 'absolute', top: 10, left: 12,
              background: tt.badgeBg, color: tt.badgeText,
              fontSize: 9, fontWeight: 700, padding: '3px 8px',
              borderRadius: 5, letterSpacing: '0.05em',
            }}>{tt.emoji} {(tt.labelKey ? t(tt.labelKey) : tt.label).toUpperCase()}</div>
          )}

          {/* Buttons top-right */}
          <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6 }}>
            {onEdit && (
              <button
                onClick={onEdit}
                title={t('task.edit_title')}
                style={{
                  background: 'rgba(0,0,0,0.55)', border: '2px solid rgba(255,255,255,0.18)',
                  borderRadius: 7, width: 32, height: 32, color: '#ccc', fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'rgba(0,0,0,0.55)', border: '2px solid rgba(255,255,255,0.18)',
                borderRadius: 7, width: 32, height: 32, color: '#ccc', fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>
          </div>

          {/* Title overlay */}
          <div style={{ position: 'absolute', bottom: 14, left: 16, right: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 20, lineHeight: 1.2, color: 'var(--text)' }}>
              {game.name}
            </div>
            {tt && (
              <div style={{ fontSize: 12, marginTop: 3, color: tt.textColor, opacity: 0.85 }}>
                {tt.emoji} {tt.labelKey ? t(tt.labelKey) : tt.label}
              </div>
            )}
          </div>
        </div>

        <SwipeTabs
          tabs={[
            { id: 'infos',  label: t('task.tab_infos') },
            { id: 'notes',  label: `${t('task.tab_notes').replace('...', '')}${notesCount > 0 ? ` (${notesCount})` : ''}` },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabBarStyle={{ padding: '0 4px', background: 'var(--surface)' }}
          tabBtnStyle={(active) => ({
            background: 'none', border: 'none',
            borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
            padding: '10px 18px', color: active ? 'var(--text)' : 'var(--text-muted)',
            fontWeight: active ? 700 : 400, fontSize: 13,
            cursor: 'pointer', marginBottom: -1, transition: 'color .15s',
          })}
        >

          {/* ══ PANNEAU INFOS ══ */}
          <div style={{ overflowY: 'auto', padding: '14px 16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* ── Terminée + Urgent ── */}
            <StatusToggles
              isDone={isDone} onToggleDone={handleToggleDone}
              isUrgent={isUrgent} onToggleUrgent={handleToggleUrgent}
            />

            {/* Date — éditable */}
            <DatePicker
              dateMode={dateMode}
              onDateModeChange={handleDateModeChange}
              dueDate={dueDate}
              onDueDateChange={handleDueDateChange}
              dueTime={dueTime}
              onDueTimeChange={handleDueTimeChange}
              startDate={startDate}
              onStartDateChange={handleStartDateChange}
              startTime={startTime}
              onStartTimeChange={handleStartTimeChange}
              endDate={endDate}
              onEndDateChange={handleEndDateChange}
              endTime={endTime}
              onEndTimeChange={handleEndTimeChange}
            />

            {/* Assignées — éditable */}
            {isTaskBoard && appUsers.length > 0 && (
              <div style={{ background: 'var(--surface2)', border: `2px solid ${cardBorderColor}`, borderRadius: 9, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
                  {t('task.assignees')}
                </div>
                <AssigneeEditor
                  assignees={game.assignees || []}
                  appUsers={appUsers}
                  onUpdateAssignees={handleUpdateAssignees}
                />
              </div>
            )}

            {/* Progress */}
            <div style={{ background: 'var(--surface2)', border: '2px solid var(--border)', borderRadius: 9, padding: '12px 14px' }}>
              <ProgressSlider
                value={game.progress ?? null}
                onChange={handleSaveProgress}
              />
            </div>

            {/* Couleur de la carte — uniquement boards personnalisés */}
            {!isTaskBoard && (
              <div style={{ background: 'var(--surface2)', border: '2px solid var(--border)', borderRadius: 9, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
                  {t('task.color_label')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    type="color"
                    value={cardColor}
                    onChange={e => handleColorChange(e.target.value)}
                    style={{ width: 36, height: 30, padding: 2, background: 'var(--surface3)', border: '2px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['#66c0f4','#f5c518','#3db86a','#e05555','#c090f0','#f0a030','#55b8e0','#e87890'].map(c => (
                      <button key={c} onClick={() => handleColorChange(c)}
                        style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: cardColor === c ? '2.5px solid #fff' : '2px solid transparent', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{cardColor}</span>
                </div>
              </div>
            )}

            {/* Meta row — emoji only for untyped cards */}
            {!game.taskType && game.emoji && (
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ background: 'var(--surface2)', borderRadius: 7, padding: '5px 10px', fontSize: 20 }}>
                  {game.emoji}
                </div>
              </div>
            )}
          </div>

          {/* ══ PANNEAU NOTES ══ */}
          <div style={{ overflowY: 'auto', padding: '14px 16px 20px' }}>
            <NotesSection
              notes={game.notes || []}
              onSave={handleSaveNotes}
              onSoftDeleteNote={onSoftDeleteNote ? (noteId) => onSoftDeleteNote(game.appid, noteId) : undefined}
              draftKey={`task_${game.appid}`}
              compact={false}
              token={token}
              currentUser={currentUser}
              appUsers={appUsers}
            />
          </div>

        </SwipeTabs>
      </div>
    </ModalBackdrop>
  );
}

// Export the date helper for use in GameCard
export { getDateInfo };
