import { useState, useEffect, useCallback, useMemo } from 'react';
import ModalBackdrop from './ModalBackdrop.jsx';
import ModalCard from './ModalCard.jsx';
import { useLang } from '../i18n.js';
import { authHeaders } from '../utils.js';

const API = '/api';

/**
 * Modale de gestion des accès d'un board public — réservée au créateur du board.
 * Permet d'activer/désactiver le contrôle d'accès, et pour chaque utilisateur :
 *  - lui donner ou retirer la visibilité du board ("Accès")
 *  - bloquer ou autoriser sa modification du board ("Modification" / "Lecture seule")
 *
 * Par défaut (enabled = false) : comportement actuel inchangé, tout le monde a accès complet.
 */
export default function BoardAccessModal({ token, boardId, boardName, onClose, onTransferred }) {
  const { t } = useLang();
  const h = authHeaders(token);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [users, setUsers] = useState([]);
  const [savingEnabled, setSavingEnabled] = useState(false);
  const [savingUserId, setSavingUserId] = useState(null);
  const [transferringId, setTransferringId] = useState(null);

  const fetchAccess = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/public/boards/${boardId}/access`, { headers: h });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setEnabled(!!data.enabled);
      setUsers(data.users || []);
    } catch {
      setError(t('access.error'));
    } finally {
      setLoading(false);
    }
  }, [boardId, token]);

  useEffect(() => { fetchAccess(); }, [fetchAccess]);

  const toggleEnabled = async () => {
    const next = !enabled;
    setSavingEnabled(true);
    setEnabled(next); // optimiste
    try {
      const res = await fetch(`${API}/public/boards/${boardId}/access`, {
        method: 'PATCH', headers: h, body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) setEnabled(!next); // rollback
    } catch {
      setEnabled(!next);
    } finally {
      setSavingEnabled(false);
    }
  };

  const patchUser = async (userId, body) => {
    setSavingUserId(userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...body } : u)); // optimiste
    try {
      const res = await fetch(`${API}/public/boards/${boardId}/access/users/${userId}`, {
        method: 'PATCH', headers: h, body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, allowed: updated.allowed, canEdit: updated.canEdit } : u));
      } else {
        fetchAccess(); // resync en cas d'échec
      }
    } catch {
      fetchAccess();
    } finally {
      setSavingUserId(null);
    }
  };

  const toggleAllowed = (u) => patchUser(u.id, { allowed: !u.allowed });
  const toggleCanEdit = (u) => patchUser(u.id, { canEdit: !u.canEdit });

  // Transfert de propriété : remplace définitivement le créateur par `u`. Une fois
  // confirmé, le créateur actuel perd l'accès à cette modale (il redevient un
  // utilisateur normal du board, avec accès en modification conservé).
  const transferOwnership = async (u) => {
    if (!confirm(t('access.transfer_confirm', { name: u.username }))) return;
    setTransferringId(u.id);
    try {
      const res = await fetch(`${API}/public/boards/${boardId}/transfer`, {
        method: 'POST', headers: h, body: JSON.stringify({ newOwnerId: u.id }),
      });
      if (res.ok) {
        alert(t('access.transfer_success', { name: u.username }));
        onTransferred?.();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || t('access.transfer_error'));
      }
    } catch {
      alert(t('access.transfer_error'));
    } finally {
      setTransferringId(null);
    }
  };

  // Utilisateurs autorisés en premier (ordre stable au sein de chaque groupe)
  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => (a.allowed === b.allowed ? 0 : a.allowed ? -1 : 1)),
    [users]
  );

  return (
    <ModalBackdrop onClose={onClose} zIndex={1000}>
      <ModalCard style={{ width: 'min(560px, calc(100vw - 40px))', height: '72vh', minHeight: 420, maxHeight: 760, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>🔐 {t('access.title')}</h2>
            {boardName && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{boardName}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {loading && <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>{t('access.loading')}</p>}
          {!loading && error && <p style={{ color: '#f88', fontSize: 13, textAlign: 'center' }}>{error}</p>}

          {!loading && !error && (
            <>
              {/* Toggle activer/désactiver */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{t('access.enable_label')}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.4 }}>
                    {enabled ? t('access.enable_desc_on') : t('access.enable_desc_off')}
                  </div>
                </div>
                <button
                  onClick={toggleEnabled}
                  disabled={savingEnabled}
                  style={{
                    background: enabled ? 'rgba(60,200,100,.2)' : 'var(--surface3)',
                    border: enabled ? '1px solid rgba(60,200,100,.4)' : '1px solid var(--border)',
                    borderRadius: 20, padding: '6px 14px', color: enabled ? '#4cd882' : 'var(--text-muted)',
                    fontSize: 12, fontWeight: 700, cursor: savingEnabled ? 'default' : 'pointer', flexShrink: 0,
                    opacity: savingEnabled ? 0.6 : 1,
                  }}
                >
                  {enabled ? t('access.on') : t('access.off')}
                </button>
              </div>

              {/* Liste des utilisateurs */}
              {!enabled ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', marginTop: 24, lineHeight: 1.5 }}>
                  {t('access.disabled_note')}
                </p>
              ) : users.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', marginTop: 24 }}>{t('access.no_users')}</p>
              ) : (
                sortedUsers.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', marginBottom: 8, opacity: savingUserId === u.id ? 0.6 : 1 }}>
                    {u.steamAvatar
                      ? <img src={u.steamAvatar} alt="" style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px solid var(--border)', flexShrink: 0 }} />
                      : <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>👤</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.username}</div>
                      {u.steamPersonaName && u.steamPersonaName !== u.username && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.7 }}>{u.steamPersonaName}</div>
                      )}
                    </div>
                    <button
                      onClick={() => toggleAllowed(u)}
                      disabled={savingUserId === u.id}
                      style={{
                        background: u.allowed ? 'rgba(60,200,100,.1)' : 'rgba(220,50,50,.1)',
                        border: u.allowed ? '1px solid rgba(60,200,100,.25)' : '1px solid rgba(220,50,50,.25)',
                        borderRadius: 6, padding: '5px 10px', color: u.allowed ? '#4cd882' : '#f88',
                        fontSize: 11, cursor: 'pointer', flexShrink: 0, fontWeight: 600,
                      }}
                    >
                      {u.allowed ? t('access.allowed') : t('access.blocked')}
                    </button>
                    {u.allowed && (
                      <button
                        onClick={() => toggleCanEdit(u)}
                        disabled={savingUserId === u.id}
                        style={{
                          background: u.canEdit ? 'rgba(245,165,0,.08)' : 'var(--surface3)',
                          border: u.canEdit ? '1px solid rgba(245,165,0,.2)' : '1px solid var(--border)',
                          borderRadius: 6, padding: '5px 10px', color: u.canEdit ? '#f5a500' : 'var(--text-muted)',
                          fontSize: 11, cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        {u.canEdit ? t('access.can_edit') : t('access.read_only')}
                      </button>
                    )}
                    {u.allowed && (
                      <button
                        onClick={() => transferOwnership(u)}
                        disabled={savingUserId === u.id || transferringId === u.id}
                        title={t('access.transfer')}
                        style={{
                          background: 'rgba(245,200,60,.1)', border: '1px solid rgba(245,200,60,.3)',
                          borderRadius: 6, padding: '5px 8px', color: '#f5c83c',
                          fontSize: 13, cursor: transferringId === u.id ? 'default' : 'pointer', flexShrink: 0,
                          opacity: transferringId === u.id ? 0.6 : 1,
                        }}
                      >
                        👑
                      </button>
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </ModalCard>
    </ModalBackdrop>
  );
}
