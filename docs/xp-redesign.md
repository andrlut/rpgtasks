# XP Redesign: Momentum + Flexible Streak

## Goals

Make XP feel less punitive and more encouraging.

The system should reward recent effort without making the player feel like all progress is lost after a bad day.

## Concepts

### Total XP

Permanent progression.

- Never decreases
- Drives level
- Unlocks long-term achievements
- Represents lifetime progress

### Momentum

A moving window of recent effort.

Momentum represents how active the player has been recently.

Suggested window:

- Last 7 days: high weight
- Days 8-14: medium weight
- Days 15-30: low weight

Alternative formula:

- Today: 100%
- Yesterday: 90%
- 2 days ago: 81%
- 3 days ago: 73%
- Continue with decay

Momentum should provide the main short-term bonus.

### Streak

Streak should represent consistency, not punishment.

Current behavior is strict consecutive daily completion.

Proposed behavior:

- Completing a daily task keeps the streak active
- Missing one day puts the streak at risk
- Completing a task during the recovery window restores the streak
- Planned rest or earned rest shields can protect the streak
- Streak should support momentum instead of being the only multiplier source

## Reward Direction

Base task reward:

- Based on difficulty/stars

Momentum bonus:

- Small capped bonus based on recent effort
- Example: up to +25%

Streak bonus:

- Smaller than today
- Could improve momentum stability
- Could grant rest shields
- Should not make the player feel punished after one missed day

## Suggested UX States

- Building momentum
- In rhythm
- On fire
- Protected rest
- Streak at risk
- Comeback available

## Example Messages

- You are building momentum. Complete one more task to enter rhythm.
- Your streak is protected today. Rest counts too.
- Comeback available: complete any daily task today to recover your rhythm.
- Great return. Your momentum is rising again.

## Initial Implementation Plan

1. Keep total XP unchanged.
2. Add a momentum calculation from recent task completions.
3. Reduce reliance on streak multiplier.
4. Add streak state: active, at_risk, protected, recovering.
5. Update the home header to show Momentum alongside Level and Streak.
6. Tune numbers after testing with real usage.
