import { useState, useEffect } from 'react';
import NotesSection from './NotesSection.jsx';
import { StatusToggles, DatePicker } from './CardControls.jsx';
import { formatPlaytime, authHeaders } from '../utils.js';
import ModalBackdrop from './ModalBackdrop.jsx';
import SwipeTabs from './SwipeTabs.jsx';
import { useLang } from '../i18n.js';
import { isSteamAccessBlocked, SteamAccessNotice } from './SteamUI.jsx';

export default function GameModal({ game, onClose, api, token, onPatchGame, onSoftDeleteNote, defaultTab = 'info', currentUser, appUsers = [] }) {
  const { t } = useLang();
  const steamBlocked = isSteamAccessBlocked(currentUser);
  const [achievements, setAchievements] = useState(null);
  const [gameInfo, setGameInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(defaultTab);
  const notesCount = (game.notes || []).filter(n => !n.deletedAt).length;
  const isDone   = !!game.done;
  const isUrgent = !!game.urgent;
  const handleSaveNotes    = (notes)   => { if (onPatchGame) onPatchGame(game.appid, { notes }); };
  const handleToggleDone   = ()        => { if (onPatchGame) onPatchGame(game.appid, { done: !isDone }); };
  const handleToggleUrgent = ()        => { if (onPatchGame) onPatchGame(game.appid, { urgent: !isUrgent }); };

  // Date state
  const [dateMode,  setDateMode]  = useState(game.startDate ? 'period' : game.dueDate ? 'single' : 'none');
  const [dueDate,   setDueDate]   = useState(game.dueDate   || '');
  const [startDate, setStartDate] = useState(game.startDate || '');
  const [endDate,   setEndDate]   = useState(game.endDate   || '');
  const [dueTime,   setDueTime]   = useState(game.dueTime   || '');
  const [startTime, setStartTime] = useState(game.startTime || '');
  const [endTime,   setEndTime]   = useState(game.endTime   || '');

  const handleDateModeChange = (mode) => {
    setDateMode(mode);
    if (mode === 'none')   { setDueDate(''); setStartDate(''); setEndDate(''); setDueTime(''); setStartTime(''); setEndTime(''); if (onPatchGame) onPatchGame(game.appid, { dueDate: null, startDate: null, endDate: null, dueTime: null, startTime: null, endTime: null }); }
    if (mode === 'single') { setStartDate(''); setEndDate(''); setStartTime(''); setEndTime(''); }
    if (mode === 'period') { setDueDate(''); setDueTime(''); }
  };
  const handleDueDateChange   = (v) => { setDueDate(v);   if (onPatchGame) onPatchGame(game.appid, { dueDate: v || null }); };
  const handleStartDateChange = (v) => { setStartDate(v); if (onPatchGame) onPatchGame(game.appid, { startDate: v || null }); };
  const handleEndDateChange   = (v) => { setEndDate(v);   if (onPatchGame) onPatchGame(game.appid, { endDate: v || null }); };
  const handleDueTimeChange   = (v) => { setDueTime(v);   if (onPatchGame) onPatchGame(game.appid, { dueTime: v || null }); };
  const handleStartTimeChange = (v) => { setStartTime(v); if (onPatchGame) onPatchGame(game.appid, { startTime: v || null }); };
  const handleEndTimeChange   = (v) => { setEndTime(v);   if (onPatchGame) onPatchGame(game.appid, { endTime: v || null }); };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${api}/steam/achievements/${game.appid}`, {
          headers: token ? authHeaders(token) : {},
        });
        const data = await res.json();
        const achs = data.achievements || [];
        const unlocked = achs.filter(a => a.achieved).length;
        setAchievements({
          achievements: achs.map(a => ({ ...a, unlocked: a.achieved })),
          total: achs.length,
          unlocked,
          percent: achs.length > 0 ? Math.round(unlocked / achs.length * 100) : 0,
        });
      } catch {
        setAchievements(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [game.appid, api, token]);

  // Infos publiques Steam (joueurs en ligne, avis, Metacritic, prix, genres…) —
  // même endpoint que le cartouche d'en-tête (SteamEncart), mis en cache côté
  // serveur par appid, donc sûr à appeler par carte sans surcharge.
  useEffect(() => {
    async function loadInfo() {
      try {
        const res = await fetch(`${api}/steam/gameinfo/${game.appid}`, {
          headers: token ? authHeaders(token) : {},
        });
        setGameInfo(res.ok ? await res.json() : null);
      } catch {
        setGameInfo(null);
      }
    }
    loadInfo();
  }, [game.appid, api, token]);

  // Liste unique : tous les succès, triés débloqués en premier (plus de filtres
  // séparés "débloqués"/"verrouillés" — tout est affiché dans la même liste).
  const filteredAchievements = (achievements?.achievements || []).slice()
    .sort((a, b) => (a.unlocked === b.unlocked ? 0 : a.unlocked ? -1 : 1));

  // Couleurs/emoji de la pastille avis, identiques à SteamEncart
  const reviewScoreVal = gameInfo?.reviewScore ?? 0;
  const reviewColor = reviewScoreVal >= 8 ? '#4cd882' : reviewScoreVal >= 5 ? '#f5c518' : '#f87575';
  const reviewEmoji = reviewScoreVal >= 8 ? '👍' : reviewScoreVal >= 5 ? '😐' : '👎';

  return (
    <ModalBackdrop onClose={onClose}>
      <div style={{
        background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: 14,
        width: '100%', maxWidth: 620, height: '85vh', minHeight: 500, maxHeight: 920,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header with game art */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img
            src={game.header_img} alt={game.name}
            style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--surface) 0%, transparent 60%)' }} />
          <button onClick={onClose} style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(0,0,0,0.6)', border: '2px solid rgba(255,255,255,0.2)',
            borderRadius: '50%', width: 32, height: 32, color: '#fff', fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
          <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{game.name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              ⏱ {formatPlaytime(game.playtime_minutes, t('game.never_played'))}
              {achievements && achievements.total > 0 && (
                <span style={{ marginLeft: 12 }}>
                  🏆 {achievements.unlocked}/{achievements.total} {t('game.tab_achievements').replace('🏆 ', '')} ({achievements.percent}%)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {achievements && achievements.total > 0 && (
          <div style={{ padding: '0 16px', flexShrink: 0 }}>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${achievements.percent}%`,
                background: achievements.percent === 100 ? 'var(--gold)' : 'var(--accent)',
                borderRadius: 2, transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        )}

        <SwipeTabs
          tabs={[
            { id: 'info',         label: t('game.tab_info') },
            { id: 'notes',        label: `${t('game.tab_notes')}${notesCount > 0 ? ` (${notesCount})` : ''}` },
            { id: 'achievements', label: t('game.tab_achievements') },
          ]}
          activeTab={tab}
          onTabChange={setTab}
        >

          {/* ── Panneau Infos ── */}
          <div style={{ overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Terminée + Urgent */}
            <StatusToggles
              isDone={isDone} onToggleDone={handleToggleDone}
              isUrgent={isUrgent} onToggleUrgent={handleToggleUrgent}
            />

            {/* Date */}
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

            {/* Résumé Steam rapide — présenté en liste (une ligne = un champ : Avis,
                Joueurs en ligne, Prix, Style…) plutôt qu'en grille de pastilles */}
            {gameInfo && (() => {
              const rows = [
                gameInfo.reviewScoreDesc && {
                  key: 'reviews', icon: reviewEmoji, label: t('ginfo.label_reviews'),
                  onClick: () => window.open(`https://store.steampowered.com/app/${game.appid}/#app_reviews_hash`, '_blank'),
                  title: t('ginfo.see_reviews'),
                  value: (
                    <>
                      <span style={{ color: reviewColor }}>{gameInfo.reviewScoreDesc}</span>
                      {gameInfo.positivePercent !== null && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {t('ginfo.positive_pct', { percent: gameInfo.positivePercent })}</span>}
                      {gameInfo.totalReviews ? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> ({gameInfo.totalReviews.toLocaleString('fr-FR')})</span> : null}
                    </>
                  ),
                },
                gameInfo.playerCount !== null && {
                  key: 'players', icon: '🟢', label: t('ginfo.label_players'),
                  value: gameInfo.playerCount.toLocaleString('fr-FR'),
                },
                gameInfo.price && {
                  key: 'price', icon: '💰', label: t('ginfo.label_price'),
                  value: (
                    <>
                      {gameInfo.discount > 0 && <span style={{ background: '#4c6b22', color: '#a4d007', fontWeight: 900, fontSize: 10.5, padding: '1px 5px', borderRadius: 4, marginRight: 6 }}>-{gameInfo.discount}%</span>}
                      {gameInfo.discount > 0 && gameInfo.priceInitial && <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through', fontWeight: 400, marginRight: 6 }}>{gameInfo.priceInitial}</span>}
                      <span style={{ color: gameInfo.discount > 0 ? '#a4d007' : 'var(--text)' }}>{gameInfo.price}</span>
                    </>
                  ),
                },
                gameInfo.metacritic !== null && {
                  key: 'metacritic', icon: '🎯', label: 'Metacritic',
                  onClick: gameInfo.metacriticUrl ? () => window.open(gameInfo.metacriticUrl, '_blank') : undefined,
                  title: gameInfo.metacriticUrl ? t('ginfo.see_metacritic') : undefined,
                  value: <span style={{ display: 'inline-block', minWidth: 26, textAlign: 'center', padding: '1px 7px', borderRadius: 5, fontWeight: 900, color: '#000', background: gameInfo.metacritic >= 75 ? '#6c3' : gameInfo.metacritic >= 50 ? '#fc3' : '#f00' }}>{gameInfo.metacritic}</span>,
                },
                (gameInfo.genres?.length > 0 || gameInfo.multiplayerLabel) && {
                  key: 'style', icon: '🎮', label: t('ginfo.label_style'),
                  value: [...(gameInfo.genres || []), gameInfo.multiplayerLabel].filter(Boolean).join(' · '),
                },
                gameInfo.developer && {
                  key: 'studio', icon: '🛠', label: t('ginfo.label_studio'),
                  value: gameInfo.developer,
                },
                gameInfo.releaseDate && {
                  key: 'release', icon: '📅', label: t('ginfo.label_release'),
                  value: gameInfo.releaseDate,
                },
                gameInfo.earlyAccess && {
                  key: 'status', icon: '⚠', label: t('ginfo.label_status'),
                  value: <span style={{ color: '#ff5555' }}>{t('ginfo.early_access')}</span>,
                },
                gameInfo.comingSoon && !gameInfo.earlyAccess && {
                  key: 'status2', icon: '🔜', label: t('ginfo.label_status'),
                  value: <span style={{ color: '#f5c518' }}>{t('ginfo.coming_soon')}</span>,
                },
              ].filter(Boolean);

              if (rows.length === 0) return null;

              return (
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, overflow: 'hidden',
                }}>
                  {rows.map((row, i) => (
                    <div
                      key={row.key}
                      onClick={row.onClick}
                      title={row.title}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
                        padding: '11px 18px',
                        borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                        cursor: row.onClick ? 'pointer' : 'default',
                      }}
                    >
                      <span style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                        <span style={{ fontSize: 13 }}>{row.icon}</span>{row.label}
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Infos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['App ID', game.appid],
                [t('game.playtime'), formatPlaytime(game.playtime_minutes, t('game.never_played'))],
                [t('game.store'), <a href={`https://store.steampowered.com/app/${game.appid}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{t('game.open')}</a>],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', gap: 12 }}>
                  <span style={{ color: 'var(--text-muted)', minWidth: 100, fontSize: 13 }}>{label}</span>
                  <span style={{ fontSize: 13 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Panneau Notes ── */}
          <div style={{ overflowY: 'auto', padding: 16 }}>
            <NotesSection
              notes={game.notes || []}
              onSave={handleSaveNotes}
              onSoftDeleteNote={onSoftDeleteNote ? (noteId) => onSoftDeleteNote(game.appid, noteId) : undefined}
              draftKey={`game_${game.appid}`}
              compact={false}
              token={token}
              currentUser={currentUser}
              appUsers={appUsers}
            />
          </div>

          {/* ── Panneau Succès ──
              Liste unique (plus de filtres Débloqués/Verrouillés séparés) : tous les
              succès, triés débloqués en premier. Conteneur flex-colonne pour que la zone
              scrollable hérite correctement de la hauteur du panneau SwipeTabs. */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 16px 16px' }}>
              {loading && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>{t('game.loading_ach')}</div>}
              {!loading && steamBlocked && (!achievements || achievements?.total === 0) && <SteamAccessNotice />}
              {!loading && !steamBlocked && !achievements && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>{t('game.no_ach')}</div>}
              {!loading && !steamBlocked && achievements?.total === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>{t('game.no_ach_game')}</div>}
              {!loading && filteredAchievements.map((a, i) => (
                <div key={a.apiname || i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0', borderBottom: '1px solid var(--border)',
                  opacity: a.unlocked ? 1 : 0.5,
                }}>
                  {a.icon ? (
                    <img src={a.icon} alt="" style={{ width: 40, height: 40, borderRadius: 6, flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: 40, height: 40, background: 'var(--border)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{a.unlocked ? '✅' : '🔒'}</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 2 }}>{a.name}</div>
                    {a.description && <div style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.4 }}>{a.description}</div>}
                  </div>
                  {a.unlocked && <div style={{ color: 'var(--accent)', fontSize: 11, flexShrink: 0 }}>✓</div>}
                </div>
              ))}
            </div>
          </div>

        </SwipeTabs>
      </div>
    </ModalBackdrop>
  );
}
