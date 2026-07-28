import { useRef, useEffect, useCallback, useLayoutEffect } from 'react';

/**
 * MobileHomeSlider — composant propre (pas une JSX const) pour garantir que
 * les refs sont attachées avant que useEffect([]) tourne.
 *
 * Props:
 *   tab         — id de l'onglet actif
 *   onTabChange — (id) => void
 *   tabLabels   — array de { id, label }
 *   children    — un enfant par onglet (dans le même ordre que tabLabels)
 */
export default function MobileHomeSlider({ tab, onTabChange, tabLabels, children }) {
  const N            = tabLabels.length;
  const containerRef = useRef(null);
  const trackRef     = useRef(null);
  const dragRef      = useRef({ active: false, startX: 0, startY: 0, startTime: 0, isHorizontal: null, w: 0 });
  const activeIdxRef = useRef(tabLabels.findIndex(t => t.id === tab));

  // Garde l'index ref synchronisé avec l'état React
  useEffect(() => {
    activeIdxRef.current = tabLabels.findIndex(t => t.id === tab);
  }, [tab, tabLabels]);

  const snapToIndex = useCallback((idx, animate = true) => {
    const el  = containerRef.current;
    const trk = trackRef.current;
    if (!el || !trk) return;
    trk.style.transition = animate
      ? 'transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      : 'none';
    trk.style.transform = `translateX(${-idx * el.offsetWidth}px)`;
  }, []);

  // Position initiale sans animation (synchrone, avant premier paint)
  useLayoutEffect(() => {
    snapToIndex(tabLabels.findIndex(t => t.id === tab), false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Snap animé quand l'onglet change (clic ou back button)
  useEffect(() => {
    snapToIndex(tabLabels.findIndex(t => t.id === tab), true);
  }, [tab, tabLabels, snapToIndex]);

  // Événements tactiles natifs — garanti de tourner après le montage (vrai composant)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onStart = (e) => {
      const d = dragRef.current;
      d.active = true; d.isHorizontal = null;
      d.startX = e.touches[0].clientX; d.startY = e.touches[0].clientY;
      d.startTime = Date.now(); d.w = el.offsetWidth;
      if (trackRef.current) trackRef.current.style.transition = 'none';
    };

    const onMove = (e) => {
      const d = dragRef.current;
      if (!d.active) return;
      const dx = e.touches[0].clientX - d.startX;
      const dy = e.touches[0].clientY - d.startY;
      if (d.isHorizontal === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5))
        d.isHorizontal = Math.abs(dx) > Math.abs(dy);
      if (!d.isHorizontal) return;
      e.preventDefault(); // bloque le scroll vertical seulement en swipe horizontal
      const base = -activeIdxRef.current * d.w;
      let x = base + dx;
      // Effet caoutchouc aux extrémités
      if (x > 0)              x = dx * 0.15;
      if (x < -(N - 1) * d.w) x = -(N - 1) * d.w + (x + (N - 1) * d.w) * 0.15;
      if (trackRef.current) trackRef.current.style.transform = `translateX(${x}px)`;
    };

    const onEnd = (e) => {
      const d = dragRef.current;
      if (!d.active) return;
      d.active = false;
      if (!d.isHorizontal) return;
      const dx      = e.changedTouches[0].clientX - d.startX;
      const dt      = Date.now() - d.startTime;
      const isFlick = dt < 300 && Math.abs(dx) > 25;
      let idx = activeIdxRef.current;
      if ((dx < -d.w * 0.3 || (isFlick && dx < 0)) && idx < N - 1) idx++;
      else if ((dx > d.w * 0.3 || (isFlick && dx > 0)) && idx > 0) idx--;
      if (trackRef.current) {
        trackRef.current.style.transition = 'transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        trackRef.current.style.transform  = `translateX(${-idx * d.w}px)`;
      }
      if (idx !== activeIdxRef.current) onTabChange(tabLabels[idx].id);
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove',  onMove,  { passive: false });
    el.addEventListener('touchend',   onEnd,   { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove',  onMove);
      el.removeEventListener('touchend',   onEnd);
    };
  }, []); // [] — le composant est monté, les refs sont attachées

  const childArray = Array.isArray(children) ? children : [children];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Barre d'onglets ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--surface)' }}>
        {tabLabels.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            style={{
              flex: 1, background: 'none', border: 'none',
              borderBottom: tab === id ? '2px solid var(--accent)' : '2px solid transparent',
              padding: '10px 4px', marginBottom: -1,
              color: tab === id ? 'var(--text)' : 'var(--text-muted)',
              fontSize: 11, fontWeight: tab === id ? 700 : 400,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Piste de slide ── */}
      <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div
          ref={trackRef}
          style={{
            display: 'flex',
            width: `${N * 100}%`,
            height: '100%',
            willChange: 'transform',
          }}
        >
          {childArray.map((child, i) => (
            <div
              key={i}
              style={{
                width: `${100 / N}%`,
                height: '100%',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxSizing: 'border-box',
              }}
            >
              {child}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
