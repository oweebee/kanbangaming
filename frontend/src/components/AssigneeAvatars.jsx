import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

function AvatarPopup({ user, anchorRect }) {
  if (!anchorRect) return null;
  const initials = user?.username?.[0]?.toUpperCase() || '?';
  const popupWidth = 170;
  const popupHeight = 110; // approximate
  const gap = 8;

  let left = anchorRect.left + anchorRect.width / 2 - popupWidth / 2;
  let top = anchorRect.top - popupHeight - gap;

  // Clamp to viewport
  if (left < 8) left = 8;
  if (left + popupWidth > window.innerWidth - 8) left = window.innerWidth - popupWidth - 8;
  if (top < 8) top = anchorRect.bottom + gap; // flip below if not enough room above

  return createPortal(
    <div style={{
      position: 'fixed', top, left, width: popupWidth,
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '10px 12px',
      zIndex: 9999, boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
      pointerEvents: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {user?.steamAvatar ? (
          <img src={user.steamAvatar} alt="" style={{ width: 38, height: 38, borderRadius: '50%', border: '2px solid var(--border)', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
            {initials}
          </div>
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text)', lineHeight: 1.3 }}>{user?.username}</div>
          {user?.steamPersonaName && user.steamPersonaName !== user.username && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{user.steamPersonaName}</div>
          )}
        </div>
      </div>
      {user?.steamId && (
        <div style={{
          textAlign: 'center', fontSize: 10, color: '#c7d5e0',
          background: '#1b2838', borderRadius: 5, padding: '4px 8px',
          letterSpacing: '0.02em',
        }}>
          <svg viewBox="0 0 496 512" xmlns="http://www.w3.org/2000/svg" style={{ width: 9, height: 9, fill: '#c7d5e0', marginRight: 4, verticalAlign: 'middle' }}>
            <path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.7-76.3-239-180.4l95.2 39.3c6.4 32.1 34.9 56.4 68.9 56.4 38.2 0 69.1-31.1 68.9-69.3l84.5-60.2c52.1 1.3 95.8-40.9 95.8-93.5 0-51.6-42-93.5-93.7-93.5s-93.7 42-93.7 93.5v1.2L176.6 279c-15.5-.9-30.7 3.4-43.5 12.1L0 236.1C10.2 108.4 117.1 8 247.6 8 384.8 8 496 119 496 256z"/>
          </svg>
          Voir profil Steam
        </div>
      )}
    </div>,
    document.body
  );
}

export default function AssigneeAvatars({ assignees = [], appUsers = [], size = 24, borderColor = 'var(--surface)', top = 4, bottom = undefined, left = 8 }) {
  const [popup, setPopup] = useState(null); // { user, rect }
  const timerRef = useRef(null);

  const users = assignees
    .map(id => appUsers.find(u => u.id === id))
    .filter(Boolean);

  if (users.length === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', position: 'absolute', top: bottom !== undefined ? undefined : top, bottom: bottom !== undefined ? bottom : undefined, left, zIndex: 10 }}>
      {users.map((user, idx) => {
        const initials = user.username?.[0]?.toUpperCase() || '?';
        const isHovered = popup?.user?.id === user.id;
        return (
          <div
            key={user.id}
            style={{ position: 'relative', marginLeft: idx > 0 ? -(size * 0.25) : 0, zIndex: isHovered ? 20 : idx + 1 }}
            onMouseEnter={e => {
              clearTimeout(timerRef.current);
              const rect = e.currentTarget.getBoundingClientRect();
              setPopup({ user, rect });
            }}
            onMouseLeave={() => {
              timerRef.current = setTimeout(() => setPopup(null), 80);
            }}
            onClick={e => {
              e.stopPropagation();
              if (user.steamId) window.open(`https://steamcommunity.com/profiles/${user.steamId}`, '_blank');
            }}
          >
            {user.steamAvatar ? (
              <img
                src={user.steamAvatar}
                alt={user.username}
                title={user.username}
                style={{
                  width: size, height: size, borderRadius: '50%',
                  border: `2px solid ${borderColor}`,
                  objectFit: 'cover', display: 'block',
                  cursor: user.steamId ? 'pointer' : 'default',
                  boxShadow: isHovered ? `0 0 0 2px var(--accent)` : 'none',
                  transition: 'box-shadow .15s',
                }}
              />
            ) : (
              <div style={{
                width: size, height: size, borderRadius: '50%',
                background: 'var(--accent)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: size * 0.4, fontWeight: 700,
                border: `2px solid ${borderColor}`,
                cursor: 'default',
                boxShadow: isHovered ? '0 0 0 2px #fff' : 'none',
                transition: 'box-shadow .15s',
              }}>{initials}</div>
            )}
          </div>
        );
      })}
      {popup && <AvatarPopup user={popup.user} anchorRect={popup.rect} />}
    </div>
  );
}
