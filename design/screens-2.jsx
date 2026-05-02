/* global React, Phone, Icon, DIMS, DimChip, DifficultyStars, Bar, CoinCounter, CoinIcon, XPCounter, Btn, TIERS, TIER_LABEL, TierBadge, TabBar, FAB, Card, SectionHeader, Eyebrow, AvatarSlot, LevelRing, ImgSlot, TaskCard, RewardCard, StatCard, SkillRow, Achievement */
// rpg/screens-2.jsx — Character, Skill Detail, Rewards, Profile

const { useState: useState2 } = React;

// Sample data
const DIM_DATA = [
  { dim: 'health',     level: 9,  xp: 320, xpMax: 500 },
  { dim: 'strength',   level: 11, xp: 180, xpMax: 600 },
  { dim: 'mind',       level: 14, xp: 410, xpMax: 700 },
  { dim: 'wealth',     level: 6,  xp: 95,  xpMax: 400 },
  { dim: 'social',     level: 7,  xp: 230, xpMax: 450 },
  { dim: 'discipline', level: 12, xp: 540, xpMax: 650 },
];

const SKILLS = [
  { id: 'pushup', name: 'Push-ups',   icon: 'dumbbell', tier: 'silver', current: 38, unit: 'reps',  nextTier: 'Gold',   nextThreshold: 50, progress: 0.7,  history: [22,24,25,28,30,30,32,33,33,35,36,36,38] },
  { id: 'run',    name: '5K run',     icon: 'flame',    tier: 'bronze', current: 28, unit: 'min',   nextTier: 'Silver', nextThreshold: 25, progress: 0.6,  history: [35,34,34,33,32,32,31,31,30,30,29,29,28] },
  { id: 'read',   name: 'Reading',    icon: 'book',     tier: 'gold',   current: 142, unit: 'pages/wk', nextTier: 'Master', nextThreshold: 200, progress: 0.55, history: [80,90,100,110,115,120,125,128,132,135,138,140,142] },
  { id: 'med',    name: 'Meditation', icon: 'brain',    tier: 'silver', current: 24, unit: 'min/day', nextTier: 'Gold', nextThreshold: 30, progress: 0.65, history: [10,12,15,16,18,18,20,20,22,22,23,24,24] },
];

// ─────────────────────────────────────────────────────────────
// 5. Character / Stats
// ─────────────────────────────────────────────────────────────
function ScreenCharacter({ tab, setTab, onSkillClick, onShowLevelUp }) {
  return (
    <div style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div className="rpg-screen" style={{ height: '100%', overflowY: 'auto', paddingBottom: 100 }}>
        {/* Hero zone */}
        <div style={{
          background: 'radial-gradient(ellipse at top, rgba(123,92,255,0.3) 0%, transparent 60%), linear-gradient(180deg, #1A1F44 0%, #0E1230 100%)',
          padding: '16px 16px 26px',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <Eyebrow color="var(--violet-2)">YOUR HERO</Eyebrow>
            <button onClick={onShowLevelUp} style={{
              padding: '6px 12px', borderRadius: 'var(--r-pill)', background: 'var(--bg-surface)',
              font: '700 11px/1 var(--font)', color: 'var(--text-hi)',
              display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="pencil" size={12}/> Edit
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <LevelRing size={120} level={12} progress={0.65}>
              <AvatarSlot size={80} label={'CHARACTER\nART'}/>
            </LevelRing>
            <div style={{ flex: 1 }}>
              <div style={{ font: '800 22px/1.1 var(--font)', color: 'var(--text-hi)' }}>Aria the Bold</div>
              <div style={{ font: '600 12px/1 var(--font)', color: 'var(--text-mid)', marginTop: 4 }}>
                Path of the Wayfarer · Tier IV
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  font: '600 11px/1 var(--font)', color: 'var(--text-mid)', marginBottom: 4 }}>
                  <span>325 XP</span><span>500 XP</span>
                </div>
                <Bar value={325} max={500} color="var(--violet)" height={6}/>
                <div style={{ marginTop: 6, font: '700 11px/1 var(--font)', color: 'var(--violet-2)' }}>
                  175 XP to Level 13
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <HeroStat value="2,480" label="coins" icon={<CoinIcon size={16}/>} color="var(--coin)"/>
            <HeroStat value="14" label="day streak" icon={<Icon name="flame" size={14} color="#FF9F43"/>} color="#FF9F43"/>
            <HeroStat value="237" label="quests done" icon={<Icon name="check" size={14} color="var(--xp)"/>} color="var(--xp)"/>
          </div>
        </div>

        {/* Dimensions grid */}
        <div style={{ padding: '20px 16px 0' }}>
          <SectionHeader title="Dimensions"/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {DIM_DATA.map(d => <StatCard key={d.dim} {...d}/>)}
          </div>
        </div>

        {/* Skills */}
        <div style={{ padding: '24px 16px 0' }}>
          <SectionHeader title="Skills"
            action={<button style={{ font: '600 12px/1 var(--font)', color: 'var(--violet-2)' }}>See all</button>}/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SKILLS.map(s => <SkillRow key={s.id} skill={s} onClick={() => onSkillClick(s)}/>)}
          </div>
        </div>

        {/* Lifetime */}
        <div style={{ padding: '24px 16px 0' }}>
          <SectionHeader title="Lifetime"/>
          <Card padding={0}>
            <LifetimeRow icon="check" label="Tasks completed" value="237" color="var(--xp)"/>
            <LifetimeRow icon="flame" label="Longest streak" value="42 days" color="#FF9F43"/>
            <LifetimeRow icon="coin" label="Coins earned" value="14,820" color="var(--coin)"/>
            <LifetimeRow icon="trophy" label="Achievements" value="18 / 42" color="var(--violet-2)" last/>
          </Card>
        </div>
      </div>
      <TabBar active={tab} onChange={setTab}/>
    </div>
  );
}

function HeroStat({ value, label, icon, color }) {
  return (
    <div style={{
      flex: 1, padding: '10px 12px', borderRadius: 'var(--r-md)',
      background: 'var(--bg-glass)', backdropFilter: 'blur(10px)',
      boxShadow: '0 0 0 1px rgba(255,255,255,0.06) inset',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
        {icon}
        <div style={{ font: '800 16px/1 var(--font)', color: 'var(--text-hi)' }}>{value}</div>
      </div>
      <div style={{ font: '600 10px/1 var(--font)', color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

function LifetimeRow({ icon, label, value, color, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px',
      borderBottom: last ? 'none' : '1px solid var(--divider)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: `${color}20`, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={16} strokeWidth={2}/>
      </div>
      <div style={{ flex: 1, font: '600 13px/1 var(--font)', color: 'var(--text)' }}>{label}</div>
      <div style={{ font: '800 15px/1 var(--font)', color: 'var(--text-hi)' }}>{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 6. Skill Detail
// ─────────────────────────────────────────────────────────────
function ScreenSkillDetail({ tab, setTab, skill = SKILLS[0], onClose, onTierUp }) {
  const tierIdx = TIERS.indexOf(skill.tier);
  return (
    <div style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div className="rpg-screen" style={{ height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
        {/* Top bar */}
        <div style={{ padding: '4px 12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-hi)' }}>
            <Icon name="chevronLeft" size={22}/>
          </button>
          <button style={{ width: 40, height: 40, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-hi)' }}>
            <Icon name="settings" size={20}/>
          </button>
        </div>

        {/* Hero badge */}
        <div style={{
          padding: '8px 16px 24px', textAlign: 'center', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: '0 0 0 0', top: 20, height: 200,
            background: 'radial-gradient(ellipse, rgba(232,236,255,0.18), transparent 60%)',
            pointerEvents: 'none',
          }}/>
          <TierBadge tier={skill.tier} size={120} glow/>
          <div style={{ marginTop: 10, font: '800 11px/1 var(--font)', letterSpacing: 2,
            color: 'var(--text-mid)', textTransform: 'uppercase' }}>
            {TIER_LABEL[skill.tier]} Tier
          </div>
          <h1 style={{ font: 'var(--t-h1)', color: 'var(--text-hi)', margin: '6px 0 4px' }}>{skill.name}</h1>
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ font: '800 36px/1 var(--font)', color: 'var(--text-hi)' }}>{skill.current}</span>
            <span style={{ font: '600 14px/1 var(--font)', color: 'var(--text-mid)' }}>{skill.unit}</span>
          </div>
        </div>

        {/* Progress to next tier */}
        <div style={{ padding: '0 16px' }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <Eyebrow>Next tier</Eyebrow>
                <div style={{ font: '800 16px/1 var(--font)', color: 'var(--text-hi)', marginTop: 4 }}>
                  {skill.nextThreshold - skill.current} more {skill.unit.split(' ')[0]} to {skill.nextTier}
                </div>
              </div>
              <TierBadge tier={TIERS[tierIdx + 1] || 'master'} size={40}/>
            </div>
            <Bar value={skill.current} max={skill.nextThreshold} color="var(--coin)" height={8}/>
            <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between',
              font: '600 11px/1 var(--font)', color: 'var(--text-mid)' }}>
              <span>{skill.current}</span>
              <span>{skill.nextThreshold}</span>
            </div>
          </Card>
        </div>

        {/* Tier ladder */}
        <div style={{ padding: '20px 16px 0' }}>
          <SectionHeader title="Tier ladder"/>
          <Card padding={16}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
              {TIERS.map((t, i) => {
                const past = i < tierIdx, current = i === tierIdx;
                return (
                  <div key={t} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 6, opacity: past || current ? 1 : 0.45 }}>
                    <TierBadge tier={t} size={40} glow={current}/>
                    <div style={{ font: `${current ? 800 : 600} 10px/1 var(--font)`,
                      color: current ? 'var(--coin)' : 'var(--text-mid)',
                      letterSpacing: 0.5, textTransform: 'uppercase' }}>
                      {TIER_LABEL[t]}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* connecting line */}
            <div style={{ position: 'relative', height: 0 }}>
              <div style={{ position: 'absolute', left: 24, right: 24, top: -52, height: 2,
                background: `linear-gradient(90deg, var(--xp) 0%, var(--xp) ${((tierIdx) / 4) * 100}%, var(--text-faint) ${((tierIdx) / 4) * 100}%, var(--text-faint) 100%)`,
                zIndex: -1 }}/>
            </div>
          </Card>
        </div>

        {/* Chart */}
        <div style={{ padding: '20px 16px 0' }}>
          <SectionHeader title="Last 30 days"
            action={<span style={{ font: '700 11px/1 var(--font)', color: 'var(--xp)' }}>↗ +73%</span>}/>
          <Card>
            <PRChart data={skill.history}/>
          </Card>
        </div>

        {/* Recent PRs */}
        <div style={{ padding: '20px 16px 0' }}>
          <SectionHeader title="Recent PRs"/>
          <Card padding={0}>
            {[
              { d: 'Mar 18', v: 38, delta: '+2' },
              { d: 'Mar 14', v: 36, delta: '+1' },
              { d: 'Mar 10', v: 35, delta: '+2' },
              { d: 'Mar 06', v: 33, delta: '+0' },
            ].map((p, i, a) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12,
                borderBottom: i === a.length - 1 ? 'none' : '1px solid var(--divider)',
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-surface-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-mid)' }}>
                  <Icon name="calendar" size={16}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ font: '700 13px/1 var(--font)', color: 'var(--text-hi)' }}>{p.d}</div>
                  <div style={{ font: '500 11px/1 var(--font)', color: 'var(--text-mid)', marginTop: 3 }}>
                    {p.delta === '+0' ? 'No change' : `${p.delta} from prev`}
                  </div>
                </div>
                <div style={{ font: '800 18px/1 var(--font)', color: 'var(--text-hi)' }}>{p.v}</div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <div style={{
        position: 'absolute', left: 16, right: 16, bottom: 90, zIndex: 4,
      }}>
        <Btn variant="gold" size="lg" full icon="plus" onClick={onTierUp}>Log new PR</Btn>
      </div>
      <TabBar active={tab} onChange={setTab}/>
    </div>
  );
}

function PRChart({ data }) {
  const W = 300, H = 110, pad = 6;
  const min = Math.min(...data), max = Math.max(...data);
  const xs = (i) => pad + (i / (data.length - 1)) * (W - pad * 2);
  const ys = (v) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
  const line = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${ys(v)}`).join(' ');
  const area = `${line} L ${xs(data.length - 1)} ${H - pad} L ${pad} ${H - pad} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="prc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFC83D" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#FFC83D" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill="url(#prc)"/>
      <path d={line} stroke="#FFC83D" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0 0 4px rgba(255,200,61,0.5))' }}/>
      {data.map((v, i) => i === data.length - 1 && (
        <g key={i}>
          <circle cx={xs(i)} cy={ys(v)} r="6" fill="#FFC83D" opacity="0.3"/>
          <circle cx={xs(i)} cy={ys(v)} r="3" fill="#FFC83D"/>
        </g>
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// 7. Rewards
// ─────────────────────────────────────────────────────────────
const REWARDS = [
  { id: 'r1', title: '1 hour gaming',     cost: 50,   icon: 'play',    accent: 'var(--violet)' },
  { id: 'r2', title: 'Movie night',       cost: 200,  icon: 'film',    accent: '#FF5C7A' },
  { id: 'r3', title: 'Espresso treat',    cost: 30,   icon: 'coffee',  accent: '#FF9F43' },
  { id: 'r4', title: 'New album',         cost: 800,  icon: 'music',   accent: '#4DD0FF' },
  { id: 'r5', title: 'Bookstore spree',   cost: 1500, icon: 'book',    accent: '#3DD68C' },
  { id: 'r6', title: 'Weekend trip',      cost: 5000, icon: 'map',     accent: '#FFC83D' },
];

function ScreenRewards({ tab, setTab, balance = 2480, onRedeem }) {
  const [view, setView] = useState2('my');
  const [redeemed, setRedeemed] = useState2([]);
  const handleRedeem = (r) => {
    setRedeemed(rs => [...rs, r.id]);
    onRedeem?.(r);
  };
  return (
    <div style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div className="rpg-screen" style={{ height: '100%', overflowY: 'auto', paddingBottom: 100 }}>
        {/* Big coin balance hero */}
        <div style={{
          background: 'radial-gradient(ellipse at top, rgba(255,200,61,0.3) 0%, transparent 60%), linear-gradient(180deg, #1A1F44 0%, #0E1230 100%)',
          padding: '20px 16px 24px', textAlign: 'center', position: 'relative',
        }}>
          <Eyebrow color="var(--coin-2)" style={{ marginBottom: 8 }}>YOUR BALANCE</Eyebrow>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10,
            filter: 'drop-shadow(0 0 24px var(--coin-glow))' }}>
            <CoinIcon size={48}/>
            <div style={{ font: '800 56px/1 var(--font)', color: 'var(--coin)', letterSpacing: -1 }}>
              {balance.toLocaleString()}
            </div>
          </div>
          <div style={{ marginTop: 8, font: '600 12px/1.4 var(--font)', color: 'var(--text-mid)' }}>
            +120 today · 14,820 lifetime
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{
            background: 'var(--bg-surface)', borderRadius: 14, padding: 4,
            display: 'flex', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: 4, bottom: 4,
              left: view === 'my' ? 4 : 'calc(50% + 0px)', width: 'calc(50% - 4px)',
              background: 'linear-gradient(180deg, #FFE08A, #FFC83D 50%, #C8881C)',
              borderRadius: 10, transition: 'left var(--dur) var(--ease)',
            }}/>
            {[
              { id: 'my', label: 'My Rewards' },
              { id: 'red', label: 'Redeemed' },
            ].map(t => (
              <button key={t.id} onClick={() => setView(t.id)} style={{
                flex: 1, height: 38, position: 'relative', zIndex: 1,
                font: '700 13px/1 var(--font)',
                color: view === t.id ? '#3a2400' : 'var(--text-mid)',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div style={{ padding: '16px 16px 0' }}>
          {view === 'my' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {REWARDS.map(r => (
                <RewardCard key={r.id} reward={r} balance={balance}
                  redeemed={redeemed.includes(r.id)}
                  onRedeem={() => handleRedeem(r)}/>
              ))}
            </div>
          ) : (
            <RedeemedList/>
          )}
        </div>
      </div>
      <FAB icon="plus" style={{
        background: 'linear-gradient(160deg, #FFE08A 0%, #C8881C 100%)',
        boxShadow: '0 14px 30px rgba(255,200,61,0.55), 0 0 0 1px rgba(255,235,180,0.4) inset, 0 -3px 0 rgba(0,0,0,0.15) inset',
      }}/>
      <TabBar active={tab} onChange={setTab}/>
    </div>
  );
}

function RedeemedList() {
  const items = [
    { d: 'Mar 17', t: 'Espresso treat', c: 30, icon: 'coffee' },
    { d: 'Mar 14', t: '1 hour gaming', c: 50, icon: 'play' },
    { d: 'Mar 09', t: 'Movie night', c: 200, icon: 'film' },
    { d: 'Mar 02', t: '1 hour gaming', c: 50, icon: 'play' },
  ];
  return (
    <Card padding={0}>
      {items.map((it, i, a) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
          borderBottom: i === a.length - 1 ? 'none' : '1px solid var(--divider)',
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 10,
            background: 'rgba(255,200,61,0.15)', color: 'var(--coin)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={it.icon} size={20}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ font: '700 13px/1 var(--font)', color: 'var(--text-hi)' }}>{it.t}</div>
            <div style={{ font: '500 11px/1 var(--font)', color: 'var(--text-mid)', marginTop: 3 }}>{it.d}</div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
            font: '800 13px/1 var(--font)', color: 'var(--text-mid)' }}>
            <CoinIcon size={13}/> -{it.c}
          </div>
        </div>
      ))}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// 8. Profile / Settings
// ─────────────────────────────────────────────────────────────
function ScreenProfile({ tab, setTab, theme, onTheme }) {
  const [notifs, setNotifs] = useState2(true);
  const [vacation, setVacation] = useState2(false);
  const [graceDays, setGraceDays] = useState2(2);
  return (
    <div style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div className="rpg-screen" style={{ height: '100%', overflowY: 'auto', paddingBottom: 100 }}>
        {/* Header */}
        <div style={{ padding: '12px 16px 8px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ font: '800 22px/1 var(--font)', color: 'var(--text-hi)' }}>Profile</div>
          <button style={{ width: 40, height: 40, borderRadius: 12,
            background: 'var(--bg-surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-hi)' }}>
            <Icon name="settings" size={20}/>
          </button>
        </div>

        {/* Identity card */}
        <div style={{ padding: '12px 16px 0' }}>
          <Card style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <AvatarSlot size={64}/>
            <div style={{ flex: 1 }}>
              <div style={{ font: '800 16px/1.1 var(--font)', color: 'var(--text-hi)' }}>Aria Holloway</div>
              <div style={{ font: '500 11px/1.4 var(--font)', color: 'var(--text-mid)', marginTop: 4 }}>aria@questmail.com</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8,
                padding: '4px 10px', borderRadius: 'var(--r-pill)',
                background: 'rgba(123,92,255,0.18)', color: 'var(--violet-2)',
                font: '700 11px/1 var(--font)' }}>
                <Icon name="shield" size={11}/> Hero · LV 12
              </div>
            </div>
            <button style={{ width: 36, height: 36, borderRadius: 10,
              background: 'var(--bg-surface-2)', color: 'var(--text-hi)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="pencil" size={16}/>
            </button>
          </Card>
        </div>

        {/* Theme */}
        <div style={{ padding: '20px 16px 0' }}>
          <SectionHeader title="Appearance"/>
          <Card padding={12}>
            <div style={{ font: '700 12px/1 var(--font)', color: 'var(--text-mid)', marginBottom: 10,
              letterSpacing: 0.5 }}>THEME</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { id: 'dark', label: 'Dark', icon: 'moon' },
                { id: 'light', label: 'Light', icon: 'sparkle' },
                { id: 'system', label: 'System', icon: 'settings' },
              ].map(t => {
                const sel = theme === t.id;
                return (
                  <button key={t.id} onClick={() => onTheme?.(t.id)} style={{
                    padding: '14px 8px', borderRadius: 'var(--r-md)',
                    background: sel ? 'rgba(123,92,255,0.18)' : 'var(--bg-surface-2)',
                    border: `1.5px solid ${sel ? 'var(--violet)' : 'transparent'}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    color: sel ? 'var(--violet-2)' : 'var(--text-mid)',
                  }}>
                    <Icon name={t.icon} size={20}/>
                    <span style={{ font: '700 11px/1 var(--font)' }}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Toggles */}
        <div style={{ padding: '20px 16px 0' }}>
          <SectionHeader title="Quest settings"/>
          <Card padding={0}>
            <ToggleRow icon="bell" iconColor="var(--violet)" label="Notifications"
              sub="Reminders, level-ups, streaks" value={notifs} onChange={setNotifs}/>
            <ToggleRow icon="moon" iconColor="#4DD0FF" label="Vacation mode"
              sub="Pause streaks while away" value={vacation} onChange={setVacation} divider/>
            <SliderRow icon="shield" iconColor="#3DD68C" label="Streak grace days"
              value={graceDays} onChange={setGraceDays} max={5}/>
          </Card>
        </div>

        {/* Achievements */}
        <div style={{ padding: '24px 16px 0' }}>
          <SectionHeader title="Achievements"
            action={<span style={{ font: '700 11px/1 var(--font)', color: 'var(--coin)' }}>18 / 42</span>}/>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <Achievement name="First Quest" icon="check" unlocked date="Feb 1"/>
            <Achievement name="Week Streak" icon="flame" unlocked date="Feb 8"/>
            <Achievement name="Big Spender" icon="coin" unlocked date="Feb 24"/>
            <Achievement name="Iron Will" icon="shield" unlocked date="Mar 5"/>
            <Achievement name="Silver Skill" icon="trophy" unlocked date="Mar 12"/>
            <Achievement name="Bookworm" icon="book" unlocked date="Mar 14"/>
            <Achievement/>
            <Achievement/>
          </div>
        </div>

        {/* Sign out */}
        <div style={{ padding: '24px 16px 0' }}>
          <Btn variant="danger" size="lg" full icon="x">Sign out</Btn>
        </div>

        <div style={{ padding: '20px 16px',
          textAlign: 'center', font: '500 11px/1 var(--font)', color: 'var(--text-faint)' }}>
          v1.0.0 · Made for heroes
        </div>
      </div>
      <TabBar active={tab} onChange={setTab}/>
    </div>
  );
}

function ToggleRow({ icon, iconColor, label, sub, value, onChange, divider }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
      borderBottom: divider ? '1px solid var(--divider)' : 'none' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10,
        background: `${iconColor}22`, color: iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18}/>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ font: '700 13px/1 var(--font)', color: 'var(--text-hi)' }}>{label}</div>
        {sub && <div style={{ font: '500 11px/1.4 var(--font)', color: 'var(--text-mid)', marginTop: 3 }}>{sub}</div>}
      </div>
      <Switch value={value} onChange={onChange}/>
    </div>
  );
}

function SliderRow({ icon, iconColor, label, value, onChange, max = 5 }) {
  return (
    <div style={{ padding: '14px 16px', borderTop: '1px solid var(--divider)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10,
          background: `${iconColor}22`, color: iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={18}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ font: '700 13px/1 var(--font)', color: 'var(--text-hi)' }}>{label}</div>
          <div style={{ font: '500 11px/1.4 var(--font)', color: 'var(--text-mid)', marginTop: 3 }}>
            {value} day{value === 1 ? '' : 's'} · skip without breaking streak
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[...Array(max + 1)].map((_, i) => (
          <button key={i} onClick={() => onChange(i)} style={{
            flex: 1, height: 36, borderRadius: 10,
            background: i === value
              ? 'linear-gradient(180deg, #8B6CFF 0%, #5B3CE0 100%)'
              : 'var(--bg-surface-2)',
            color: i === value ? '#fff' : 'var(--text-mid)',
            font: '800 13px/1 var(--font)',
            boxShadow: i === value ? '0 4px 12px rgba(123,92,255,0.4)' : 'none',
          }}>{i}</button>
        ))}
      </div>
    </div>
  );
}

function Switch({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: 44, height: 26, borderRadius: 14,
      background: value ? 'linear-gradient(90deg, var(--violet), var(--violet-2))' : 'var(--bg-surface-2)',
      position: 'relative', transition: 'background var(--dur) var(--ease)',
      boxShadow: value ? '0 0 12px var(--violet-glow)' : 'none',
    }}>
      <div style={{
        position: 'absolute', top: 3, left: value ? 21 : 3,
        width: 20, height: 20, borderRadius: 10,
        background: '#fff',
        transition: 'left var(--dur) var(--ease)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      }}/>
    </button>
  );
}

Object.assign(window, { ScreenCharacter, ScreenSkillDetail, ScreenRewards, ScreenProfile, SKILLS, DIM_DATA, REWARDS, PRChart, Switch });
