import { useState, useRef, useEffect, useCallback } from 'react';
import { useLang } from '../i18n.js';
import { authHeaders } from '../utils.js';

const API = '/api';

function highlight(text, q) {
  if (!text || !q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(100,200,255,0.22)', color: 'inherit', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

const PUBLIC_COLOR = '#47a7f5';

export default function GlobalSearch({ token, onGoToBoard, onOpenGame }) {
  const { t } = useLang();
  const BADGE = {
    board: { label: 'Board',           color: '#f5a500' },
    name:  { label: t('gsearch.badge_task'), color: '#4cd882' },
    note:  { label: t('gsearch.badge_note'), color: '#a78bfa' },
  };

  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [open, setOpen]           = useState(false);
  const [expanded, setExpanded]   = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const debounceRef  = useRef(null);
  const containerRef = useRef(null);
  const inputRef     = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/search?q=${encodeURIComponent(q)}`, {
        headers: authHeaders(token),
      });
      if (res.ok) setResults(await res.json());
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [token]);

  const handleInput = (val) => {
    setQuery(val);
    setActiveIdx(-1);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); setOpen(false); return; }
    setOpen(true);
    debounceRef.current = setTimeout(() => doSearch(val), 220);
  };

  const handleSelect = (r) => {
    setQuery(''); setResults([]); setOpen(false); setExpanded(false);
    if (r.type === 'board') onGoToBoard(r.boardId, r);
    else onOpenGame(r.boardId, r.gameId, r);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); setQuery(''); setResults([]); setExpanded(false); return; }
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); handleSelect(results[activeIdx]); }
  };

  const handleIconClick = () => {
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Fermer au clic extérieur
  useEffect(() => {
    const fn = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setExpanded(false);
        setQuery('');
        setResults([]);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>

      {/* Icône loupe — seul élément dans le flux du header */}
      <button
        onClick={handleIconClick}
        title={t('gsearch.title')}
        style={{
          background: expanded ? 'rgba(192,87,10,0.18)' : 'none',
          border: expanded ? '1px solid var(--accent)' : '1px solid transparent',
          borderRadius: 8,
          width: 30, height: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
          transition: 'background .15s, border-color .15s',
        }}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
          stroke={expanded ? 'var(--accent)' : 'var(--text-muted)'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </button>

      {/* Panneau flottant : champ + dropdown. position:absolute → ne touche pas au layout du header */}
      {expanded && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 2001 }}>

          {/* Champ de saisie */}
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              type="search"
              placeholder={t('gsearch.placeholder')}
              value={query}
              onChange={e => handleInput(e.target.value)}
              onFocus={() => query && results.length > 0 && setOpen(true)}
              onKeyDown={handleKeyDown}
              style={{
                display: 'block',
                background: 'var(--surface)',
                border: '1px solid var(--accent)',
                borderRadius: 8,
                padding: '7px 30px 7px 12px',
                color: 'var(--text)', fontSize: 13, outline: 'none',
                width: 260,
                boxShadow: '0 6px 24px rgba(0,0,0,0.7)',
              }}
            />
            {loading && (
              <div style={{
                position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)',
                width: 10, height: 10,
                border: '2px solid var(--accent)', borderTopColor: 'transparent',
                borderRadius: '50%', animation: 'gspin .55s linear infinite',
              }} />
            )}
          </div>

          {/* Dropdown résultats */}
          {open && query.length >= 2 && (
            <div style={{
              marginTop: 4,
              width: 420,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, boxShadow: '0 10px 40px rgba(0,0,0,.85)',
              maxHeight: 480, overflowY: 'auto',
            }}>
              {!loading && results.length === 0 ? (
                <div style={{ padding: '18px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  {t('gsearch.no_results', { query })}
                </div>
              ) : results.map((r, idx) => {
                const badge = BADGE[r.matchedIn] || { label: r.matchedIn, color: '#fff' };
                const isActive = idx === activeIdx;
                return (
                  <div
                    key={`${r.type}-${r.boardId}-${r.gameId || ''}-${idx}`}
                    onClick={() => handleSelect(r)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                      cursor: 'pointer',
                      background: isActive ? 'var(--surface2)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      transition: 'background .08s',
                    }}
                  >
                    {/* Miniature — icône gauche +30% : 52×30 → 68×39 */}
                    <div style={{
                      width: 68, height: 39, borderRadius: 5, overflow: 'hidden', flexShrink: 0,
                      background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      {r.gameImg ? (
                        <img src={r.gameImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : r.boardHeaderImg ? (
                        <img src={r.boardHeaderImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : r.boardIcon ? (
                        <img src={r.boardIcon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      ) : (
                        <span style={{ fontSize: 20 }}>🎮</span>
                      )}
                    </div>

                    {/* Texte — +25% */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                        {r.type === 'board' ? highlight(r.boardName, query) : highlight(r.gameName, query)}
                      </div>
                      {r.type !== 'board' && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                          {r.matchedIn === 'note' && r.notePreview
                            ? <>📝 {highlight(r.notePreview, query)}</>
                            : `📋 ${r.boardName}`}
                        </div>
                      )}
                      {r.matchedIn === 'note' && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1, lineHeight: 1.3 }}>📋 {r.boardName}</div>
                      )}
                      {r.isPublic && r.ownerUsername && (
                        <div style={{ fontSize: 12, color: PUBLIC_COLOR, marginTop: 1, lineHeight: 1.3, opacity: 0.8 }}>
                          🌐 {r.isFollowed ? 'Suivi · ' : ''}{r.ownerUsername}
                        </div>
                      )}
                    </div>

                    {/* Badge — +25% */}
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, flexShrink: 0,
                      color: badge.color, border: `1px solid ${badge.color}`, opacity: 0.9,
                      letterSpacing: '0.03em',
                    }}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      <style>{`@keyframes gspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
