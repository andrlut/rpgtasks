/* global React, Icon, DIMS, DimChip, DifficultyStars, Bar, CoinCounter, CoinIcon, XPCounter, Btn, TierBadge, Card, SectionHeader, AvatarSlot, ImgSlot */
// rpg/components.jsx — Reusable composite components

// ─── Task card (collapsed + expanded) ───────────────────────
function TaskCard({ task, expanded, onComplete, onToggle, completed, completing }) {
  const { title, dims = [], difficulty = 2, xp, coins, recurrence, time, description } = task;
  return (
    <div style={{
      background: completed ? 'rgba(61,214,140,0.08)' : 'var(--bg-surface)',
      borderRadius: 'var(--r-lg)',
      padding: 14,
      boxShadow: 'var(--el-2)',
      border: completed ? '1px solid rgba(61,214,140,0.3)' : '1px solid transparent',
      transition: 'all var(--dur) var(--ease)',
      opacity: completing ? 0.5 : 1,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }} onClick={onToggle}>
          <div style={{ font: '700 15px/1.25 var(--font)', color: completed ? 'var(--text-mid)' : 'var(--text-hi)',
            textDecoration: completed ? 'line-through' : 'none' }}>
            {title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {dims.map(d => <DimChip key={d} dim={d} size="sm"/>)}
            <DifficultyStars value={difficulty} size={11}/>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
              font: '800 12px/1 var(--font)', color: 'var(--xp)' }}>
              <Icon name="bolt" size={12} color="var(--xp)" strokeWidth={2.4}/>
              +{xp} XP
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
              font: '800 12px/1 var(--font)', color: 'var(--coin)' }}>
              <CoinIcon size={13}/>
              +{coins}
            </span>
            {time && <span style={{ font: '600 11px/1 var(--font)', color: 'var(--text-dim)',
              display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Icon name="clock" size={11}/>{time}
            </span>}
          </div>
          {expanded && description && (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'rgba(0,0,0,0.2)',
              font: '500 12px/1.4 var(--font)', color: 'var(--text-mid)' }}>
              {description}
            </div>
          )}
          {expanded && recurrence && (
            <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
              {['M','T','W','T','F','S','S'].map((d, i) => (
                <div key={i} style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: recurrence[i] ? 'var(--violet)' : 'var(--bg-surface-2)',
                  color: recurrence[i] ? '#fff' : 'var(--text-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  font: '800 10px/1 var(--font)',
                }}>{d}</div>
              ))}
            </div>
          )}
        </div>
        <button onClick={onComplete} disabled={completed} style={{
          width: 44, height: 44, borderRadius: 14, flexShrink: 0,
          background: completed
            ? 'var(--xp)'
            : 'linear-gradient(180deg, #8B6CFF 0%, #5B3CE0 100%)',
          color: '#fff',
          boxShadow: completed
            ? '0 0 18px var(--xp-glow), 0 0 0 1px rgba(255,255,255,0.2) inset'
            : '0 6px 18px rgba(123,92,255,0.4), 0 0 0 1px rgba(255,255,255,0.18) inset',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all var(--dur) var(--ease)',
        }}>
          <Icon name="check" size={22} strokeWidth={3}/>
        </button>
      </div>
    </div>
  );
}

// ─── Reward card ────────────────────────────────────────────
function RewardCard({ reward, balance, onRedeem, redeemed }) {
  const { title, cost, icon = 'gift', accent = 'var(--violet)' } = reward;
  const canAfford = balance >= cost && !redeemed;
  return (
    <div style={{
      background: 'var(--bg-surface)',
      borderRadius: 'var(--r-lg)',
      padding: 14,
      boxShadow: 'var(--el-2)',
      opacity: redeemed ? 0.55 : 1,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {!canAfford && !redeemed && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          width: 28, height: 28, borderRadius: '50%',
          background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-dim)',
        }}>
          <Icon name="lock" size={14}/>
        </div>
      )}
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: canAfford ? `${accent}26` : 'var(--bg-surface-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: canAfford ? accent : 'var(--text-dim)',
        marginBottom: 10,
      }}>
        <Icon name={icon} size={26} strokeWidth={1.8}/>
      </div>
      <div style={{ font: '700 14px/1.3 var(--font)', color: canAfford ? 'var(--text-hi)' : 'var(--text-mid)', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10,
        font: '800 14px/1 var(--font)', color: canAfford ? 'var(--coin)' : 'var(--text-dim)' }}>
        <CoinIcon size={14}/>
        {cost.toLocaleString()}
      </div>
      <button onClick={canAfford ? onRedeem : undefined} disabled={!canAfford} style={{
        width: '100%', height: 36, borderRadius: 10,
        background: redeemed
          ? 'rgba(61,214,140,0.18)'
          : canAfford
            ? 'linear-gradient(180deg, #FFE08A 0%, #FFC83D 50%, #C8881C 100%)'
            : 'var(--bg-surface-2)',
        color: redeemed ? 'var(--xp)' : canAfford ? '#3a2400' : 'var(--text-dim)',
        font: '800 12px/1 var(--font)', letterSpacing: 0.5,
        boxShadow: canAfford && !redeemed
          ? '0 4px 14px rgba(255,200,61,0.35), 0 0 0 1px rgba(255,235,180,0.4) inset'
          : 'none',
      }}>
        {redeemed ? '✓ REDEEMED' : canAfford ? 'REDEEM' : `NEEDS ${cost - balance}`}
      </button>
    </div>
  );
}

// ─── Stat card (dimension) ──────────────────────────────────
function StatCard({ dim, level, xp, xpMax }) {
  const d = DIMS[dim];
  return (
    <div style={{
      background: 'var(--bg-surface)',
      borderRadius: 'var(--r-lg)',
      padding: 14,
      boxShadow: 'var(--el-2)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80,
        borderRadius: '50%', background: d.color, opacity: 0.08, filter: 'blur(20px)',
      }}/>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: d.bg, color: d.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={d.icon} size={20} strokeWidth={2}/>
        </div>
        <div style={{ font: '800 22px/1 var(--font)', color: 'var(--text-hi)' }}>
          <span style={{ font: '700 11px/1 var(--font)', color: 'var(--text-mid)' }}>LV </span>
          {level}
        </div>
      </div>
      <div style={{ font: '700 13px/1.2 var(--font)', color: 'var(--text-hi)', marginBottom: 8 }}>
        {d.label}
      </div>
      <Bar value={xp} max={xpMax} color={d.color} height={5}/>
      <div style={{ marginTop: 6, font: '600 10px/1 var(--font)', color: 'var(--text-mid)' }}>
        {xp}/{xpMax} XP
      </div>
    </div>
  );
}

// ─── Skill row ─────────────────────────────────────────────
function SkillRow({ skill, onClick }) {
  const { name, icon, tier, current, unit, nextTier, nextThreshold, progress } = skill;
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'var(--bg-surface)',
      borderRadius: 'var(--r-lg)',
      padding: 12,
      boxShadow: 'var(--el-2)',
      cursor: 'pointer',
    }}>
      <TierBadge tier={tier} size={44}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name={icon} size={14} color="var(--text-mid)"/>
          <div style={{ font: '700 14px/1 var(--font)', color: 'var(--text-hi)' }}>{name}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '4px 0 6px' }}>
          <span style={{ font: '800 18px/1 var(--font)', color: 'var(--text-hi)' }}>{current}</span>
          <span style={{ font: '600 11px/1 var(--font)', color: 'var(--text-mid)' }}>{unit}</span>
        </div>
        <Bar value={progress * 100} max={100} color="var(--coin)" height={4} glow={false}/>
        <div style={{ marginTop: 4, font: '600 10px/1 var(--font)', color: 'var(--text-dim)' }}>
          {nextThreshold - current} to {nextTier}
        </div>
      </div>
      <Icon name="chevronRight" size={18} color="var(--text-dim)"/>
    </div>
  );
}

// ─── Achievement tile ───────────────────────────────────────
function Achievement({ name, icon = 'trophy', unlocked, date }) {
  return (
    <div style={{
      aspectRatio: '1',
      borderRadius: 'var(--r-lg)',
      background: unlocked ? 'linear-gradient(160deg, rgba(255,200,61,0.15), rgba(123,92,255,0.15))' : 'var(--bg-surface)',
      border: unlocked ? '1px solid rgba(255,200,61,0.3)' : '1px solid var(--border)',
      padding: 10,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
      position: 'relative', overflow: 'hidden',
    }}>
      {unlocked ? (
        <Icon name={icon} size={28} color="var(--coin)" strokeWidth={1.8}/>
      ) : (
        <Icon name="lock" size={22} color="var(--text-faint)" strokeWidth={1.8}/>
      )}
      <div style={{ font: '700 10px/1.1 var(--font)', color: unlocked ? 'var(--text-hi)' : 'var(--text-faint)',
        textAlign: 'center' }}>
        {unlocked ? name : '???'}
      </div>
      {unlocked && date && (
        <div style={{ font: '500 9px/1 var(--font)', color: 'var(--text-dim)' }}>{date}</div>
      )}
    </div>
  );
}

Object.assign(window, { TaskCard, RewardCard, StatCard, SkillRow, Achievement });
