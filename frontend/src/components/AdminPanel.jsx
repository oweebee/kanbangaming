import { useState, useEffect } from 'react';
import ModalBackdrop from './ModalBackdrop.jsx';
import ModalCard from './ModalCard.jsx';
import { useLang } from '../i18n.js';
import { authHeaders } from '../utils.js';

const API = '/api';

function StatusBadge({ status }) {
  const { t } = useLang();
  const map = {
    pending:   { bg: 'rgba(255,200,0,.18)',   color: '#ffc800', key: 'status.pending' },
    active:    { bg: 'rgba(60,200,100,.18)',   color: '#4cd882', key: 'status.active' },
    suspended: { bg: 'rgba(220,50,50,.18)',    color: '#f87575', key: 'status.suspended' },
    admin:     { bg: 'rgba(245,165,0,.18)',    color: '#f5a500', key: 'status.admin' },
  };
  const s = map[status] || map.active;
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: s.bg, color: s.color, textTransform: 'uppercase' }}>
      {t(s.key)}
    </span>
  );
}

export default function AdminPanel({ token, currentUser, onClose }) {
  const { t } = useLang();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editPwd, setEditPwd] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('pending');

  // Create user tab
  const [steamIdInput, setSteamIdInput] = useState('');
  const [createMsg, setCreateMsg] = useState('');
  const [createErr, setCreateErr] = useState('');
  const [creating, setCreating] = useState(false);

  // Settings tab
  const [settings, setSettings] = useState(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [discordUrl, setDiscordUrl] = useState('');
  const [discordIconUrl, setDiscordIconUrl] = useState('');
  const [discordSaving, setDiscordSaving] = useState(false);
  const [discordMsg, setDiscordMsg] = useState('');

  // Export / Restore
  const [restoreMsg, setRestoreMsg] = useState('');
  const [restoreErr, setRestoreErr] = useState('');
  const [restoring, setRestoring] = useState(false);

  // Boards tab
  const [boards, setBoards] = useState([]);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [boardsError, setBoardsError] = useState('');

  const h = authHeaders(token);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/users`, { headers: h });
      if (!res.ok) throw new Error('Erreur chargement');
      setUsers(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function fetchBoards() {
    setBoardsLoading(true); setBoardsError('');
    try {
      const res = await fetch(`${API}/admin/boards`, { headers: h });
      if (!res.ok) throw new Error('Erreur chargement');
      setBoards(await res.json());
    } catch (e) { setBoardsError(e.message); }
    finally { setBoardsLoading(false); }
  }

  useEffect(() => { if (tab === 'boards') fetchBoards(); }, [tab]);

  useEffect(() => {
    if (tab !== 'settings' || settings !== null) return;
    fetch(`${API}/admin/settings`, { headers: h })
      .then(r => r.json()).then(d => {
        setSettings(d);
        setDiscordUrl(d.discordUrl || '');
        setDiscordIconUrl(d.discordIconUrl || '');
      }).catch(() => {});
  }, [tab]);

  function handleExport() {
    const a = document.createElement('a');
    a.href = `/api/admin/export`;
    // Inject token via fetch to get the file
    fetch('/api/admin/export', { headers: h })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `kangbangaming-backup-${date}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  function handleRestoreFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreMsg(''); setRestoreErr('');
    const reader = new FileReader();
    reader.onload = async ev => {
      let data;
      try { data = JSON.parse(ev.target.result); } catch { setRestoreErr('Fichier JSON invalide.'); return; }
      if (!confirm(`⚠ Restauration : ceci va écraser TOUTES les données actuelles (${data.users?.length ?? '?'} users, boards, paramètres). Confirmer ?`)) return;
      setRestoring(true);
      try {
        const res = await fetch('/api/admin/restore', { method: 'POST', headers: h, body: JSON.stringify(data) });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Erreur');
        setRestoreMsg(`✓ ${result.message}`);
        fetchUsers();
      } catch (err) { setRestoreErr(err.message); }
      finally { setRestoring(false); e.target.value = ''; }
    };
    reader.readAsText(file);
  }

  async function saveDiscord() {
    setDiscordSaving(true); setDiscordMsg('');
    try {
      const res = await fetch(`${API}/admin/settings`, { method: 'PATCH', headers: h, body: JSON.stringify({ discordUrl: discordUrl.trim(), discordIconUrl: discordIconUrl.trim() }) });
      if (res.ok) { setSettings(await res.json()); setDiscordMsg(t('admin.discord_saved')); setTimeout(() => setDiscordMsg(''), 2500); }
    } finally { setDiscordSaving(false); }
  }

  async function toggleSetting(key, value) {
    setSettingsSaving(true);
    try {
      const res = await fetch(`${API}/admin/settings`, { method: 'PATCH', headers: h, body: JSON.stringify({ [key]: value }) });
      if (res.ok) setSettings(await res.json());
    } finally { setSettingsSaving(false); }
  }

  async function handleDeleteBoard(ownerId, boardId, boardName) {
    if (!confirm(t('admin.del_board_confirm', { name: boardName }))) return;
    try {
      const res = await fetch(`${API}/admin/boards/${ownerId}/${boardId}`, { method: 'DELETE', headers: h });
      if (!res.ok) { alert(t('admin.del_board_error', { code: res.status })); return; }
    } catch (e) {
      alert(t('admin.del_board_error', { code: e.message }));
      return;
    }
    fetchBoards();
  }

  async function patch(id, body) {
    setSaving(true);
    await fetch(`${API}/admin/users/${id}`, { method: 'PATCH', headers: h, body: JSON.stringify(body) });
    setSaving(false);
    fetchUsers();
  }

  async function handleDelete(id) {
    if (!confirm(t('admin.del_user_confirm'))) return;
    await fetch(`${API}/admin/users/${id}`, { method: 'DELETE', headers: h });
    fetchUsers();
  }

  async function handlePreregister(e) {
    e.preventDefault();
    setCreateErr(''); setCreateMsg('');
    const sid = steamIdInput.trim();
    if (!/^\d{17}$/.test(sid)) { setCreateErr('Steam ID invalide — il doit faire exactement 17 chiffres.'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/preregister', { method: 'POST', headers: h, body: JSON.stringify({ steamId: sid }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Erreur');
      setCreateMsg(`✓ ${data.message}`);
      setSteamIdInput('');
      fetchUsers();
    } catch (err) {
      setCreateErr(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleSavePwd(id) {
    if (!editPwd.trim()) return;
    setSaving(true);
    await fetch(`${API}/admin/users/${id}`, { method: 'PATCH', headers: h, body: JSON.stringify({ password: editPwd.trim() }) });
    setSaving(false);
    setEditingId(null); setEditPwd('');
    fetchUsers();
  }

  const pending = users.filter(u => (u.status || 'active') === 'pending');
  const active  = users.filter(u => (u.status || 'active') === 'active' && u.id !== currentUser.id);
  const suspended = users.filter(u => (u.status || 'active') === 'suspended');

  const tabStyle = (id) => ({
    background: 'none', border: 'none',
    borderBottom: tab === id ? '2px solid var(--accent)' : '2px solid transparent',
    padding: '8px 14px', color: tab === id ? 'var(--text)' : 'var(--text-muted)',
    fontWeight: tab === id ? 700 : 400, fontSize: 13, cursor: 'pointer', marginBottom: -1,
  });

  function renderUser(u, showApprove = false) {
    return (
      <div key={u.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {u.steamAvatar
              ? <img src={u.steamAvatar} alt="" style={{ width: 32, height: 32, borderRadius: 6, border: '1.5px solid var(--border)', flexShrink: 0 }} />
              : <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>👤</div>
            }
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{u.username}</span>
                <StatusBadge status={u.role === 'admin' ? 'admin' : (u.status || 'active')} />
                {u.steamAuth && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(28,58,89,0.7)', border: '1px solid rgba(71,167,245,0.35)', borderRadius: 20, padding: '1px 7px' }}>
                    <svg viewBox="0 0 496 512" xmlns="http://www.w3.org/2000/svg" style={{ width: 8, height: 8, fill: '#47a7f5' }}>
                      <path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.7-76.3-239-180.4l95.2 39.3c6.4 32.1 34.9 56.4 68.9 56.4 38.2 0 69.1-31.1 68.9-69.3l84.5-60.2c52.1 1.3 95.8-40.9 95.8-93.5 0-51.6-42-93.5-93.7-93.5s-93.7 42-93.7 93.5v1.2L176.6 279c-15.5-.9-30.7 3.4-43.5 12.1L0 236.1C10.2 108.4 117.1 8 247.6 8 384.8 8 496 119 496 256z"/>
                    </svg>
                    <span style={{ fontSize: 9, color: '#47a7f5', fontWeight: 700 }}>Steam</span>
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {t('admin.registered_on', { date: new Date(u.createdAt).toLocaleDateString() })}
                {u.steamPersonaName && u.steamPersonaName !== u.username && <span style={{ marginLeft: 6, opacity: 0.7 }}>· {u.steamPersonaName}</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
            {showApprove && (
              <button onClick={() => patch(u.id, { status: 'active' })} disabled={saving}
                style={{ background: 'rgba(60,200,100,.2)', border: '1px solid rgba(60,200,100,.4)', borderRadius: 6, padding: '5px 12px', color: '#4cd882', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
                ✓ {t('admin.approve')}
              </button>
            )}
            {showApprove && (
              <button onClick={() => handleDelete(u.id)} disabled={saving}
                style={{ background: 'rgba(220,50,50,.15)', border: '1px solid rgba(220,50,50,.3)', borderRadius: 6, padding: '5px 12px', color: '#f88', fontSize: 12, cursor: 'pointer' }}>
                {t('admin.reject')}
              </button>
            )}
            {!showApprove && u.id !== 'admin' && (
              <>
                {/* Toggle rôle admin — seulement si pas le super-admin */}
                {u.role === 'admin' ? (
                  <button onClick={() => { if (confirm(t('admin.del_admin_confirm', { name: u.username }))) patch(u.id, { role: 'user' }); }} disabled={saving}
                    title={t('admin.remove_admin')}
                    style={{ background: 'rgba(245,165,0,.15)', border: '1px solid rgba(245,165,0,.4)', borderRadius: 6, padding: '5px 10px', color: '#f5a500', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                    {t('admin.remove_admin')}
                  </button>
                ) : (
                  <button onClick={() => { if (confirm(t('admin.add_admin_confirm', { name: u.username }))) patch(u.id, { role: 'admin', status: 'active' }); }} disabled={saving}
                    title={t('admin.make_admin')}
                    style={{ background: 'rgba(245,165,0,.08)', border: '1px solid rgba(245,165,0,.2)', borderRadius: 6, padding: '5px 10px', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}>
                    {t('admin.make_admin')}
                  </button>
                )}
                {/* Suspendre/Réactiver — désactivé pour les admins */}
                {u.role !== 'admin' && ((u.status || 'active') === 'active' ? (
                  <button onClick={() => patch(u.id, { status: 'suspended' })} disabled={saving}
                    style={{ background: 'rgba(220,50,50,.1)', border: '1px solid rgba(220,50,50,.25)', borderRadius: 6, padding: '5px 10px', color: '#f88', fontSize: 11, cursor: 'pointer' }}>
                    {t('admin.suspend')}
                  </button>
                ) : (
                  <button onClick={() => patch(u.id, { status: 'active' })} disabled={saving}
                    style={{ background: 'rgba(60,200,100,.1)', border: '1px solid rgba(60,200,100,.25)', borderRadius: 6, padding: '5px 10px', color: '#4cd882', fontSize: 11, cursor: 'pointer' }}>
                    {t('admin.reactivate')}
                  </button>
                ))}
                {!u.steamAuth && (
                  <button onClick={() => { setEditingId(editingId === u.id ? null : u.id); setEditPwd(''); }}
                    style={{ background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', color: 'var(--text)', fontSize: 11, cursor: 'pointer' }}>
                    🔑 MDP
                  </button>
                )}
                <button onClick={() => handleDelete(u.id)}
                  style={{ background: 'rgba(220,50,50,.12)', border: '1px solid rgba(220,50,50,.25)', borderRadius: 6, padding: '5px 10px', color: '#f88', fontSize: 11, cursor: 'pointer' }}>
                  {t('admin.delete_user')}
                </button>
              </>
            )}
          </div>
        </div>

        {editingId === u.id && (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="password" value={editPwd} onChange={e => setEditPwd(e.target.value)}
              placeholder={t('admin.new_pwd')}
              style={{ flex: 1, padding: '7px 10px', background: 'var(--surface1)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13, outline: 'none' }}
            />
            <button onClick={() => handleSavePwd(u.id)} disabled={saving || !editPwd.trim()}
              style={{ padding: '7px 14px', background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {saving ? '…' : 'OK'}
            </button>
            <button onClick={() => { setEditingId(null); setEditPwd(''); }}
              style={{ padding: '7px 10px', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
              ✕
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <ModalBackdrop onClose={onClose} zIndex={1000}>
      <ModalCard style={{ width: '100%', maxWidth: 660, height: '78vh', minHeight: 500, maxHeight: 920, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 0', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>⚙️ Panneau Admin</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1, marginBottom: 12 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px', flexShrink: 0 }}>
          <button style={tabStyle('pending')} onClick={() => setTab('pending')}>
            {t('admin.tab_pending')} {pending.length > 0 && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '50%', fontSize: 9, padding: '1px 5px', marginLeft: 4 }}>{pending.length}</span>}
          </button>
          <button style={tabStyle('active')} onClick={() => setTab('active')}>{t('admin.tab_active')} ({active.length})</button>
          <button style={tabStyle('suspended')} onClick={() => setTab('suspended')}>{t('admin.tab_suspended')} ({suspended.length})</button>
          <button style={tabStyle('boards')} onClick={() => setTab('boards')}>{t('admin.tab_boards')}</button>
          <button style={tabStyle('create')} onClick={() => { setTab('create'); setCreateMsg(''); setCreateErr(''); }}>{t('admin.tab_create')}</button>
          <button style={tabStyle('settings')} onClick={() => setTab('settings')}>{t('admin.tab_settings')}</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {loading && <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>{t('admin.loading')}</p>}
          {error && <p style={{ color: '#f88', fontSize: 13 }}>{error}</p>}

          {!loading && tab === 'pending' && (
            pending.length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 32 }}>{t('admin.no_pending')}</p>
              : pending.map(u => renderUser(u, true))
          )}
          {!loading && tab === 'active' && (
            active.length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 32 }}>{t('admin.no_active')}</p>
              : active.map(u => renderUser(u, false))
          )}
          {!loading && tab === 'suspended' && (
            suspended.length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 32 }}>{t('admin.no_suspended')}</p>
              : suspended.map(u => renderUser(u, false))
          )}

          {tab === 'settings' && (
            <div style={{ maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 16px' }}>{t('admin.settings_desc')}</p>

              {/* Toggle : validation à l'inscription */}
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>{t('admin.approval_title')}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {t('admin.approval_desc')}
                  </div>
                </div>
                <button
                  disabled={settings === null || settingsSaving}
                  onClick={() => toggleSetting('requireApproval', !settings?.requireApproval)}
                  style={{
                    flexShrink: 0, width: 44, height: 24, borderRadius: 12, border: 'none', cursor: settings === null ? 'default' : 'pointer',
                    background: settings?.requireApproval ? 'var(--accent)' : 'var(--surface3)',
                    position: 'relative', transition: 'background .2s', opacity: settingsSaving ? 0.6 : 1,
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 3, left: settings?.requireApproval ? 23 : 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    transition: 'left .2s', display: 'block',
                  }} />
                </button>
              </div>

              {/* Discord */}
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{t('admin.discord_title')}</div>
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Lien serveur */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{t('admin.discord_url')}</label>
                    <input value={discordUrl} onChange={e => setDiscordUrl(e.target.value)} placeholder="https://discord.gg/xxxxxx"
                      style={{ padding: '7px 10px', background: 'var(--surface1)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', fontSize: 13, outline: 'none' }} />
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {t('admin.discord_url_hint')}
                    </div>
                  </div>
                  {/* Icône — auto-remplie ou saisie manuelle */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{t('admin.discord_icon')}</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input value={discordIconUrl} onChange={e => setDiscordIconUrl(e.target.value)} placeholder="https://cdn.discordapp.com/icons/…/….webp"
                        style={{ flex: 1, padding: '7px 10px', background: 'var(--surface1)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', fontSize: 12, outline: 'none' }} />
                      {discordIconUrl && <img src={discordIconUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border)', flexShrink: 0, objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {t('admin.discord_icon_hint')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={saveDiscord} disabled={discordSaving}
                      style={{ padding: '7px 18px', background: 'var(--accent)', border: 'none', borderRadius: 7, color: '#fff', fontSize: 13, fontWeight: 700, cursor: discordSaving ? 'not-allowed' : 'pointer', opacity: discordSaving ? 0.7 : 1 }}>
                      {discordSaving ? '…' : t('admin.save')}
                    </button>
                    {discordMsg && <span style={{ fontSize: 12, color: '#4cd882' }}>{discordMsg}</span>}
                  </div>
                </div>
              </div>

              {/* Export / Restore */}
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{t('admin.backup_title')}</div>

                {/* Export */}
                <button onClick={handleExport}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(60,200,100,.1)', border: '1px solid rgba(60,200,100,.3)', borderRadius: 9, color: '#4cd882', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <div>
                    <div>{t('admin.export_btn')}</div>
                    <div style={{ fontSize: 10, fontWeight: 400, color: 'rgba(76,216,130,.7)', marginTop: 1 }}>{t('admin.export_desc')}</div>
                  </div>
                </button>

                {/* Restore */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(220,50,50,.08)', border: '1px solid rgba(220,50,50,.25)', borderRadius: 9, color: '#f88', fontSize: 13, fontWeight: 700, cursor: restoring ? 'not-allowed' : 'pointer' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <div>
                    <div>{restoring ? t('admin.restoring') : t('admin.restore_btn')}</div>
                    <div style={{ fontSize: 10, fontWeight: 400, color: 'rgba(248,136,136,.7)', marginTop: 1 }}>{t('admin.restore_desc')}</div>
                  </div>
                  <input type="file" accept=".json" onChange={handleRestoreFile} disabled={restoring} style={{ display: 'none' }} />
                </label>

                {restoreErr && <div style={{ background: 'rgba(220,50,50,.12)', border: '1px solid rgba(220,50,50,.3)', borderRadius: 7, padding: '8px 10px', color: '#f88', fontSize: 12 }}>{restoreErr}</div>}
                {restoreMsg && <div style={{ background: 'rgba(60,200,100,.1)', border: '1px solid rgba(60,200,100,.3)', borderRadius: 7, padding: '8px 10px', color: '#4cd882', fontSize: 12 }}>{restoreMsg}</div>}
              </div>
            </div>
          )}

          {tab === 'create' && (
            <form onSubmit={handlePreregister} style={{ maxWidth: 380, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 4px', lineHeight: 1.6 }}>
                {t('admin.prereg_desc')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('admin.steam_id_hint')}</label>
                <input value={steamIdInput} onChange={e => setSteamIdInput(e.target.value)}
                  placeholder="ex: 76561198012345678" required
                  style={{ padding: '8px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'monospace' }} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {t('admin.prereg_steam_hint')} <a href="https://www.steamidfinder.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>steamidfinder.com</a>
                </div>
              </div>
              {createErr && <div style={{ background: 'rgba(220,50,50,.12)', border: '1px solid rgba(220,50,50,.3)', borderRadius: 7, padding: '8px 10px', color: '#f88', fontSize: 12 }}>{createErr}</div>}
              {createMsg && <div style={{ background: 'rgba(60,200,100,.1)', border: '1px solid rgba(60,200,100,.3)', borderRadius: 7, padding: '8px 10px', color: '#4cd882', fontSize: 12 }}>{createMsg}</div>}
              <button type="submit" disabled={creating}
                style={{ padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1 }}>
                {creating ? t('admin.prereg_ing') : t('admin.prereg_btn')}
              </button>
            </form>
          )}

          {tab === 'boards' && (
            boardsLoading
              ? <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>Chargement…</p>
              : boardsError
                ? <p style={{ color: '#f88', fontSize: 13 }}>{boardsError}</p>
                : boards.length === 0
                  ? <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 32 }}>Aucun board</p>
                  : boards.map(b => (
                      <div key={`${b.ownerId}-${b.id}`} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Thumbnail */}
                        <div style={{ width: 52, height: 30, borderRadius: 5, overflow: 'hidden', flexShrink: 0, background: 'var(--surface1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {b.headerImg
                            ? <img src={b.headerImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: 18 }}>{b.emoji}</span>
                          }
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{b.name}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, flexShrink: 0, color: b.public ? '#3db86a' : 'var(--text-muted)', border: `2px solid ${b.public ? '#3db86a' : 'var(--border)'}` }}>
                              {b.public ? 'Public' : 'Privé'}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            👤 {b.ownerUsername} · {b.gameCount} carte{b.gameCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteBoard(b.ownerId, b.id, b.name)}
                          style={{ background: 'rgba(220,50,50,.12)', border: '1px solid rgba(220,50,50,.25)', borderRadius: 6, padding: '5px 10px', color: '#f88', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
                        >
                          🗑 {t('admin.delete_user')}
                        </button>
                      </div>
                    ))
          )}
        </div>
      </ModalCard>
    </ModalBackdrop>
  );
}
