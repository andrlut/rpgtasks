/* global React, Icon, CoinIcon, Btn, TierBadge, AvatarSlot, LevelRing, DIMS */
// rpg/overlays.jsx — Coin float, Level up, Tier up, Reward toast

const { useState: useStateO, useEffect: useEffectO, useRef: useRefO } = React;

// ─── Floating reward (+XP / +coins rises and fades) ────────
function CoinFloat({ origin, xp, coins, onDone }) {
  useEffectO(() => {
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{
      position: 'absolute',
      left: origin.x - 80, top: origin.y - 30,
      width: 160, height: 60,
      pointerEvents: 'none',
      zIndex: 50,
      animation: 'cf-rise 1500ms var(--ease) forwards',
    }}>
      <style>{`
        @keyframes cf-rise {
          0%   { opacity: 0; transform: translateY(0) scale(0.7); }
          15%  { opacity: 1; transform: translateY(-10px) scale(1.1); }
          30%  { transform: translateY(-20px) scale(1); }
          100% { opacity: 0; transform: translateY(-90px) scale(0.95); }
        }
        @keyframes cf-spark {
          0% { opacity: 0; transform: translate(0,0) scale(0); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1); }
        }
      `}</style>
      <div style={{
        background: 'rgba(14,18,48,0.85)',
        borderRadius: 14,
        padding: '8px 14px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
          font: '800 16px/1 var(--font)', color: 'var(--xp)',
          filter: 'drop-shadow(0 0 8px var(--xp-glow))' }}>
          <Icon name="bolt" size={16} color="var(--xp)" strokeWidth={2.4}/>
          +{xp}
        </div>
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)' }}/>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
          font: '800 16px/1 var(--font)', color: 'var(--coin)',
          filter: 'drop-shadow(0 0 8px var(--coin-glow))' }}>
          <CoinIcon size={16}/>
          +{coins}
        </div>
      </div>
      {/* sparkles */}
      {[...Array(6)].map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <div key={i} style={{
            position: 'absolute', left: 80, top: 30,
            width: 6, height: 6, borderRadius: '50%',
            background: i % 2 ? 'var(--coin)' : 'var(--xp)',
            '--dx': `${Math.cos(a) * 50}px`,
            '--dy': `${Math.sin(a) * 50}px`,
            animation: `cf-spark 1100ms ${100 + i * 30}ms var(--ease) forwards`,
            boxShadow: '0 0 8px currentColor',
          }}/>
        );
      })}
    </div>
  );
}

// ─── Level up modal ───────────────────────────────────────
function LevelUpModal({ dim = 'health', level = 7, onDismiss }) {
  const d = DIMS[dim];
  return (
    <div onClick={onDismiss} style={{
      position: 'absolute', inset: 0, zIndex: 80,
      background: 'rgba(8,10,30,0.85)',
      backdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, animation: 'lu-fade 240ms var(--ease)',
    }}>
      <style>{`
        @keyframes lu-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lu-pop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes lu-glow {
          0%,100% { filter: drop-shadow(0 0 30px ${d.color}); }
          50% { filter: drop-shadow(0 0 60px ${d.color}); }
        }
        @keyframes lu-rays {
          0%   { opacity: 0; transform: scale(0.6) rotate(0deg); }
          50%  { opacity: 0.7; }
          100% { opacity: 0; transform: scale(1.6) rotate(60deg); }
        }
      `}</style>

      {/* rays */}
      <div style={{
        position: 'absolute', width: 400, height: 400, top: '40%', left: '50%',
        transform: 'translate(-50%, -50%)',
        animation: 'lu-rays 2.6s var(--ease) infinite',
      }}>
        <svg viewBox="0 0 400 400" width="100%" height="100%">
          {[...Array(16)].map((_, i) => {
            const a = (i / 16) * Math.PI * 2;
            return <line key={i}
              x1={200 + Math.cos(a) * 60} y1={200 + Math.sin(a) * 60}
              x2={200 + Math.cos(a) * 200} y2={200 + Math.sin(a) * 200}
              stroke={d.color} strokeWidth="3" opacity="0.5" strokeLinecap="round"/>;
          })}
        </svg>
      </div>

      <div style={{ animation: 'lu-pop 480ms var(--ease-spring)' }}>
        <div style={{ animation: 'lu-glow 2s var(--ease) infinite' }}>
          <div style={{
            width: 140, height: 140,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${d.color}, ${d.color}88)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
            boxShadow: `0 0 60px ${d.color}, 0 0 0 4px rgba(255,255,255,0.2) inset`,
          }}>
            <Icon name={d.icon} size={64} strokeWidth={2}/>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 32, textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <div style={{
          font: '800 13px/1 var(--font)', color: 'var(--coin)',
          letterSpacing: 4, marginBottom: 10,
          filter: 'drop-shadow(0 0 8px var(--coin-glow))',
        }}>
          ◆ LEVEL UP ◆
        </div>
        <div style={{ font: '800 36px/1.05 var(--font)', color: 'var(--text-hi)' }}>
          {d.label} <span style={{ color: d.color }}>Lv {level}</span>
        </div>
        <div style={{ marginTop: 14, font: '500 14px/1.4 var(--font)', color: 'var(--text-mid)',
          maxWidth: 260, marginLeft: 'auto', marginRight: 'auto' }}>
          New skill slots unlocked. The path widens.
        </div>
      </div>

      <div style={{ marginTop: 40, position: 'relative', zIndex: 2 }}>
        <Btn variant="primary" size="lg" iconRight="arrowRight" onClick={onDismiss}>
          Tap to continue
        </Btn>
      </div>
    </div>
  );
}

// ─── Tier up modal ────────────────────────────────────────
function TierUpModal({ skill, fromTier = 'silver', toTier = 'gold', onDismiss }) {
  const [showTo, setShowTo] = useStateO(false);
  useEffectO(() => {
    const t = setTimeout(() => setShowTo(true), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div onClick={onDismiss} style={{
      position: 'absolute', inset: 0, zIndex: 80,
      background: 'rgba(8,10,30,0.88)',
      backdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, animation: 'lu-fade 240ms var(--ease)',
    }}>
      <style>{`
        @keyframes tu-from { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(0.5); opacity: 0; } }
        @keyframes tu-to { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes tu-spark {
          0% { opacity: 0; transform: translate(0,0) scale(0); }
          30% { opacity: 1; transform: translate(calc(var(--dx) * 0.5), calc(var(--dy) * 0.5)) scale(1); }
          100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0.4); }
        }
      `}</style>

      <div style={{ position: 'relative', width: 200, height: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', animation: 'tu-from 600ms var(--ease) forwards' }}>
          <TierBadge tier={fromTier} size={140}/>
        </div>
        {showTo && (
          <>
            <div style={{ position: 'absolute', animation: 'tu-to 700ms var(--ease-spring) forwards' }}>
              <TierBadge tier={toTier} size={140}/>
            </div>
            {[...Array(20)].map((_, i) => {
              const a = (i / 20) * Math.PI * 2;
              const dist = 80 + Math.random() * 40;
              return (
                <div key={i} style={{
                  position: 'absolute',
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--coin)',
                  boxShadow: '0 0 8px var(--coin)',
                  '--dx': `${Math.cos(a) * dist}px`,
                  '--dy': `${Math.sin(a) * dist}px`,
                  animation: `tu-spark 1300ms ${600 + Math.random() * 200}ms var(--ease) forwards`,
                }}/>
              );
            })}
          </>
        )}
      </div>

      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <div style={{
          font: '800 13px/1 var(--font)', color: 'var(--coin)',
          letterSpacing: 4, marginBottom: 10,
          filter: 'drop-shadow(0 0 8px var(--coin-glow))',
        }}>
          ◆ TIER UP ◆
        </div>
        <div style={{ font: '800 30px/1.1 var(--font)', color: 'var(--text-hi)' }}>
          {skill?.name || 'Push-ups'}
        </div>
        <div style={{ marginTop: 8, font: '700 16px/1 var(--font)', color: 'var(--text-mid)' }}>
          Silver <span style={{ color: 'var(--text-faint)' }}>→</span> <span style={{
            background: 'linear-gradient(90deg, #FFE08A, #C8881C)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Gold</span>
        </div>
      </div>

      <div style={{ marginTop: 36 }}>
        <Btn variant="gold" size="lg" onClick={onDismiss} iconRight="arrowRight">Continue</Btn>
      </div>
    </div>
  );
}

// ─── Toast (reward redeemed, etc) ──────────────────────────
function Toast({ children, onDone }) {
  useEffectO(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{
      position: 'absolute', bottom: 90, left: 16, right: 16, zIndex: 60,
      animation: 'toast-in 200ms var(--ease), toast-out 240ms 1960ms var(--ease) forwards',
    }}>
      <style>{`
        @keyframes toast-in { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes toast-out { to { transform: translateY(20px); opacity: 0; } }
      `}</style>
      <div style={{
        background: 'var(--bg-glass-strong)',
        backdropFilter: 'blur(18px)',
        borderRadius: 14,
        padding: '14px 16px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08) inset',
        font: '600 13px/1.3 var(--font)',
        color: 'var(--text-hi)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>{children}</div>
    </div>
  );
}

Object.assign(window, { CoinFloat, LevelUpModal, TierUpModal, Toast });
