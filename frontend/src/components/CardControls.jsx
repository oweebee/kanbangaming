import { useState, useRef, useEffect } from 'react';
import { useLang } from '../i18n.js';
import { formatDateLong } from '../utils.js';

// ── Composants partagés pour les contrôles de carte ──────────────────────────
// StatusToggles  : boutons Terminée + Urgent côte à côte
// DatePicker     : sélecteur date unique / période
// AssigneeEditor : chips + dropdown pour ajouter / retirer des assignés
// Importés par TaskModal, GameModal, SearchModal, GameCard

export function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  return formatDateLong(dateStr + 'T00:00:00');
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '11px 14px',
  background: 'var(--surface2)', border: '2px solid var(--border)',
  borderRadius: 8, color: 'var(--text)', fontSize: 14, outline: 'none',
};

// ── Terminée + Urgent côte à côte ─────────────────────────────────────────────
export function StatusToggles({ isDone, onToggleDone, isUrgent, onToggleUrgent }) {
  const { t } = useLang();
  return (
    <div style={{ display: 'flex', gap: 10 }}>

      {/* ── Terminée ── */}
      <button
        type="button"
        onClick={onToggleDone}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 10,
          background: isDone ? 'rgba(61,184,106,0.12)' : 'var(--surface2)',
          border: `2px solid ${isDone ? '#3db86a' : 'var(--border)'}`,
          borderRadius: 9, padding: '11px 14px', cursor: 'pointer',
          transition: 'all .15s', textAlign: 'left',
          boxShadow: isDone ? '0 0 12px rgba(61,184,106,0.18)' : 'none',
        }}
      >
        {/* Cercle indicateur */}
        <div style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${isDone ? '#3db86a' : 'rgba(255,255,255,0.2)'}`,
          background: isDone ? '#3db86a' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s',
        }}>
          {isDone
            ? <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          }
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: isDone ? '#3db86a' : 'var(--text)' }}>
          {t('ctrl.done')}
        </span>
      </button>

      {/* ── Urgent ── */}
      <button
        type="button"
        onClick={onToggleUrgent}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 10,
          background: isUrgent ? 'rgba(220,40,40,0.12)' : 'var(--surface2)',
          border: `2px solid ${isUrgent ? 'rgba(220,60,60,0.6)' : 'var(--border)'}`,
          borderRadius: 9, padding: '11px 14px', cursor: 'pointer',
          transition: 'all .15s', textAlign: 'left',
          boxShadow: isUrgent ? '0 0 12px rgba(220,40,40,0.2)' : 'none',
        }}
      >
        {/* Cercle indicateur */}
        <div style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${isUrgent ? '#dc3c3c' : 'rgba(255,255,255,0.2)'}`,
          background: isUrgent ? '#dc3c3c' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s',
          fontSize: 13, fontWeight: 900, lineHeight: 1,
          color: isUrgent ? '#fff' : 'rgba(255,255,255,0.25)',
        }}>!</div>
        <span style={{ fontSize: 13, fontWeight: 700, color: isUrgent ? '#ff6060' : 'var(--text)' }}>
          {t('ctrl.urgent')}
        </span>
      </button>

    </div>
  );
}

// ── Sélecteur d'heure (créneaux de 1h) ───────────────────────────────────────
function TimeSelect({ value, onChange }) {
  const { t } = useLang();
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00');
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value || null)}
      style={{
        background: 'var(--surface2)', border: '2px solid var(--border)',
        borderRadius: 8, color: value ? 'var(--text)' : 'var(--text-muted)',
        fontSize: 13, padding: '7px 10px', cursor: 'pointer',
        outline: 'none', width: '100%', colorScheme: 'dark',
      }}
    >
      <option value="">{t('ctrl.time_opt')}</option>
      {hours.map(h => <option key={h} value={h}>{h}</option>)}
    </select>
  );
}

// ── Sélecteur de date / période ───────────────────────────────────────────────
export function DatePicker({
  dateMode, onDateModeChange,
  dueDate, onDueDateChange, dueTime, onDueTimeChange,
  startDate, onStartDateChange, startTime, onStartTimeChange,
  endDate, onEndDateChange, endTime, onEndTimeChange,
}) {
  const { t } = useLang();
  return (
    <div>
      <label style={{ display: 'block', fontSize: 14, color: 'var(--text-muted)', marginBottom: 10 }}>
        {t('ctrl.date_label')} <span style={{ opacity: 0.55 }}>{t('ctrl.optional')}</span>
      </label>

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[
          ['none',   t('ctrl.no_date')],
          ['single', t('ctrl.one_date')],
          ['period', t('ctrl.period')],
        ].map(([mode, lbl]) => (
          <button key={mode} type="button"
            onClick={() => onDateModeChange(mode)}
            style={{
              padding: '7px 15px', borderRadius: 18, cursor: 'pointer', fontSize: 13,
              background: dateMode === mode ? 'var(--accent)' : 'var(--surface2)',
              border: dateMode === mode ? '2px solid var(--accent)' : '2px solid var(--border)',
              color: dateMode === mode ? '#fff' : 'var(--text-muted)',
              fontWeight: dateMode === mode ? 700 : 500,
              transition: 'all .15s',
            }}
          >{lbl}</button>
        ))}
      </div>

      {dateMode === 'single' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input type="date" value={dueDate} onChange={e => onDueDateChange(e.target.value)}
            style={{ ...inputStyle, colorScheme: 'dark' }} />
          {dueDate && onDueTimeChange && (
            <TimeSelect value={dueTime} onChange={onDueTimeChange} />
          )}
        </div>
      )}

      {dateMode === 'period' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="date" value={startDate} onChange={e => onStartDateChange(e.target.value)}
              style={{ ...inputStyle, flex: 1, colorScheme: 'dark' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: 20, flexShrink: 0 }}>→</span>
            <input type="date" value={endDate} onChange={e => onEndDateChange(e.target.value)}
              style={{ ...inputStyle, flex: 1, colorScheme: 'dark' }} />
          </div>
          {(startDate || endDate) && (onStartTimeChange || onEndTimeChange) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                {startDate && onStartTimeChange && <TimeSelect value={startTime} onChange={onStartTimeChange} />}
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 20, flexShrink: 0 }}>→</span>
              <div style={{ flex: 1 }}>
                {endDate && onEndTimeChange && <TimeSelect value={endTime} onChange={onEndTimeChange} />}
              </div>
            </div>
          )}
        </div>
      )}

      {dateMode === 'single' && dueDate && (
        <div style={{
          marginTop: 9, padding: '8px 13px', borderRadius: 8,
          background: 'rgba(180,140,10,0.12)', border: '2px solid rgba(180,140,10,0.35)',
          fontSize: 13, color: 'var(--text-muted)',
        }}>
          {t('ctrl.due_label')}<strong style={{ color: '#d4b020' }}>{formatDateLabel(dueDate)}{dueTime ? `${t('ctrl.at')}${dueTime}` : ''}</strong>
        </div>
      )}
      {dateMode === 'period' && (startDate || endDate) && (
        <div style={{
          marginTop: 9, padding: '8px 13px', borderRadius: 8,
          background: 'rgba(40,100,200,0.12)', border: '2px solid rgba(60,130,220,0.35)',
          fontSize: 13, color: 'var(--text-muted)',
        }}>
          📅 {startDate ? <strong style={{ color: '#80b8f0' }}>{formatDateLabel(startDate)}{startTime ? ` ${startTime}` : ''}</strong> : '…'}
          {' → '}
          {endDate ? <strong style={{ color: '#80b8f0' }}>{formatDateLabel(endDate)}{endTime ? ` ${endTime}` : ''}</strong> : '…'}
        </div>
      )}
    </div>
  );
}

// ── Éditeur d'assignés : chips + ✕ + dropdown ────────────────────────────────
// Props:
//   assignees        — tableau d'IDs actuels
//   appUsers         — tous les utilisateurs disponibles
//   onUpdateAssignees — callback(newAssigneesArray)
//   compact          — mode réduit pour GameCard (avatar 14px, bouton inline)
//   stopPropagation  — ajoute e.stopPropagation() sur tous les clics (pour GameCard)
export function AssigneeEditor({ assignees = [], appUsers = [], onUpdateAssignees, compact = false, stopPropagation = false }) {
  const { t } = useLang();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const sp = stopPropagation ? e => e.stopPropagation() : undefined;
  const available = appUsers.filter(u => u.role !== 'admin' && !assignees.includes(u.id));
  const avatarSize = compact ? 14 : 20;
  const chipFont   = compact ? 11 : 13;

  return (
    <div style={{ position: 'relative' }}>
      {/* ── Chips ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: compact ? 4 : 6, alignItems: 'center', marginBottom: !compact && assignees.length > 0 ? 8 : 0 }}>
        {assignees.map(uid => {
          const u = appUsers.find(x => x.id === uid);
          if (!u) return null;
          return (
            <div key={uid} style={{
              display: 'flex', alignItems: 'center', gap: compact ? 3 : 5,
              background: 'var(--surface3)', border: '2px solid var(--border)',
              borderRadius: 20, padding: compact ? '2px 6px 2px 3px' : '4px 10px 4px 5px', fontSize: chipFont,
            }}>
              {u.steamAvatar
                ? <img src={u.steamAvatar} alt="" style={{ width: avatarSize, height: avatarSize, borderRadius: '50%', flexShrink: 0 }} />
                : <div style={{ width: avatarSize, height: avatarSize, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.max(7, Math.floor(avatarSize * 0.45)), fontWeight: 700, color: '#fff', flexShrink: 0 }}>{u.username?.[0]?.toUpperCase()}</div>
              }
              <span style={{ color: 'var(--text)', maxWidth: compact ? 60 : 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.steamPersonaName || u.username}
              </span>
              <button
                onClick={e => { if (sp) sp(e); onUpdateAssignees(assignees.filter(id => id !== uid)); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: compact ? 9 : 12, cursor: 'pointer', padding: compact ? '0 0 0 1px' : '0 0 0 2px', lineHeight: 1 }}
              >✕</button>
            </div>
          );
        })}

        {/* Compact : bouton + inline avec les chips */}
        {compact && available.length > 0 && (
          <button
            onClick={e => { if (sp) sp(e); setShowMenu(v => !v); }}
            style={{ background: 'var(--surface3)', border: '2px dashed var(--border)', borderRadius: 20, padding: '2px 7px', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}
          >{t('ctrl.add_assignee_short')}</button>
        )}
      </div>

      {/* Normal : bouton pleine largeur sous les chips */}
      {!compact && available.length > 0 && (
        <button
          onClick={() => setShowMenu(v => !v)}
          style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'var(--surface3)', border: '2px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span>{t('ctrl.add_assignee')}</span>
          <span style={{ marginLeft: 'auto', opacity: 0.4 }}>{showMenu ? '▲' : '▼'}</span>
        </button>
      )}

      {/* ── Dropdown ── */}
      {showMenu && (
        <div ref={menuRef} style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'var(--surface2)', border: '2px solid var(--border)',
          borderRadius: 8, marginTop: compact ? 3 : 4,
          maxHeight: compact ? 160 : 180, overflowY: 'auto',
          boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
        }}>
          {available.map(u => (
            <div key={u.id}
              onClick={e => { if (sp) sp(e); onUpdateAssignees([...assignees, u.id]); setShowMenu(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: compact ? 7 : 8, padding: compact ? '7px 10px' : '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface3)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              {u.steamAvatar
                ? <img src={u.steamAvatar} alt="" style={{ width: compact ? 22 : 26, height: compact ? 22 : 26, borderRadius: '50%', flexShrink: 0, border: '1px solid var(--border)' }} />
                : <div style={{ width: compact ? 22 : 26, height: compact ? 22 : 26, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: compact ? 9 : 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{u.username?.[0]?.toUpperCase()}</div>
              }
              <div>
                <div style={{ fontSize: compact ? 12 : 13, color: 'var(--text)', fontWeight: 600 }}>{u.username}</div>
                {u.steamPersonaName && u.steamPersonaName !== u.username && (
                  <div style={{ fontSize: compact ? 10 : 11, color: 'var(--text-muted)' }}>{u.steamPersonaName}</div>
                )}
              </div>
            </div>
          ))}
          {!compact && available.length === 0 && (
            <div style={{ padding: '12px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
              {t('ctrl.all_assigned')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
