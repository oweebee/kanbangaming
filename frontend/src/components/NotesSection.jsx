import { useState, useEffect } from 'react';
import LinkPreview from './LinkPreview.jsx';
import { useLang } from '../i18n.js';

// Renders text with URLs turned into clickable links + rich preview cards
function NoteText({ text, token }) {
  const parts = text.split(/(https?:\/\/\S+)/g);
  const urls = parts.filter(p => /^https?:\/\//.test(p));
  return (
    <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6 }}>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part)
          ? <a key={i} href={part} target="_blank" rel="noreferrer noopener"
              onClick={e => e.stopPropagation()}
              style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
              {part}
            </a>
          : <span key={i}>{part}</span>
      )}
      {/* Preview cards — une par URL unique détectée */}
      {urls.map((u, i) => (
        <LinkPreview key={i} url={u} token={token} />
      ))}
    </span>
  );
}

function formatNoteDate(isoStr) {
  if (!isoStr) return '';
  try {
    return new Date(isoStr).toLocaleString('fr-FR', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
}

// Clé localStorage pour un brouillon de nouvelle note (un par carte/jeu/utilisateur)
function newDraftStorageKey(draftKey, userId) {
  return draftKey ? `notesDraft_${draftKey}_${userId ?? 'anon'}` : null;
}
// Clé localStorage pour un brouillon d'édition d'une note existante (une par note/utilisateur)
function editDraftStorageKey(draftKey, noteId, userId) {
  return draftKey ? `notesDraftEdit_${draftKey}_${noteId}_${userId ?? 'anon'}` : null;
}
function readDraft(key) {
  if (!key) return '';
  try { return localStorage.getItem(key) || ''; } catch { return ''; }
}
function writeDraft(key, val) {
  if (!key) return;
  try { val ? localStorage.setItem(key, val) : localStorage.removeItem(key); } catch { /* ignore (quota/private mode) */ }
}

// Props:
//   notes       – array of {id, text, createdAt, editedAt, authorId?}
//   onSave      – called with full updated notes array on any change
//   compact     – compact styling (SearchModal)
//   currentUser – { id, role } — used to control edit/delete permissions
//   appUsers    – array of user objects (for avatar lookup)
//   draftKey    – identifiant unique (ex: `task_${appid}`) activant la sauvegarde de brouillon en
//                 temps réel (localStorage) pour la nouvelle note ET l'édition d'une note existante.
//                 Si absent (ex: SearchModal), aucune persistance localStorage n'est faite — comportement inchangé.
export default function NotesSection({ notes: externalNotesRaw = [], onSave, onSoftDeleteNote, onDraftChange, draftKey, compact = false, token, currentUser, appUsers = [] }) {
  const { t } = useLang();
  // Sécurité : la valeur par défaut `= []` ne protège que le cas `undefined`.
  // Si la prop `notes` arrive corrompue (null, objet, données legacy…), on la
  // normalise ici en tableau vide plutôt que de planter sur le .map() de
  // l'effet juste en dessous (et sur tous les .map() de la liste plus bas) —
  // erreur observée en prod : "TypeError: x.map is not a function".
  const externalNotes = Array.isArray(externalNotesRaw) ? externalNotesRaw : [];
  const [notes, setNotes]         = useState(externalNotes);
  const [newNote, setNewNote]     = useState(() => readDraft(newDraftStorageKey(draftKey, currentUser?.id)));
  const [newDraftRestored, setNewDraftRestored] = useState(() => !!readDraft(newDraftStorageKey(draftKey, currentUser?.id)));
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText]   = useState('');
  const [editDraftRestored, setEditDraftRestored] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  // Peut modifier/supprimer : admin OU auteur de la note
  // Notes sans authorId (legacy) : admin seulement
  const canModify = (note) =>
    isAdmin || (note.authorId && note.authorId === currentUser?.id);

  useEffect(() => {
    setNotes(externalNotes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalNotes.length, externalNotes.map(n => n.id).join(',')]);

  const push = (updated) => { setNotes(updated); onSave(updated); };

  const setNewNoteWithDraft = (val) => {
    setNewNote(val);
    onDraftChange?.(val);
    writeDraft(newDraftStorageKey(draftKey, currentUser?.id), val);
    if (!val) setNewDraftRestored(false); // texte vidé → plus rien à signaler
  };

  const addNote = () => {
    const text = newNote.trim();
    if (!text) return;
    push([...notes, {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text, createdAt: new Date().toISOString(), editedAt: null,
      authorId: currentUser?.id ?? null,
    }]);
    setNewNoteWithDraft('');
    setNewDraftRestored(false);
  };

  // Soft-delete : appelle l'endpoint dédié si disponible, sinon fallback via push
  const deleteNote = async (id) => {
    const updated = notes.map(n => n.id === id ? { ...n, deletedAt: new Date().toISOString() } : n);
    setNotes(updated);
    if (onSoftDeleteNote) {
      try {
        await onSoftDeleteNote(id);
        onSave?.(updated);
      } catch (e) {
        setNotes(notes);
        console.error('[NotesSection] soft-delete note error:', e);
      }
    } else {
      push(updated);
    }
  };

  // Ouvre l'édition d'une note : récupère un éventuel brouillon non enregistré (localStorage)
  // s'il diffère du texte actuel de la note (sinon on repart du texte tel quel).
  const startEdit = (note) => {
    const draft = readDraft(editDraftStorageKey(draftKey, note.id, currentUser?.id));
    const restored = !!draft && draft !== note.text;
    setEditingId(note.id);
    setEditText(restored ? draft : note.text);
    setEditDraftRestored(restored);
  };

  const setEditTextWithDraft = (val) => {
    setEditText(val);
    writeDraft(editDraftStorageKey(draftKey, editingId, currentUser?.id), val);
  };

  const cancelEdit = () => {
    writeDraft(editDraftStorageKey(draftKey, editingId, currentUser?.id), '');
    setEditingId(null);
    setEditDraftRestored(false);
  };

  const saveEdit = () => {
    const text = editText.trim();
    writeDraft(editDraftStorageKey(draftKey, editingId, currentUser?.id), '');
    if (!text) { setEditingId(null); setEditDraftRestored(false); return; }
    push(notes.map(n => n.id === editingId ? { ...n, text, editedAt: new Date().toISOString() } : n));
    setEditingId(null);
    setEditDraftRestored(false);
  };

  // Afficher uniquement les notes actives (pas dans la corbeille), du plus récent au plus ancien
  const sorted = [...notes].filter(n => !n.deletedAt).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const labelStyle = {
    display: 'block', fontSize: compact ? 14 : 12,
    fontWeight: 600, color: 'var(--text-muted)',
    marginBottom: compact ? 10 : 7,
    textTransform: 'uppercase', letterSpacing: '0.06em',
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 7, color: 'var(--text)',
    fontSize: compact ? 14 : 12,
    padding: compact ? '10px 12px' : '8px 10px',
    outline: 'none', resize: 'vertical', minHeight: compact ? 80 : 62,
    fontFamily: 'inherit', lineHeight: 1.5,
  };

  return (
    <div>
      <label style={labelStyle}>{t('notes.label')}</label>

      {/* ── New note input — always at top ── */}
      <textarea
        value={newNote}
        onChange={e => setNewNoteWithDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote(); }}
        placeholder={notes.length === 0 ? t('notes.ph_first') : t('notes.ph_more')}
        style={inputStyle}
      />
      {newDraftRestored && newNote.trim() && (
        <div style={{ fontSize: 11, color: 'var(--accent)', fontStyle: 'italic', marginTop: 4 }}>
          {t('notes.draft_restored')}
        </div>
      )}
      <button
        onClick={addNote}
        disabled={!newNote.trim()}
        style={{
          marginTop: 6, marginBottom: notes.length > 0 ? 10 : 0,
          width: '100%',
          background: newNote.trim() ? 'rgba(192,87,10,0.12)' : 'var(--surface2)',
          border: newNote.trim() ? '1px solid var(--accent)' : '1px solid var(--border)',
          borderRadius: 7, padding: compact ? '8px' : '6px',
          color: newNote.trim() ? 'var(--accent)' : 'var(--text-muted)',
          fontSize: compact ? 13 : 12, fontWeight: 600,
          cursor: newNote.trim() ? 'pointer' : 'not-allowed',
          opacity: newNote.trim() ? 1 : 0.5,
          transition: 'all .15s',
        }}
      >{t('notes.add_btn')}</button>

      {/* ── Existing notes — newest first. Pas de scroll interne dédié : la liste s'étire
           naturellement et c'est le conteneur parent (déjà overflowY:auto dans les modales
           qui utilisent NotesSection) qui gère le défilement, uniquement si l'ensemble du
           panneau (zone de saisie + liste) dépasse la hauteur dispo. Évite une barre de
           défilement imbriquée qui apparaîtrait avant que ce soit vraiment nécessaire. ── */}
      {notes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 2 }}>
          {sorted.map(note => {
            // Priorité à currentUser pour ses propres notes (données Steam toujours dispo)
            const author = note.authorId
              ? (note.authorId === currentUser?.id ? currentUser : appUsers.find(u => u.id === note.authorId))
              : null;
            const initials = author?.username?.[0]?.toUpperCase() || '?';
            const modifiable = canModify(note);
            return (
            <div key={note.id} style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 7, padding: '9px 11px',
              borderLeft: '3px solid var(--accent)',
            }}>
              {editingId === note.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <textarea autoFocus value={editText}
                    onChange={e => setEditTextWithDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                    style={{ ...inputStyle, minHeight: 52 }}
                  />
                  {editDraftRestored && (
                    <div style={{ fontSize: 11, color: 'var(--accent)', fontStyle: 'italic' }}>
                      {t('notes.draft_restored')}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={saveEdit}
                      style={{ flex: 1, background: 'var(--accent)', border: 'none', borderRadius: 6, padding: '6px 0', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >{t('notes.save')}</button>
                    <button onClick={cancelEdit}
                      style={{ background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}
                    >{t('notes.cancel')}</button>
                  </div>
                </div>
              ) : (
                <>
                  {/* En-tête note : avatar auteur + actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                    {/* Avatar + pseudo */}
                    {note.authorId && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        {author?.steamAvatar
                          ? <img src={author.steamAvatar} alt={author.username || ''} style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid var(--border)', flexShrink: 0, objectFit: 'cover' }} />
                          : <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0, border: '1.5px solid var(--border)' }}>{initials}</div>
                        }
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', opacity: 0.85, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {author?.steamPersonaName || author?.username || t('notes.unknown')}
                        </span>
                      </div>
                    )}
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.7, flex: 1 }}>
                      {formatNoteDate(note.createdAt)}
                      {note.editedAt && <span style={{ marginLeft: 5, fontStyle: 'italic' }}>{t('notes.modified')}</span>}
                    </span>
                    {/* Boutons edit / delete — uniquement si autorisé */}
                    {modifiable && (<>
                      <button
                        onClick={e => { e.stopPropagation(); startEdit(note); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.55, padding: '2px 4px', lineHeight: 1, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                        title={t('card.edit_title')}
                      >
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                        </svg>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); if (window.confirm(t('notes.trash_confirm'))) deleteNote(note.id); }}
                        style={{ background: 'none', border: 'none', color: '#c05050', cursor: 'pointer', opacity: 0.6, padding: '2px 4px', lineHeight: 1, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                        title={t('card.delete')}
                      >
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </>)}
                  </div>
                  <div style={{ fontSize: compact ? 13 : 12, color: 'var(--text)' }}>
                    <NoteText text={note.text} token={token} />
                  </div>
                </>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
