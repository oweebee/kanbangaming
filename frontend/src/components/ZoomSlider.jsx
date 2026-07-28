// Curseur de zoom de l'interface — paliers fixes 80/85/90/95/100%,
// comme le réglage de zoom de Teams/Discord (réduit l'échelle pour
// afficher plus de surface sur les écrans basse résolution).
// Props:
//   value    – 80 | 85 | 90 | 95 | 100
//   onChange – called with new value (number)
import { useLang } from '../i18n.js';
import { ZOOM_STEPS } from '../zoom.js';

export default function ZoomSlider({ value, onChange }) {
  const { t } = useLang();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {t('profile.zoom_label')}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700, color: 'var(--accent)',
          background: 'rgba(192,87,10,0.13)',
          border: '2px solid var(--accent)',
          borderRadius: 5, padding: '1px 8px',
          transition: 'all .2s',
        }}>
          {value}%
        </span>
      </div>

      {/* Segmented step buttons */}
      <div style={{ display: 'flex' }}>
        {ZOOM_STEPS.map((step, i) => {
          const active = step === value;
          const first = i === 0;
          const last = i === ZOOM_STEPS.length - 1;
          return (
            <button
              key={step}
              type="button"
              onClick={() => onChange(step)}
              style={{
                flex: 1,
                padding: '7px 0',
                background: active ? 'var(--accent)' : 'var(--surface2)',
                border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                borderRight: !last ? 'none' : undefined,
                borderRadius: first ? '7px 0 0 7px' : last ? '0 7px 7px 0' : 0,
                color: active ? '#fff' : 'var(--text-muted)',
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                transition: 'all .15s',
              }}
            >{step}%</button>
          );
        })}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 7, lineHeight: 1.5 }}>
        {t('profile.zoom_desc')}
      </div>
    </div>
  );
}
