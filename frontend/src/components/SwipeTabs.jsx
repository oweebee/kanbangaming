import { useRef, useEffect, useCallback, useLayoutEffect } from 'react';

/**
 * SwipeTabs — conteneur d'onglets avec hauteur uniforme et swipe tactile.
 *
 * Props:
 *   tabs        — array de { id, label }
 *   activeTab   — id de l'onglet actif
 *   onTabChange — (id) => void
 *   children    — un enfant par onglet, dans le même ordre que tabs
 *   tabBarStyle — style supplémentaire pour la barre d'onglets (optionnel)
 *   tabBtnStyle — (isActive) => styleObject  (optionnel — remplace le style par défaut)
 */
export default function SwipeTabs({ tabs, activeTab, onTabChange, children, tabBarStyle, tabBtnStyle }) {
  const N            = tabs.length;
  const containerRef = useRef(null);
  const trackRef     = useRef(null);
  const dragRef      = useRef({ active: false, startX: 0, startY: 0, startTime: 0, isHorizontal: null, w: 0 });
  const activeIdxRef = useRef(tabs.findIndex(t => t.id === activeTab));

  useEffect(() => {
    activeIdxRef.current = tabs.findIndex(t => t.id === activeTab);
  }, [activeTab, tabs]);

  const snapToIndex = useCallback((idx, animate = true) => {
    const el  = containerRef.current;
    const trk = trackRef.current;
    if (!el || !trk) return;
    trk.style.transition = animate
      ? 'transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      : 'none';
    trk.style.transform = `translateX(${-idx * el.offsetWidth}px)`;
  }, []);

  useLayoutEffect(() => {
    snapToIndex(tabs.findIndex(t => t.id === activeTab), false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    snapToIndex(tabs.findIndex(t => t.id === activeTab), true);
  }, [activeTab, tabs, snapToIndex]);

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
      e.preventDefault();
      const base = -activeIdxRef.current * d.w;
      let x = base + dx;
      if (x > 0)               x = dx * 0.15;
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
      if (idx !== activeIdxRef.current) onTabChange(tabs[idx].id);
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove',  onMove,  { passive: false });
    el.addEventListener('touchend',   onEnd,   { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove',  onMove);
      el.removeEventListener('touchend',   onEnd);
    };
  }, [N, onTabChange, tabs]);

  const childArray = Array.isArray(children) ? children : [children];

  const defaultBtnStyle = (active) => ({
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    padding: '6px 12px',
    color: active ? 'var(--text)' : 'var(--text-muted)',
    fontWeight: active ? 600 : 400,
    fontSize: 13,
    marginBottom: -1,
    cursor: 'pointer',
  });

  return (
    <>
      {/* Barre d'onglets */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        padding: '8px 16px 0',
        flexShrink: 0,
        ...tabBarStyle,
      }}>
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            style={(tabBtnStyle || defaultBtnStyle)(id === activeTab)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Piste glissante — hauteur identique pour tous les onglets */}
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
                minHeight: 0,
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
    </>
  );
}
