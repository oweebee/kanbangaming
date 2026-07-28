// Props:
//   value    – null | 0 | 25 | 50 | 75 | 100
//   onChange – called with new value (null or number)
//   compact  – slightly larger typography for SearchModal
import { useLang } from '../i18n.js';

const STEPS = [
  { val: null, label: '—',    color: null },
  { val: 0,    label: '0%',   color: '#c03030' },
  { val: 25,   label: '25%',  color: '#c07020' },
  { val: 50,   label: '50%',  color: '#b09010' },
  { val: 75,   label: '75%',  color: '#4d9020' },
  { val: 100,  label: '100%', color: '#1a8040' },
];

export function progressColor(v) {
  if (v === null || v === undefined) return null;
  if (v >= 100) return '#1a8040';
  if (v >= 75)  return '#4d9020';
  if (v >= 50)  return '#b09010';
  if (v >= 25)  return '#c07020';
  return '#c03030';
}

export default function ProgressSlider({ value, onChange, compact = false }) {
  const { t } = useLang();
  const color = progressColor(value);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{
          fontSize: compact ? 14 : 12, fontWeight: 600,
          color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {t('progress.label')}
          <span style={{ opacity: 0.55, textTransform: 'none', fontWeight: 400, fontSize: compact ? 12 : 10, marginLeft: 5 }}>
            {t('ctrl.optional')}
          </span>
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: value === null ? 'var(--text-muted)' : color,
          background: value === null ? 'transparent' : `${color}22`,
          border: `2px solid ${value === null ? 'var(--border)' : color}`,
          borderRadius: 5, padding: '1px 8px',
          transition: 'all .2s',
        }}>
          {value === null ? t('progress.disabled') : `${value}%`}
        </span>
      </div>

      {/* Segmented step buttons */}
      <div style={{ display: 'flex' }}>
        {STEPS.map((step, i) => {
          const active = step.val === value;
          const isOff = step.val === null;
          const c = step.color;
          const first = i === 0;
          const last = i === STEPS.length - 1;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(step.val)}
              style={{
                flex: isOff ? 'none' : 1,
                padding: compact ? '9px 0' : '7px 0',
                minWidth: isOff ? (compact ? 42 : 36) : undefined,
                background: active
                  ? (isOff ? 'rgba(255,255,255,0.1)' : c)
                  : (isOff ? 'var(--surface2)' : `${c}18`),
                border: active
                  ? `2px solid ${isOff ? 'rgba(255,255,255,0.3)' : c}`
                  : `2px solid ${isOff ? 'var(--border)' : `${c}50`}`,
                borderRight: !last ? 'none' : undefined,
                borderRadius: first ? '7px 0 0 7px' : last ? '0 7px 7px 0' : 0,
                color: active ? (isOff ? '#bbb' : '#fff') : (isOff ? 'var(--text-muted)' : c),
                fontSize: isOff ? (compact ? 16 : 14) : (compact ? 13 : 11),
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                transition: 'all .15s',
                opacity: !active && isOff ? 0.55 : 1,
              }}
            >{step.label}</button>
          );
        })}
      </div>

      {/* Progress track preview */}
      {value !== null && (
        <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 3, marginTop: 7, overflow: 'hidden' }}>
          <div style={{
            width: `${value}%`, height: '100%',
            background: color,
            transition: 'width .3s, background .3s',
          }} />
        </div>
      )}
    </div>
  );
}
