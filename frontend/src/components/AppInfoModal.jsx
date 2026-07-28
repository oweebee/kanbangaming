import { useState } from 'react';
import ModalBackdrop from './ModalBackdrop.jsx';
import ModalCard from './ModalCard.jsx';
import { GENRE_COLORS } from './SteamUI.jsx';
import { useLang } from '../i18n.js';

const GENRE_LIST = Object.entries(GENRE_COLORS);

// Horodatage du build courant (injecté par vite.config.js à chaque `vite
// build`) — affiché discrètement ici plutôt qu'en footer permanent, pour
// vérifier au besoin qu'un appareil charge bien le dernier déploiement
// (utile pour distinguer un vrai bug d'une PWA restée sur une ancienne
// version en cache). Repli si jamais la constante n'est pas injectée (ex: run
// hors build Vite).
const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : null;
const BUILD_LABEL = BUILD_TIME
  ? new Date(BUILD_TIME).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  : '?';

// Numéro de version (source unique : frontend/package.json → "version").
// Convention à partir de V1 : on incrémente 1.0.0 → 1.1.0 → 1.2.0 à chaque
// changement livré, plutôt que des tags génériques "V2", "V3"…
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?';

function Swatch({ color, size = 12 }) {
  return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: 3, background: color, border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }} />;
}

function SteamNote() {
  const { t } = useLang();
  return (
    <div style={{ background: 'rgba(102,192,244,0.07)', border: '1px solid rgba(102,192,244,0.25)', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 16 }}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#66c0f4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        {t('info.steamnote.text1_before')} <span style={{ color: '#66c0f4', fontWeight: 700 }}>{t('info.steamnote.public_word')}</span> {t('info.steamnote.text1_after')}{' '}
        <a href="https://help.steampowered.com/fr/faqs/view/588C-C67D-0251-C276" target="_blank" rel="noreferrer" style={{ color: '#66c0f4' }}>{t('info.steamnote.link1')}</a>
        <div style={{ marginTop: 6 }}>
          {t('info.steamnote.text2_before')} <span style={{ color: '#66c0f4', fontWeight: 700 }}>{t('info.steamnote.own_key_words')}</span> {t('info.steamnote.text2_after')}{' '}
          <a href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noreferrer" style={{ color: '#66c0f4' }}>{t('info.steamnote.link2')}</a> {t('info.steamnote.text2_note')}
        </div>
      </div>
    </div>
  );
}

// ── Onglet 1 : Couleurs ────────────────────────────────────────────────────────
function TabColors() {
  const { t } = useLang();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Boards */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{t('info.colors.group_boards')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { color: '#3db86a', label: t('info.col_public'), desc: t('info.colors.board_public_desc') },
            { color: '#f5a500', label: t('info.col_pinned'), desc: t('info.colors.board_pinned_desc') },
            { color: 'var(--accent)', label: t('info.col_active'), desc: t('info.colors.board_active_desc') },
          ].map(({ color, label, desc }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)', border: '1px solid var(--border)', borderLeft: `3px solid ${color}`, borderRadius: 7, padding: '7px 12px' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color }}>{label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cartes */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{t('info.colors.group_cards')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { color: '#66c0f4', label: t('info.colors.card_default_label'), desc: t('info.colors.card_default_desc') },
            { color: '#3db86a', label: t('info.colors.card_done_label'), desc: t('info.colors.card_done_desc') },
            { color: '#dc3c3c', label: t('info.colors.card_urgent_label'), desc: t('info.colors.card_urgent_desc') },
            { color: '#787878', label: t('info.colors.card_archived_label'), desc: t('info.colors.card_archived_desc') },
          ].map(({ color, label, desc }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)', border: '1px solid var(--border)', borderLeft: `3px solid ${color}`, borderRadius: 7, padding: '7px 12px' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 12, color }}>{label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Genres Steam */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{t('info.colors.group_genres')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {GENRE_LIST.map(([genre, color]) => (
            <div key={genre} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${color}15`, border: `1px solid ${color}50`, borderRadius: 5, padding: '3px 8px' }}>
              <Swatch color={color} size={9} />
              <span style={{ fontSize: 11, color, fontWeight: 600 }}>{genre}</span>
            </div>
          ))}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(102,192,244,0.1)', border: '1px solid rgba(102,192,244,0.3)', borderRadius: 5, padding: '3px 8px' }}>
            <Swatch color="#66c0f4" size={9} />
            <span style={{ fontSize: 11, color: '#66c0f4', fontWeight: 600 }}>{t('info.colors.genre_other')}</span>
          </div>
        </div>
      </div>

      {/* Avis */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{t('info.colors.group_reviews')}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { color: '#4cd882', label: t('info.colors.review_positive'), range: '≥ 80%' },
            { color: '#f5c518', label: t('info.colors.review_mixed'),  range: '50–79%' },
            { color: '#f87575', label: t('info.colors.review_negative'), range: '< 50%' },
          ].map(({ color, label, range }) => (
            <div key={label} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, background: `${color}12`, border: `1px solid ${color}35`, borderRadius: 7, padding: '7px 10px' }}>
              <Swatch color={color} size={11} />
              <div>
                <div style={{ fontSize: 12, color, fontWeight: 700 }}>{label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{range}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Onglet 2 : Fonctionnalités ─────────────────────────────────────────────────
function TabFeatures() {
  const { t } = useLang();
  const features = [
    { icon: '📋', title: t('info.feat.create_board_t'), desc: t('info.feat.create_board_d') },
    { icon: '➕', title: t('info.feat.add_card_t'), desc: t('info.feat.add_card_d') },
    { icon: '↔️', title: t('info.feat.move_card_t'), desc: t('info.feat.move_card_d') },
    { icon: '✏️', title: t('info.feat.custom_columns_t'), desc: t('info.feat.custom_columns_d') },
    { icon: '🌐', title: t('info.feat.public_share_t'), desc: t('info.feat.public_share_d') },
    { icon: '📌', title: t('info.feat.pinned_boards_t'), desc: t('info.feat.pinned_boards_d') },
    { icon: '🎮', title: t('info.feat.game_panel_t'), desc: t('info.feat.game_panel_d') },
    { icon: '⚠️', title: t('info.feat.urgent_done_t'), desc: t('info.feat.urgent_done_d') },
    { icon: '👤', title: t('info.feat.assignment_t'), desc: t('info.feat.assignment_d') },
    { icon: '📊', title: t('info.feat.custom_tasks_t'), desc: t('info.feat.custom_tasks_d') },
    { icon: '🕘', title: t('info.feat.emoji_favorites_t'), desc: t('info.feat.emoji_favorites_d') },
    { icon: '📝', title: t('info.feat.card_notes_t'), desc: t('info.feat.card_notes_d') },
    { icon: '🎵', title: t('info.feat.now_playing_t'), desc: t('info.feat.now_playing_d') },
    { icon: '🔍', title: t('info.feat.global_search_t'), desc: t('info.feat.global_search_d') },
    { icon: '⭐', title: t('info.feat.popular_t'), desc: t('info.feat.popular_d') },
    { icon: '📅', title: t('info.feat.upcoming_t'), desc: t('info.feat.upcoming_d') },
    { icon: '📰', title: t('info.feat.news_t'), desc: t('info.feat.news_d') },
    { icon: '📊', title: t('info.feat.profile_stats_t'), desc: t('info.feat.profile_stats_d') },
    { icon: '🗑️', title: t('info.feat.trash_t'), desc: t('info.feat.trash_d') },
    { icon: '🌐', title: t('info.feat.collab_boards_t'), desc: t('info.feat.collab_boards_d') },
    { icon: '🔐', title: t('info.feat.access_mgmt_t'), desc: t('info.feat.access_mgmt_d') },
    { icon: '★', title: t('info.feat.wishlist_deadlines_t'), desc: t('info.feat.wishlist_deadlines_d') },
    { icon: '📋', title: t('info.feat.wishlist_tab_t'), desc: t('info.feat.wishlist_tab_d') },
    { icon: '🔑', title: t('info.feat.api_key_t'), desc: t('info.feat.api_key_d') },
    { icon: '🔒', title: t('info.feat.blocked_module_t'), desc: t('info.feat.blocked_module_d') },
    { icon: '🔎', title: t('info.feat.ui_zoom_t'), desc: t('info.feat.ui_zoom_d') },
    { icon: '🔽', title: t('info.feat.filter_t'), desc: t('info.feat.filter_d') },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {features.map(({ icon, title, desc }) => (
        <div key={title} style={{ display: 'flex', gap: 10, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px' }}>
          <span style={{ fontSize: 15, flexShrink: 0, width: 22, textAlign: 'center', marginTop: 1 }}>{icon}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
          </div>
        </div>
      ))}
      <SteamNote />
    </div>
  );
}

// ── Onglet 3 : Kanban ─────────────────────────────────────────────────────────
// Note : les emphases <strong> sur des mots précis ("Kanban"/"colonnes",
// "glisses-déposes") qui existaient en dur en français ont été retirées —
// le texte traduit est affiché en prose simple. Reconstruire ces emphases
// mot-à-mot dans 6 langues à grammaire différente serait fragile ; c'est une
// simplification purement visuelle, sans impact fonctionnel.
function TabKanban() {
  const { t } = useLang();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.8 }}>
        {t('info.kanban.intro')}
      </p>

      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { col: t('info.kanban.col_todo'),  color: '#66c0f4', desc: t('info.kanban.col_todo_desc') },
          { col: t('info.kanban.col_doing'), color: '#f5a500', desc: t('info.kanban.col_doing_desc') },
          { col: t('info.kanban.col_finished'),  color: '#4cd882', desc: t('info.kanban.col_finished_desc') },
        ].map(({ col, color, desc }) => (
          <div key={col} style={{ flex: 1, background: `${color}10`, border: `1px solid ${color}40`, borderRadius: 9, padding: '10px 11px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 5 }}>{col}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>

      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
        {t('info.kanban.dragdrop')}
      </p>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
        {t('info.kanban.two_types_intro')}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderLeft: '3px solid #66c0f4', borderRadius: 8, padding: '9px 12px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#66c0f4', marginBottom: 3 }}>🎮 {t('board.steam_board')}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{t('info.kanban.board_steam_desc')}</div>
        </div>
        <div style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderLeft: '3px solid #f5a500', borderRadius: 8, padding: '9px 12px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f5a500', marginBottom: 3 }}>🕹️ {t('board.task_board')}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{t('info.kanban.board_task_desc')}</div>
        </div>
      </div>

      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: '12px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{t('info.kanban.icons_title')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
          {[
            ['🌐', t('info.kanban.icon_board_public')],
            ['🔒', t('info.kanban.icon_board_private')],
            ['📌', t('info.col_pinned')],
            ['🎮', t('info.kanban.icon_now_playing')],
            ['⭐', t('info.kanban.icon_public_fav')],
            ['🕹️', t('board.task_board')],
          ].map(([icon, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={{ fontSize: 14 }}>{icon}</span>{label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────
export default function AppInfoModal({ onClose }) {
  const { t } = useLang();
  const [tab, setTab] = useState('colors');
  const TABS = [
    { id: 'colors',   label: t('info.tab_colors') },
    { id: 'features', label: t('info.tab_features') },
    { id: 'kanban',   label: t('info.tab_kanban') },
  ];

  return (
    <ModalBackdrop onClose={onClose} zIndex={1100}>
      <ModalCard style={{
        width: '100%', maxWidth: 580, height: '78vh', minHeight: 500, maxHeight: 920,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{t('info.title')}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.5 }} title={BUILD_TIME || ''}>v{APP_VERSION} · build {BUILD_LABEL}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px', marginTop: 12, flexShrink: 0 }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              background: 'none', border: 'none',
              borderBottom: tab === tb.id ? '2px solid var(--accent)' : '2px solid transparent',
              padding: '8px 12px', color: tab === tb.id ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: tab === tb.id ? 700 : 400, fontSize: 12, cursor: 'pointer', marginBottom: -1, whiteSpace: 'nowrap',
            }}>{tb.label}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          {tab === 'colors'   && <TabColors />}
          {tab === 'features' && <TabFeatures />}
          {tab === 'kanban'   && <TabKanban />}
        </div>
      </ModalCard>
    </ModalBackdrop>
  );
}
