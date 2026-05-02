/* global React, Phone, Icon, DIMS, DimChip, DifficultyStars, DifficultySelector, Bar, CoinCounter, CoinIcon, XPCounter, Btn, TIERS, TierBadge, TabBar, FAB, Card, SectionHeader, Eyebrow, AvatarSlot, LevelRing, ImgSlot, TaskCard, RewardCard, StatCard, SkillRow, Achievement */
// rpg/screens-1.jsx — Onboarding, Auth, Home, Task Edit

const { useState, useEffect, useRef } = React;

// ─────────────────────────────────────────────────────────────
// 1. Onboarding (3 slides, swipeable via dots / next button)
// ─────────────────────────────────────────────────────────────
function ScreenOnboarding() {
  const [slide, setSlide] = useState(0);
  const slides = [
    {
      eyebrow: 'WELCOME, HERO',
      title: 'Turn your life into an RPG.',
      sub: 'Real tasks. Real XP. Real rewards. The grind, but make it yours.',
      art: <OnboardingArt1/>,
    },
    {
      eyebrow: 'THE LOOP',
      title: 'Train. Earn. Redeem.',
      sub: 'Complete habits to gain XP and coins. Spend coins on rewards you set yourself.',
      art: <OnboardingArt2/>,
    },
    {
      eyebrow: 'READY?',
      title: 'Your journey starts at Level 1.',
      sub: 'Pick a few starter quests. We\'ll handle the leveling.',
      art: <OnboardingArt3/>,
    },
  ];
  const s = slides[slide];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
      background: 'radial-gradient(ellipse at top, #1E2348 0%, #0E1230 60%)',
      padding: '20px 24px 28px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BrandMark size={26}/>
          <div style={{ font: '800 14px/1 var(--font)', color: 'var(--text-hi)', letterSpacing: 0.3 }}>
            RPG<span style={{ color: 'var(--violet-2)' }}>·</span>Tasks
          </div>
        </div>
        <button onClick={() => setSlide(2)} style={{ font: '600 13px/1 var(--font)', color: 'var(--text-mid)' }}>
          Skip
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', gap: 24 }}>
        <div style={{ width: 240, height: 240 }}>{s.art}</div>
        <div style={{ textAlign: 'center', maxWidth: 290 }}>
          <Eyebrow color="var(--violet-2)" style={{ marginBottom: 8 }}>{s.eyebrow}</Eyebrow>
          <h1 style={{ font: 'var(--t-h1)', color: 'var(--text-hi)', margin: '0 0 12px',
            textWrap: 'balance' }}>{s.title}</h1>
          <p style={{ font: 'var(--t-body-lg)', color: 'var(--text-mid)', margin: 0, textWrap: 'pretty' }}>{s.sub}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 18 }}>
        {[0,1,2].map(i => (
          <div key={i} onClick={() => setSlide(i)} style={{
            width: i === slide ? 24 : 8, height: 8, borderRadius: 4,
            background: i === slide ? 'var(--violet)' : 'var(--text-faint)',
            transition: 'all var(--dur) var(--ease)', cursor: 'pointer',
          }}/>
        ))}
      </div>

      <Btn variant="primary" size="lg" full
           iconRight={slide === 2 ? 'arrowRight' : undefined}
           onClick={() => setSlide(s => Math.min(s + 1, 2))}>
        {slide === 2 ? 'Start your journey' : 'Continue'}
      </Btn>
    </div>
  );
}

function BrandMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <defs>
        <linearGradient id="bm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9B82FF"/>
          <stop offset="100%" stopColor="#5B3CE0"/>
        </linearGradient>
      </defs>
      <path d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z" fill="url(#bm)"/>
      <path d="M16 9 L21 12 L21 19 L16 22 L11 19 L11 12 Z" fill="rgba(255,255,255,0.85)"/>
    </svg>
  );
}

function OnboardingArt1() {
  // Hero badge with placeholder character silhouette inside a glowing diamond
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        position: 'absolute', width: 200, height: 200,
        background: 'radial-gradient(circle, rgba(123,92,255,0.6), transparent 70%)',
        filter: 'blur(20px)',
      }}/>
      <svg width="220" height="220" viewBox="0 0 220 220">
        <defs>
          <linearGradient id="oa1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9B82FF"/>
            <stop offset="100%" stopColor="#4B2FCC"/>
          </linearGradient>
        </defs>
        <path d="M110 10 L200 110 L110 210 L20 110 Z" fill="url(#oa1)" opacity="0.25"/>
        <path d="M110 30 L185 110 L110 190 L35 110 Z" fill="url(#oa1)" opacity="0.5"/>
        <path d="M110 50 L170 110 L110 170 L50 110 Z" fill="url(#oa1)"/>
      </svg>
      <div style={{ position: 'absolute', width: 80, height: 80,
        borderRadius: '50%',
        background: `repeating-linear-gradient(45deg, #2A2F58, #2A2F58 5px, #232958 5px, #232958 10px)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-hi)',
        font: '800 11px/1.2 var(--font-mono, ui-monospace)',
        textAlign: 'center', whiteSpace: 'pre-line',
        boxShadow: '0 0 30px rgba(155,130,255,0.6), 0 0 0 3px rgba(255,255,255,0.15) inset',
      }}>{'CHARACTER\nART'}</div>
    </div>
  );
}

function OnboardingArt2() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg viewBox="0 0 240 240" width="100%" height="100%">
        <circle cx="120" cy="120" r="78" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 5"/>
        {/* XP node */}
        <g>
          <circle cx="120" cy="42" r="30" fill="rgba(61,214,140,0.15)"/>
          <circle cx="120" cy="42" r="22" fill="#3DD68C"/>
          <text x="120" y="46" textAnchor="middle" fill="#0E1230" fontWeight="800" fontSize="13" fontFamily="Manrope">XP</text>
        </g>
        {/* Coin node */}
        <g>
          <circle cx="195" cy="158" r="30" fill="rgba(255,200,61,0.15)"/>
          <circle cx="195" cy="158" r="22" fill="url(#coinG2)"/>
          <defs>
            <radialGradient id="coinG2" cx="35%" cy="35%" r="80%">
              <stop offset="0%" stopColor="#FFE890"/>
              <stop offset="100%" stopColor="#C8881C"/>
            </radialGradient>
          </defs>
          <text x="195" y="163" textAnchor="middle" fill="#3a2400" fontWeight="800" fontSize="14" fontFamily="Manrope">¢</text>
        </g>
        {/* Reward node */}
        <g>
          <circle cx="45" cy="158" r="30" fill="rgba(123,92,255,0.18)"/>
          <circle cx="45" cy="158" r="22" fill="#7B5CFF"/>
          <path d="M37 153h16v10h-16zM45 153v10M40 153c-2-3 1-5 5 0M50 153c2-3-1-5-5 0" stroke="#fff" strokeWidth="1.5" fill="none"/>
        </g>
        {/* arrows */}
        <path d="M138 60 Q175 95 180 130" stroke="#3DD68C" strokeWidth="2" fill="none" strokeLinecap="round" markerEnd="url(#a1)"/>
        <path d="M170 175 Q120 195 75 178" stroke="#FFC83D" strokeWidth="2" fill="none" strokeLinecap="round" markerEnd="url(#a2)"/>
        <path d="M55 130 Q72 80 100 55" stroke="#7B5CFF" strokeWidth="2" fill="none" strokeLinecap="round" markerEnd="url(#a3)"/>
        <defs>
          <marker id="a1" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#3DD68C"/></marker>
          <marker id="a2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#FFC83D"/></marker>
          <marker id="a3" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#7B5CFF"/></marker>
        </defs>
        {/* Center hero hex */}
        <path d="M120 90 L150 108 L150 142 L120 160 L90 142 L90 108 Z" fill="#1A1F44" stroke="#9B82FF" strokeWidth="2"/>
        <text x="120" y="130" textAnchor="middle" fill="#fff" fontWeight="800" fontSize="11" fontFamily="Manrope" letterSpacing="1">YOU</text>
        {/* Labels */}
        <text x="120" y="14" textAnchor="middle" fill="#3DD68C" fontWeight="700" fontSize="10" fontFamily="Manrope" letterSpacing="1.5">EARN</text>
        <text x="220" y="200" textAnchor="middle" fill="#FFC83D" fontWeight="700" fontSize="10" fontFamily="Manrope" letterSpacing="1.5">SAVE</text>
        <text x="20" y="200" textAnchor="middle" fill="#9B82FF" fontWeight="700" fontSize="10" fontFamily="Manrope" letterSpacing="1.5">REDEEM</text>
      </svg>
    </div>
  );
}

function OnboardingArt3() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        position: 'absolute', inset: 20,
        background: 'radial-gradient(circle, rgba(255,200,61,0.4), transparent 65%)',
        filter: 'blur(20px)',
      }}/>
      <svg width="220" height="220" viewBox="0 0 220 220">
        <defs>
          <linearGradient id="oa3a" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE08A"/>
            <stop offset="100%" stopColor="#C8881C"/>
          </linearGradient>
        </defs>
        {/* radial bursts */}
        {[...Array(12)].map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const x1 = 110 + Math.cos(a) * 70, y1 = 110 + Math.sin(a) * 70;
          const x2 = 110 + Math.cos(a) * 95, y2 = 110 + Math.sin(a) * 95;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFC83D" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>;
        })}
        {/* trophy / badge */}
        <path d="M110 38 L165 70 L165 130 L110 162 L55 130 L55 70 Z" fill="url(#oa3a)" stroke="#7B4E0A" strokeWidth="2"/>
        <path d="M110 58 L150 80 L150 122 L110 144 L70 122 L70 80 Z" fill="rgba(255,255,255,0.2)"/>
        <text x="110" y="115" textAnchor="middle" fontFamily="Manrope" fontWeight="800" fontSize="42" fill="#3a2400">1</text>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. Auth (Login / Signup toggle)
// ─────────────────────────────────────────────────────────────
function ScreenAuth() {
  const [mode, setMode] = useState('login');
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
      background: 'radial-gradient(ellipse at top, #1E2348 0%, #0E1230 60%)',
      padding: '32px 24px 24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 28 }}>
        <BrandMark size={48}/>
        <div style={{ font: '800 22px/1 var(--font)', color: 'var(--text-hi)', letterSpacing: 0.3 }}>
          RPG<span style={{ color: 'var(--violet-2)' }}>·</span>Tasks
        </div>
        <div style={{ font: '500 13px/1.4 var(--font)', color: 'var(--text-mid)' }}>
          {mode === 'login' ? 'Welcome back, hero.' : 'Begin your journey.'}
        </div>
      </div>

      {/* segmented toggle */}
      <div style={{
        background: 'var(--bg-surface)', borderRadius: 14, padding: 4,
        display: 'flex', marginBottom: 24, position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 4, bottom: 4,
          left: mode === 'login' ? 4 : 'calc(50% + 0px)', width: 'calc(50% - 4px)',
          background: 'linear-gradient(180deg, #8B6CFF 0%, #5B3CE0 100%)',
          borderRadius: 10,
          boxShadow: '0 4px 12px rgba(123,92,255,0.4)',
          transition: 'left var(--dur) var(--ease)',
        }}/>
        {['login','signup'].map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, height: 38, position: 'relative', zIndex: 1,
            font: '700 13px/1 var(--font)', letterSpacing: 0.3,
            color: mode === m ? '#fff' : 'var(--text-mid)',
            textTransform: 'capitalize',
          }}>{m}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mode === 'signup' && <Field label="Name" value="Aria Holloway" icon="user"/>}
        <Field label="Email" value="aria@questmail.com" icon="chat" type="email"/>
        <Field label="Password" value="••••••••••" icon="lock" type="password" rightIcon="eye"/>
        {mode === 'login' && (
          <button style={{ alignSelf: 'flex-end',
            font: '600 12px/1 var(--font)', color: 'var(--violet-2)', marginTop: -4 }}>
            Forgot password?
          </button>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <Btn variant="primary" size="lg" full iconRight="arrowRight">
          {mode === 'login' ? 'Log in' : 'Create account'}
        </Btn>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--divider)' }}/>
        <div style={{ font: '600 11px/1 var(--font)', color: 'var(--text-dim)', letterSpacing: 1 }}>OR</div>
        <div style={{ flex: 1, height: 1, background: 'var(--divider)' }}/>
      </div>

      <button style={{
        height: 52, borderRadius: 'var(--r-md)',
        background: '#fff', color: '#1f1f1f',
        font: '700 14px/1 var(--font)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
      }}>
        <GoogleG/>
        Continue with Google
      </button>

      <div style={{ marginTop: 'auto', textAlign: 'center', font: '500 11px/1.5 var(--font)',
        color: 'var(--text-dim)', paddingTop: 16 }}>
        By continuing you agree to our Terms & Privacy Policy.
      </div>
    </div>
  );
}

function Field({ label, value, icon, rightIcon, type = 'text' }) {
  return (
    <div style={{ position: 'relative' }}>
      <label style={{ font: '700 10px/1 var(--font)', color: 'var(--text-mid)',
        letterSpacing: 1.2, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{label}</label>
      <div style={{
        height: 52, borderRadius: 'var(--r-md)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10,
      }}>
        {icon && <Icon name={icon} size={18} color="var(--text-mid)"/>}
        <input defaultValue={value} type={type} style={{
          flex: 1, background: 'none', border: 0, outline: 'none',
          color: 'var(--text-hi)', font: '600 14px/1 var(--font)',
        }}/>
        {rightIcon && <Icon name={rightIcon} size={18} color="var(--text-mid)"/>}
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.6c-.2 1.3-1 2.4-2 3.1v2.6h3.3c1.9-1.8 3.1-4.4 3.1-7.6Z"/>
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4.1H3v2.6A10 10 0 0 0 12 22Z"/>
      <path fill="#FBBC05" d="M6.4 13.8a6 6 0 0 1 0-3.6V7.6H3a10 10 0 0 0 0 9l3.4-2.8Z"/>
      <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9C16.9 2.9 14.7 2 12 2A10 10 0 0 0 3 7.6L6.4 10A6 6 0 0 1 12 6Z"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. Home / Today
// ─────────────────────────────────────────────────────────────
const SAMPLE_TASKS = [
  { id: 't1', title: 'Morning workout · 30 min', dims: ['strength','health'], difficulty: 3, xp: 40, coins: 40, time: '7:00', recurrence: [1,1,1,1,1,0,0] },
  { id: 't2', title: 'Meditate · 10 min',         dims: ['mind','discipline'], difficulty: 2, xp: 15, coins: 15, time: '8:00', recurrence: [1,1,1,1,1,1,1] },
  { id: 't3', title: 'Read 20 pages',              dims: ['mind'], difficulty: 2, xp: 15, coins: 15, time: '21:00', recurrence: [1,1,1,1,1,1,1] },
  { id: 't4', title: 'Cook a clean dinner',        dims: ['health','wealth'], difficulty: 3, xp: 40, coins: 40, time: '19:00', recurrence: [0,1,0,1,0,1,1] },
  { id: 't5', title: 'Call mom',                   dims: ['social'], difficulty: 1, xp: 5, coins: 5, recurrence: [0,0,0,0,0,1,0] },
];

function ScreenHome({ tab, setTab, showEmpty, completed, onComplete, completing, onShowLevelUp }) {
  const visible = SAMPLE_TASKS.filter(t => !completed.includes(t.id));
  const isEmpty = showEmpty || visible.length === 0;

  return (
    <div style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div className="rpg-screen" style={{
        height: '100%', overflowY: 'auto', paddingBottom: 100,
        background: 'radial-gradient(ellipse at top, #1E2348 0%, #0E1230 50%)',
      }}>
        {/* Header / character mini-card */}
        <div style={{ padding: '4px 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ font: '600 12px/1 var(--font)', color: 'var(--text-mid)' }}>Tuesday, Mar 18</div>
              <div style={{ font: '800 22px/1.1 var(--font)', color: 'var(--text-hi)', marginTop: 4 }}>Good morning, Aria</div>
            </div>
            <button style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bg-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-hi)', position: 'relative' }}>
              <Icon name="bell" size={20}/>
              <span style={{ position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4,
                background: 'var(--coin)', boxShadow: '0 0 6px var(--coin-glow)' }}/>
            </button>
          </div>
          <HeroMiniCard onLevelUp={onShowLevelUp}/>
        </div>

        {/* Streak strip */}
        <div style={{ padding: '0 16px', marginBottom: 18 }}>
          <Card padding={12} style={{ display: 'flex', alignItems: 'center', gap: 12,
            background: 'linear-gradient(120deg, rgba(255,159,67,0.1) 0%, rgba(255,92,122,0.08) 100%)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,159,67,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="flame" size={20} color="#FF9F43" strokeWidth={2}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ font: '800 14px/1 var(--font)', color: 'var(--text-hi)' }}>14-day streak</div>
              <div style={{ font: '500 11px/1.3 var(--font)', color: 'var(--text-mid)', marginTop: 3 }}>
                3 quests left to keep it alive
              </div>
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {[1,1,1,1,1,1,0].map((d, i) => (
                <div key={i} style={{ width: 8, height: 22, borderRadius: 2,
                  background: d ? 'linear-gradient(180deg, #FF9F43, #FF5C7A)' : 'var(--bg-surface-2)' }}/>
              ))}
            </div>
          </Card>
        </div>

        {isEmpty ? (
          <EmptyTodayState/>
        ) : (
          <>
            {/* Today */}
            <div style={{ padding: '0 16px' }}>
              <SectionHeader title="Today"
                action={<span style={{ font: '600 12px/1 var(--font)', color: 'var(--text-mid)' }}>
                  {visible.length} due
                </span>}/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {visible.slice(0, 3).map(t => (
                  <TaskCard key={t.id} task={t}
                    completing={completing === t.id}
                    onComplete={() => onComplete(t)}/>
                ))}
              </div>
            </div>

            {/* Habits */}
            <div style={{ padding: '20px 16px 0' }}>
              <SectionHeader title="Later today"
                action={<button style={{ font: '600 12px/1 var(--font)', color: 'var(--violet-2)' }}>See all</button>}/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {visible.slice(3).map(t => (
                  <TaskCard key={t.id} task={t}
                    completing={completing === t.id}
                    onComplete={() => onComplete(t)}/>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <FAB/>
      <TabBar active={tab} onChange={setTab}/>
    </div>
  );
}

function HeroMiniCard({ onLevelUp }) {
  return (
    <div style={{
      borderRadius: 'var(--r-xl)',
      padding: 14,
      background: 'linear-gradient(135deg, rgba(123,92,255,0.18) 0%, rgba(36,42,88,0.6) 100%)',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06) inset',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ position: 'relative' }}>
        <LevelRing size={72} level={12} progress={0.65}>
          <AvatarSlot size={48} label={'HERO'}/>
        </LevelRing>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ font: '800 16px/1 var(--font)', color: 'var(--text-hi)' }}>Aria the Bold</div>
          <Icon name="chevronRight" size={14} color="var(--text-mid)"/>
        </div>
        <div style={{ font: '600 11px/1 var(--font)', color: 'var(--text-mid)', marginTop: 4 }}>
          325 / 500 XP to LV 13
        </div>
        <div style={{ marginTop: 6 }}>
          <Bar value={325} max={500} color="var(--violet)" height={5}/>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 10 }}>
          <CoinCounter value={2480} size="sm" glow/>
          <button onClick={onLevelUp} style={{
            font: '700 11px/1 var(--font)', color: 'var(--text-dim)',
            display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Icon name="flame" size={11} color="var(--text-dim)"/>
            14d streak
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyTodayState() {
  return (
    <div style={{ padding: '40px 24px 0', textAlign: 'center' }}>
      <div style={{ width: 180, height: 180, margin: '0 auto 20px', position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 10,
          background: 'radial-gradient(circle, rgba(61,214,140,0.4), transparent 65%)',
          filter: 'blur(20px)',
        }}/>
        <svg width="180" height="180" viewBox="0 0 180 180">
          <defs>
            <linearGradient id="es1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3DD68C"/>
              <stop offset="100%" stopColor="#2A8F5C"/>
            </linearGradient>
          </defs>
          <circle cx="90" cy="90" r="65" fill="rgba(61,214,140,0.1)"/>
          <circle cx="90" cy="90" r="48" fill="url(#es1)"/>
          <path d="M70 92 L84 106 L114 76" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          {[...Array(8)].map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <circle key={i} cx={90 + Math.cos(a) * 75} cy={90 + Math.sin(a) * 75} r="3" fill="#3DD68C" opacity="0.6"/>;
          })}
        </svg>
      </div>
      <h2 style={{ font: 'var(--t-h2)', color: 'var(--text-hi)', margin: '0 0 8px' }}>All quests cleared.</h2>
      <p style={{ font: 'var(--t-body)', color: 'var(--text-mid)', maxWidth: 240, margin: '0 auto' }}>
        Today's slate is empty. Take the rest, or set a stretch goal.
      </p>
      <div style={{ marginTop: 20, display: 'inline-flex', gap: 8 }}>
        <Btn variant="ghost" icon="plus" size="md">Add quest</Btn>
        <Btn variant="primary" icon="trophy" size="md">View streak</Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. Task Create / Edit
// ─────────────────────────────────────────────────────────────
function ScreenTaskEdit({ tab, setTab, onClose }) {
  const [diff, setDiff] = useState(3);
  const [selDims, setSelDims] = useState(['strength','health']);
  const [recurType, setRecurType] = useState('daily');
  const [days, setDays] = useState([1,1,1,1,1,0,0]);
  const xp = [5,15,40,100,250][diff-1];

  const toggleDim = (d) => setSelDims(s => s.includes(d) ? s.filter(x => x !== d) : [...s, d]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-base)' }}>
      <div className="rpg-screen" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 100px' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 6, marginBottom: 18 }}>
          <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: 12,
            background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-hi)' }}>
            <Icon name="x" size={20}/>
          </button>
          <div style={{ font: '800 16px/1 var(--font)', color: 'var(--text-hi)' }}>New quest</div>
          <button style={{ width: 40, height: 40, borderRadius: 12,
            background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--danger)' }}>
            <Icon name="trash" size={18}/>
          </button>
        </div>

        {/* Title */}
        <Field label="Quest title" value="Morning workout · 30 min" icon="sword"/>
        <div style={{ height: 14 }}/>
        <div>
          <label style={{ font: '700 10px/1 var(--font)', color: 'var(--text-mid)',
            letterSpacing: 1.2, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            Description (optional)
          </label>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-md)',
            border: '1px solid var(--border)', padding: 12,
            font: '500 13px/1.4 var(--font)', color: 'var(--text)' }}>
            3 sets push-ups, 5 min run, 5 min stretch.
          </div>
        </div>

        {/* Dimensions */}
        <Group title="Dimensions" sub="Pick all that apply">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.keys(DIMS).map(d => (
              <DimChip key={d} dim={d} size="md" selected={selDims.includes(d)} onClick={() => toggleDim(d)}/>
            ))}
          </div>
        </Group>

        {/* Difficulty */}
        <Group title="Difficulty" sub="Bigger risks earn more XP">
          <DifficultySelector value={diff} onChange={setDiff}/>
        </Group>

        {/* Type */}
        <Group title="Type">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { id: 'one', label: 'One-shot' },
              { id: 'daily', label: 'Daily' },
              { id: 'weekly', label: 'Weekly' },
              { id: 'nweek', label: 'N / wk' },
            ].map(o => {
              const sel = recurType === o.id;
              return (
                <button key={o.id} onClick={() => setRecurType(o.id)} style={{
                  padding: '10px 4px', borderRadius: 'var(--r-md)',
                  background: sel ? 'rgba(123,92,255,0.18)' : 'var(--bg-surface)',
                  border: `1.5px solid ${sel ? 'var(--violet)' : 'var(--border)'}`,
                  font: '700 11px/1 var(--font)',
                  color: sel ? 'var(--violet-2)' : 'var(--text-mid)',
                }}>{o.label}</button>
              );
            })}
          </div>
        </Group>

        {/* Days */}
        <Group title="Days of week">
          <div style={{ display: 'flex', gap: 6 }}>
            {['M','T','W','T','F','S','S'].map((d, i) => (
              <button key={i} onClick={() => setDays(ds => ds.map((v, j) => j === i ? (v ? 0 : 1) : v))} style={{
                flex: 1, height: 42, borderRadius: 'var(--r-md)',
                background: days[i] ? 'linear-gradient(180deg, #8B6CFF 0%, #5B3CE0 100%)' : 'var(--bg-surface)',
                color: days[i] ? '#fff' : 'var(--text-mid)',
                font: '800 13px/1 var(--font)',
                boxShadow: days[i] ? '0 4px 14px rgba(123,92,255,0.4)' : 'none',
              }}>{d}</button>
            ))}
          </div>
        </Group>

        {/* Time */}
        <Group title="Reminder">
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              flex: 1, height: 52, borderRadius: 'var(--r-md)',
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10,
            }}>
              <Icon name="clock" size={18} color="var(--text-mid)"/>
              <div style={{ font: '700 14px/1 var(--font)', color: 'var(--text-hi)' }}>7:00 AM</div>
            </div>
            <div style={{
              flex: 1, height: 52, borderRadius: 'var(--r-md)',
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10,
            }}>
              <Icon name="bell" size={18} color="var(--text-mid)"/>
              <div style={{ font: '700 14px/1 var(--font)', color: 'var(--text-hi)' }}>10 min before</div>
            </div>
          </div>
        </Group>

        {/* Reward preview */}
        <div style={{ marginTop: 22 }}>
          <div style={{
            borderRadius: 'var(--r-xl)',
            padding: 18,
            background: 'linear-gradient(135deg, rgba(61,214,140,0.18) 0%, rgba(255,200,61,0.15) 100%)',
            border: '1px solid rgba(61,214,140,0.25)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ font: '700 11px/1 var(--font)', color: 'var(--text-mid)',
              letterSpacing: 1.5, marginBottom: 10 }}>REWARD ON COMPLETION</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="bolt" size={28} color="var(--xp)" strokeWidth={2.4}/>
                <div style={{ font: '800 32px/1 var(--font)', color: 'var(--xp)' }}>+{xp}</div>
                <div style={{ font: '700 12px/1 var(--font)', color: 'var(--xp)' }}>XP</div>
              </div>
              <div style={{ width: 1, height: 28, background: 'var(--divider)' }}/>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CoinIcon size={26}/>
                <div style={{ font: '800 32px/1 var(--font)', color: 'var(--coin)' }}>+{xp}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky save bar */}
      <div style={{ padding: '12px 16px 16px',
        background: 'linear-gradient(180deg, transparent, var(--bg-base) 30%)',
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 5,
        display: 'flex', gap: 10 }}>
        <Btn variant="ghost" size="lg" style={{ flex: 1 }} onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" size="lg" style={{ flex: 2 }} icon="check">Save quest</Btn>
      </div>
    </div>
  );
}

function Group({ title, sub, children }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <div style={{ font: '700 13px/1 var(--font)', color: 'var(--text-hi)' }}>{title}</div>
        {sub && <div style={{ font: '500 11px/1 var(--font)', color: 'var(--text-dim)' }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

Object.assign(window, { ScreenOnboarding, ScreenAuth, ScreenHome, ScreenTaskEdit, BrandMark });
