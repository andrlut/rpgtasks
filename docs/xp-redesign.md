# XP Redesign: Recent Effort + Flexible Consistency

## Why change this?

The current XP system is a good starting point, but it can feel too much like a traditional game system:

- XP grows forever.
- Streaks can become the main source of bonus.
- Missing a day may feel like losing progress.

We want the app to feel useful and welcoming even for people who are not into games.

The goal is to make progress feel like a reflection of real life:

- Some days are productive.
- Some days are slow.
- Rest is normal.
- Coming back matters more than being perfect.

## Main concepts

### Lifetime progress

This is permanent progress.

It represents everything the user has completed over time.

It should:

- never decrease;
- drive levels or long-term milestones;
- unlock achievements or cosmetic rewards;
- make the user feel that every completed task counted.

Suggested user-facing labels:

- Progress
- Total progress
- Lifetime progress
- Journey progress

Internally this can still be stored as 	otal_xp.

### Recent effort

This is the friendly version of Momentum.

Recent effort represents how active the user has been in the last period.

It should be based on a moving window, such as the last 30 days, with recent days counting more than older days.

Example weighting:

- Today: 100%
- Yesterday: 90%
- 2 days ago: 81%
- 3 days ago: 73%
- Older days keep fading gradually

This avoids a harsh reset. If the user misses a day, recent effort goes down slowly instead of disappearing.

Suggested user-facing labels:

- Recent effort
- Current rhythm
- This month's effort
- Recent activity
- Your rhythm

We can still use momentum internally if that is useful in code.

### Consistency

This is the friendly version of Streak.

Consistency should show regularity, not punish missed days.

The old streak idea is strict:

- complete a daily task every day;
- miss a day;
- lose the streak.

The new idea should be softer:

- completing a daily task keeps consistency active;
- missing one day puts consistency at risk;
- completing a task during a recovery window restores the rhythm;
- earned rest days can protect consistency;
- the app encourages return instead of highlighting failure.

Suggested user-facing labels:

- Consistency
- Rhythm
- Routine
- Current rhythm
- Steady days

## What each concept affects

### Lifetime progress affects

- Level or long-term progress.
- Permanent achievements.
- Unlocks.
- Historical stats.

It should not go down.

### Recent effort affects

Recent effort should be the main short-term feedback system.

It can affect:

- a small bonus on task rewards;
- encouraging messages;
- visual state on the home screen;
- weekly or monthly summaries;
- suggestions like "you are building rhythm" or "your effort is rising again".

Suggested bonus range:

- 0% to 25% maximum.

This keeps the bonus meaningful without making the user feel weak when recent effort is low.

### Consistency affects

Consistency should support the user emotionally and mechanically.

It can affect:

- protection from one missed day;
- recovery messages;
- earned rest shields;
- slower decay of recent effort;
- badges or milestones.

Consistency should not be the main XP multiplier anymore.

## Subtasks, main tasks, and categories

### Subtasks

Subtasks should remain the smallest reward unit.

Each subtask has its own effort value, based on stars or difficulty.

Example:

`	ext
Workout
- Warm-up: 2 stars = 15 progress
- Main exercise: 3 stars = 40 progress
- Stretching: 1 star = 5 progressIf the user completes all subtasks:

Base progress = 15 + 40 + 5 = 60

If the user completes only part of the task, they still receive partial progress.

This is important because real life is often partial. Doing something should feel better than doing nothing.

Main tasks

Main tasks are the visual and organizational layer.

They group subtasks and make the interface easier to understand.

A main task reward is the sum of its completed subtasks.

Example:

Workout completed fully: 60 progress
Workout completed partially: 55 progress
Categories

The first version should use one global recent effort score.

That keeps the system easier to understand.

Later, categories can have their own recent effort scores.

Example future categories:

Health
Learning
Home
Work
Relationships
Personal projects

These can become attribute-like areas without requiring game-heavy language.

Possible friendly labels:

Health rhythm
Learning rhythm
Home care
Project focus

Possible RPG-style internal mapping for later:

Health -> Vitality
Learning -> Wisdom
Home -> Order
Work/projects -> Mastery
Social -> Connection
Example scenario
Day 1

The user completes:

Workout: 60 progress
Study session: 100 progress

Result:

Lifetime progress: +160
Recent effort: rises a lot
Consistency: 1 active day
Message: Good start. You are building rhythm.
Day 2

The user completes nothing.

Result:

Lifetime progress: unchanged
Recent effort: goes down slightly
Consistency: at risk, not broken immediately
Message: A slower day is okay. Complete one small task tomorrow to keep your rhythm.
Day 3

The user completes a small task:

Read for 10 minutes: 15 progress

Result:

Lifetime progress: +15
Recent effort: starts rising again
Consistency: recovered
Message: Nice comeback. Small steps keep the rhythm going.
Example reward calculation

A task gives 60 base progress.

The user's recent effort gives an 8% bonus.

Base progress: 60
Recent effort bonus: +8%
Bonus progress: +5
Final progress: 65

The user also has an active consistency state.

Instead of adding a large multiplier, consistency gives support:

Consistency: active
Effect: recent effort decays slightly slower
Rest protection: 1 available

This makes consistency valuable without making a missed day feel devastating.

Suggested user-facing states

Use calm and friendly language:

Getting started
Building rhythm
In rhythm
Strong rhythm
Rest protected
Rhythm at risk
Comeback available
Back on track

Avoid harsh language:

Failed
Broken streak
Lost progress
Penalty
Punishment
Suggested messages
You are building rhythm. One small task is enough to keep going.
A slower day is okay. Your progress is still here.
Rest is part of the process. Your rhythm is protected today.
Comeback available: complete any daily task today to get back on track.
Nice comeback. Your recent effort is rising again.
You have been steady this week. Keep it simple and sustainable.
Initial implementation plan
Keep total_xp as permanent lifetime progress.
Add a recent effort calculation from task completions in the last 30 days.
Use recent effort for a small capped bonus and home-screen feedback.
Change streak language to consistency or rhythm in the UI.
Add consistency states: active, at risk, protected, recovering.
Reduce or replace the current streak multiplier.
Keep rewards calculated from subtasks first, then summed into main tasks.
Start with one global recent effort score.
Add category-level recent effort later if the global version feels good.
Open questions
Should the user see numbers, labels, or both?
Should recent effort affect coins, progress, or only messages and visuals?
How many recovery days should be allowed?
How does the user earn rest protection?
Should weekly tasks count toward consistency, or only daily tasks?
Should categories have their own rhythm in the first version or a later version?
