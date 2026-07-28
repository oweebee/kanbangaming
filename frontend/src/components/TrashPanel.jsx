import { useState, useEffect } from 'react';
import { useLang } from '../i18n.js';
import { formatDateLong, authHeaders } from '../utils.js';

const API = '/api';

function formatDate(isoStr) {
  return formatDateLong(isoStr);
}

// SVG corbeille propre (outline, style cohérent avec le reste de l'appli)
function TrashIcon({ size = 11 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/>
      <path d="M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  );
}

// Composant réutilisable pour user (isAdmin=false) et admin (isAdmin=true).
export default function TrashPanel({ token, isAdmin = false }) {
  const { t } = useLang();
  const [items, setItems]         = useState([]);
  const [boards, setBoards]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [purging, setPurging]     = useState(false);
  const [acting, setActing]       = useState(new Set());

  const baseUrl = isAdmin ? `${API}/admin/trash` : `${API}/trash/notes`;

  async function load() {
    setLoading(true);
    setFetchError(null);
    try {
      const headers = authHeaders(token);
      const [itemsRes, boardsRes] = await Promise.all([
        fetch(baseUrl, { headers }),
        isAdmin ? Promise.resolve(null) : fetch(`${API}/trash/boards`, { headers }),
      ]);
      if (!itemsRes.ok) { setFetchError(`Erreur ${itemsRes.status}`); setLoading(false); return; }
      setItems(await itemsRes.json());
      if (boardsRes?.ok) setBoards(await boardsRes.json());
    } catch {
      setFetchError('Erreur réseau');
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [token, isAdmin]);

  async function act(key, fn) {
    setActing(prev => new Set([...prev, key]));
    await fn();
    setActing(prev => { const s = new Set(prev); s.delete(key); return s; });
    load();
  }

  // ── Actions jeu (carte kanban) ─────────────────────────────────────
  async function restoreGame(item) {
    const url  = isAdmin ? `${API}/admin/trash/games/restore` : `${API}/trash/games/restore`;
    const body = isAdmin
      ? { userId: item.userId, boardId: item.boardId, gameId: item.gameId }
      : { boardId: item.boardId, gameId: item.gameId };
    act(item.gameId, () => fetch(url, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }));
  }

  async function permDeleteGame(item) {
    if (!window.confirm(t('trash.confirm_perm_delete'))) return;
    const url  = isAdmin ? `${API}/admin/trash/games/item` : `${API}/trash/games/item`;
    const body = isAdmin
      ? { userId: item.userId, boardId: item.boardId, gameId: item.gameId }
      : { boardId: item.boardId, gameId: item.gameId };
    act(item.gameId, () => fetch(url, { method: 'DELETE', headers: authHeaders(token), body: JSON.stringify(body) }));
  }

  // ── Actions note texte ─────────────────────────────────────────────
  async function restoreNote(item) {
    const url  = isAdmin ? `${API}/admin/trash/restore` : `${API}/trash/notes/restore`;
    const body = isAdmin
      ? { userId: item.userId, boardId: item.boardId, gameId: item.gameId, noteId: item.id }
      : { boardId: item.boardId, gameId: item.gameId, noteId: item.id };
    act(item.id, () => fetch(url, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }));
  }

  async function permDeleteNote(item) {
    if (!window.confirm(t('trash.confirm_perm_delete'))) return;
    const url  = isAdmin ? `${API}/admin/trash/item` : `${API}/trash/notes/item`;
    const body = isAdmin
      ? { userId: item.userId, boardId: item.boardId, gameId: item.gameId, noteId: item.id }
      : { boardId: item.boardId, gameId: item.gameId, noteId: item.id };
    act(item.id, () => fetch(url, { method: 'DELETE', headers: authHeaders(token), body: JSON.stringify(body) }));
  }

  // ── Actions board ──────────────────────────────────────────────────
  async function restoreBoard(board) {
    act(`board_${board.id}`, () => fetch(`${API}/trash/boards/restore`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ boardId: board.id }),
    }));
  }

  async function permDeleteBoard(board) {
    if (!window.confirm(t('trash.confirm_perm_delete'))) return;
    act(`board_${board.id}`, () => fetch(`${API}/trash/boards/item`, {
      method: 'DELETE',
      headers: authHeaders(token),
      body: JSON.stringify({ boardId: board.id }),
    }));
  }

  async function purgeAll() {
    if (!window.confirm(t('trash.confirm_purge'))) return;
    setPurging(true);
    await fetch(baseUrl, { method: 'DELETE', headers: authHeaders(token) });
    setPurging(false);
    setItems([]);
    setBoards([]);
  }

  // ── États vide / chargement / erreur ──────────────────────────────
  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
      {t('common.loading')}
    </div>
  );

  if (fetchError) return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <div style={{ fontSize: 13, color: '#d07070', marginBottom: 12 }}>{fetchError}</div>
      <button onClick={load} style={{ background: 'rgba(255,255,255,.07)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 16px', color: 'var(--text)', fontSize: 12, cursor: 'pointer' }}>
        ⟳ Réessayer
      </button>
    </div>
  );

  if (items.length === 0 && boards.length === 0) return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 6 }}>
        {t('trash.empty_title')}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
        {t('trash.empty_desc')}
      </div>
      <button onClick={load} style={{ background: 'rgba(255,255,255,.07)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 16px', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
        ⟳ Rafraîchir
      </button>
    </div>
  );

  // Liste unifiée — boards, cartes et notes mélangés, triés du plus récent
  // au plus ancien (deletedAt desc), sans distinction de catégorie.
  const merged = [
    ...boards.map(b => ({ ...b, _kind: 'board' })),
    ...items.map(i => ({ ...i, _kind: i.type })), // 'game' | 'note'
  ].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

  return (
    <div>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>
          {t('trash.count', { count: merged.length })}
        </div>
        <button onClick={load} title="Rafraîchir"
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '4px 9px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1 }}>
          ⟳
        </button>
        <button onClick={purgeAll} disabled={purging}
          style={{ background: 'rgba(192,80,80,0.1)', border: '1px solid rgba(192,80,80,0.4)', borderRadius: 7, padding: '5px 12px', cursor: purging ? 'not-allowed' : 'pointer', color: '#d07070', fontSize: 11, fontWeight: 600, opacity: purging ? 0.6 : 1 }}>
          {purging ? '…' : t('trash.purge_btn')}
        </button>
      </div>

      {/* Liste unifiée, triée par date de suppression (récent → ancien) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {merged.map(entry => {
          // ══ Board supprimé ════════════════════════════════════════
          if (entry._kind === 'board') {
            const board  = entry;
            const actKey = `board_${board.id}`;
            const busy   = acting.has(actKey);
            const urgent = board.daysLeft <= 3;
            return (
              <div key={`board_${board.id}`} style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 10, overflow: 'hidden',
                borderLeft: `3px solid ${urgent ? '#d07070' : 'rgba(192,120,60,0.6)'}`,
                opacity: busy ? 0.55 : 1, transition: 'opacity .15s',
              }}>
                {board.headerImg && (
                  <div style={{ position: 'relative', height: 48, overflow: 'hidden' }}>
                    <img src={board.headerImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45 }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 20%, var(--surface2))' }} />
                    <span style={{ position: 'absolute', top: 6, left: 9, fontSize: 9, fontWeight: 800, color: '#fff', textShadow: '0 1px 3px #000', letterSpacing: '0.1em', background: 'rgba(0,0,0,0.45)', borderRadius: 3, padding: '1px 5px' }}>
                      CORBEILLE · BOARD
                    </span>
                  </div>
                )}
                <div style={{ padding: '9px 13px 11px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {!board.headerImg && (
                      <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{board.emoji || '🎮'}</span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {board.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                        {board.gameCount} carte{board.gameCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <span style={{ flexShrink: 0, fontSize: 10, fontWeight: urgent ? 700 : 400, color: urgent ? '#d07070' : 'var(--text-muted)' }}>
                      {t('trash.days_left', { days: board.daysLeft })}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
                    {t('trash.deleted_on')} {formatDate(board.deletedAt)}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => restoreBoard(board)} disabled={busy}
                      style={{ flex: 1, background: 'rgba(61,184,106,0.1)', border: '1px solid rgba(61,184,106,0.4)', borderRadius: 6, padding: '5px 0', cursor: busy ? 'not-allowed' : 'pointer', color: '#3db86a', fontSize: 11, fontWeight: 600 }}>
                      {t('trash.restore')}
                    </button>
                    <button onClick={() => permDeleteBoard(board)} disabled={busy}
                      style={{ background: 'rgba(192,80,80,0.08)', border: '1px solid rgba(192,80,80,0.3)', borderRadius: 6, padding: '5px 10px', cursor: busy ? 'not-allowed' : 'pointer', color: '#d07070', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <TrashIcon size={10} />
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          // ══ Carte jeu ou note texte ═══════════════════════════════
          const item   = entry;
          const isGame = item._kind === 'game';
          const key    = isGame ? `game_${item.boardId}_${item.gameId}` : `note_${item.id}_${item.userId || ''}`;
          const actKey = isGame ? item.gameId : item.id;
          const busy   = acting.has(actKey);
          const urgent = item.daysLeft <= 3;

          return (
            <div key={key} style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 10, overflow: 'hidden',
              borderLeft: `3px solid ${urgent ? '#d07070' : isGame ? 'rgba(100,140,220,0.6)' : 'rgba(192,80,80,0.45)'}`,
              opacity: busy ? 0.55 : 1, transition: 'opacity .15s',
            }}>
              {isGame ? (
                /* ══ Carte jeu (kanban) ══════════════════════════════ */
                <div>
                  {/* Bannière */}
                  {item.gameIcon && (
                    <div style={{ position: 'relative', height: 56, overflow: 'hidden' }}>
                      <img src={item.gameIcon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, var(--surface2))' }} />
                      <span style={{ position: 'absolute', top: 6, left: 9, fontSize: 9, fontWeight: 800, color: '#fff', textShadow: '0 1px 3px #000', letterSpacing: '0.1em', background: 'rgba(0,0,0,0.45)', borderRadius: 3, padding: '1px 5px' }}>
                        CORBEILLE
                      </span>
                    </div>
                  )}
                  <div style={{ padding: '9px 13px 11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                      {!item.gameIcon && (
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(100,140,220,0.15)', border: '1px solid rgba(100,140,220,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'rgba(100,140,220,0.7)' }}>
                          <TrashIcon size={13} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.gameName}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                          {isAdmin && item.username && <span style={{ color: 'var(--accent)', fontWeight: 700 }}>@{item.username} · </span>}
                          {item.boardName}
                        </div>
                      </div>
                      <span style={{ flexShrink: 0, fontSize: 10, fontWeight: urgent ? 700 : 400, color: urgent ? '#d07070' : 'var(--text-muted)' }}>
                        {t('trash.days_left', { days: item.daysLeft })}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
                      {t('trash.deleted_on')} {formatDate(item.deletedAt)}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => restoreGame(item)} disabled={busy}
                        style={{ flex: 1, background: 'rgba(61,184,106,0.1)', border: '1px solid rgba(61,184,106,0.4)', borderRadius: 6, padding: '5px 0', cursor: busy ? 'not-allowed' : 'pointer', color: '#3db86a', fontSize: 11, fontWeight: 600 }}>
                        {t('trash.restore')}
                      </button>
                      <button onClick={() => permDeleteGame(item)} disabled={busy}
                        style={{ background: 'rgba(192,80,80,0.08)', border: '1px solid rgba(192,80,80,0.3)', borderRadius: 6, padding: '5px 10px', cursor: busy ? 'not-allowed' : 'pointer', color: '#d07070', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <TrashIcon size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ══ Note texte ══════════════════════════════════════ */
                <div style={{ padding: '11px 13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, minWidth: 0 }}>
                    {item.gameIcon && (
                      <img src={item.gameIcon} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                      {isAdmin && item.username && <><span style={{ color: 'var(--accent)', fontWeight: 700 }}>@{item.username}</span> · </>}
                      {item.boardName} · {item.gameName}
                    </span>
                    <span style={{ flexShrink: 0, fontSize: 10, fontWeight: urgent ? 700 : 400, color: urgent ? '#d07070' : 'var(--text-muted)' }}>
                      {t('trash.days_left', { days: item.daysLeft })}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.55, marginBottom: 8, wordBreak: 'break-word' }}>
                    {item.text?.length > 220 ? item.text.slice(0, 220) + '…' : item.text}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', flex: 1 }}>
                      {t('trash.deleted_on')} {formatDate(item.deletedAt)}
                      {item.createdAt && (
                        <span style={{ marginLeft: 6, opacity: 0.6 }}>· {t('trash.created_on')} {formatDate(item.createdAt)}</span>
                      )}
                    </span>
                    <button onClick={() => restoreNote(item)} disabled={busy}
                      style={{ background: 'rgba(61,184,106,0.1)', border: '1px solid rgba(61,184,106,0.4)', borderRadius: 6, padding: '4px 10px', cursor: busy ? 'not-allowed' : 'pointer', color: '#3db86a', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                      {t('trash.restore')}
                    </button>
                    <button onClick={() => permDeleteNote(item)} disabled={busy}
                      style={{ background: 'rgba(192,80,80,0.08)', border: '1px solid rgba(192,80,80,0.3)', borderRadius: 6, padding: '4px 8px', cursor: busy ? 'not-allowed' : 'pointer', color: '#d07070', fontSize: 11, fontWeight: 600, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      <TrashIcon size={10} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
