-- ============================================================================
-- Skills v3 — full 39-skill catalog with verified real-world benchmarks.
--
-- Adds:
--   - skill.population_stat          punchy 1-line stat shown on the medal
--                                    (e.g. "Only 0.05% of US adults finish a
--                                    marathon — RunRepeat 2025")
--
-- Wipes the existing catalog (4 skills: pushups/running/meditate/reading) and
-- their tiers and any logs against them — sandbox stage, user authorized
-- ("pode apagar tudo tb e fazer do 0"). Custom user-owned skills (where
-- character_id is not null) are preserved.
--
-- Single unisex tier ladder per skill. For the 3 sex-dimorphic strength
-- skills (push-ups, pull-ups, squat) ACSM/ExRx norms differ by sex, but at
-- the master tier the gap is small relative to the gap with everyone else —
-- so we use a split-the-difference unisex scale and let the description
-- carry the population context.
--
-- Sources for descriptions and thresholds: every non-heuristic stat is
-- backed by CDC, BLS, ACSM, BEA, Pew, NielsenIQ, RunRepeat, Guinness, Newport
-- (Deep Work), Duolingo, Worklytics, Springer (J Geriatr Phys Ther), or
-- peer-reviewed studies. Heuristic thresholds are noted with `[heuristic]`.
-- ============================================================================

begin;

-- ─── 1. Schema additions ─────────────────────────────────────────────────

alter table public.skill
  add column population_stat text;

-- ─── 2. Wipe catalog skills + tiers + dependent logs ─────────────────────
-- skill.character_id is null → catalog row. Cascades to skill_tier (FK on
-- delete cascade) and skill_log (FK on delete cascade).

delete from public.skill where character_id is null;

-- ─── 3. Seed 39 catalog skills ───────────────────────────────────────────

insert into public.skill
  (id, display_name, unit, dimension_id, sub_id, icon, sort_order, character_id, description, population_stat)
values

-- ── HEALTH / SLEEP ──────────────────────────────────────────────────────
('sleep_8h_streak', '8h+ sleep streak', 'days', 'health', 'sleep', 'moon', 11, null,
 'Long sleep is when the body repairs hormones, immunity, and memory. The AASM/SRS recommendation is 7–9 hours, but most adults consistently miss the upper end. An 8-hour-floor streak is harder than the bare minimum and signals real sleep discipline.',
 '30.5% of US adults sleep <7h on a typical night (CDC NCHS, 2024).'),

('early_wake_streak', 'Consistent early-wake streak', 'days', 'health', 'sleep', 'sunny', 12, null,
 'Consistent wake time is the strongest behavioral lever for the circadian rhythm — the AASM ranks it above bedtime for sleep regularity. Most adults'' wake times drift ≥1 hour between weekdays and weekends ("social jet lag"), which is associated with worse metabolic and mood outcomes. [heuristic thresholds]',
 'Most adults shift wake time ≥1h between weekdays and weekends (AASM).'),

('screen_free_bed_streak', 'Screen-free hour-before-bed streak', 'days', 'health', 'sleep', 'phone-portrait', 13, null,
 'Daily pre-sleep screen use is associated with 33% higher odds of poor sleep and ~48 fewer minutes of sleep per week. Beating this baseline puts you firmly in the minority — most adults reach for the phone within an hour of lights-out.',
 '58% of US adults look at screens within an hour of bedtime (JAMA Network Open, 2025).'),

-- ── HEALTH / NUTRITION ──────────────────────────────────────────────────
('no_sugar_streak', 'No-added-sugar streak', 'days', 'health', 'nutrition', 'ban', 21, null,
 'The average US adult consumes ~17 teaspoons (71g) of added sugar daily — far above the AHA''s 6–9 tsp recommendation. Going zero-added-sugar even for one day is harder than it sounds; multi-week streaks are exceptional.',
 '~3 in 5 Americans exceed the AHA added-sugar limit (CDC, AHA).'),

('home_cooked_week', 'Home-cooked meals per week', 'meals/wk', 'health', 'nutrition', 'restaurant', 22, null,
 'Cooking at home is the single biggest behavioral lever for diet quality and food spending. Post-COVID US data shows a historic low of ~8 home meals per week. Hitting 14+ (basically all meals) is uncommon outside strict eaters and family kitchens.',
 'US adults eat ~8 home-cooked meals/week — a historic low (HelloFresh / Circana, 2025).'),

('hydration_streak', 'Hydration ≥2L streak', 'days', 'health', 'nutrition', 'water', 23, null,
 'Most adults drink ~1.2L of plain water per day — well under the 2L target most nutritionists set. Hitting 2L+ from drinks alone, day after day, is meaningful adherence. [heuristic streak length]',
 'CDC: men avg 3.46L total water, women 2.75L — but plain-water alone is ~1.2L/day.'),

-- ── STRENGTH / MOVEMENT ─────────────────────────────────────────────────
('pushups', 'Push-ups (single set)', 'reps', 'strength', 'movement', 'fitness', 31, null,
 'ACSM uses push-ups as the standard upper-body endurance test. Norms vary by sex: men 20–29 average 17–29 reps ("excellent" 35+); women 20–29 average 15–20. Most untrained adults can''t hit 20 strict push-ups in one set. Tier ladder is unisex — calibrate against the population stat.',
 'US Marines need 75 in 2 min for a perfect score (ages 17–25).'),

('pullups', 'Pull-ups (strict, single set)', 'reps', 'strength', 'movement', 'barbell', 32, null,
 'The most strength-revealing bodyweight movement. Untrained men do 1–3; "fit" men 8–15. Many sedentary adults can''t do one. The Marine Corps requires 20 strict pull-ups for a perfect PFT score (17–25 age band). Tier ladder is unisex.',
 'Most untrained men do 1–3 pull-ups; many sedentary adults can''t do one (USMC PFT data).'),

('squat_bw_ratio', 'Squat ratio (×bodyweight)', '×BW (×100)', 'strength', 'movement', 'body', 33, null,
 'Stored as ratio × 100 (so 1.5×BW logs as 150). ExRx ratios for trained men: untrained 0.75×BW, intermediate 1.5×, elite 2.5×. Most non-lifters can''t squat their own bodyweight. Tier ladder is unisex.',
 'A bodyweight squat (1.0×BW) already beats untrained-male standards (ExRx).'),

('plank_hold', 'Plank hold', 'sec', 'strength', 'movement', 'time', 34, null,
 'WKU norms (college-age): median male 110s, median female 95s; 75th percentile males 135s. McGill (the spine biomechanics researcher) argues anything beyond ~2 minutes has diminishing returns. The Guinness record exceeds 9 hours.',
 'Most college-age adults plank ~95–110 sec at the median (WKU IJES study).'),

('running_max', 'Longest run (single session)', 'km', 'strength', 'movement', 'walk', 35, null,
 'Roughly 15% of Americans run a 5K in any given year, but only ~0.05% of the US population finishes a marathon. Half-marathon (21.1km) is the most common milestone for committed amateur runners.',
 'Only ~0.05% of the US population finishes a marathon (RunRepeat, 2025).'),

-- ── STRENGTH / DEXTERITY ────────────────────────────────────────────────
('jump_rope_max', 'Jump rope (consecutive skips)', 'skips', 'strength', 'dexterity', 'pulse', 41, null,
 'Beginners are typically taught to aim for 100–120 consecutive skips at 60–100 rpm. Boxers commonly chain 500–1000+. Guinness records exceed 7 hours of continuous skipping. [heuristic intermediate thresholds]',
 'Coaching norms: 100+ skips = past beginner; boxers chain 500–1000+ (Crossrope/Elite Jumps).'),

('typing_wpm', 'Touch-typing speed', 'WPM', 'strength', 'dexterity', 'keypad', 42, null,
 'The average adult types ~40 WPM; 60+ WPM puts you in the top 25%. Court reporters and elite typists hit 100+. The world record (Barbara Blackburn, sustained) is 216 WPM.',
 'Average adult: 40 WPM. Top 25% type 60+ WPM (Wikipedia / typing benchmarks).'),

('balance_eyes_closed', 'Single-leg balance, eyes closed', 'sec', 'strength', 'dexterity', 'walk', 43, null,
 'Springer et al. (2007, J Geriatr Phys Ther) tested 549 adults: young adults 18–39 averaged ~15 sec eyes-closed balance. The widely-cited "30 sec for healthy adults" standard is NOT actually empirically supported.',
 '18–39 yo average ~15 sec eyes-closed (Springer et al., 2007).'),

('juggling_3ball', 'Juggling (3-ball cascade)', 'catches', 'strength', 'dexterity', 'sparkles', 44, null,
 'Most beginners need 1–4 weeks of practice to chain 50+ catches. Holding a 3-ball pattern for several minutes requires real reliability under fatigue. The Guinness record is 2,292 consecutive catches (Micah Wright, 2023).',
 'Guinness 3-ball record: 2,292 consecutive catches (Micah Wright, 2023).'),

-- ── MIND / LEARN ────────────────────────────────────────────────────────
('reading_pages', 'Pages in one sitting', 'pgs', 'mind', 'learn', 'book', 51, null,
 'US adults read ~7 minutes/day on average; mean books per year is ~14, median 5 (Pew). At 250 wpm, average daily reading = 6–9 pages. A single sitting of 50+ pages (≈2h focused) is well past population behavior.',
 'Median US adult reads 5 books/year; average daily reading ~7 min (Pew, BLS).'),

('deep_work_session', 'Deep work session', 'min', 'mind', 'learn', 'eye', 52, null,
 'Newport''s Deep Work sets the realistic upper bound at ~4 hours/day of true deep work; most knowledge workers achieve close to zero. Worklytics 2025: remote workers average ~22.75h/week of focused work — meaning median sessions are well under an hour.',
 'Remote workers average 22.75h focused work/week; in-office 18.6h (Worklytics, 2025).'),

('reading_streak', 'Daily reading streak', 'days', 'mind', 'learn', 'flame', 53, null,
 'Reading is the activity with the most lopsided distribution in the BLS time-use survey — many adults log 0 minutes for the diary day. Daily reading even for a week puts you in a small subset. [heuristic streak lengths, calibrated to Duolingo''s validated 7/30/100/365 ladder]',
 'Reading time is bimodal: many US adults log 0 min on a given day (BLS ATUS).'),

-- ── MIND / CONTEMPLATE ──────────────────────────────────────────────────
('meditate_max', 'Longest single meditation', 'min', 'mind', 'contemplate', 'leaf', 61, null,
 'Per CDC NHIS, 18.3% of US adults meditated in 2022 (up from 4.1% in 2012). A longitudinal study found practitioners average ~28 min/day. MBSR clinical protocols use 40–45 min sessions.',
 '18.3% of US adults meditate (CDC NHIS, 2022) — up from 4.1% in 2012.'),

('meditate_streak', 'Meditation daily streak', 'days', 'mind', 'contemplate', 'infinite', 62, null,
 'Research on meditation consistency shows frequency has 2.5× the predictive power of session length for outcomes. But sustaining a daily practice past a few weeks is rare — most app users abandon early. [Duolingo-validated ladder]',
 'Meditation frequency predicts outcomes 2.5× more than session length (longitudinal study).'),

('journal_entries_month', 'Journal entries per month', 'entries/mo', 'mind', 'contemplate', 'create', 63, null,
 'Per YouGov (2022, n=5,735): only 11% of US adults journal "very often"; 47% never do. Journaling 4+ times per month already places you in the active-journaler minority.',
 '47% of US adults never journal; only 11% do it "very often" (YouGov, 2022).'),

-- ── WEALTH / MONEY ──────────────────────────────────────────────────────
('emergency_fund', 'Emergency fund (months covered)', 'months', 'wealth', 'money', 'shield', 71, null,
 'Per Bankrate (2026) and the Federal Reserve SHED 2024: only 46% of Americans have ≥3 months of expenses saved, and 24% have nothing for emergencies. Experts (CFPB, NerdWallet, Fed) recommend 3–6 months.',
 'Only 46% of Americans have 3+ months of emergency savings (Bankrate, 2026).'),

('savings_rate_streak', 'Months saving ≥20% of income', 'months', 'wealth', 'money', 'trending-up', 72, null,
 'US personal savings rate is ~3.6% (BEA, March 2025). A 20% personal savings rate is ~5× the national average and aligns with the classic FIRE / "Wealthy Barber" benchmark.',
 'US personal savings rate: 3.6% (BEA, 2025) — 20% is roughly 5× the national average.'),

('investment_diversity', 'Investment diversity', 'asset classes', 'wealth', 'money', 'pie-chart', 73, null,
 'HSBC''s Affluent Investor Snapshot 2024: affluent investors hold ~4 asset classes on average. Analysis of the Fed''s Survey of Consumer Finances puts general US household investors at ~2 asset classes. Holding 5+ across stocks, bonds, real estate, cash, alts and crypto is uncommon.',
 'Affluent investors hold ~4 asset classes; general households ~2 (HSBC / SCF).'),

-- ── WEALTH / CAREER ─────────────────────────────────────────────────────
('side_projects_shipped', 'Side projects shipped (lifetime)', 'projects', 'wealth', 'career', 'rocket', 81, null,
 'Most developers dabble in side projects but few ship multiple. A 9-year HN dataset (700+ projects) shows the typical creator who reaches paying customers ships in 6–8 weeks per project — most never reach that point. [heuristic — no clean census exists]',
 'Most developers ship 0–1 public side projects in their career.'),

('talks_given', 'Talks/presentations given (lifetime)', 'talks', 'wealth', 'career', 'mic', 82, null,
 '~75% of adults report fear of public speaking (~25% extreme). Even a single voluntary presentation puts you ahead of the majority. Senior industry speakers tend to give 5–20+ talks/year.',
 '~75% of adults fear public speaking; a single voluntary talk beats the majority.'),

('focus_hours_week', 'Focused work hours per week', 'h/wk', 'wealth', 'career', 'flash', 83, null,
 'Worklytics 2025: remote workers average 22.75h/week of focused work; in-office 18.6h. Newport caps realistic deep work at ~4h/day = 20h/week. Beating 25h/week of focused work is rare.',
 'Newport''s realistic deep-work cap: ~4h/day = 20h/week (Deep Work, 2016).'),

-- ── BONDS / CIRCLE ──────────────────────────────────────────────────────
('family_calls_month', 'Calls/video chats with family per month', 'calls', 'bonds', 'circle', 'call', 91, null,
 'Per Pew (2024): 61% of young adults text a parent at least a few times per week, but only ~46% talk or video-chat that often (14% daily). Voice/video contact is a stronger relational marker than text — and less common.',
 '61% of young adults text family weekly+; only 46% call or video chat that often (Pew, 2024).'),

('friends_in_person_week', 'Friends seen in person per week', 'people', 'bonds', 'circle', 'people', 92, null,
 'Cigna 2025 Loneliness Index: 57% of Americans report being lonely; only ~50% report meaningful daily in-person social interaction. Seeing 2+ different friends in person in a week is above the median.',
 '57% of Americans report being lonely (Cigna Loneliness Index, 2025).'),

('dinners_hosted_year', 'Dinners hosted per year', 'dinners', 'bonds', 'circle', 'restaurant', 93, null,
 'NielsenIQ found 25% of people globally entertain at home weekly+, 34% monthly. Post-pandemic US data: only 17% of Americans host dinner parties regularly despite 55% wanting to. Hosting monthly already puts you above population behavior.',
 'Only 17% of Americans regularly host dinners — though 55% want to (post-COVID surveys).'),

-- ── BONDS / ROMANCE ─────────────────────────────────────────────────────
('date_nights_month', 'Date nights per month', 'dates', 'bonds', 'romance', 'wine', 101, null,
 'Per the National Marriage Project (2023): 52% of married couples never or rarely go on dates; only 11% go weekly, 30% monthly. Couples who go on monthly date nights are the least likely to split up.',
 '52% of married couples never/rarely date; weekly daters are the least likely to split (Wilcox & Dew, 2023).'),

('phone_free_couple_day', 'Phone-free time together per day', 'min/day', 'bonds', 'romance', 'heart', 102, null,
 'Gottman''s "Magic 5 Hours" guidance: ~5 hours/week of intentional connection ≈ 45 min/day. Vanderbilt 2024: participants spent ~25% of their partner-time on phones, correlating with lower relationship satisfaction.',
 'Couples spend ~25% of partner-time on phones — predicts lower satisfaction (PMC, 2024).'),

('appreciation_streak', 'Daily appreciation message streak', 'days', 'bonds', 'romance', 'mail', 103, null,
 'Gratitude research (Algoe, Gottman, Emmons) shows expressing appreciation is among the strongest predictors of relationship satisfaction. [no hard data on streak distributions — heuristic ladder]',
 'Gratitude expression is among the strongest predictors of relationship satisfaction.'),

-- ── CRAFT / PLAY ────────────────────────────────────────────────────────
('hobby_session_max', 'Longest uninterrupted hobby session', 'min', 'craft', 'play', 'game-controller', 111, null,
 'BLS American Time Use Survey 2024: US adults spend 5.5h/day (men) or 4.7h/day (women) on leisure — but the bulk is TV. A truly uninterrupted hobby block of 90+ minutes (no phone, no context-switch) is uncommon. Newport caps human focus at ~4h.',
 'BLS ATUS: most leisure time is TV — uninterrupted hobby blocks are rare.'),

('distinct_hobbies_year', 'Distinct hobbies tried per year', 'hobbies', 'craft', 'play', 'extension-puzzle', 112, null,
 'Per AYTM 2024: 67% of US adults have multiple hobbies, 18% have one, 15% have none. Trying 3+ genuinely new hobbies in a year (not just dabbling at the same one) is uncommon. [heuristic]',
 '67% of US adults have multiple hobbies; 15% have none (AYTM, 2024).'),

('practice_streak', 'Practice streak (any chosen skill)', 'days', 'craft', 'play', 'flame', 113, null,
 'Cleanest streak benchmark available is Duolingo: just over half of daily learners maintain a 7+ day streak; 9M+ users have year-plus streaks. A 7-day streak makes a learner 3.6× more likely to complete a course.',
 '7+ day streak makes Duolingo learners 3.6× more likely to finish (Duolingo blog).'),

-- ── CRAFT / BUILD ───────────────────────────────────────────────────────
('pieces_published_year', 'Pieces published per year', 'pieces', 'craft', 'build', 'create', 121, null,
 'Industry blogging stats: 44% of bloggers publish 3–6 posts/month (~36–72/yr); 22% publish weekly. The average post takes ~4h and ~1416 words. Publishing 24+/yr places creators in the upper tier of consistent output.',
 '44% of bloggers publish 3–6 posts/month; 22% publish weekly (Best Writing, 2026).'),

('build_streak', 'Build streak (consecutive build days)', 'days', 'craft', 'build', 'hammer', 122, null,
 'GitHub Octoverse 2025: ~1B commits/year across 150–160k median monthly contributors — but the distribution is long-tailed, so the typical individual goes weeks without a public commit. A 100-day build streak is rare even among professional developers.',
 '~1B GitHub commits/year, but the per-developer distribution is heavily long-tailed.'),

('portfolio_items_lifetime', 'Portfolio items / OSS contributions (lifetime)', 'items', 'craft', 'build', 'albums', 123, null,
 'GitHub has ~150M+ developers globally; the vast majority have 0 public OSS contributions, with counts following a power law. Hitting 100+ lifetime merged PRs or completed portfolio pieces puts a creator in a meaningful top slice. [heuristic]',
 '~150M GitHub devs, but contribution counts follow a power law — most have 0 public OSS.');

-- ─── 4. Seed skill_tier rows (5 per skill, unisex) ──────────────────────

insert into public.skill_tier
  (id, skill_id, tier_name, threshold, sort_order, percentile, description)
values

-- ── HEALTH / SLEEP ──────────────────────────────────────────────────────
('sleep_8h_streak_beginner', 'sleep_8h_streak', 'beginner', 0,  1, null, 'Get started.'),
('sleep_8h_streak_bronze',   'sleep_8h_streak', 'bronze',   3,  2, 70,   'A short clean stretch.'),
('sleep_8h_streak_silver',   'sleep_8h_streak', 'silver',   7,  3, 40,   'A full week meeting AASM''s upper-end recommendation.'),
('sleep_8h_streak_gold',     'sleep_8h_streak', 'gold',     21, 4, 15,   'Past the popular habit-formation threshold.'),
('sleep_8h_streak_master',   'sleep_8h_streak', 'master',   60, 5, 3,    'Sustained behavior change — body is recalibrated.'),

('early_wake_streak_beginner', 'early_wake_streak', 'beginner', 0,  1, null, 'Set your wake window.'),
('early_wake_streak_bronze',   'early_wake_streak', 'bronze',   5,  2, null, 'Beat the weekday-weekend drift for one work week.'),
('early_wake_streak_silver',   'early_wake_streak', 'silver',   14, 3, null, 'Past the typical circadian adjustment window.'),
('early_wake_streak_gold',     'early_wake_streak', 'gold',     30, 4, null, 'A month of locked-in wake time.'),
('early_wake_streak_master',   'early_wake_streak', 'master',   90, 5, null, 'Full circadian rebuild.'),

('screen_free_bed_streak_beginner', 'screen_free_bed_streak', 'beginner', 0,  1, null, 'Pick a bedtime cutoff.'),
('screen_free_bed_streak_bronze',   'screen_free_bed_streak', 'bronze',   3,  2, null, 'Three nights without the phone — already harder than it sounds.'),
('screen_free_bed_streak_silver',   'screen_free_bed_streak', 'silver',   10, 3, 30,   'Beats the 58% of adults who screen-scroll in bed.'),
('screen_free_bed_streak_gold',     'screen_free_bed_streak', 'gold',     30, 4, 10,   'Past the adjustment phase — sleep latency drops.'),
('screen_free_bed_streak_master',   'screen_free_bed_streak', 'master',   90, 5, 3,    'Habit fully entrenched.'),

-- ── HEALTH / NUTRITION ──────────────────────────────────────────────────
('no_sugar_streak_beginner', 'no_sugar_streak', 'beginner', 0,  1, null, 'Pick a start day.'),
('no_sugar_streak_bronze',   'no_sugar_streak', 'bronze',   3,  2, null, 'Three clean days — sugar cravings peak around now.'),
('no_sugar_streak_silver',   'no_sugar_streak', 'silver',   7,  3, null, 'A full sugar-free week. You''ve made it through the worst.'),
('no_sugar_streak_gold',     'no_sugar_streak', 'gold',     21, 4, null, 'Past the cravings-rebound — taste preferences shift.'),
('no_sugar_streak_master',   'no_sugar_streak', 'master',   60, 5, null, 'Re-baselined palate. Sweet things now taste sweet.'),

('home_cooked_week_beginner', 'home_cooked_week', 'beginner', 0,  1, null, 'Cook one meal at home.'),
('home_cooked_week_bronze',   'home_cooked_week', 'bronze',   3,  2, 75,   'A few home meals — beginning to build a habit.'),
('home_cooked_week_silver',   'home_cooked_week', 'silver',   7,  3, 50,   'About one home meal/day — at the population average.'),
('home_cooked_week_gold',     'home_cooked_week', 'gold',     14, 4, 15,   'Lunches and dinners cooked at home — uncommon for working adults.'),
('home_cooked_week_master',   'home_cooked_week', 'master',   21, 5, 5,    'Nearly every meal home-cooked.'),

('hydration_streak_beginner', 'hydration_streak', 'beginner', 0,  1, null, 'Track one day.'),
('hydration_streak_bronze',   'hydration_streak', 'bronze',   3,  2, null, 'Three days of consistent hydration.'),
('hydration_streak_silver',   'hydration_streak', 'silver',   7,  3, null, 'A full hydrated week.'),
('hydration_streak_gold',     'hydration_streak', 'gold',     30, 4, null, 'Habit takes hold.'),
('hydration_streak_master',   'hydration_streak', 'master',   90, 5, null, 'Hydration is automatic.'),

-- ── STRENGTH / MOVEMENT ─────────────────────────────────────────────────
-- Push-ups: split-the-difference between male (10/25/45/75) and female (5/15/30/50)
('pushups_beginner', 'pushups', 'beginner', 0,  1, null, 'Drop and start.'),
('pushups_bronze',   'pushups', 'bronze',   8,  2, 75,   'Past the untrained floor.'),
('pushups_silver',   'pushups', 'silver',   20, 3, 40,   'Around ACSM "average" 20–29.'),
('pushups_gold',     'pushups', 'gold',     40, 4, 10,   'Top decile — ACSM "excellent".'),
('pushups_master',   'pushups', 'master',   65, 5, 1,    'Approaching USMC perfect-score territory.'),

-- Pull-ups: split between male (3/8/15/25) and female (1/3/8/15)
('pullups_beginner', 'pullups', 'beginner', 0,  1, null, 'Even one strict rep is the goal.'),
('pullups_bronze',   'pullups', 'bronze',   2,  2, 75,   'Past the can''t-do-one phase.'),
('pullups_silver',   'pullups', 'silver',   5,  3, 40,   'Solid upper-body strength.'),
('pullups_gold',     'pullups', 'gold',     12, 4, 8,    'Strong calisthenics tier.'),
('pullups_master',   'pullups', 'master',   20, 5, 1,    'Marines'' perfect PFT score.'),

-- Squat ratio (×100): split between male (100/150/200/250) and female (75/100/150/200)
('squat_bw_ratio_beginner', 'squat_bw_ratio', 'beginner', 0,   1, null, 'Learn the pattern with bodyweight.'),
('squat_bw_ratio_bronze',   'squat_bw_ratio', 'bronze',   90,  2, 75,   'Approaching a full bodyweight squat.'),
('squat_bw_ratio_silver',   'squat_bw_ratio', 'silver',   125, 3, 40,   'Intermediate strength.'),
('squat_bw_ratio_gold',     'squat_bw_ratio', 'gold',     175, 4, 10,   'Advanced lifter.'),
('squat_bw_ratio_master',   'squat_bw_ratio', 'master',   225, 5, 1,    'Elite — north of 2× bodyweight.'),

('plank_hold_beginner', 'plank_hold', 'beginner', 0,   1, null, 'Hold the position — any duration counts.'),
('plank_hold_bronze',   'plank_hold', 'bronze',   30,  2, 75,   'Half a minute — most adults can manage.'),
('plank_hold_silver',   'plank_hold', 'silver',   60,  3, 50,   'The common gym goal — at the population median.'),
('plank_hold_gold',     'plank_hold', 'gold',     120, 4, 25,   'Top quartile (WKU norms).'),
('plank_hold_master',   'plank_hold', 'master',   300, 5, 2,    'Five minutes — elite without going Guinness-tier.'),

('running_max_beginner', 'running_max', 'beginner', 0,   1, null, 'Lace up.'),
('running_max_bronze',   'running_max', 'bronze',   5,   2, 85,   '5K — the population-accessible benchmark.'),
('running_max_silver',   'running_max', 'silver',   10,  3, 50,   '10K — serious recreational territory.'),
('running_max_gold',     'running_max', 'gold',     21,  4, 5,    'Half-marathon — top decile of casual runners.'),
('running_max_master',   'running_max', 'master',   42,  5, 1,    'Marathon — only ~0.05% of the US population.'),

-- ── STRENGTH / DEXTERITY ────────────────────────────────────────────────
('jump_rope_max_beginner', 'jump_rope_max', 'beginner', 0,    1, null, 'Pick up the rope.'),
('jump_rope_max_bronze',   'jump_rope_max', 'bronze',   50,   2, null, 'A clean run — past the trip-and-restart phase.'),
('jump_rope_max_silver',   'jump_rope_max', 'silver',   200,  3, null, 'Past the beginner threshold.'),
('jump_rope_max_gold',     'jump_rope_max', 'gold',     500,  4, null, 'Boxer-tier endurance.'),
('jump_rope_max_master',   'jump_rope_max', 'master',   1500, 5, null, 'Serious athlete territory.'),

('typing_wpm_beginner', 'typing_wpm', 'beginner', 0,   1, null, 'Hunt-and-peck → touch.'),
('typing_wpm_bronze',   'typing_wpm', 'bronze',   30,  2, null, 'Functional touch-typing.'),
('typing_wpm_silver',   'typing_wpm', 'silver',   50,  3, 50,   'Above the population average of ~40 WPM.'),
('typing_wpm_gold',     'typing_wpm', 'gold',     80,  4, 10,   'Top decile.'),
('typing_wpm_master',   'typing_wpm', 'master',   120, 5, 1,    'Court-reporter territory.'),

('balance_eyes_closed_beginner', 'balance_eyes_closed', 'beginner', 0,  1, null, 'Eyes closed — find your foot.'),
('balance_eyes_closed_bronze',   'balance_eyes_closed', 'bronze',   10, 2, 50,   'Around the 18–39 yo population average.'),
('balance_eyes_closed_silver',   'balance_eyes_closed', 'silver',   20, 3, 25,   'Above-average vestibular control.'),
('balance_eyes_closed_gold',     'balance_eyes_closed', 'gold',     45, 4, 5,    '3× population average — exceptional.'),
('balance_eyes_closed_master',   'balance_eyes_closed', 'master',   90, 5, 1,    'Elite proprioception.'),

('juggling_3ball_beginner', 'juggling_3ball', 'beginner', 0,    1, null, 'Master the 3-ball cascade pattern.'),
('juggling_3ball_bronze',   'juggling_3ball', 'bronze',   30,   2, null, 'Past the trip-up phase.'),
('juggling_3ball_silver',   'juggling_3ball', 'silver',   100,  3, null, 'Reliable cascade.'),
('juggling_3ball_gold',     'juggling_3ball', 'gold',     500,  4, null, 'Performable in front of an audience.'),
('juggling_3ball_master',   'juggling_3ball', 'master',   2000, 5, null, 'Near the Guinness world record floor.'),

-- ── MIND / LEARN ────────────────────────────────────────────────────────
('reading_pages_beginner', 'reading_pages', 'beginner', 0,   1, null, 'Open a book.'),
('reading_pages_bronze',   'reading_pages', 'bronze',   20,  2, 60,   '~30 min of focused reading.'),
('reading_pages_silver',   'reading_pages', 'silver',   50,  3, 25,   '~90 min single sitting.'),
('reading_pages_gold',     'reading_pages', 'gold',     100, 4, 5,    'A deep half-day session.'),
('reading_pages_master',   'reading_pages', 'master',   200, 5, 1,    'A short novel in a single sitting.'),

('deep_work_session_beginner', 'deep_work_session', 'beginner', 0,   1, null, 'Set a timer.'),
('deep_work_session_bronze',   'deep_work_session', 'bronze',   30,  2, 60,   'Past distraction switching.'),
('deep_work_session_silver',   'deep_work_session', 'silver',   60,  3, 30,   'A full Pomodoro stack.'),
('deep_work_session_gold',     'deep_work_session', 'gold',     120, 4, 10,   'A serious deep-work block.'),
('deep_work_session_master',   'deep_work_session', 'master',   240, 5, 1,    'Hits Newport''s realistic upper bound.'),

('reading_streak_beginner', 'reading_streak', 'beginner', 0,   1, null, 'Read today.'),
('reading_streak_bronze',   'reading_streak', 'bronze',   7,   2, null, 'A week of daily reading.'),
('reading_streak_silver',   'reading_streak', 'silver',   30,  3, null, 'A month — entrenched.'),
('reading_streak_gold',     'reading_streak', 'gold',     100, 4, null, 'Triple-digit days.'),
('reading_streak_master',   'reading_streak', 'master',   365, 5, null, 'A full year of daily reading.'),

-- ── MIND / CONTEMPLATE ──────────────────────────────────────────────────
('meditate_max_beginner', 'meditate_max', 'beginner', 0,  1, null, 'Sit and breathe.'),
('meditate_max_bronze',   'meditate_max', 'bronze',   10, 2, 50,   'A standard short sit.'),
('meditate_max_silver',   'meditate_max', 'silver',   20, 3, 25,   'The dose used in most meditation studies.'),
('meditate_max_gold',     'meditate_max', 'gold',     45, 4, 5,    'MBSR clinical-protocol length.'),
('meditate_max_master',   'meditate_max', 'master',   90, 5, 1,    'Retreat-level sit.'),

('meditate_streak_beginner', 'meditate_streak', 'beginner', 0,   1, null, 'Sit today.'),
('meditate_streak_bronze',   'meditate_streak', 'bronze',   7,   2, null, 'A week of daily practice.'),
('meditate_streak_silver',   'meditate_streak', 'silver',   30,  3, null, 'Headspace stickiness threshold.'),
('meditate_streak_gold',     'meditate_streak', 'gold',     100, 4, null, 'A real habit.'),
('meditate_streak_master',   'meditate_streak', 'master',   365, 5, null, 'Year-long monk-tier consistency.'),

('journal_entries_month_beginner', 'journal_entries_month', 'beginner', 0,  1, null, 'Open the page.'),
('journal_entries_month_bronze',   'journal_entries_month', 'bronze',   4,  2, 50,   'About once a week.'),
('journal_entries_month_silver',   'journal_entries_month', 'silver',   12, 3, 25,   'Active-journaler minority — ~3×/week.'),
('journal_entries_month_gold',     'journal_entries_month', 'gold',     25, 4, 5,    'Almost daily.'),
('journal_entries_month_master',   'journal_entries_month', 'master',   30, 5, 1,    'Daily without exception.'),

-- ── WEALTH / MONEY ──────────────────────────────────────────────────────
('emergency_fund_beginner', 'emergency_fund', 'beginner', 0,  1, null, 'Open a savings account.'),
('emergency_fund_bronze',   'emergency_fund', 'bronze',   1,  2, 60,   'A month of breathing room.'),
('emergency_fund_silver',   'emergency_fund', 'silver',   3,  3, 50,   'The Fed/CFPB recommended floor.'),
('emergency_fund_gold',     'emergency_fund', 'gold',     6,  4, 25,   'The recommended ceiling — true cushion.'),
('emergency_fund_master',   'emergency_fund', 'master',   12, 5, 5,    'Exceptional security — FIRE-tier.'),

('savings_rate_streak_beginner', 'savings_rate_streak', 'beginner', 0,  1, null, 'One month at 20% saved.'),
('savings_rate_streak_bronze',   'savings_rate_streak', 'bronze',   3,  2, null, 'A consistent quarter.'),
('savings_rate_streak_silver',   'savings_rate_streak', 'silver',   12, 3, null, 'A full year of discipline.'),
('savings_rate_streak_gold',     'savings_rate_streak', 'gold',     36, 4, null, 'Three years — serious wealth-building.'),
('savings_rate_streak_master',   'savings_rate_streak', 'master',   60, 5, null, 'Five years — on track for early retirement.'),

('investment_diversity_beginner', 'investment_diversity', 'beginner', 0, 1, null, 'Pick one asset class.'),
('investment_diversity_bronze',   'investment_diversity', 'bronze',   2, 2, 60,   'Around the household average.'),
('investment_diversity_silver',   'investment_diversity', 'silver',   3, 3, 35,   'Approaching the affluent-investor average.'),
('investment_diversity_gold',     'investment_diversity', 'gold',     5, 4, 10,   'Textbook diversified.'),
('investment_diversity_master',   'investment_diversity', 'master',   7, 5, 2,    'Sophisticated allocation across alts and foreign.'),

-- ── WEALTH / CAREER ─────────────────────────────────────────────────────
('side_projects_shipped_beginner', 'side_projects_shipped', 'beginner', 0,  1, null, 'Start one thing.'),
('side_projects_shipped_bronze',   'side_projects_shipped', 'bronze',   1,  2, null, 'Past the "I''ll ship something soon" trap.'),
('side_projects_shipped_silver',   'side_projects_shipped', 'silver',   3,  3, null, 'A pattern emerging.'),
('side_projects_shipped_gold',     'side_projects_shipped', 'gold',     10, 4, null, 'Indie-hacker territory.'),
('side_projects_shipped_master',   'side_projects_shipped', 'master',   25, 5, null, 'Builder-as-identity.'),

('talks_given_beginner', 'talks_given', 'beginner', 0,   1, null, 'Volunteer to speak.'),
('talks_given_bronze',   'talks_given', 'bronze',   1,   2, 75,   'Past the glossophobia barrier — beats 75% of adults.'),
('talks_given_silver',   'talks_given', 'silver',   5,   3, 25,   'Comfortable on stage.'),
('talks_given_gold',     'talks_given', 'gold',     25,  4, 5,    'Regular speaker.'),
('talks_given_master',   'talks_given', 'master',   100, 5, 1,    'Career-as-speaker tier.'),

('focus_hours_week_beginner', 'focus_hours_week', 'beginner', 0,  1, null, 'Track focus minutes.'),
('focus_hours_week_bronze',   'focus_hours_week', 'bronze',   10, 2, null, 'Building the muscle.'),
('focus_hours_week_silver',   'focus_hours_week', 'silver',   20, 3, 50,   'Hits Newport''s realistic ceiling.'),
('focus_hours_week_gold',     'focus_hours_week', 'gold',     30, 4, 10,   'Exceptional discipline / autonomy.'),
('focus_hours_week_master',   'focus_hours_week', 'master',   40, 5, 1,    'Monk-mode.'),

-- ── BONDS / CIRCLE ──────────────────────────────────────────────────────
('family_calls_month_beginner', 'family_calls_month', 'beginner', 0,  1, null, 'Pick up the phone.'),
('family_calls_month_bronze',   'family_calls_month', 'bronze',   2,  2, null, 'Bi-weekly cadence.'),
('family_calls_month_silver',   'family_calls_month', 'silver',   4,  3, null, 'Weekly — Pew''s "frequent" band.'),
('family_calls_month_gold',     'family_calls_month', 'gold',     8,  4, null, 'Multiple family members weekly.'),
('family_calls_month_master',   'family_calls_month', 'master',   16, 5, null, 'Near-daily voice/video contact.'),

('friends_in_person_week_beginner', 'friends_in_person_week', 'beginner', 0, 1, null, 'Make a plan.'),
('friends_in_person_week_bronze',   'friends_in_person_week', 'bronze',   1, 2, null, 'Above the lonely-American baseline.'),
('friends_in_person_week_silver',   'friends_in_person_week', 'silver',   2, 3, null, 'Above the population median.'),
('friends_in_person_week_gold',     'friends_in_person_week', 'gold',     4, 4, null, 'Thriving social life.'),
('friends_in_person_week_master',   'friends_in_person_week', 'master',   7, 5, null, 'Exceptionally connected.'),

('dinners_hosted_year_beginner', 'dinners_hosted_year', 'beginner', 0,  1, null, 'Send the first invite.'),
('dinners_hosted_year_bronze',   'dinners_hosted_year', 'bronze',   4,  2, null, 'Quarterly — most people.'),
('dinners_hosted_year_silver',   'dinners_hosted_year', 'silver',   12, 3, null, 'Monthly host — beats the 17% baseline.'),
('dinners_hosted_year_gold',     'dinners_hosted_year', 'gold',     24, 4, null, 'Bi-weekly host.'),
('dinners_hosted_year_master',   'dinners_hosted_year', 'master',   52, 5, null, 'Weekly — the neighborhood anchor.'),

-- ── BONDS / ROMANCE ─────────────────────────────────────────────────────
('date_nights_month_beginner', 'date_nights_month', 'beginner', 0, 1, null, 'Plan one.'),
('date_nights_month_bronze',   'date_nights_month', 'bronze',   1, 2, null, 'Beats half of married couples (Wilcox & Dew).'),
('date_nights_month_silver',   'date_nights_month', 'silver',   2, 3, null, 'Bi-weekly cadence.'),
('date_nights_month_gold',     'date_nights_month', 'gold',     4, 4, 10,   'Weekly — couples least likely to split.'),
('date_nights_month_master',   'date_nights_month', 'master',   8, 5, null, 'Exceptionally intentional partnership.'),

('phone_free_couple_day_beginner', 'phone_free_couple_day', 'beginner', 0,   1, null, 'Phones-down for a few minutes.'),
('phone_free_couple_day_bronze',   'phone_free_couple_day', 'bronze',   15,  2, null, 'A short daily "us" window.'),
('phone_free_couple_day_silver',   'phone_free_couple_day', 'silver',   30,  3, null, 'The therapist-cited "tiny daily quality time" floor.'),
('phone_free_couple_day_gold',     'phone_free_couple_day', 'gold',     60,  4, null, 'Beats Gottman''s 45-min/day benchmark.'),
('phone_free_couple_day_master',   'phone_free_couple_day', 'master',   120, 5, null, 'Unusually intentional couple.'),

('appreciation_streak_beginner', 'appreciation_streak', 'beginner', 0,   1, null, 'Send one note.'),
('appreciation_streak_bronze',   'appreciation_streak', 'bronze',   7,   2, null, 'A full week of daily appreciation.'),
('appreciation_streak_silver',   'appreciation_streak', 'silver',   30,  3, null, 'A month — felt by your partner.'),
('appreciation_streak_gold',     'appreciation_streak', 'gold',     90,  4, null, 'A quarter of intentional gratitude.'),
('appreciation_streak_master',   'appreciation_streak', 'master',   365, 5, null, 'A full year of daily appreciation.'),

-- ── CRAFT / PLAY ────────────────────────────────────────────────────────
('hobby_session_max_beginner', 'hobby_session_max', 'beginner', 0,   1, null, 'Block 15 minutes.'),
('hobby_session_max_bronze',   'hobby_session_max', 'bronze',   30,  2, null, 'A short focused block.'),
('hobby_session_max_silver',   'hobby_session_max', 'silver',   60,  3, null, 'A real hour of immersion.'),
('hobby_session_max_gold',     'hobby_session_max', 'gold',     120, 4, null, 'A serious flow session.'),
('hobby_session_max_master',   'hobby_session_max', 'master',   240, 5, null, 'Hits the human focus ceiling (Newport).'),

('distinct_hobbies_year_beginner', 'distinct_hobbies_year', 'beginner', 0, 1, null, 'Try one new thing.'),
('distinct_hobbies_year_bronze',   'distinct_hobbies_year', 'bronze',   1, 2, 85,   'Past the 15% no-hobby slice (AYTM).'),
('distinct_hobbies_year_silver',   'distinct_hobbies_year', 'silver',   2, 3, null, 'Multi-hobby — the AYTM majority.'),
('distinct_hobbies_year_gold',     'distinct_hobbies_year', 'gold',     4, 4, null, 'Genuine variety-seeker.'),
('distinct_hobbies_year_master',   'distinct_hobbies_year', 'master',   8, 5, null, 'Explorer-tier curiosity.'),

('practice_streak_beginner', 'practice_streak', 'beginner', 0,   1, null, 'Practice once.'),
('practice_streak_bronze',   'practice_streak', 'bronze',   7,   2, null, '7-day streak — 3.6× more likely to finish (Duolingo).'),
('practice_streak_silver',   'practice_streak', 'silver',   30,  3, null, 'A month — habit forming.'),
('practice_streak_gold',     'practice_streak', 'gold',     100, 4, null, 'Triple-digit days — entrenched.'),
('practice_streak_master',   'practice_streak', 'master',   365, 5, null, 'A full year of daily practice.'),

-- ── CRAFT / BUILD ───────────────────────────────────────────────────────
('pieces_published_year_beginner', 'pieces_published_year', 'beginner', 0,  1, null, 'Ship one.'),
('pieces_published_year_bronze',   'pieces_published_year', 'bronze',   4,  2, null, 'Quarterly cadence.'),
('pieces_published_year_silver',   'pieces_published_year', 'silver',   12, 3, null, 'Monthly — median consistent creator.'),
('pieces_published_year_gold',     'pieces_published_year', 'gold',     24, 4, null, 'Bi-weekly — upper tier.'),
('pieces_published_year_master',   'pieces_published_year', 'master',   52, 5, null, 'Weekly — top-tier prolific output.'),

('build_streak_beginner', 'build_streak', 'beginner', 0,   1, null, 'Make today''s commit.'),
('build_streak_bronze',   'build_streak', 'bronze',   7,   2, null, 'A week in a row.'),
('build_streak_silver',   'build_streak', 'silver',   30,  3, null, 'A month — beats most professional devs.'),
('build_streak_gold',     'build_streak', 'gold',     100, 4, null, 'Triple-digit streak — rare.'),
('build_streak_master',   'build_streak', 'master',   365, 5, null, 'Year-long contribution streak.'),

('portfolio_items_lifetime_beginner', 'portfolio_items_lifetime', 'beginner', 0,   1, null, 'Publish one.'),
('portfolio_items_lifetime_bronze',   'portfolio_items_lifetime', 'bronze',   5,   2, null, 'A real public footprint begins.'),
('portfolio_items_lifetime_silver',   'portfolio_items_lifetime', 'silver',   25,  3, null, 'Established portfolio.'),
('portfolio_items_lifetime_gold',     'portfolio_items_lifetime', 'gold',     100, 4, null, 'Prolific contributor.'),
('portfolio_items_lifetime_master',   'portfolio_items_lifetime', 'master',   500, 5, null, 'Maintainer-class output.');

commit;
