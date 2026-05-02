/* global React, BrandMark, Eyebrow, TIERS, TierBadge, TIER_LABEL, DIMS, Icon */
// rpg/style-guide.jsx — Tokens (color / type / spacing / radius / shadow)

function StyleGuide() {
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
          <Eyebrow color="var(--coin-2)">RPG TASKS · TOKENS</Eyebrow>
          <h1 style={{ font: 'var(--t-h1)', color: 'var(--text-hi)', margin: '4px 0 0' }}>Style guide</h1>
        </div>
      </div>
      <p style={{ font: 'var(--t-body)', color: 'var(--text-mid)', maxWidth: 600, margin: '8px 0 28px' }}>
        Single source of truth for the design system. Numbers are the contract; visuals follow.
      </p>

      {/* Colors */}
      <Block title="Color · Surfaces">
        <SwatchGrid>
          <Swatch color="#0E1230" name="bg-base" desc="page bg"/>
          <Swatch color="#0A0E26" name="bg-deep" desc="canvas backdrop"/>
          <Swatch color="#1A1F44" name="bg-surface" desc="card surface"/>
          <Swatch color="#232958" name="bg-surface-2" desc="elevated"/>
          <Swatch color="#2D3470" name="bg-surface-3" desc="hover / active"/>
        </SwatchGrid>
      </Block>

      <Block title="Color · Text">
        <SwatchGrid>
          <Swatch color="#F2F3FF" name="text-hi" dark/>
          <Swatch color="#D9DBFA" name="text" dark/>
          <Swatch color="#9AA0D4" name="text-mid" dark/>
          <Swatch color="#6E74A8" name="text-dim" dark/>
          <Swatch color="#4A4F7A" name="text-faint" dark/>
        </SwatchGrid>
      </Block>

      <Block title="Color · Brand & system">
        <SwatchGrid>
          <Swatch color="#7B5CFF" name="violet" desc="primary"/>
          <Swatch color="#9B82FF" name="violet-2"/>
          <Swatch color="#3DD68C" name="xp" desc="experience" dark/>
          <Swatch color="#FFC83D" name="coin" desc="currency" dark/>
          <Swatch color="#FF5C7A" name="danger" desc="errors"/>
          <Swatch color="#FF9F43" name="warn" desc="streaks"/>
        </SwatchGrid>
      </Block>

      <Block title="Color · Dimensions" sub="Always paired with icon + label">
        <SwatchGrid>
          {Object.entries(DIMS).map(([k, d]) => (
            <Swatch key={k} color={d.color} name={`dim-${k}`} icon={d.icon} desc={d.label} dark/>
          ))}
        </SwatchGrid>
      </Block>

      <Block title="Color · Tier metals" sub="Used on skill badges">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {TIERS.map(t => (
            <div key={t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <TierBadge tier={t} size={56} label/>
            </div>
          ))}
        </div>
      </Block>

      {/* Typography */}
      <Block title="Type · Manrope" sub="Variable weights 300–800. JetBrains Mono for numeric labels.">
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 120px', gap: 12, alignItems: 'baseline' }}>
          {[
            { token: 't-display', label: 'Display 800/36', ex: 'Lv 12 · The Bold' },
            { token: 't-h1', label: 'H1 800/28', ex: 'Turn your life into an RPG.' },
            { token: 't-h2', label: 'H2 700/22', ex: 'All quests cleared.' },
            { token: 't-h3', label: 'H3 700/17', ex: 'Today' },
            { token: 't-body-lg', label: 'Body lg 500/16', ex: 'Real tasks. Real XP.' },
            { token: 't-body', label: 'Body 500/14', ex: 'Box breathing 4-4-4-4.' },
            { token: 't-caption', label: 'Caption 600/12', ex: '+40 XP · 14d streak' },
            { token: 't-eyebrow', label: 'Eyebrow 700/11 · ALL CAPS', ex: 'NEXT TIER' },
          ].map(r => (
            <React.Fragment key={r.token}>
              <code style={{ font: '600 12px var(--font-mono, monospace)', color: 'var(--text-mid)' }}>--{r.token}</code>
              <div style={{ font: `var(--${r.token})`, color: 'var(--text-hi)' }}>{r.ex}</div>
              <div style={{ font: '500 11px var(--font)', color: 'var(--text-dim)', textAlign: 'right' }}>{r.label}</div>
            </React.Fragment>
          ))}
        </div>
      </Block>

      {/* Spacing */}
      <Block title="Spacing scale">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            ['s-1', 4], ['s-2', 8], ['s-3', 12], ['s-4', 16], ['s-5', 20],
            ['s-6', 24], ['s-7', 32], ['s-8', 40], ['s-9', 48], ['s-10', 64],
          ].map(([t, v]) => (
            <div key={t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, width: 80 }}>
              <div style={{ width: v, height: 24, background: 'var(--violet)', borderRadius: 4 }}/>
              <code style={{ font: '600 11px var(--font-mono, monospace)', color: 'var(--text-mid)' }}>--{t}</code>
              <div style={{ font: '500 11px var(--font)', color: 'var(--text-dim)' }}>{v}px</div>
            </div>
          ))}
        </div>
      </Block>

      {/* Radii */}
      <Block title="Radius">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            ['r-xs', 6], ['r-sm', 10], ['r-md', 14], ['r-lg', 18],
            ['r-xl', 24], ['r-2xl', 32], ['r-pill', 999],
          ].map(([t, v]) => (
            <div key={t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 90 }}>
              <div style={{
                width: 64, height: 64, background: 'var(--bg-surface)',
                borderRadius: v === 999 ? 999 : v,
                boxShadow: 'var(--el-2)',
                border: '1px solid var(--violet)',
              }}/>
              <code style={{ font: '600 11px var(--font-mono, monospace)', color: 'var(--text-mid)' }}>--{t}</code>
              <div style={{ font: '500 11px var(--font)', color: 'var(--text-dim)' }}>{v === 999 ? '∞' : v + 'px'}</div>
            </div>
          ))}
        </div>
      </Block>

      {/* Elevation */}
      <Block title="Elevation · shadow">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16,
          padding: 24, background: '#0E1230', borderRadius: 16 }}>
          {[
            { t: 'el-1', label: 'subtle' },
            { t: 'el-2', label: 'card' },
            { t: 'el-3', label: 'modal' },
            { t: 'el-violet', label: 'CTA glow' },
            { t: 'el-coin', label: 'reward glow' },
          ].map(e => (
            <div key={e.t} style={{
              height: 90, borderRadius: 14,
              background: e.t.includes('violet') ? 'linear-gradient(180deg, #8B6CFF 0%, #5B3CE0 100%)'
                : e.t.includes('coin') ? 'linear-gradient(180deg, #FFE08A 0%, #C8881C 100%)'
                : 'var(--bg-surface)',
              boxShadow: `var(--${e.t})`,
              padding: 12, color: e.t.includes('coin') ? '#3a2400' : 'var(--text-hi)',
            }}>
              <code style={{ font: '700 11px var(--font-mono, monospace)' }}>--{e.t}</code>
              <div style={{ font: '500 11px var(--font)', marginTop: 4, opacity: 0.8 }}>{e.label}</div>
            </div>
          ))}
        </div>
      </Block>

      {/* Motion */}
      <Block title="Motion">
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 120px', gap: 12, alignItems: 'baseline' }}>
          {[
            { t: 'dur-fast', v: '140ms', desc: 'micro feedback' },
            { t: 'dur', v: '240ms', desc: 'default' },
            { t: 'dur-slow', v: '480ms', desc: 'modal · level up' },
            { t: 'ease', v: 'cubic-bezier(.2,.7,.3,1)', desc: 'standard' },
            { t: 'ease-spring', v: 'cubic-bezier(.34,1.56,.64,1)', desc: 'rewards · pop-in' },
          ].map(r => (
            <React.Fragment key={r.t}>
              <code style={{ font: '600 12px var(--font-mono, monospace)', color: 'var(--text-mid)' }}>--{r.t}</code>
              <div style={{ font: '500 13px var(--font)', color: 'var(--text-hi)' }}>{r.v}</div>
              <div style={{ font: '500 11px var(--font)', color: 'var(--text-dim)', textAlign: 'right' }}>{r.desc}</div>
            </React.Fragment>
          ))}
        </div>
      </Block>

      {/* Accessibility */}
      <Block title="Accessibility">
        <ul style={{ font: 'var(--t-body)', color: 'var(--text-mid)', lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
          <li>Min 44×44px tap targets on all interactive elements</li>
          <li>Body text ≥ 14px; numbers ≥ 13px</li>
          <li>WCAG AA contrast: <code>--text-hi</code> on <code>--bg-surface</code> = 14.5:1</li>
          <li>Tier and dimension never communicated by color alone — always paired with icon + label</li>
          <li>Dynamic type: relative units throughout (%, em); no absolute pinning</li>
        </ul>
      </Block>
    </div>
  );
}

function Block({ title, sub, children }) {
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ font: '800 16px/1.2 var(--font)', color: 'var(--text-hi)' }}>{title}</div>
      {sub && <div style={{ font: '500 12px/1.3 var(--font)', color: 'var(--text-dim)', marginTop: 4 }}>{sub}</div>}
      <div style={{ marginTop: 14, background: 'var(--bg-glass)', borderRadius: 16, padding: 20,
        boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset' }}>
        {children}
      </div>
    </div>
  );
}

function SwatchGrid({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
      {children}
    </div>
  );
}

function Swatch({ color, name, desc, dark, icon }) {
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 0 0 1px rgba(255,255,255,0.06) inset' }}>
      <div style={{
        height: 64, background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: 10,
        color: dark ? '#0E1230' : '#fff',
      }}>
        {icon && <Icon name={icon} size={20}/>}
      </div>
      <div style={{ padding: '10px 12px', background: 'var(--bg-surface)' }}>
        <code style={{ font: '700 12px var(--font-mono, monospace)', color: 'var(--text-hi)' }}>--{name}</code>
        <div style={{ font: '500 11px var(--font)', color: 'var(--text-mid)', marginTop: 3 }}>
          {color.toUpperCase()}{desc ? ` · ${desc}` : ''}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { StyleGuide });
