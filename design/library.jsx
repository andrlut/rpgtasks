/* global React, Icon, DIMS, DimChip, DifficultyStars, DifficultySelector, Bar, CoinCounter, CoinIcon, XPCounter, Btn, TIERS, TIER_LABEL, TierBadge, TabBar, FAB, Card, Eyebrow, AvatarSlot, LevelRing, ImgSlot, TaskCard, RewardCard, StatCard, SkillRow, Achievement, Switch, BrandMark */
// rpg/library.jsx — Component library page (long-form, scrollable)

function ComponentLibrary() {
  return (
    <div style={{
      width: 980,
      background: 'linear-gradient(180deg, #15183A 0%, #0E1230 100%)',
      borderRadius: 24,
      padding: 32,
      color: 'var(--text)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <BrandMark size={32}/>
        <div>
          <Eyebrow color="var(--violet-2)">RPG TASKS · COMPONENTS</Eyebrow>
          <h1 style={{ font: 'var(--t-h1)', color: 'var(--text-hi)', margin: '4px 0 0' }}>Component library</h1>
        </div>
      </div>
      <p style={{ font: 'var(--t-body)', color: 'var(--text-mid)', maxWidth: 560, margin: '8px 0 24px' }}>
        Reusable parts that compose every screen. All components consume tokens from <code style={{ background: 'var(--bg-surface)', padding: '2px 6px', borderRadius: 4, font: '600 12px var(--font-mono, monospace)' }}>tokens.css</code>.
      </p>

      <Section title="Buttons" sub="Primary, gold, soft, ghost, danger · 3 sizes · default + pressed">
        <Row>
          <Btn variant="primary" size="lg" icon="check">Complete quest</Btn>
          <Btn variant="primary" size="md">Default</Btn>
          <Btn variant="primary" size="sm">Small</Btn>
          <Btn variant="primary" size="md" state="pressed">Pressed</Btn>
        </Row>
        <Row>
          <Btn variant="gold" size="lg" icon="plus">Log new PR</Btn>
          <Btn variant="soft" icon="bell">Soft</Btn>
          <Btn variant="ghost" icon="settings">Ghost</Btn>
          <Btn variant="danger" icon="trash">Delete</Btn>
          <Btn variant="primary" disabled>Disabled</Btn>
        </Row>
      </Section>

      <Section title="Dimension chips" sub="Color-coded, paired with icon + label (no color-only)">
        <Row>
          {Object.keys(DIMS).map(d => <DimChip key={d} dim={d} size="md"/>)}
        </Row>
        <Row>
          {Object.keys(DIMS).map(d => <DimChip key={d} dim={d} size="md" selected/>)}
        </Row>
      </Section>

      <Section title="Tier badges" sub="Beginner → Bronze → Silver → Gold → Master">
        <Row>
          {TIERS.map(t => <TierBadge key={t} tier={t} size={64} label/>)}
        </Row>
      </Section>

      <Section title="Difficulty selector" sub="5 tiers · live XP preview">
        <div style={{ maxWidth: 460 }}>
          <DifficultySelector value={3} onChange={() => {}}/>
        </div>
        <Row style={{ marginTop: 12 }}>
          {[1,2,3,4,5].map(n => <DifficultyStars key={n} value={n} size={18}/>)}
        </Row>
      </Section>

      <Section title="Counters" sub="Coin & XP, multiple sizes">
        <Row>
          <CoinCounter value={2480} size="lg" glow/>
          <CoinCounter value={120} size="md"/>
          <XPCounter value={325} size="lg"/>
          <XPCounter value={40} size="md"/>
        </Row>
      </Section>

      <Section title="Progress bars" sub="Glow + dimension-tinted variants">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 600 }}>
          <Bar value={325} max={500} color="var(--violet)" label="XP to LV 13"/>
          <Bar value={38} max={50} color="var(--coin)" label="Push-ups → Gold"/>
          <Bar value={320} max={500} color="var(--dim-health)" label="Health"/>
          <Bar value={540} max={650} color="var(--dim-discipline)" label="Discipline"/>
        </div>
      </Section>

      <Section title="Task card" sub="Collapsed + expanded states">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 720 }}>
          <TaskCard task={{ title: 'Morning workout · 30 min', dims: ['strength','health'], difficulty: 3, xp: 40, coins: 40, time: '7:00' }}/>
          <TaskCard task={{ title: 'Meditate · 10 min', dims: ['mind','discipline'], difficulty: 2, xp: 15, coins: 15, time: '8:00',
            description: 'Box breathing 4-4-4-4. Focus on shoulders.', recurrence: [1,1,1,1,1,0,0] }} expanded/>
          <TaskCard task={{ title: 'Read 20 pages', dims: ['mind'], difficulty: 2, xp: 15, coins: 15 }} completed/>
        </div>
      </Section>

      <Section title="Reward card" sub="Affordable / locked / redeemed">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, maxWidth: 720 }}>
          <RewardCard reward={{ title: '1 hour gaming', cost: 50, icon: 'play', accent: 'var(--violet)' }} balance={2480}/>
          <RewardCard reward={{ title: 'Espresso treat', cost: 30, icon: 'coffee', accent: '#FF9F43' }} balance={2480}/>
          <RewardCard reward={{ title: 'Weekend trip', cost: 5000, icon: 'map', accent: '#FFC83D' }} balance={2480}/>
          <RewardCard reward={{ title: 'Movie night', cost: 200, icon: 'film' }} balance={2480} redeemed/>
        </div>
      </Section>

      <Section title="Stat card" sub="Used in Character > Dimensions grid">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 600 }}>
          <StatCard dim="health" level={9} xp={320} xpMax={500}/>
          <StatCard dim="strength" level={11} xp={180} xpMax={600}/>
          <StatCard dim="discipline" level={12} xp={540} xpMax={650}/>
        </div>
      </Section>

      <Section title="Skill row">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 720 }}>
          <SkillRow skill={{ name: 'Push-ups', icon: 'dumbbell', tier: 'silver', current: 38, unit: 'reps', nextTier: 'Gold', nextThreshold: 50, progress: 0.7 }}/>
          <SkillRow skill={{ name: '5K run', icon: 'flame', tier: 'bronze', current: 28, unit: 'min', nextTier: 'Silver', nextThreshold: 25, progress: 0.6 }}/>
        </div>
      </Section>

      <Section title="Avatar + level ring">
        <Row>
          <LevelRing size={100} level={12} progress={0.65}><AvatarSlot size={64}/></LevelRing>
          <LevelRing size={80} level={5} progress={0.3} color="var(--xp)"><AvatarSlot size={50}/></LevelRing>
          <AvatarSlot size={56} label="HERO"/>
        </Row>
      </Section>

      <Section title="Achievements" sub="Locked = silhouette, unlocked = full color">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, maxWidth: 540 }}>
          <Achievement name="First Quest" icon="check" unlocked date="Feb 1"/>
          <Achievement name="Week Streak" icon="flame" unlocked date="Feb 8"/>
          <Achievement name="Big Spender" icon="coin" unlocked date="Feb 24"/>
          <Achievement/>
          <Achievement/>
          <Achievement/>
        </div>
      </Section>

      <Section title="Tab bar + FAB" sub="Glass blur, gradient indicator, FAB sits on top-right">
        <div style={{ position: 'relative', width: 380, height: 100, background: '#0E1230', borderRadius: 16, overflow: 'hidden' }}>
          <TabBar active="home"/>
          <FAB style={{ bottom: 22 }}/>
        </div>
      </Section>

      <Section title="Switch · slider segments">
        <Row>
          <Switch value={true} onChange={()=>{}}/>
          <Switch value={false} onChange={()=>{}}/>
        </Row>
      </Section>

      <Section title="Iconography" sub="Outlined Lucide-style, stroke 1.75px">
        <Row style={{ flexWrap: 'wrap', gap: 14 }}>
          {['home','list','shield','user','plus','check','sparkle','flame','bell','moon','settings','heart','sword','brain','wallet','chat','target','gift','trophy','lock','star','starF','arrowRight','calendar','clock','book','dumbbell','play','film','music','map','bolt'].map(n => (
            <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 56 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-hi)' }}>
                <Icon name={n} size={20}/>
              </div>
              <div style={{ font: '600 9px/1.1 var(--font-mono, monospace)', color: 'var(--text-dim)', textAlign: 'center' }}>{n}</div>
            </div>
          ))}
        </Row>
      </Section>
    </div>
  );
}

function Section({ title, sub, children }) {
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ font: '800 16px/1.2 var(--font)', color: 'var(--text-hi)' }}>{title}</div>
      {sub && <div style={{ font: '500 12px/1.3 var(--font)', color: 'var(--text-dim)', marginTop: 4, marginBottom: 14 }}>{sub}</div>}
      {!sub && <div style={{ height: 12 }}/>}
      <div style={{ background: 'var(--bg-glass)', borderRadius: 16, padding: 18,
        boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ children, style }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', ...style }}>{children}</div>;
}

Object.assign(window, { ComponentLibrary });
