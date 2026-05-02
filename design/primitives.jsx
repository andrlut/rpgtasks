/* global React */
// rpg/primitives.jsx — Phone shell, icons, badges, chips, buttons, bars

const PHONE_W = 380;
const PHONE_H = 780;

// ─────────────────────────────────────────────────────────────
// Icon — outlined Lucide-ish set. All 24x24, stroke=1.75.
// ─────────────────────────────────────────────────────────────
function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 1.75, style }) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: color, strokeWidth,
    strokeLinecap: 'round', strokeLinejoin: 'round',
    style: { display: 'block', ...style },
  };
  const paths = {
    home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"/><path d="M10 20v-5h4v5"/></>,
    list: <><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><circle cx="3.5" cy="6" r="1.2"/><circle cx="3.5" cy="12" r="1.2"/><circle cx="3.5" cy="18" r="1.2"/></>,
    shield: <><path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z"/></>,
    coin: <><circle cx="12" cy="12" r="9"/><path d="M9 9h5a2 2 0 0 1 0 4H10a2 2 0 0 0 0 4h5"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></>,
    plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    check: <><path d="M5 12.5 10 17l9-10"/></>,
    sparkle: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></>,
    flame: <><path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 1-5"/><path d="M9.5 14a2.5 2.5 0 0 0 5 0c0-1.5-1.2-2-1.5-3"/></>,
    bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2H4.5L6 16Z"/><path d="M10 20a2 2 0 0 0 4 0"/></>,
    moon: <><path d="M20 14a8 8 0 1 1-9-11 6 6 0 0 0 9 11Z"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>,
    heart: <><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"/></>,
    sword: <><path d="m14.5 4 5.5 5.5-7 7-3-3 7-7 .5 .5"/><path d="m4 20 4-1 2-2-3-3-2 2-1 4Z"/></>,
    brain: <><path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-1 5 3 3 0 0 0 2 5 3 3 0 0 0 6 0V4a3 3 0 0 0-3-3"/><path d="M15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 1 5 3 3 0 0 1-2 5 3 3 0 0 1-6 0"/></>,
    wallet: <><path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3"/><path d="M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-3"/><path d="M21 9h-5a3 3 0 0 0 0 6h5V9Z"/><circle cx="16.5" cy="12" r="1"/></>,
    chat: <><path d="M21 15a3 3 0 0 1-3 3H8l-5 4V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v9Z"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></>,
    gift: <><rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8"/><path d="M12 8v13"/><path d="M12 8s-3.5-5-5.5-3 .5 3 5.5 3Z"/><path d="M12 8s3.5-5 5.5-3-.5 3-5.5 3Z"/></>,
    trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M16 5h3v2a3 3 0 0 1-3 3"/><path d="M8 5H5v2a3 3 0 0 0 3 3"/><path d="M10 14v3h4v-3"/><path d="M7 21h10"/></>,
    lock: <><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></>,
    chevronRight: <><path d="m9 6 6 6-6 6"/></>,
    chevronLeft: <><path d="m15 6-6 6 6 6"/></>,
    chevronDown: <><path d="m6 9 6 6 6-6"/></>,
    chevronUp: <><path d="m6 15 6-6 6 6"/></>,
    star: <><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"/></>,
    starF: <><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" fill={color}/></>,
    arrowRight: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    arrowUp: <><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></>,
    google: <><path d="M22 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.6c-.2 1.3-1 2.4-2 3.1v2.6h3.3c1.9-1.8 3.1-4.4 3.1-7.6Z"/><path d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4.1H3v2.6A10 10 0 0 0 12 22Z"/><path d="M6.4 13.8a6 6 0 0 1 0-3.6V7.6H3a10 10 0 0 0 0 9l3.4-2.8Z"/><path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9C16.9 2.9 14.7 2 12 2A10 10 0 0 0 3 7.6L6.4 10A6 6 0 0 1 12 6Z"/></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 3v4M16 3v4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    trash: <><path d="M4 7h16"/><path d="M10 4h4l1 3H9l1-3Z"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/></>,
    pencil: <><path d="m4 20 1-4L17 4l3 3L8 19l-4 1Z"/></>,
    book: <><path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z"/><path d="M5 4v14"/><path d="M9 8h5"/></>,
    dumbbell: <><path d="M3 10v4M7 7v10M17 7v10M21 10v4"/><path d="M7 12h10"/></>,
    apple: <><path d="M12 7c1-3 5-3 5 0"/><path d="M16 8c2 0 4 2 4 6 0 4-2 7-5 7-1 0-2-.5-3-.5s-2 .5-3 .5c-3 0-5-3-5-7 0-4 2-6 4-6 1 0 2 .5 3 .5s2-.5 3-.5"/></>,
    palette: <><path d="M12 3a9 9 0 0 0 0 18c1 0 2-1 2-2s-1-2-1-3 1-2 2-2h3a4 4 0 0 0 4-4c0-4-4-7-10-7Z"/><circle cx="7" cy="11" r="1"/><circle cx="9" cy="6.5" r="1"/><circle cx="15" cy="6.5" r="1"/><circle cx="17" cy="11" r="1"/></>,
    play: <><path d="M7 4v16l13-8L7 4Z"/></>,
    bag: <><path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></>,
    coffee: <><path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2"/><path d="M7 4v2M11 4v2M15 4v2"/></>,
    film: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/></>,
    music: <><path d="M9 18V6l11-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></>,
    map: <><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z"/><path d="M9 4v16M15 6v16"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v5h1"/></>,
    x: <><path d="M6 6 18 18"/><path d="M18 6 6 18"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 8v5l3 2"/></>,
    bolt: <><path d="m13 3-9 11h6l-1 7 9-11h-6l1-7Z"/></>,
  };
  return <svg {...common}>{paths[name] || null}</svg>;
}

// ─────────────────────────────────────────────────────────────
// Dimension config
// ─────────────────────────────────────────────────────────────
const DIMS = {
  health:     { label: 'Health',     icon: 'heart',    color: 'var(--dim-health)',     bg: 'var(--dim-health-bg)' },
  strength:   { label: 'Strength',   icon: 'dumbbell', color: 'var(--dim-strength)',   bg: 'var(--dim-strength-bg)' },
  mind:       { label: 'Mind',       icon: 'brain',    color: 'var(--dim-mind)',       bg: 'var(--dim-mind-bg)' },
  wealth:     { label: 'Wealth',     icon: 'wallet',   color: 'var(--dim-wealth)',     bg: 'var(--dim-wealth-bg)' },
  social:     { label: 'Social',     icon: 'chat',     color: 'var(--dim-social)',     bg: 'var(--dim-social-bg)' },
  discipline: { label: 'Discipline', icon: 'target',   color: 'var(--dim-discipline)', bg: 'var(--dim-discipline-bg)' },
};

// ─────────────────────────────────────────────────────────────
// Phone shell — bezel + status bar + content + nav pill
// ─────────────────────────────────────────────────────────────
function Phone({ children, dark = true, label, w = PHONE_W, h = PHONE_H, scroll = true, style }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 38,
      background: 'linear-gradient(160deg, #2a2f55 0%, #15183a 100%)',
      padding: 6,
      boxShadow: '0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04) inset',
      position: 'relative',
      ...style,
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 32,
        background: dark ? 'var(--bg-base)' : '#FAFBFF',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex', flexDirection: 'column',
      }}>
        <PhoneStatusBar />
        <div className="rpg-screen" data-screen-label={label} style={{
          flex: 1,
          overflow: scroll ? 'auto' : 'hidden',
          position: 'relative',
        }}>
          {children}
        </div>
        <PhoneHomeIndicator />
      </div>
    </div>
  );
}

function PhoneStatusBar() {
  return (
    <div style={{
      height: 40, padding: '0 22px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      color: 'var(--text-hi)', font: '700 13px/1 var(--font)',
      letterSpacing: 0.2, flexShrink: 0,
      position: 'relative', zIndex: 5,
    }}>
      <span>9:41</span>
      <div style={{
        position: 'absolute', left: '50%', top: 8, transform: 'translateX(-50%)',
        width: 88, height: 22, borderRadius: 16,
        background: '#000',
      }}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, opacity: 0.95 }}>
        {/* signal */}
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="0.5"/><rect x="4.5" y="5" width="3" height="6" rx="0.5"/><rect x="9" y="2.5" width="3" height="8.5" rx="0.5"/><rect x="13.5" y="0" width="3" height="11" rx="0.5"/></svg>
        {/* wifi */}
        <svg width="14" height="11" viewBox="0 0 16 11" fill="currentColor"><path d="M8 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm5-4.5a7 7 0 0 0-10 0l1.5 1.5a5 5 0 0 1 7 0L13 6.5ZM16 3.5a11 11 0 0 0-16 0L1.5 5a9 9 0 0 1 13 0L16 3.5Z"/></svg>
        {/* battery */}
        <svg width="22" height="11" viewBox="0 0 22 11" fill="none"><rect x="0.5" y="0.5" width="18" height="10" rx="2.5" stroke="currentColor" opacity="0.5"/><rect x="20" y="3.5" width="1.5" height="4" rx="0.75" fill="currentColor" opacity="0.5"/><rect x="2" y="2" width="15" height="7" rx="1.5" fill="currentColor"/></svg>
      </div>
    </div>
  );
}

function PhoneHomeIndicator() {
  return (
    <div style={{
      height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <div style={{ width: 130, height: 4, borderRadius: 2, background: 'var(--text-hi)', opacity: 0.85 }}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Dimension chip
// ─────────────────────────────────────────────────────────────
function DimChip({ dim, size = 'sm', selected, onClick }) {
  const d = DIMS[dim];
  if (!d) return null;
  const px = size === 'lg' ? '8px 14px' : size === 'md' ? '6px 12px' : '4px 9px';
  const fs = size === 'lg' ? 13 : size === 'md' ? 12 : 11;
  const ic = size === 'lg' ? 16 : size === 'md' ? 14 : 12;
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: px, borderRadius: 'var(--r-pill)',
      background: selected ? d.color : d.bg,
      color: selected ? '#0E1230' : d.color,
      font: `700 ${fs}px/1 var(--font)`,
      border: `1px solid ${selected ? d.color : 'transparent'}`,
      transition: 'all var(--dur-fast) var(--ease)',
    }}>
      <Icon name={d.icon} size={ic} strokeWidth={2.2}/>
      {d.label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Difficulty stars (1–5)
// ─────────────────────────────────────────────────────────────
const DIFFICULTY = [
  { n: 1, label: 'Trivial', xp: 5,   color: '#9AA0D4' },
  { n: 2, label: 'Easy',    xp: 15,  color: '#3DD68C' },
  { n: 3, label: 'Medium',  xp: 40,  color: '#4DD0FF' },
  { n: 4, label: 'Hard',    xp: 100, color: '#FF8A3D' },
  { n: 5, label: 'Heroic',  xp: 250, color: '#FF5C7A' },
];

function DifficultyStars({ value = 1, size = 14, color, gap = 2 }) {
  const c = color || DIFFICULTY[value - 1]?.color || 'var(--coin)';
  return (
    <div style={{ display: 'inline-flex', gap }}>
      {[1,2,3,4,5].map(i => (
        <Icon key={i} name={i <= value ? 'starF' : 'star'} size={size}
              color={i <= value ? c : 'var(--text-faint)'} strokeWidth={1.5}/>
      ))}
    </div>
  );
}

function DifficultySelector({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
      {DIFFICULTY.map(d => {
        const sel = value === d.n;
        return (
          <button key={d.n} onClick={() => onChange?.(d.n)} style={{
            padding: '12px 4px',
            borderRadius: 'var(--r-md)',
            background: sel ? `${d.color}22` : 'var(--bg-surface)',
            border: `1.5px solid ${sel ? d.color : 'var(--border)'}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            transition: 'all var(--dur-fast) var(--ease)',
          }}>
            <DifficultyStars value={d.n} size={11} color={d.color} gap={1}/>
            <div style={{ font: '700 11px/1 var(--font)', color: sel ? d.color : 'var(--text-mid)' }}>{d.label}</div>
            <div style={{ font: '800 13px/1 var(--font)', color: sel ? d.color : 'var(--text-hi)' }}>+{d.xp}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Progress bar
// ─────────────────────────────────────────────────────────────
function Bar({ value = 0, max = 100, color = 'var(--violet)', height = 8, glow = true, bg, label }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ width: '100%' }}>
      <div style={{
        height, borderRadius: height,
        background: bg || 'rgba(255,255,255,0.08)',
        overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: typeof color === 'string' && color.startsWith('linear') ? color
            : `linear-gradient(90deg, ${color}, ${color})`,
          boxShadow: glow ? `0 0 12px ${color}aa` : 'none',
          borderRadius: height,
          transition: 'width 600ms var(--ease)',
        }}/>
      </div>
      {label && (
        <div style={{
          marginTop: 4, font: 'var(--t-caption)', color: 'var(--text-mid)',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>{label}</span>
          <span style={{ color: 'var(--text-hi)' }}>{value}/{max}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Coin / XP counters
// ─────────────────────────────────────────────────────────────
function CoinCounter({ value = 0, size = 'md', glow = false }) {
  const fs = size === 'lg' ? 22 : size === 'md' ? 16 : 14;
  const ic = size === 'lg' ? 22 : size === 'md' ? 18 : 14;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      font: `800 ${fs}px/1 var(--font)`, color: 'var(--coin)',
      filter: glow ? 'drop-shadow(0 0 8px var(--coin-glow))' : 'none',
    }}>
      <CoinIcon size={ic}/>
      {value.toLocaleString()}
    </div>
  );
}

function CoinIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <defs>
        <radialGradient id="coinG" cx="35%" cy="35%" r="80%">
          <stop offset="0%" stopColor="#FFE890"/>
          <stop offset="55%" stopColor="#FFC83D"/>
          <stop offset="100%" stopColor="#C8881C"/>
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#coinG)" stroke="#8A5C0F" strokeWidth="1"/>
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="#8A5C0F" strokeOpacity="0.4" strokeWidth="0.7"/>
      <path d="M9 9h5a2 2 0 0 1 0 4H10a2 2 0 0 0 0 4h5" fill="none" stroke="#7B4E0A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <ellipse cx="9" cy="8" rx="2" ry="1" fill="#FFF" opacity="0.5"/>
    </svg>
  );
}

function XPCounter({ value = 0, size = 'md' }) {
  const fs = size === 'lg' ? 22 : size === 'md' ? 14 : 12;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      font: `800 ${fs}px/1 var(--font)`, color: 'var(--xp)',
    }}>
      <Icon name="bolt" size={size === 'lg' ? 18 : 14} color="var(--xp)" strokeWidth={2.2}/>
      {value} XP
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Buttons
// ─────────────────────────────────────────────────────────────
function Btn({ children, variant = 'primary', size = 'md', icon, iconRight, full, onClick, state, style, disabled }) {
  const sizes = {
    sm: { padding: '8px 14px', fs: 13, ic: 14, h: 36 },
    md: { padding: '12px 18px', fs: 14, ic: 16, h: 44 },
    lg: { padding: '16px 22px', fs: 16, ic: 18, h: 52 },
  };
  const sz = sizes[size];
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: sz.padding, height: sz.h, minHeight: sz.h,
    borderRadius: 'var(--r-md)',
    font: `700 ${sz.fs}px/1 var(--font)`,
    transition: 'all var(--dur-fast) var(--ease)',
    width: full ? '100%' : undefined,
    opacity: disabled ? 0.4 : 1,
  };
  let v;
  if (variant === 'primary') {
    const press = state === 'pressed';
    v = {
      background: press
        ? 'linear-gradient(180deg, #6147E0 0%, #3F25B0 100%)'
        : 'linear-gradient(180deg, #8B6CFF 0%, #5B3CE0 100%)',
      color: '#fff',
      boxShadow: press
        ? '0 2px 8px rgba(75, 47, 204, 0.5), 0 0 0 1px rgba(255,255,255,0.1) inset'
        : '0 6px 20px rgba(123,92,255,0.45), 0 0 0 1px rgba(255,255,255,0.18) inset, 0 -2px 0 rgba(0,0,0,0.2) inset',
      transform: press ? 'translateY(1px)' : 'none',
    };
  } else if (variant === 'gold') {
    v = {
      background: 'linear-gradient(180deg, #FFE08A 0%, #FFC83D 50%, #C8881C 100%)',
      color: '#3a2400',
      boxShadow: '0 6px 22px rgba(255,200,61,0.45), 0 0 0 1px rgba(255,235,180,0.4) inset, 0 -2px 0 rgba(0,0,0,0.15) inset',
    };
  } else if (variant === 'ghost') {
    v = {
      background: 'rgba(255,255,255,0.04)',
      color: 'var(--text-hi)',
      border: '1px solid var(--border-strong)',
    };
  } else if (variant === 'soft') {
    v = {
      background: 'var(--bg-surface)',
      color: 'var(--text-hi)',
      boxShadow: 'var(--el-1)',
    };
  } else if (variant === 'danger') {
    v = {
      background: 'rgba(255,92,122,0.12)',
      color: 'var(--danger)',
      border: '1px solid rgba(255,92,122,0.3)',
    };
  }
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...v, ...style }} disabled={disabled}>
      {icon && <Icon name={icon} size={sz.ic} strokeWidth={2.2}/>}
      {children}
      {iconRight && <Icon name={iconRight} size={sz.ic} strokeWidth={2.2}/>}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Tier badge — geometric medal (Beginner / Bronze / Silver / Gold / Master)
// ─────────────────────────────────────────────────────────────
const TIERS = ['beginner', 'bronze', 'silver', 'gold', 'master'];
const TIER_LABEL = { beginner: 'Beginner', bronze: 'Bronze', silver: 'Silver', gold: 'Gold', master: 'Master' };

function TierBadge({ tier = 'bronze', size = 56, glow = true, label = false }) {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g,'');
  const grads = {
    beginner: [['#B8BDE0', '#5C638F']],
    bronze:   [['#F2B27A', '#E69559'], ['#A85B26', '#5E2E10']],
    silver:   [['#F4F6FF', '#C2C9E8'], ['#7B85B8', '#3F4880']],
    gold:     [['#FFEFB0', '#FFE08A'], ['#E0A52B', '#7E5210']],
    master:   [['#C2A1FF', '#FFC83D'], ['#4DD0FF', '#7B5CFF']],
  };
  const g = grads[tier] || grads.beginner;
  const chevrons = { beginner: 0, bronze: 1, silver: 2, gold: 3, master: 4 };
  const cn = chevrons[tier];

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size,
        filter: glow ? `drop-shadow(0 0 ${size/4}px ${tier === 'master' ? 'rgba(155,130,255,0.7)' : tier === 'gold' ? 'rgba(255,200,61,0.7)' : tier === 'silver' ? 'rgba(232,236,255,0.5)' : tier === 'bronze' ? 'rgba(230,149,89,0.5)' : 'rgba(155,160,200,0.4)'})` : 'none',
      }}>
        <svg width={size} height={size} viewBox="0 0 64 64">
          <defs>
            <linearGradient id={`tg1${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={g[0][0]}/>
              <stop offset="100%" stopColor={g[0][1]}/>
            </linearGradient>
            {g[1] && (
              <linearGradient id={`tg2${id}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={g[1][0]}/>
                <stop offset="100%" stopColor={g[1][1]}/>
              </linearGradient>
            )}
            {tier === 'master' && (
              <linearGradient id={`tgm${id}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7B5CFF"/>
                <stop offset="50%" stopColor="#4DD0FF"/>
                <stop offset="100%" stopColor="#FFC83D"/>
              </linearGradient>
            )}
          </defs>
          {/* outer hex */}
          <path d="M32 2 L58 17 L58 47 L32 62 L6 47 L6 17 Z"
                fill={tier === 'master' ? `url(#tgm${id})` : (g[1] ? `url(#tg2${id})` : `url(#tg1${id})`)}/>
          {/* inner hex */}
          <path d="M32 9 L52 20.5 L52 43.5 L32 55 L12 43.5 L12 20.5 Z"
                fill={`url(#tg1${id})`}/>
          {/* shine */}
          <path d="M32 9 L52 20.5 L40 27 L24 27 L12 20.5 Z"
                fill="rgba(255,255,255,0.25)"/>
          {/* chevrons */}
          {cn > 0 && [...Array(cn)].map((_, i) => {
            const cy = 28 + i * 5;
            return <path key={i} d={`M22 ${cy + 4} L32 ${cy} L42 ${cy + 4}`}
                         stroke="rgba(0,0,0,0.45)" strokeWidth="1.6" fill="none"
                         strokeLinecap="round" strokeLinejoin="round"/>;
          })}
          {tier === 'beginner' && <circle cx="32" cy="32" r="3" fill="rgba(0,0,0,0.3)"/>}
          {tier === 'master' && <>
            <path d="M32 22 L34 29 L41 30 L34 32 L32 39 L30 32 L23 30 L30 29 Z" fill="rgba(255,255,255,0.85)"/>
          </>}
        </svg>
      </div>
      {label && <div style={{ font: '700 11px/1 var(--font)', color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: 1 }}>{TIER_LABEL[tier]}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Bottom tab bar
// ─────────────────────────────────────────────────────────────
function TabBar({ active = 'home', onChange }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'tasks', label: 'Tasks', icon: 'list' },
    { id: 'character', label: 'Hero', icon: 'shield' },
    { id: 'rewards', label: 'Rewards', icon: 'gift' },
    { id: 'profile', label: 'Profile', icon: 'user' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 12, right: 12, bottom: 12,
      height: 64, borderRadius: 22,
      background: 'var(--bg-glass-strong)',
      backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
      boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.07) inset',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '0 6px', zIndex: 4,
    }}>
      {tabs.map(t => {
        const sel = active === t.id;
        return (
          <button key={t.id} onClick={() => onChange?.(t.id)} style={{
            flex: 1, height: 52, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 3,
            color: sel ? 'var(--violet-2)' : 'var(--text-dim)',
            position: 'relative',
          }}>
            {sel && <div style={{
              position: 'absolute', top: 4, width: 32, height: 3, borderRadius: 2,
              background: 'var(--violet)', boxShadow: '0 0 8px var(--violet-glow)',
            }}/>}
            <Icon name={t.icon} size={22} strokeWidth={sel ? 2.4 : 1.8}/>
            <span style={{ font: `${sel ? 800 : 600} 10px/1 var(--font)` }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function FAB({ onClick, icon = 'plus', style }) {
  return (
    <button onClick={onClick} style={{
      position: 'absolute', right: 18, bottom: 92,
      width: 56, height: 56, borderRadius: 18,
      background: 'linear-gradient(160deg, #9B82FF 0%, #5B3CE0 100%)',
      color: '#fff',
      boxShadow: '0 14px 30px rgba(123,92,255,0.55), 0 0 0 1px rgba(255,255,255,0.18) inset, 0 -3px 0 rgba(0,0,0,0.2) inset',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 4,
      ...style,
    }}>
      <Icon name={icon} size={26} strokeWidth={2.6}/>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Card wrapper
// ─────────────────────────────────────────────────────────────
function Card({ children, style, glass = false, padding = 16, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: glass ? 'var(--bg-glass)' : 'var(--bg-surface)',
      borderRadius: 'var(--r-lg)',
      padding,
      boxShadow: 'var(--el-2)',
      backdropFilter: glass ? 'blur(14px)' : 'none',
      WebkitBackdropFilter: glass ? 'blur(14px)' : 'none',
      ...style,
    }}>{children}</div>
  );
}

// Section header used inside screens
function SectionHeader({ title, action, style }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '0 4px', marginBottom: 10, ...style,
    }}>
      <div style={{ font: 'var(--t-h3)', color: 'var(--text-hi)' }}>{title}</div>
      {action}
    </div>
  );
}

// Eyebrow
function Eyebrow({ children, color = 'var(--text-mid)', style }) {
  return <div style={{
    font: 'var(--t-eyebrow)', color, textTransform: 'uppercase', letterSpacing: 1.4, ...style,
  }}>{children}</div>;
}

// Avatar placeholder slot (used inside level rings)
function AvatarSlot({ size = 80, label = 'CHARACTER\nART' }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `repeating-linear-gradient(45deg, #2A2F58, #2A2F58 6px, #232958 6px, #232958 12px)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-dim)',
      font: `700 ${Math.max(8, size/12)}px/1.1 var(--font-mono, ui-monospace)`,
      letterSpacing: 1,
      whiteSpace: 'pre-line', textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {label}
    </div>
  );
}

// Level ring around avatar
function LevelRing({ size = 140, level = 12, progress = 0.65, children, color = 'var(--violet)' }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - progress);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} fill="none"/>
        <circle cx={size/2} cy={size/2} r={r}
                stroke={color} strokeWidth={stroke} fill="none"
                strokeDasharray={c} strokeDashoffset={off}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: 'stroke-dashoffset 600ms var(--ease)' }}/>
      </svg>
      <div style={{ position: 'absolute', inset: stroke + 4, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
      {/* level badge */}
      <div style={{
        position: 'absolute', bottom: -2, left: '50%', transform: 'translateX(-50%)',
        background: 'linear-gradient(180deg, #8B6CFF 0%, #5B3CE0 100%)',
        color: '#fff',
        font: '800 12px/1 var(--font)', letterSpacing: 0.5,
        padding: '5px 10px', borderRadius: 'var(--r-pill)',
        boxShadow: '0 4px 14px rgba(123,92,255,0.5), 0 0 0 1px rgba(255,255,255,0.2) inset',
        whiteSpace: 'nowrap',
      }}>
        LV {level}
      </div>
    </div>
  );
}

// Image / illustration placeholder block
function ImgSlot({ w = '100%', h = 120, label = 'illustration', radius = 'var(--r-lg)', style }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: `repeating-linear-gradient(135deg, #2A2F58 0 8px, #232958 8px 16px)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-dim)',
      font: '700 11px/1 var(--font-mono, ui-monospace)', letterSpacing: 1.2,
      textTransform: 'uppercase',
      ...style,
    }}>{label}</div>
  );
}

Object.assign(window, {
  PHONE_W, PHONE_H, Phone, Icon, DIMS, DimChip,
  DIFFICULTY, DifficultyStars, DifficultySelector,
  Bar, CoinCounter, CoinIcon, XPCounter,
  Btn, TIERS, TIER_LABEL, TierBadge,
  TabBar, FAB, Card, SectionHeader, Eyebrow,
  AvatarSlot, LevelRing, ImgSlot,
});
