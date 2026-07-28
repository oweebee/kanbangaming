import { useState, useRef, useEffect } from 'react';
import GameCard from './GameCard.jsx';
import AssigneeAvatars from './AssigneeAvatars.jsx';
import { getTaskType } from '../taskTypes.jsx';
import { useLang } from '../i18n.js';
import { matchesFilter } from '../utils.js';
import { EmojiPicker } from './EmojiPicker.jsx';

function ColumnHeader({ col, onRename, onDelete, onSetEmoji, onColDragStart, onColDragEnd, onColDragOver, onColDrop, isDragOver }) {
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(col.label);
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiButtonRef = useRef();
  const colTouchRef = useRef({ active: false, pendingX: 0, pendingY: 0 });
  const colTouchTimerRef = useRef(null);

  const commit = () => {
    const trimmed = label.trim();
    if (trimmed && trimmed !== col.label) onRename(col.id, trimmed);
    else setLabel(col.label);
    setEditing(false);
  };

  return (
    <div style={{
      padding: '10px 10px 10px 8px',
      borderBottom: isDragOver ? '2px solid #3db86a' : '2px solid var(--accent)',
      display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
      position: 'relative', transition: 'border-color .15s',
    }}>
      <div
        draggable
        onDragStart={e => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; onColDragStart(col.id); }}
        onDragEnd={onColDragEnd}
        onTouchStart={e => {
          e.stopPropagation();
          clearTimeout(colTouchTimerRef.current);
          const touch = e.touches[0];
          colTouchRef.current = { pendingX: touch.clientX, pendingY: touch.clientY, active: false };
          colTouchTimerRef.current = setTimeout(() => {
            colTouchRef.current.active = true;
            onColDragStart(col.id);
            if (navigator.vibrate) navigator.vibrate(40);
          }, 350);
        }}
        onTouchMove={e => {
          e.stopPropagation();
          const st = colTouchRef.current;
          const touch = e.touches[0];
          if (!st.active) {
            if (Math.abs(touch.clientX - st.pendingX) > 6 || Math.abs(touch.clientY - st.pendingY) > 6) clearTimeout(colTouchTimerRef.current);
            return;
          }
          e.preventDefault();
          const el = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('[data-kb-col]');
          if (el) onColDragOver(el.getAttribute('data-kb-col'));
        }}
        onTouchEnd={e => {
          e.stopPropagation();
          clearTimeout(colTouchTimerRef.current);
          const wasActive = colTouchRef.current.active;
          colTouchRef.current.active = false;
          if (!wasActive) return;
          e.preventDefault();
          const touch = e.changedTouches[0];
          const el = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('[data-kb-col]');
          onColDrop(el ? el.getAttribute('data-kb-col') : col.id);
        }}
        onTouchCancel={e => {
          e.stopPropagation();
          clearTimeout(colTouchTimerRef.current);
          colTouchRef.current.active = false;
          onColDragEnd();
        }}
        onContextMenu={e => e.preventDefault()}
        title={t('col.move_title')}
        style={{ cursor: 'grab', color: 'var(--text-muted)', opacity: 0.35, fontSize: 14, lineHeight: 1, flexShrink: 0, padding: '0 2px', userSelect: 'none', touchAction: 'none' }}
      >⠇</div>

      <div style={{ position: 'relative' }}>
        <button ref={emojiButtonRef} onClick={() => setShowEmoji(v => !v)} title={t('col.emoji_title')} style={{
          background: col.emoji ? 'transparent' : 'var(--surface3)',
          border: '1px solid var(--border)', borderRadius: 5,
          width: 26, height: 26, fontSize: col.emoji ? 16 : 11,
          cursor: 'pointer', color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>{col.emoji || '+'}</button>
        {showEmoji && (
          <EmojiPicker current={col.emoji || ''} onSelect={e => { onSetEmoji(col.id, e); setShowEmoji(false); }} onClose={() => setShowEmoji(false)} anchorEl={emojiButtonRef.current}
            columns={8} gap={3} btnSize={30} emojiFontSize={16} width={272} maxHeight={340}
            padding="10px 10px 6px" background="var(--surface1)" borderRadius={12}
            boxShadow="0 8px 32px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.04)"
            headerLabel={t('col.icon_header')} clearLabel={t('col.no_emoji')}
            catMarginBottom={10} catFontSize={9} catFontWeight={800} catLetterSpacing="0.1em"
            catLabelMarginBottom={5} catOpacity={0.6} />
        )}
      </div>

      {editing ? (
        <input autoFocus value={label}
          onChange={e => setLabel(e.target.value)} onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setLabel(col.label); setEditing(false); } }}
          style={{ flex: 1, background: 'var(--surface3)', border: '1px solid var(--accent)', borderRadius: 5, padding: '3px 7px', color: 'var(--text)', fontSize: 13, fontWeight: 700, outline: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}
        />
      ) : (
        <span onDoubleClick={() => setEditing(true)} title={t('col.rename_title')}
          style={{ flex: 1, fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', cursor: 'text', userSelect: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: col.color || 'var(--text)' }}
        >{col.label}</span>
      )}

      <span style={{ background: 'var(--surface3)', borderRadius: 99, padding: '1px 7px', fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{col._count || 0}</span>

      <button onClick={() => onDelete(col.id)} title={t('col.del_title')} style={{
        background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', opacity: 0.45, padding: '0 2px', flexShrink: 0,
      }}>✕</button>
    </div>
  );
}

export default function KanbanBoard({ columns, byColumn, dragging, setDragging, moveGame, onCardClick, onArchiveGame, onUnarchiveGame, onDeleteGame, onEditGame, onRenameColumn, onDeleteColumn, onSetEmoji, onReorderColumns, onAddToColumn, onReorderGames, isTaskBoard, appUsers = [], compactView = false, leftOffset = 0, rightOffset = 0, onToggleDone, onToggleUrgent, onUpdateAssignees, onClickNotes, genreColors = {}, hiddenCardIds = new Set(), showHiddenCards = false, onHideCard, onUnhideCard, filterText = '' }) {
  const { t } = useLang();
  const [draggingColId, setDraggingColId] = useState(null);
  const [dragOverColId, setDragOverColId] = useState(null);
  const [dragInsert, setDragInsert] = useState(null); // { colId, beforeAppid: string|null }

  const handleColDragStart = (colId) => setDraggingColId(colId);
  const handleColDragEnd   = () => { setDraggingColId(null); setDragOverColId(null); };

  const handleColDrop = (targetColId) => {
    if (!draggingColId || draggingColId === targetColId) { handleColDragEnd(); return; }
    const newOrder = [...columns];
    const fromIdx = newOrder.findIndex(c => c.id === draggingColId);
    const toIdx   = newOrder.findIndex(c => c.id === targetColId);
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    onReorderColumns(newOrder.map(c => c.id));
    handleColDragEnd();
  };

  // Logique de dépose d'une carte, extraite pour être partagée entre le drop
  // natif HTML5 (souris, événement `drop` du navigateur) et la fin d'un drag
  // tactile (pas d'événement `drop` natif sur mobile/tablette — on rejoue la
  // même logique "à la main" au relâchement du doigt, à partir du dernier
  // `dragInsert` connu). Comportement strictement identique aux deux endroits.
  const performCardDrop = (targetColId) => {
    if (dragging) {
      if (dragInsert?.colId === targetColId) {
        // Réordonnancement dans la même colonne OU déplacement inter-colonne
        // avec position précise.
        const colGames = byColumn[targetColId] || [];
        const newOrder = colGames.map(g => g.appid).filter(id => id !== dragging.appid);
        const insertIdx = dragInsert.beforeAppid
          ? newOrder.indexOf(dragInsert.beforeAppid)
          : newOrder.length;
        newOrder.splice(insertIdx < 0 ? newOrder.length : insertIdx, 0, dragging.appid);
        onReorderGames(targetColId, newOrder);
      } else if (dragging.column !== targetColId) {
        moveGame(dragging.appid, targetColId);
      }
    }
    setDragging(null);
    setDragInsert(null);
  };

  return (
    <div style={{ display: 'flex', flex: 1, gap: '10px', padding: '14px', paddingLeft: 14 + leftOffset, paddingRight: 14 + rightOffset, overflowX: 'auto', overflowY: 'hidden', transition: 'padding-left 0.32s cubic-bezier(0.4,0,0.2,1), padding-right 0.32s cubic-bezier(0.4,0,0.2,1)' }}>
      {columns.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          {t('col.empty_start')}
        </div>
      )}
      {columns.map(col => {
        const games = byColumn[col.id] || [];
        // Filtre local (cartes) — on ne filtre QUE la liste affichée/parcourue ici ;
        // `games` (= byColumn[col.id]) reste intact pour tous les calculs de
        // réordonnancement drag-and-drop (onDrop / dragInsert), qui continuent de
        // s'appuyer sur la liste complète. L'index plein `games.indexOf(game)` est
        // recalculé pour chaque carte visible afin de garder `games[idx+1]` correct.
        const visibleGames = games.filter(g => matchesFilter(g.name, filterText));
        const noMatch = games.length > 0 && visibleGames.length === 0;
        const isColDragOver = dragOverColId === col.id && draggingColId && draggingColId !== col.id;
        return (
          <div key={col.id}
            data-kb-col={col.id}
            onDragOver={e => {
              e.preventDefault();
              if (draggingColId) { setDragOverColId(col.id); return; }
              e.dataTransfer.dropEffect = 'move';
              // Only fires when over empty column area (card wrappers use stopPropagation)
              if (!dragInsert || dragInsert.colId !== col.id || dragInsert.beforeAppid !== null) {
                setDragInsert({ colId: col.id, beforeAppid: null });
              }
            }}
            onDrop={e => {
              e.preventDefault();
              if (draggingColId) { handleColDrop(col.id); return; }
              e.currentTarget.style.background = 'var(--surface)';
              performCardDrop(col.id);
            }}
            onDragEnter={e => { if (!draggingColId) e.currentTarget.style.background = 'rgba(192,87,10,.07)'; }}
            onDragLeave={e => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                if (!draggingColId) e.currentTarget.style.background = 'var(--surface)';
                setDragInsert(null);
              }
            }}
            style={{
              flex: '1 1 0', minWidth: 210, maxWidth: 300,
              display: 'flex', flexDirection: 'column',
              background: 'var(--surface)', borderRadius: 'var(--radius)',
              border: isColDragOver ? '1px solid #3db86a' : '1px solid var(--border)',
              overflow: 'hidden', transition: 'background .15s, border-color .15s',
              opacity: draggingColId === col.id ? 0.45 : 1,
            }}
          >
            <ColumnHeader
              col={{ ...col, _count: visibleGames.length }}
              onRename={onRenameColumn} onDelete={onDeleteColumn} onSetEmoji={onSetEmoji}
              onColDragStart={handleColDragStart} onColDragEnd={handleColDragEnd}
              onColDragOver={setDragOverColId} onColDrop={handleColDrop}
              isDragOver={isColDragOver}
            />
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {games.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, padding: '20px 8px', border: '1px dashed var(--border)', borderRadius: 7 }}>
                  {isTaskBoard ? t('col.empty_task') : t('col.empty_game')}
                </div>
              )}
              {noMatch && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, padding: '20px 8px', border: '1px dashed var(--border)', borderRadius: 7 }}>
                  {t('filter.no_results')}
                </div>
              )}
              {visibleGames.map((game) => {
                const idx = games.indexOf(game);
                const hasAssignees = isTaskBoard && appUsers.length > 0 && game.assignees?.length > 0;
                const tt = game.taskType ? getTaskType(game.taskType) : null;
                const steamColor = game.type !== 'custom' ? (genreColors[String(game.appid)] || '#66c0f4') : null;
                const cardBorderColor = game.urgent ? 'rgba(220,60,60,0.6)' : tt ? tt.border : steamColor || 'var(--border)';
                return (
                  <div
                    key={game.appid}
                    data-kb-card={game.appid}
                    style={{ position: 'relative', paddingTop: hasAssignees && !compactView ? 40 : 0, animation: 'card-appear .2s ease' }}
                    onDragOver={e => {
                      if (draggingColId || !dragging || dragging.appid === game.appid) return;
                      e.preventDefault();
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const isTopHalf = e.clientY < rect.top + rect.height / 2;
                      const beforeAppid = isTopHalf ? game.appid : (games[idx + 1]?.appid ?? null);
                      if (dragInsert?.colId !== col.id || dragInsert?.beforeAppid !== beforeAppid) {
                        setDragInsert({ colId: col.id, beforeAppid });
                      }
                    }}
                  >
                    {dragInsert?.colId === col.id && dragInsert?.beforeAppid === game.appid && (
                      <div style={{ height: 3, background: 'var(--accent)', borderRadius: 3, margin: '0 2px 4px', opacity: 0.9, animation: 'drop-line-in .12s ease' }} />
                    )}
                    {hasAssignees && !compactView && (
                      <AssigneeAvatars
                        assignees={game.assignees}
                        appUsers={appUsers}
                        size={44}
                        borderColor={cardBorderColor}
                      />
                    )}
                    <GameCard game={game}
                      onDragStart={() => setDragging(game)}
                      onDragEnd={() => { setDragging(null); setDragInsert(null); }}
                      onTouchDragMove={touch => {
                        const el = document.elementFromPoint(touch.clientX, touch.clientY);
                        const colEl = el?.closest('[data-kb-col]');
                        if (!colEl) return;
                        const targetColId = colEl.getAttribute('data-kb-col');
                        const cardEl = el?.closest('[data-kb-card]');
                        const targetGame = cardEl ? (byColumn[targetColId] || []).find(g => String(g.appid) === cardEl.getAttribute('data-kb-card')) : null;
                        if (targetGame && String(targetGame.appid) !== String(game.appid)) {
                          const targetGames = byColumn[targetColId] || [];
                          const tIdx = targetGames.indexOf(targetGame);
                          const rect = cardEl.getBoundingClientRect();
                          const isTopHalf = touch.clientY < rect.top + rect.height / 2;
                          const beforeAppid = isTopHalf ? targetGame.appid : (targetGames[tIdx + 1]?.appid ?? null);
                          if (dragInsert?.colId !== targetColId || dragInsert?.beforeAppid !== beforeAppid) {
                            setDragInsert({ colId: targetColId, beforeAppid });
                          }
                          return;
                        }
                        if (dragInsert?.colId !== targetColId || dragInsert?.beforeAppid !== null) {
                          setDragInsert({ colId: targetColId, beforeAppid: null });
                        }
                      }}
                      onTouchDragEnd={() => performCardDrop(dragInsert ? dragInsert.colId : col.id)}
                      onClick={() => onCardClick(game)}
                      onArchive={() => onArchiveGame(game.appid)}
                      onUnarchive={() => onUnarchiveGame(game.appid)}
                      onDelete={() => onDeleteGame(game.appid)}
                      onEdit={onEditGame}
                      isDragging={dragging?.appid === game.appid}
                      isTaskBoard={isTaskBoard}
                      compact={compactView}
                      assignees={game.assignees}
                      appUsers={appUsers}
                      onToggleDone={onToggleDone ? (done) => onToggleDone(game.appid, done) : undefined}
                      onToggleUrgent={onToggleUrgent ? (urgent) => onToggleUrgent(game.appid, urgent) : undefined}
                      onUpdateAssignees={onUpdateAssignees ? (assignees) => onUpdateAssignees(game.appid, assignees) : undefined}
                      onClickNotes={onClickNotes ? () => onClickNotes(game) : undefined}
                      genreColor={steamColor}
                      isHidden={hiddenCardIds.has(String(game.appid))}
                      onHide={onHideCard ? () => onHideCard(game.appid) : undefined}
                      onUnhide={onUnhideCard ? () => onUnhideCard(game.appid) : undefined}
                    />
                  </div>
                );
              })}
              {dragInsert?.colId === col.id && dragInsert?.beforeAppid === null && (
                <div style={{ height: 3, background: 'var(--accent)', borderRadius: 3, margin: '4px 2px 0', opacity: 0.9, animation: 'drop-line-in .12s ease' }} />
              )}
              {onAddToColumn && (
                <button
                  onClick={() => onAddToColumn(col.id)}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, rgba(192,87,10,0.12) 0%, rgba(192,87,10,0.04) 100%)',
                    border: '1.5px solid rgba(192,87,10,0.35)',
                    borderRadius: 7, padding: '7px 8px',
                    color: 'var(--accent)', fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', textAlign: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    transition: 'background .15s, border-color .15s, box-shadow .15s',
                    marginTop: games.length > 0 ? 2 : 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(192,87,10,0.22) 0%, rgba(192,87,10,0.10) 100%)'; e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(192,87,10,0.18), 0 2px 8px rgba(0,0,0,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(192,87,10,0.12) 0%, rgba(192,87,10,0.04) 100%)'; e.currentTarget.style.borderColor = 'rgba(192,87,10,0.35)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)'; }}
                >
                  + {isTaskBoard ? t('col.add_task') : t('col.add_card_game')}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
