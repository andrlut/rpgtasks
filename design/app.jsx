/* global React, Phone, ScreenOnboarding, ScreenAuth, ScreenHome, ScreenTaskEdit, ScreenCharacter, ScreenSkillDetail, ScreenRewards, ScreenProfile, CoinFloat, LevelUpModal, TierUpModal, Toast, SKILLS, CoinIcon, Icon */
// rpg/app.jsx — App shell that wires screens + overlays. Each phone instance
// is independent so they can sit side-by-side on the canvas.

const { useState: useStateA, useRef: useRefA } = React;

function PhoneApp({ start = 'home', label, animSpeed = 1, density = 'comfortable' }) {
  const [tab, setTab] = useStateA(start);
  const [showEmpty, setShowEmpty] = useStateA(false);
  const [completed, setCompleted] = useStateA([]);
  const [completing, setCompleting] = useStateA(null);
  const [floats, setFloats] = useStateA([]); // {id, x, y, xp, coins}
  const [levelUp, setLevelUp] = useStateA(null);
  const [tierUp, setTierUp] = useStateA(null);
  const [toast, setToast] = useStateA(null);
  const [activeSkill, setActiveSkill] = useStateA(SKILLS[0]);

  const screenRef = useRefA(null);

  const handleComplete = (task) => {
    if (completed.includes(task.id) || completing) return;
    setCompleting(task.id);
    // Origin: rough center of the task row for visual interest
    const rect = screenRef.current?.getBoundingClientRect();
    const x = (rect?.width || 380) / 2;
    const y = 280; // approx where Today list lives
    const fid = Math.random();
    setFloats(f => [...f, { id: fid, x, y, xp: task.xp, coins: task.coins }]);
    setTimeout(() => {
      setCompleted(c => [...c, task.id]);
      setCompleting(null);
    }, 350);
  };

  const triggerLevelUp = () => setLevelUp({ dim: 'health', level: 7 });
  const triggerTierUp = () => setTierUp({ skill: activeSkill, fromTier: 'silver', toTier: 'gold' });

  let screen;
  if (tab === 'onboarding') screen = <ScreenOnboarding/>;
  else if (tab === 'auth') screen = <ScreenAuth/>;
  else if (tab === 'home') screen = (
    <ScreenHome tab="home" setTab={setTab} showEmpty={showEmpty}
      completed={completed} onComplete={handleComplete} completing={completing}
      onShowLevelUp={triggerLevelUp}/>
  );
  else if (tab === 'tasks') screen = <ScreenTaskEdit tab="tasks" setTab={setTab} onClose={() => setTab('home')}/>;
  else if (tab === 'character') screen = (
    <ScreenCharacter tab="character" setTab={setTab}
      onSkillClick={(s) => { setActiveSkill(s); setTab('skill'); }}
      onShowLevelUp={triggerLevelUp}/>
  );
  else if (tab === 'skill') screen = (
    <ScreenSkillDetail tab="character" setTab={setTab} skill={activeSkill}
      onClose={() => setTab('character')}
      onTierUp={triggerTierUp}/>
  );
  else if (tab === 'rewards') screen = (
    <ScreenRewards tab="rewards" setTab={setTab}
      onRedeem={(r) => setToast({ msg: `Redeemed: ${r.title}`, icon: 'gift' })}/>
  );
  else if (tab === 'profile') screen = <ScreenProfile tab="profile" setTab={setTab} theme="dark"/>;

  return (
    <Phone label={label || tab} scroll={false}>
      <div ref={screenRef} style={{ position: 'absolute', inset: 0 }}>
        {screen}
        {/* Floating rewards */}
        {floats.map(f => (
          <CoinFloat key={f.id} origin={{ x: f.x, y: f.y }} xp={f.xp} coins={f.coins}
            onDone={() => setFloats(fs => fs.filter(x => x.id !== f.id))}/>
        ))}
        {/* Toast */}
        {toast && (
          <Toast onDone={() => setToast(null)}>
            <div style={{ width: 28, height: 28, borderRadius: 8,
              background: 'rgba(255,200,61,0.18)', color: 'var(--coin)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={toast.icon} size={16}/>
            </div>
            {toast.msg}
          </Toast>
        )}
        {/* Level up */}
        {levelUp && (
          <LevelUpModal dim={levelUp.dim} level={levelUp.level} onDismiss={() => setLevelUp(null)}/>
        )}
        {/* Tier up */}
        {tierUp && (
          <TierUpModal skill={tierUp.skill} fromTier={tierUp.fromTier} toTier={tierUp.toTier}
            onDismiss={() => setTierUp(null)}/>
        )}
      </div>
    </Phone>
  );
}

Object.assign(window, { PhoneApp });
