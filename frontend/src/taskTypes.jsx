// ── Task Type definitions ─────────────────────────────────────────────────────
// Each type has: id, label, emoji, colors, an SVG Icon component,
// and a dark imgBg for the card image area.

function FarmingIcon() {
  return (
    <svg width="90" height="68" viewBox="0 0 90 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hay bale */}
      <rect x="46" y="28" width="38" height="28" rx="8" fill="#c49a18" stroke="#7a5c00" strokeWidth="2.5"/>
      <line x1="46" y1="42" x2="84" y2="42" stroke="#7a5c00" strokeWidth="2"/>
      <line x1="65" y1="28" x2="65" y2="56" stroke="#7a5c00" strokeWidth="2"/>
      {/* Hay strands */}
      <line x1="54" y1="28" x2="51" y2="20" stroke="#d4aa20" strokeWidth="2" strokeLinecap="round"/>
      <line x1="65" y1="28" x2="65" y2="19" stroke="#d4aa20" strokeWidth="2" strokeLinecap="round"/>
      <line x1="75" y1="28" x2="78" y2="20" stroke="#d4aa20" strokeWidth="2" strokeLinecap="round"/>
      {/* Pitchfork handle */}
      <rect x="14" y="26" width="6" height="36" rx="3" fill="#8B5E2A" stroke="#5a3a10" strokeWidth="2"/>
      {/* Pitchfork bar */}
      <rect x="8" y="20" width="20" height="7" rx="3" fill="#d4aa20" stroke="#7a5c00" strokeWidth="2"/>
      {/* Tines */}
      <rect x="8" y="7" width="5" height="16" rx="2.5" fill="#d4aa20" stroke="#7a5c00" strokeWidth="2"/>
      <rect x="15" y="5" width="5" height="18" rx="2.5" fill="#d4aa20" stroke="#7a5c00" strokeWidth="2"/>
      <rect x="22" y="7" width="5" height="16" rx="2.5" fill="#d4aa20" stroke="#7a5c00" strokeWidth="2"/>
      {/* Sun */}
      <circle cx="78" cy="12" r="6" fill="#f0c030" stroke="#7a5c00" strokeWidth="1.8"/>
      <line x1="78" y1="3" x2="78" y2="1" stroke="#f0c030" strokeWidth="2" strokeLinecap="round"/>
      <line x1="85" y1="5.5" x2="87" y2="3.5" stroke="#f0c030" strokeWidth="2" strokeLinecap="round"/>
      <line x1="88" y1="12" x2="91" y2="12" stroke="#f0c030" strokeWidth="2" strokeLinecap="round"/>
      <line x1="85" y1="18.5" x2="87" y2="20.5" stroke="#f0c030" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function MissionIcon() {
  return (
    <svg width="90" height="68" viewBox="0 0 90 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shield */}
      <path d="M45 6 L74 17 L74 42 Q74 60 45 68 Q16 60 16 42 L16 17 Z" fill="#1a6bb5" stroke="#0a3a6a" strokeWidth="2.5"/>
      {/* Highlight */}
      <path d="M24 22 L45 13 L45 44 Q32 50 24 44 Z" fill="rgba(100,170,255,0.14)"/>
      {/* Star */}
      <polygon points="45,23 48.5,33 59,33 51,39 54,49 45,43 36,49 39,39 31,33 41.5,33"
        fill="#f5d030" stroke="#8a6000" strokeWidth="1.5"/>
    </svg>
  );
}

function ConstructionIcon() {
  return (
    <svg width="90" height="68" viewBox="0 0 90 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Bottom row */}
      <rect x="8" y="50" width="28" height="14" rx="3" fill="#a06030" stroke="#5a3010" strokeWidth="2.2"/>
      <rect x="40" y="50" width="28" height="14" rx="3" fill="#a06030" stroke="#5a3010" strokeWidth="2.2"/>
      <rect x="72" y="50" width="12" height="14" rx="3" fill="#a06030" stroke="#5a3010" strokeWidth="2.2"/>
      {/* Middle row */}
      <rect x="8" y="35" width="14" height="14" rx="3" fill="#b07040" stroke="#5a3010" strokeWidth="2.2"/>
      <rect x="26" y="35" width="28" height="14" rx="3" fill="#b07040" stroke="#5a3010" strokeWidth="2.2"/>
      <rect x="58" y="35" width="26" height="14" rx="3" fill="#b07040" stroke="#5a3010" strokeWidth="2.2"/>
      {/* Top row */}
      <rect x="8" y="20" width="28" height="14" rx="3" fill="#c08050" stroke="#5a3010" strokeWidth="2.2"/>
      <rect x="40" y="20" width="28" height="14" rx="3" fill="#c08050" stroke="#5a3010" strokeWidth="2.2"/>
      <rect x="72" y="20" width="12" height="14" rx="3" fill="#c08050" stroke="#5a3010" strokeWidth="2.2"/>
      {/* Trowel */}
      <line x1="76" y1="19" x2="84" y2="8" stroke="#8B5E2A" strokeWidth="3" strokeLinecap="round"/>
      <path d="M82 4 Q88 6 88 12 Q84 14 80 10 Z" fill="#c49a18" stroke="#7a5c00" strokeWidth="1.5"/>
    </svg>
  );
}

function DailyQuestIcon() {
  return (
    <svg width="90" height="68" viewBox="0 0 90 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Calendar body */}
      <rect x="14" y="16" width="60" height="50" rx="7" fill="#d07818" stroke="#7a4000" strokeWidth="2.5"/>
      {/* Top bar */}
      <rect x="14" y="16" width="60" height="18" rx="7" fill="#a85a10" stroke="#7a4000" strokeWidth="2.5"/>
      <rect x="14" y="26" width="60" height="8" fill="#a85a10"/>
      {/* Rings */}
      <rect x="27" y="9" width="7" height="14" rx="3.5" fill="#7a4000" stroke="#5a2800" strokeWidth="1.5"/>
      <rect x="54" y="9" width="7" height="14" rx="3.5" fill="#7a4000" stroke="#5a2800" strokeWidth="1.5"/>
      {/* Circular arrow */}
      <path d="M32 48 A13 13 0 1 1 52 58" fill="none" stroke="rgba(255,210,100,0.95)" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Arrow head */}
      <polygon points="52,53 60,57 54,64" fill="rgba(255,210,100,0.95)"/>
    </svg>
  );
}

function EventIcon() {
  return (
    <svg width="90" height="68" viewBox="0 0 90 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Calendar body */}
      <rect x="14" y="16" width="60" height="50" rx="7" fill="#5a5a8a" stroke="#3a3a6a" strokeWidth="2.5"/>
      {/* Top bar */}
      <rect x="14" y="16" width="60" height="18" rx="7" fill="#48487a" stroke="#3a3a6a" strokeWidth="2.5"/>
      <rect x="14" y="26" width="60" height="8" fill="#48487a"/>
      {/* Rings */}
      <rect x="27" y="9" width="7" height="14" rx="3.5" fill="#3a3a6a" stroke="#2a2a5a" strokeWidth="1.5"/>
      <rect x="54" y="9" width="7" height="14" rx="3.5" fill="#3a3a6a" stroke="#2a2a5a" strokeWidth="1.5"/>
      {/* Day dots */}
      <circle cx="27" cy="42" r="3.5" fill="rgba(200,200,240,0.35)"/>
      <circle cx="40" cy="42" r="3.5" fill="rgba(200,200,240,0.35)"/>
      <circle cx="53" cy="42" r="3.5" fill="rgba(200,200,240,0.35)"/>
      <circle cx="66" cy="42" r="3.5" fill="rgba(200,200,240,0.35)"/>
      <circle cx="27" cy="55" r="3.5" fill="rgba(200,200,240,0.35)"/>
      <circle cx="40" cy="55" r="3.5" fill="rgba(200,200,240,0.35)"/>
      {/* Red X marked date */}
      <rect x="56" y="48" width="18" height="16" rx="4" fill="rgba(200,20,20,0.18)" stroke="#cc2020" strokeWidth="2"/>
      <line x1="60" y1="52" x2="70" y2="60" stroke="#ff4545" strokeWidth="2.8" strokeLinecap="round"/>
      <line x1="70" y1="52" x2="60" y2="60" stroke="#ff4545" strokeWidth="2.8" strokeLinecap="round"/>
    </svg>
  );
}

function DungeonIcon() {
  return (
    <svg width="95" height="68" viewBox="0 0 95 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Wing */}
      <path d="M28 36 L6 22 L14 38 L4 52 L28 46 Z" fill="#8a1010" stroke="#5a0a0a" strokeWidth="2" strokeLinejoin="round"/>
      <line x1="28" y1="36" x2="10" y2="26" stroke="rgba(180,50,50,0.4)" strokeWidth="1.2"/>
      <line x1="28" y1="42" x2="7" y2="40" stroke="rgba(180,50,50,0.4)" strokeWidth="1.2"/>
      {/* Body */}
      <ellipse cx="46" cy="48" rx="20" ry="16" fill="#b52020" stroke="#6a0808" strokeWidth="2.5"/>
      {/* Head */}
      <ellipse cx="60" cy="28" rx="16" ry="13" fill="#c02828" stroke="#6a0808" strokeWidth="2.5"/>
      {/* Horns */}
      <path d="M50 16 L46 5 L56 14" fill="#8a1010" stroke="#5a0a0a" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M65 14 L68 4 L73 14" fill="#8a1010" stroke="#5a0a0a" strokeWidth="2" strokeLinejoin="round"/>
      {/* Eye */}
      <circle cx="65" cy="26" r="5.5" fill="#f5d030" stroke="#5a0a0a" strokeWidth="1.5"/>
      <ellipse cx="66" cy="26" rx="2.5" ry="3.5" fill="#1a0808"/>
      {/* Scales */}
      <path d="M38 45 Q42 41 46 45" fill="none" stroke="rgba(200,80,80,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M46 53 Q50 49 54 53" fill="none" stroke="rgba(200,80,80,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Fire */}
      <path d="M73 30 Q80 25 87 29 Q84 34 90 38 Q83 37 87 45 Q79 39 82 50 Q73 41 77 53 Q68 44 72 36 Q67 38 73 30 Z"
        fill="#f5a020" stroke="#c04010" strokeWidth="1.5"/>
      <path d="M75 33 Q81 29 83 35 Q80 39 83 44 Q77 39 79 47 Q74 41 75 33 Z" fill="#f8e040"/>
    </svg>
  );
}

function ItemIcon() {
  return (
    <svg width="90" height="68" viewBox="0 0 90 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Strap */}
      <path d="M30 24 Q45 14 60 24" fill="none" stroke="#1a6a30" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Bag body */}
      <rect x="18" y="22" width="54" height="42" rx="11" fill="#2a8a3a" stroke="#1a5025" strokeWidth="2.5"/>
      {/* Flap */}
      <path d="M18 36 L18 28 Q18 22 24 22 L66 22 Q72 22 72 28 L72 36 Q72 44 66 44 L24 44 Q18 44 18 36 Z"
        fill="#228030" stroke="#1a5025" strokeWidth="2.5"/>
      {/* Flap shine */}
      <path d="M26 25 Q45 20 64 25" fill="none" stroke="rgba(120,240,140,0.18)" strokeWidth="2"/>
      {/* Buckle */}
      <rect x="34" y="37" width="22" height="11" rx="4" fill="#1a5025" stroke="#0a3015" strokeWidth="2"/>
      <rect x="39" y="40" width="12" height="5" rx="2.5" fill="rgba(100,230,130,0.25)"/>
      {/* Pockets */}
      <rect x="22" y="52" width="20" height="9" rx="3" fill="rgba(0,0,0,0.2)" stroke="rgba(100,220,120,0.3)" strokeWidth="1.5"/>
      <rect x="48" y="52" width="20" height="9" rx="3" fill="rgba(0,0,0,0.2)" stroke="rgba(100,220,120,0.3)" strokeWidth="1.5"/>
    </svg>
  );
}

function ProductionIcon() {
  return (
    <svg width="90" height="68" viewBox="0 0 90 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer ring */}
      <circle cx="45" cy="36" r="28" fill="none" stroke="#c0c0c0" strokeWidth="3"/>
      {/* Gear teeth (8 teeth) */}
      <rect x="41" y="5" width="8" height="11" rx="2.5" fill="#d8d8d8" stroke="#a0a0a0" strokeWidth="1.5"/>
      <rect x="41" y="56" width="8" height="11" rx="2.5" fill="#d8d8d8" stroke="#a0a0a0" strokeWidth="1.5"/>
      <rect x="5" y="32" width="11" height="8" rx="2.5" fill="#d8d8d8" stroke="#a0a0a0" strokeWidth="1.5"/>
      <rect x="74" y="32" width="11" height="8" rx="2.5" fill="#d8d8d8" stroke="#a0a0a0" strokeWidth="1.5"/>
      {/* Diagonal teeth */}
      <rect x="13" y="13" width="8" height="11" rx="2.5" fill="#d8d8d8" stroke="#a0a0a0" strokeWidth="1.5" transform="rotate(45 17 18.5)"/>
      <rect x="65" y="13" width="8" height="11" rx="2.5" fill="#d8d8d8" stroke="#a0a0a0" strokeWidth="1.5" transform="rotate(-45 69 18.5)"/>
      <rect x="13" y="51" width="8" height="11" rx="2.5" fill="#d8d8d8" stroke="#a0a0a0" strokeWidth="1.5" transform="rotate(-45 17 56.5)"/>
      <rect x="65" y="51" width="8" height="11" rx="2.5" fill="#d8d8d8" stroke="#a0a0a0" strokeWidth="1.5" transform="rotate(45 69 56.5)"/>
      {/* Main body */}
      <circle cx="45" cy="36" r="22" fill="url(#gearGrad)" stroke="#b0b0b0" strokeWidth="2"/>
      {/* Center hole */}
      <circle cx="45" cy="36" r="9" fill="#1a1a1a" stroke="#888" strokeWidth="2"/>
      {/* Shine */}
      <ellipse cx="36" cy="27" rx="6" ry="4" fill="rgba(255,255,255,0.18)" transform="rotate(-30 36 27)"/>
      <defs>
        <radialGradient id="gearGrad" cx="38%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#f0f0f0"/>
          <stop offset="60%" stopColor="#c8c8c8"/>
          <stop offset="100%" stopColor="#909090"/>
        </radialGradient>
      </defs>
    </svg>
  );
}

function BossIcon() {
  return (
    <svg width="90" height="68" viewBox="0 0 90 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Crown base */}
      <rect x="24" y="27" width="42" height="10" rx="3" fill="#f0c030" stroke="#8a6000" strokeWidth="2"/>
      {/* Crown spikes */}
      <polygon points="24,27 30,12 37,25" fill="#f0c030" stroke="#8a6000" strokeWidth="1.5" strokeLinejoin="round"/>
      <polygon points="39,27 45,8 51,27" fill="#f0c030" stroke="#8a6000" strokeWidth="1.5" strokeLinejoin="round"/>
      <polygon points="53,27 60,12 66,27" fill="#f0c030" stroke="#8a6000" strokeWidth="1.5" strokeLinejoin="round"/>
      {/* Crown gems */}
      <circle cx="30" cy="20" r="3.5" fill="#e040c0" stroke="#8a0060" strokeWidth="1"/>
      <circle cx="45" cy="14" r="4" fill="#e040c0" stroke="#8a0060" strokeWidth="1"/>
      <circle cx="60" cy="20" r="3.5" fill="#e040c0" stroke="#8a0060" strokeWidth="1"/>
      {/* Left ear */}
      <ellipse cx="22" cy="44" rx="7" ry="9" fill="#f090b8" stroke="#c05080" strokeWidth="2"/>
      <ellipse cx="22" cy="44" rx="4" ry="6" fill="#e060a0"/>
      {/* Right ear */}
      <ellipse cx="68" cy="44" rx="7" ry="9" fill="#f090b8" stroke="#c05080" strokeWidth="2"/>
      <ellipse cx="68" cy="44" rx="4" ry="6" fill="#e060a0"/>
      {/* Head */}
      <ellipse cx="45" cy="54" rx="23" ry="18" fill="#f090b8" stroke="#c05080" strokeWidth="2.5"/>
      {/* Eyes */}
      <ellipse cx="37" cy="50" rx="3.5" ry="4" fill="#1a0810"/>
      <ellipse cx="53" cy="50" rx="3.5" ry="4" fill="#1a0810"/>
      <circle cx="38" cy="49" r="1.2" fill="#fff" opacity="0.7"/>
      <circle cx="54" cy="49" r="1.2" fill="#fff" opacity="0.7"/>
      {/* Snout */}
      <ellipse cx="45" cy="60" rx="10" ry="6.5" fill="#e060a0" stroke="#c05080" strokeWidth="1.5"/>
      <ellipse cx="41" cy="60" rx="2.5" ry="2" fill="#1a0810" opacity="0.5"/>
      <ellipse cx="49" cy="60" rx="2.5" ry="2" fill="#1a0810" opacity="0.5"/>
      {/* Cheek blush */}
      <ellipse cx="29" cy="56" rx="5" ry="3" fill="#e04090" opacity="0.3"/>
      <ellipse cx="61" cy="56" rx="5" ry="3" fill="#e04090" opacity="0.3"/>
    </svg>
  );
}

function ITIcon() {
  return (
    <svg width="90" height="68" viewBox="0 0 90 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Écran */}
      <rect x="10" y="8" width="70" height="46" rx="4" fill="#132433" stroke="#3a8ab0" strokeWidth="2.5"/>
      {/* Zone code */}
      <rect x="16" y="14" width="58" height="34" rx="2" fill="#081420"/>
      {/* Chevrons < > */}
      <path d="M32 23 L23 31 L32 39" fill="none" stroke="#4ad4ff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M56 23 L65 31 L56 39" fill="none" stroke="#4ad4ff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Slash */}
      <line x1="48" y1="19" x2="41" y2="43" stroke="#7af0a0" strokeWidth="3.2" strokeLinecap="round"/>
      {/* Pied de l'écran */}
      <rect x="40" y="54" width="10" height="8" fill="#3a8ab0"/>
      <rect x="27" y="62" width="36" height="5" rx="2.5" fill="#3a8ab0"/>
    </svg>
  );
}

function DIYIcon() {
  return (
    <svg width="90" height="68" viewBox="0 0 90 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Manche du marteau (diagonale basse-gauche → haut-droite) */}
      <rect x="-4" y="-4.5" width="52" height="10" rx="4.5" fill="#8B5E2A" stroke="#5a3a10" strokeWidth="2"
        transform="translate(20 58) rotate(-42)"/>
      {/* Tête du marteau */}
      <rect x="0" y="0" width="24" height="16" rx="3" fill="#8a929a" stroke="#4a5058" strokeWidth="2.2"
        transform="translate(46 8) rotate(-42)"/>
      {/* Clé à molette (diagonale basse-droite → haut-gauche) */}
      <rect x="-4" y="-4.5" width="46" height="9" rx="4.5" fill="#b0b8c0" stroke="#5a6068" strokeWidth="2"
        transform="translate(58 58) rotate(42)"/>
      <circle cx="60" cy="18" r="9" fill="none" stroke="#5a6068" strokeWidth="4.5"
        transform="translate(0 0)"/>
      <path d="M56 10 L60 3 L64 10 Z" fill="#e8ecf0" transform="translate(0 0)"/>
    </svg>
  );
}

function HourglassIcon() {
  return (
    <svg width="90" height="68" viewBox="0 0 90 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Socles */}
      <rect x="24" y="6" width="42" height="8" rx="3" fill="#e0a030" stroke="#7a5c00" strokeWidth="2"/>
      <rect x="24" y="58" width="42" height="8" rx="3" fill="#e0a030" stroke="#7a5c00" strokeWidth="2"/>
      {/* Verre */}
      <path d="M28 14 L62 14 L48 36 L62 58 L28 58 L42 36 Z" fill="rgba(255,230,180,0.12)" stroke="#e0a030" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* Sable haut */}
      <path d="M32 18 L58 18 L45 33 Z" fill="#f5c848"/>
      {/* Sable bas */}
      <path d="M34 54 L56 54 L45 40 Z" fill="#f5c848" opacity="0.85"/>
      {/* Filet de sable */}
      <line x1="45" y1="34" x2="45" y2="40" stroke="#f5d97a" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  );
}

// ── Type registry ─────────────────────────────────────────────────────────────

export const TASK_TYPES = [
  {
    id: 'farming', label: 'Farming', emoji: '🌾',
    img: '/task-types/farming.png', FallbackIcon: FarmingIcon,
    bg: 'rgba(160,120,20,0.16)', border: '#c8a028',
    badgeBg: 'rgba(120,85,8,0.88)', badgeText: '#f5d97a', textColor: '#e8d080',
  },
  {
    id: 'mission', label: 'Mission', emoji: '🛡️',
    img: '/task-types/mission.png', FallbackIcon: MissionIcon,
    bg: 'rgba(20,80,160,0.16)', border: '#3c82dc',
    badgeBg: 'rgba(8,40,100,0.88)', badgeText: '#80b8f0', textColor: '#80b8f0',
  },
  {
    id: 'construction', label: 'Construction', emoji: '🧱',
    img: '/task-types/construction.png', FallbackIcon: ConstructionIcon,
    bg: 'rgba(120,70,20,0.16)', border: '#aa6e32',
    badgeBg: 'rgba(80,45,10,0.88)', badgeText: '#d4a870', textColor: '#d4a870',
  },
  {
    id: 'daily', label: 'Quotidien', labelKey: 'type.daily', emoji: '🔁',
    img: '/task-types/daily.png', FallbackIcon: DailyQuestIcon,
    bg: 'rgba(180,100,10,0.16)', border: '#e69628',
    badgeBg: 'rgba(130,75,8,0.88)', badgeText: '#f5c060', textColor: '#f5c060',
  },
  {
    id: 'event', label: 'Événement', labelKey: 'type.event', emoji: '📅',
    img: '/task-types/event.png', FallbackIcon: EventIcon,
    bg: 'rgba(90,90,130,0.16)', border: '#a0a0d2',
    badgeBg: 'rgba(50,50,90,0.88)', badgeText: '#c0c0e0', textColor: '#c0c0e0',
  },
  {
    id: 'dungeon', label: 'Donjon', labelKey: 'type.dungeon', emoji: '🐉',
    img: '/task-types/dungeon.png', FallbackIcon: DungeonIcon,
    bg: 'rgba(160,15,15,0.16)', border: '#dc3232',
    badgeBg: 'rgba(100,8,8,0.88)', badgeText: '#f08080', textColor: '#f08080',
  },
  {
    id: 'item', label: 'Item', emoji: '🎒',
    img: '/task-types/item.png', FallbackIcon: ItemIcon,
    bg: 'rgba(25,110,45,0.16)', border: '#3cb45a',
    badgeBg: 'rgba(12,70,25,0.88)', badgeText: '#80e898', textColor: '#80e898',
  },
  {
    id: 'boss', label: 'Boss', emoji: '👑',
    img: '/task-types/boss.png', FallbackIcon: BossIcon,
    bg: 'rgba(220,60,150,0.15)', border: '#ff64be',
    badgeBg: 'rgba(130,20,80,0.88)', badgeText: '#ffb0e0', textColor: '#ffb0e0',
  },
  {
    id: 'production', label: 'Production', emoji: '⚙️',
    img: '/task-types/production.png', FallbackIcon: ProductionIcon,
    bg: 'rgba(200,200,200,0.10)', border: '#c8c8c8',
    badgeBg: 'rgba(80,80,80,0.88)', badgeText: '#e0e0e0', textColor: '#d0d0d0',
  },
  {
    id: 'it', label: 'IT', emoji: '💻',
    img: '/task-types/it.png', FallbackIcon: ITIcon,
    bg: 'rgba(20,120,170,0.15)', border: '#3ac8f0',
    badgeBg: 'rgba(10,60,90,0.88)', badgeText: '#7ae0ff', textColor: '#7ae0ff',
  },
  {
    id: 'diy', label: 'Bricolage', labelKey: 'type.diy', emoji: '🛠️',
    img: '/task-types/diy.png', FallbackIcon: DIYIcon,
    bg: 'rgba(120,130,140,0.14)', border: '#9aa4ae',
    badgeBg: 'rgba(50,58,66,0.88)', badgeText: '#c8d0d8', textColor: '#b8c2cc',
  },
  {
    id: 'waiting', label: 'Attente', labelKey: 'type.waiting', emoji: '⏳',
    img: '/task-types/waiting.png', FallbackIcon: HourglassIcon,
    bg: 'rgba(224,160,48,0.14)', border: '#e0a030',
    badgeBg: 'rgba(120,80,10,0.88)', badgeText: '#f5c060', textColor: '#e8b860',
  },
];

export function getTaskType(id) {
  return TASK_TYPES.find(t => t.id === id) || null;
}
