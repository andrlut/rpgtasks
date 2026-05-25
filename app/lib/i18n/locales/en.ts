/**
 * English translations.
 *
 * Keys are namespaced by feature/screen. Keep groups small and predictable —
 * if a group grows past ~30 entries, split it.
 *
 * For dynamic interpolation use `{{name}}` placeholders, e.g.
 *   greeting.morning: 'Good morning, {{name}}'
 *
 * For pluralization use the i18n-js convention:
 *   tasks.count: { one: '1 task', other: '{{count}} tasks' }
 */
const en = {
  common: {
    ok: 'OK',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    confirm: 'Confirm',
    loading: 'Loading…',
    retry: 'Retry',
    yes: 'Yes',
    no: 'No',
    error: 'Something went wrong',
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    optional: 'optional',
    skip: 'Skip',
    none: 'None',
    all: 'All',
    add: 'Add',
    remove: 'Remove',
    archive: 'Archive',
    unarchive: 'Unarchive',
    create: 'Create',
    update: 'Update',
  },

  auth: {
    brand: {
      title: 'Perceva',
      tagline: 'Perceive the path you are walking',
    },
    fields: {
      email: 'Email',
      emailPlaceholder: 'you@example.com',
      password: 'Password',
      passwordPlaceholder: 'At least 6 characters',
      newPassword: 'New password',
      confirmPassword: 'Confirm password',
    },
    login: {
      title: 'Welcome back',
      subtitle: 'Sign in to continue your journey',
      submit: 'Log in',
      failed: 'Login failed',
      forgot: 'Forgot password?',
      noAccount: "Don't have an account? ",
      signUpLink: 'Sign up',
    },
    signup: {
      title: 'Create your account',
      submit: 'Sign up',
      failed: 'Signup failed',
      almostThere: 'Almost there',
      checkEmail: 'Check your email to confirm your account, then come back and log in.',
      hasAccount: 'Already have an account? ',
      signInLink: 'Log in',
    },
    forgot: {
      title: 'Reset password',
      subtitle: "We'll send you a link to choose a new one.",
      emailNeeded: 'Email needed',
      emailNeededBody: 'Type the email you signed up with.',
      submit: 'Send reset link',
      couldNotSend: 'Could not send',
      rateLimited: 'Email service is rate-limited right now. Wait a few minutes and try again, or ask the admin.',
      emailSent: 'Email sent',
      emailSentBody: 'Check {{email}} for a link. Open it on this device — the app will pick it up and let you set a new password.',
      back: 'Back to login',
      done: 'Done',
    },
    reset: {
      title: 'Pick a new password',
      subtitle: "You arrived here via a recovery email. Set a fresh password and you're back in.",
      newLabel: 'New password',
      newPlaceholder: 'At least 6 characters',
      confirmLabel: 'Confirm',
      confirmPlaceholder: 'Type it again',
      submit: 'Update password',
      mismatch: 'Mismatch',
      mismatchBody: "Passwords don't match.",
      tooShort: 'Weak password',
      tooShortBody: 'Use at least 6 characters.',
      couldNotUpdate: 'Could not update',
      cancel: 'Cancel and sign out',
      success: 'Password updated',
      successBody: 'Welcome back.',
    },
    errors: {
      missingInfo: 'Missing info',
      missingInfoBody: 'Email and password are required.',
      weakPassword: 'Weak password',
      weakPasswordBody: 'Password must be at least 6 characters.',
      invalidCredentials: 'Invalid email or password',
      emailRequired: 'Email is required',
      passwordRequired: 'Password is required',
      generic: 'Sign-in failed. Please try again.',
    },
    signOut: 'Sign out',
  },

  onboarding: {
    brand: 'Perceva',
    skip: 'Skip',
    continue: 'Continue',
    start: 'Start your journey',
    slide1: {
      eyebrow: 'WELCOME',
      title: 'Perceive. Practice. Become.',
      body: 'The actions you take today build the person you want to become.',
    },
    slide2: {
      eyebrow: 'THE LOOP',
      title: 'Train. Earn. Redeem.',
      body: 'Complete habits to gain progress and coins. Spend coins on rewards you set yourself.',
    },
    slide3: {
      eyebrow: 'READY?',
      title: 'Your journey starts at Level 1.',
      body: 'Pick a few starter quests. We will handle the leveling.',
    },
  },

  tabs: {
    tasks: 'Tasks',
    history: 'History',
    hero: 'Me',
    rewards: 'Rewards',
    learning: 'Learn',
    settings: 'Settings',
  },

  learning: {
    eyebrow: 'LEARN',
    title: 'Reading nook',
    subtitle: 'Short, visual, tied to what you’re cultivating.',
    empty: 'No materials yet for this filter.',
    read: 'Read',
    readMin: { one: '{{count}} min read', other: '{{count}} min read' },
    type: {
      explainer: 'Explainer',
      summary: 'Summary',
      news: 'News',
    },
    readFilter: {
      all: 'All',
      unread: 'Unread',
      read: 'Read',
    },
    section: {
      new: 'New this month',
      byDim: 'By dimension',
      byType: 'By type',
    },
    filteringBy: 'Filtering: {{what}}',
    stats: {
      summary: '{{read}} of {{total}} read',
      byDim: 'By dimension',
      byType: 'By type',
      bySub: 'By sub',
    },
    detail: {
      source: 'Source',
      takeaways: 'Walk away with this',
      signs: 'On track when',
      tracking: 'How the app tracks it',
      markRead: 'Mark as read',
      markedRead: 'Read',
      alreadyRead: 'You already read this one. XP was claimed.',
      rewardPreview: '+{{xp}} XP and +{{coins}} coins for reading this.',
      markFail: 'Could not mark as read',
      notFound: 'Material not found.',
      feedbackPrompt: 'Was this useful?',
      feedbackUp: 'Helpful',
      feedbackDown: 'Not for me',
    },
  },

  /**
   * Canonical glossary of the three pillars. Use `pillar.<key>.short` for
   * tab labels and chips; `.long` when context calls for the full name;
   * `.identity` when explicitly framing under "Perceived / Practiced /
   * Desired Identity" from the V3 product doc.
   */
  pillar: {
    // ── Top-level pilares (V3 official names) ─────────────────────
    top: {
      percebida: { label: 'Perceived', long: 'Perceived Identity' },
      praticada: { label: 'Practiced', long: 'Practiced Identity' },
      desejada: { label: 'Desired', long: 'Desired Identity' },
    },
    // ── Sub-pilares within each top pillar ──────────────────────
    sub: {
      percebida: {
        avaliacao: 'Assessment',
        autoconhecimento: 'Self-knowledge',
      },
      praticada: {
        dedicacao: 'Dedication',
        momentum: 'Momentum',
      },
      desejada: {
        goals: 'Goals',
        skills: 'Skills',
      },
    },
    // ── Legacy keys (PR #136 — generic sub-pillar reference) ────
    avaliacao: {
      short: 'Assessment',
      long: 'Assessment · how I see myself',
      identity: 'Perceived Identity',
    },
    dedicacao: {
      short: 'Dedication',
      long: 'Dedication · what I practice',
      identity: 'Practiced Identity',
    },
    skills: {
      short: 'Skills',
      long: 'Skills · where I level up',
      identity: 'Desired Identity',
    },
  },

  goalsPreview: {
    eyebrow: 'COMING SOON',
    title: 'Where you’re heading',
    body: 'Goals turn identity direction into clear targets. They’ll tie into Skills and Assessment so you can see how close you are to who you want to become.',
    examples: 'Examples of what’s coming:',
    example1: 'Become someone who sleeps well',
    example2: 'Cultivate presence in relationships',
    example3: 'Build study discipline',
    locked: 'soon',
  },

  avaliacao: {
    selfAssessmentCta: 'Update self-assessment',
    questionnaireFirst: 'Take the questionnaire (5-10 min)',
    questionnaireToday: 'Retake questionnaire · done today',
    questionnaireDaysAgo: 'Retake questionnaire · {{count}}d ago',
    mirrorCta: 'Compare self vs questionnaire',
    nudgeSuffix: 'is at {{score}}/5 — tap to see recommended tasks',
  },

  autoconhecimento: {
    lead: 'Deeper inventories measuring personality, values and attachment style. Do not affect the Assessment hex.',
  },

  adoptSheet: {
    eyebrow: 'Adopt',
    body: 'How do you want to do this task in your routine?',
    templateDefault: 'System default',
    templateDefaultHint: 'recommended',
    daily: 'Daily · once a day',
    weekly3x: 'Weekly · 3x per week',
    weekly1x: 'Weekly · 1x per week',
    oneShot: 'One-shot · just once',
    customize: 'Customize',
    customizeHint: 'edit everything before creating',
  },

  reward: {
    common: {
      ok: 'OK',
      cancel: 'Cancel',
    },
    shop: {
      noCoinsHint: 'Earn some coins to unlock rewards',
      notEnoughTitle: 'Not enough coins',
      notEnoughBody: 'You need {{deficit}} more coins.',
      buyTitle: 'Buy "{{title}}"?',
      buyBody: 'Spend {{cost}} coins. It goes to your Bank — use it whenever you’re ready.',
      buyOk: 'Buy',
      buyFail: 'Could not buy',
      useTitle: 'Use "{{title}}"?',
      useBody: 'Mark this reward as redeemed. It moves to your Used list.',
      useOk: 'Use it',
      useFail: 'Could not use',
      archiveTitle: 'Archive "{{title}}"?',
      archiveBody: 'Stops showing in the Shop. Past purchases stay in your Bank/Used. You can restore it from Manage.',
      archiveOk: 'Archive',
      archiveFail: 'Could not archive',
    },
    form: {
      missingTitleTitle: 'Title required',
      missingTitleBody: 'Give your reward a title.',
      missingCostTitle: 'Cost must be at least 1',
      missingCostBody: 'Set how many coins it costs.',
      saveFailTitle: 'Save failed',
      archiveFailTitle: 'Archive failed',
      archiveConfirmTitle: 'Archive reward?',
      archiveConfirmBody: 'It will no longer appear on Rewards.',
      archiveOk: 'Archive',
    },
  },

  skill: {
    actions: {
      more: 'More options',
      delete: 'Delete skill',
      deleteConfirmTitle: 'Delete {{name}}?',
      deleteConfirmBody: 'This deletes the skill and its entire PR history. Cannot be undone.',
      cancel: 'Cancel',
    },
    form: {
      newTitle: 'New skill',
      save: 'Save',
      saving: '...',
      nameLabel: 'Name',
      namePlaceholder: 'e.g. Burpees, Sprint 100m, 5K run',
      unitLabel: 'Unit',
      unitPlaceholder: 'reps · min · km · pages · sec',
      descLabel: 'Description (optional)',
      descPlaceholder: 'What is this skill? Why does it matter?',
      subLabel: 'Area',
      iconLabel: 'Icon',
      tierLabel: 'Tier ladder',
      tierHelper: 'Thresholds must ascend. Percentile is optional (0–100, what % of adults reach this tier — leave blank if you don’t know).',
      tierThreshold: 'Threshold',
      tierTop: 'Top %',
      tierDescPlaceholder: 'What does {{tier}} look like?',
      missingNameTitle: 'Missing name',
      missingNameBody: 'Give the skill a name.',
      missingUnitTitle: 'Missing unit',
      missingUnitBody: 'Set a unit (reps, min, km, etc.).',
      badThresholdTitle: 'Bad threshold',
      badThresholdBody: 'Tier {{tier}}: enter a non-negative number.',
      tiersAscendTitle: 'Tiers must ascend',
      tiersAscendBody: '{{tier}} threshold ({{value}}) must be greater than {{prevTier}} ({{prevValue}}).',
      badPercentileTitle: 'Bad percentile',
      badPercentileBody: 'Tier {{tier}}: percentile must be 0–100 or empty.',
    },
  },

  home: {
    greeting: {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
      night: 'Late night',
    },
    defaultName: 'adventurer',
    buckets: {
      today: 'Today',
      thisWeek: 'This Week',
      thisMonth: 'This Month',
      oneTime: 'One-time',
      emptyToday: 'All clear for today.',
    },
    typeTabs: {
      daily: 'Daily',
      weekly: 'Recurring',
      oneShot: 'One-shot',
      general: 'All',
      emptyDaily: 'Nothing daily pending.',
      emptyWeekly: 'Nothing recurring pending.',
      emptyOneShot: 'Nothing one-shot pending.',
      emptyGeneral: 'No templates available.',
      generalLead: 'Mark any template here without adopting it into your routine.',
    },
    bucketTabs: {
      daily: 'Daily',
      weekly: 'Weekly',
      oneshot: 'One-shot',
      all: 'All',
      emptyDaily: 'No daily tasks pending.',
      emptyWeekly: 'No weekly tasks pending.',
      emptyOneshot: 'No one-shot tasks pending.',
      emptyAll: 'Nothing pending.',
      nextUp: 'Next up · tap to complete',
      // Legacy keys still referenced by some components — kept until those
      // surfaces migrate to the type-flavored model.
      today: 'Today',
      week: 'This week',
      recurring: 'Recurring',
      emptyToday: 'Nothing pending for today.',
      emptyWeek: 'Nothing pending this week.',
      emptyRecurring: 'No cadences set up yet.',
      recurringLead: 'Active cadences',
      oneshotLead: 'Whenever you want',
    },
    completedBucket: {
      daily: 'Done today',
      weekly: 'Done this week',
      oneshot: 'Completed',
      all: 'Done today',
      // Legacy compat
      today: 'Done today',
      week: 'Done this week',
      recurring: 'Cadences on track',
    },
    skippedBucket: {
      today: 'Skipped today',
    },
    ring: {
      toDo: { one: '{{count}} to do', other: '{{count}} to do' },
      allDone: 'All done! 🎉',
      subtitle: 'to close out the day',
    },
    quests: {
      label: 'Active quests',
      empty: 'No active quests.',
      browseCta: 'Browse quests',
      browseChip: 'Browse',
      collapse: 'Collapse quests',
      expand: 'Expand quests',
    },
    empty: {
      title: 'All clear.',
      body: 'Nothing pending right now. Add a task to get started.',
      cta: 'Manage tasks',
    },
    error: 'Something went wrong loading your data. Pull to retry.',
    manageCta: 'Manage tasks',
    actionErrors: {
      complete: 'Could not complete task',
      skip: 'Could not skip',
      undo: 'Could not undo',
      unskip: 'Could not unskip',
      unknown: 'Unknown error.',
    },
    momentum: {
      label: 'Momentum',
      recentEffort: 'Recent effort by attribute',
      tier: {
        calm: 'calm',
        building: 'building',
        strong: 'strong',
        peak: 'peak',
      },
      bonusActive: '+{{percent}}% bonus',
      // Legacy streak-style keys (deprecated; kept while any leftover
      // V2 streak surface still references them).
      days: { one: '{{count}} day', other: '{{count}} days' },
      best: 'Best: {{count}}',
      atRisk: 'At risk',
    },
    completedDrawer: {
      title: 'Completed today',
      empty: 'Complete your first task to see it here.',
      completedSummary: '{{count}} completed',
      skippedSummary: '{{count}} skipped',
      tapToToggle: ' · tap to ',
      tapHide: 'hide',
      tapView: 'view',
      skippedToday: 'Skipped today',
      undo: 'Undo',
      addExtra: '+ Extra',
      unskip: 'Unskip',
    },
    pullToRefresh: 'Pull to refresh',
    swipe: {
      complete: 'Complete',
      skip: 'Skip today',
      hint: 'Swipe right to complete · left to skip',
    },
  },

  tasks: {
    new: 'New task',
    edit: 'Edit task',
    fields: {
      title: 'Title',
      titlePlaceholder: 'What do you want to do?',
      difficulty: 'Difficulty',
      dimensions: 'Dimensions',
      dimensionsHint: 'Pick up to 3 dimensions this task grows.',
      schedule: 'Schedule',
      target: 'Target per period',
      targetHint: 'How many times per period this task counts toward your goal.',
    },
    schedule: {
      oneShot: 'One-shot',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      everyDay: 'Every day',
      weekDays: 'Selected days',
      monthDay: 'Day of month',
    },
    actions: {
      complete: 'Complete',
      skip: 'Skip today',
      unskip: 'Unskip',
      logExtra: 'Log extra',
      undo: 'Undo',
      archive: 'Archive',
      unarchive: 'Unarchive',
      delete: 'Delete',
      confirmDelete: 'Delete this task? This cannot be undone.',
      confirmHighDifficulty: 'This is a {{stars}}-star task. Mark complete?',
    },
    actionSheet: {
      adjustStars: 'Adjust stars',
      adjustStarsSub: 'Change how heavy this completion was per sub',
      skipToday: 'Skip today',
      skipTodaySub: 'Hide from today without completing — no XP, no Momentum penalty',
      editTask: 'Edit task',
      editTaskSub: 'Change title, subs, recurrence, etc',
    },
    completeSheet: {
      totalStars: 'Total stars',
      reset: 'Reset',
      log: 'Log',
    },
    subPicker: {
      pickAtLeastOne: 'Pick at least one sub',
      countSubs: { one: '{{count}} sub', other: '{{count}} subs' },
      total: 'total',
    },
    difficultyLabel: {
      1: 'Trivial',
      2: 'Easy',
      3: 'Steady',
      4: 'Hard',
      5: 'Heroic',
    },
    history: {
      title: 'History',
      empty: 'No history yet',
      tapToLog: 'Tap a past day to log a retroactive completion.',
      logFor: 'Log for {{date}}',
      removeEntry: 'Remove this entry?',
    },
  },

  tasksHub: {
    title: 'My Tasks',
    newTask: 'New task',
    filters: {
      allocated: 'Allocated',
      mine: 'Mine',
      suggested: 'Suggested',
    },
    search: {
      open: 'Search',
      close: 'Close search',
      placeholderMine: 'Search your tasks…',
      placeholderCatalog: 'Search catalog…',
    },
    buckets: {
      daily: 'Daily',
      dailyDesc: 'Routines you do every day',
      weekly: 'Weekly',
      weeklyDesc: 'Specific days or monthly cadence',
      oneTime: 'One-time',
      oneTimeDesc: 'Done once',
    },
    customChip: 'CUSTOM',
    adopt: {
      adopt: 'Adopt',
      added: 'Added',
    },
    bucketEmpty: 'No tasks in this bucket.',
    empty: {
      noMatchesTitle: 'No matches',
      noMatchesBody: 'Nothing matches "{{query}}".',
      noMatchesCatalog: 'Nothing in the catalog matches "{{query}}".',
      noTasksTitle: 'No tasks yet',
      noTasksBody: 'Add your first task or browse the Suggested tab.',
      cta: 'New task',
    },
    errors: {
      couldNotAdoptTitle: 'Could not adopt',
      unknown: 'Unknown error.',
    },
  },

  rewards: {
    title: 'Rewards',
    new: 'New reward',
    edit: 'Edit reward',
    fields: {
      title: 'Title',
      titlePlaceholder: 'What do you want to earn?',
      cost: 'Cost (coins)',
      icon: 'Icon',
      category: 'Category',
    },
    categories: {
      indulgence: 'Indulgence',
      good: 'Good',
      experience: 'Experience',
    },
    actions: {
      redeem: 'Redeem',
      confirmRedeem: 'Spend {{cost}} coins on "{{title}}"?',
      archive: 'Archive',
      unarchive: 'Unarchive',
      delete: 'Delete',
      confirmDelete: 'Delete this reward?',
    },
    insufficient: 'Not enough coins. You need {{short}} more.',
    coins: { one: '{{count}} coin', other: '{{count}} coins' },
    history: {
      title: 'History',
      emptyTitle: 'Nothing used yet',
      emptySub: 'Once you use a reward from the Bank, it shows up here.',
    },
    bank: {
      title: 'Bank',
      emptyTitle: 'Your bank is empty',
      emptySub: 'Buy a reward from the Shop. It lands here for whenever you’re ready to use it.',
    },
    vault: {
      eyebrow: 'REWARDS',
      heroTitle: 'Your harvest',
      heroEyebrow: 'YOUR HARVEST',
      heroStatusIdle: 'Keep training to unlock bigger vaults',
      heroStatusReady: '{{title}} is yours!',
      tabs: {
        shop: 'Shop',
        bank: 'Bank · {{count}}',
        used: 'History',
      },
      sections: {
        available: 'Available now',
        almost: 'Almost there',
        big: 'Big goals',
      },
      itemsCount: { one: '{{count}} item', other: '{{count}} items' },
      tracked: {
        eyebrow: 'YOUR GOAL',
        progress: '{{coins}} / {{cost}}',
        remaining: '{{deficit}} to go · {{pct}}%',
      },
      status: {
        ready: 'Ready',
        almost: 'Almost',
        goal: 'Goal',
      },
      cta: {
        buy: 'Buy',
        track: 'Track',
        use: 'Use',
      },
      remaining: '{{deficit}} to go',
      earnedTime: 'earned {{when}}',
    },
    celebration: {
      eyebrow: 'IN THE BAG',
      title: 'Bought "{{title}}"',
      titleN: 'Bought {{qty}}× "{{title}}"',
      bankLine: 'Bank: {{before}} → {{after}}',
      goToBank: 'Go to bank',
      dismiss: 'Close',
    },
    buyConfirm: {
      qtyLabel: 'Quantity',
      total: 'Total',
      confirm: 'Buy',
      cancel: 'Cancel',
      deficit: 'Short by {{deficit}} coins',
    },
    bankActionSheet: {
      use: 'Use',
      useSub: 'Mark as enjoyed and move to history',
      sell: 'Sell',
      sellSub: 'Refund the coins and remove from the bank',
    },
    sellConfirm: {
      eyebrow: 'SELL FOR REFUND',
      refundLabel: 'You get back',
      confirm: 'Sell',
      cancel: 'Cancel',
      failTitle: 'Could not sell',
    },
    useConfirm: {
      eyebrow: 'TIME TO ENJOY',
      title: 'Enjoy it now!',
      confirm: 'Enjoy',
      cancel: 'Save for later',
    },
    historyActionSheet: {
      unuse: 'Send back to bank',
      unuseSub: 'Marks it available again so you can use it later',
    },
    unuseConfirm: {
      eyebrow: 'BACK TO THE BANK',
      sub: 'The reward goes back to your bank, ready to use whenever.',
      confirm: 'Send back',
      cancel: 'Cancel',
      failTitle: 'Could not send back',
    },
    actionSheet: {
      edit: 'Edit reward',
      editSub: 'Change title, cost, icon or category',
      archive: 'Archive',
      archiveSub: 'Stops showing in the Shop. Restore anytime from Manage',
      buyQuantity: 'Buy multiple',
      buyQuantitySub: 'Pick how many to grab at once',
    },
    manage: {
      title: 'Manage rewards',
      reorderHint: 'Hold and drag to reorder',
      sectionActive: 'Active',
      sectionArchived: 'Archived',
      emptyActive: 'No active rewards. Create one from the Shop.',
      emptyArchived: 'Nothing archived.',
      restore: 'Restore',
      restoreFail: 'Could not restore',
      delete: 'Delete',
      deleteConfirmTitle: 'Delete "{{title}}" forever?',
      deleteConfirmBody: 'It will disappear from the app for good. Only rewards with no purchase history can be deleted.',
      deleteOk: 'Delete',
      deleteFail: 'Could not delete',
      deleteBlockedRedemptions: 'You have bought this reward before — only archive is allowed.',
    },
  },

  character: {
    title: 'Character',
    level: 'Level',
    xp: 'XP',
    coins: 'Coins',
    ranks: {
      master: 'Master',
      adept: 'Adept',
      builder: 'Builder',
      apprentice: 'Apprentice',
    },
    failedToLoad: 'Failed to load character.',
    sections: {
      stats: 'Stats',
      pillars: 'Pillars',
      weights: 'Weights',
      skills: 'Skills',
      profile: 'Profile',
    },
    weights: {
      label: 'Weight',
      hint: 'How much this pillar matters to you, from 1 to 5 stars.',
    },
    selfAssessment: {
      title: 'Self-assessment',
      subtitle: 'Tap to update your gut-check.',
      cta: 'Update self-assessment',
      lastUpdated: 'Last updated {{when}}',
    },
    questionnaire: {
      cta: 'Take the questionnaire',
      lastTaken: 'Last taken {{when}}',
      never: 'Never taken',
      due: 'Due now',
    },
  },

  dimensions: {
    health: {
      label: 'Health',
      tagline: 'Your body is the vessel.',
      description:
        'The base layer: sleep + nutrition. Recovery and fuel are what every other dimension stands on. Without these, the rest crumbles.',
      examples: [
        'Sleep 7+ hours',
        'Drink 2L of water',
        'Eat a real meal (no junk)',
        'No screens 1h before bed',
      ],
    },
    body: {
      label: 'Body',
      tagline: 'Earned, not given.',
      description:
        'Strength + dexterity. Cardio, lifting, sport, mobility. The visible proof of consistency over time.',
      examples: [
        '20 push-ups',
        'Run 5km',
        'Climb / sport / martial art',
        'Mobility 10 min',
      ],
    },
    mind: {
      label: 'Mind',
      tagline: 'Sharpen the blade.',
      description:
        'Learn + contemplate. Reading, deep work, study, meditation, journaling. What you compound here multiplies what you can do everywhere else.',
      examples: [
        'Read for 20 minutes',
        'Meditate 10 min',
        'Study or take a course',
        '90 min of deep work',
      ],
    },
    wealth: {
      label: 'Wealth',
      tagline: 'Future-you needs this.',
      description:
        'Money + career. Earning, saving, investing, shipping. Small reps here are worth far more than big sporadic moves.',
      examples: [
        "Log today's expenses",
        'Review the budget',
        'Save / invest a fixed amount',
        '90 min on a side project',
      ],
    },
    bonds: {
      label: 'Bonds',
      tagline: "Don't solo this game.",
      description:
        'Friends, family + romance. Highest-yield long-term investment. Easy to skip; expensive to skip for years.',
      examples: [
        'Call / message family',
        'Have lunch with a friend',
        'Quality time with partner',
        'Show up to a gathering',
      ],
    },
    craft: {
      label: 'Craft',
      tagline: 'Make something.',
      description:
        'Play + build. Hobbies, creative work, side-projects. The dimension that makes life worth the grind everywhere else.',
      examples: [
        'Hobby session 30 min',
        'Ship something on a side project',
        'Practice an instrument',
        'Finish a creative piece',
      ],
    },
  },

  // 5 strings per sub (summary / definition / low / mid / high), see pt.ts.
  subs: {
    sleep: {
      label: 'Sleep',
      summary: 'Amount, consistency, and quality of rest.',
      definition:
        "How you sleep — amount, consistency, and quality of rest. The biological prerequisite for everything else: focus, mood, physical capacity, impulse control. Covers both behavior (timing, environment) and outcome (waking restored).",
      low: 'You sleep under 6h most nights, or on very irregular timing. Waking is a struggle. Caffeine carries the day. Afternoons crash; nights bring a false second wind. Apnea, snoring, or nighttime anxiety are part of the landscape.',
      mid: "You sleep 6-7h per night, with some better nights. It works, but doesn't flourish. Some mornings rested, some not — usually tracking what you did the night before. You notice when sleep was bad, not always what caused it.",
      high: 'You sleep 7-9h consistently, with stable timing (under 30 min variation). Wake before the alarm, restored. Sleep is negotiated as a priority — screens away, firm timing. Sustains focus and mood through the whole day without props.',
    },
    nutrition: {
      label: 'Nutrition',
      summary: 'How you eat and your relationship with food.',
      definition:
        'What you put in your body, how often, and the peace you carry around it. Covers nutritional density (protein, vegetables, hydration), meal regularity, and the psychological relationship — without guilt, obsession, or compulsion.',
      low: 'Meals are chaotic: skipped, replaced with fast food, decided on impulse. Most of what you eat is ultra-processed, sugary, or liquid. Your relationship with food carries guilt, anxiety, or compulsion. Energy swings with your stomach — peak-crash-peak.',
      mid: "You eat reasonably well most days, but with gaps — weekends, travel, stressful days. You know what would be better, don't always do it. Don't always feel light after meals. Hydration is unstable.",
      high: 'Real, regular meals with quality protein and vegetables. Consistent hydration. Ultra-processed is rare, not shameful. Your relationship with food is light — no aggressive dieting, no guilt, no compulsion. You eat with pleasure, get full, move on.',
    },
    strength: {
      label: 'Strength',
      summary: 'Physical capacity to carry life.',
      definition:
        'How strong and capable your body is day-to-day — for effort, sport, autonomy. Covers training frequency, quality of effort (leaving the comfort zone), functional capacity (climbing stairs, carrying weight), and visible progress over time.',
      low: "Physical activity is rare or absent. A few flights of stairs tire you. Carrying heavy bags hurts the next day. Sports, kid-play, or physical tasks demand disproportionately from you. There's no routine, no progress.",
      mid: "You train 1-2x per week, or do light cardio regularly. You handle daily life reasonably well, but don't feel strong. Some weeks pass entirely without training. No measurable progress in weight, reps, or volume.",
      high: "Strength training or intense sport 3+ times a week, with good form and progression. Body feels capable: you trust your movements, don't avoid effort, recover quickly. Stronger today than 6 months ago — in weight, reps, or volume — with concrete evidence.",
    },
    dexterity: {
      label: 'Dexterity',
      summary: 'Mobility, coordination, and balance.',
      definition:
        "How your body moves — range, control, balance. From basic mobility (stretching, posture) to motor skills (racquet sport, dance, climbing). It's what keeps you agile and fluid as years pass, or stiff and locked up.",
      low: "Wide movements hurt or aren't possible. Posture is poor, your back or neck pays for it. You stumble and don't recover well. You avoid sports or new movements out of injury fear. You practice nothing that requires coordination.",
      mid: "You move without pain most days, but with stubborn areas — hip, shoulder, neck. You stretch sporadically. Balance is okay, not trained. You don't feel range or control progress over the months.",
      high: 'Mobility worked regularly — yoga, stretching, mobility work. Movement is fluid and pain-free. Balance and coordination are real — you react well to stumbles, play sport, dance. You feel more mobile today than 6 months ago.',
    },
    learn: {
      label: 'Learn',
      summary: 'Intentional study and depth of what you learn.',
      definition:
        'How much and how deeply you study, read, investigate. Not just consumption — intentional study, applied, connected. Covers frequency, engagement quality (active vs passive), and whether what you learn finds use in your life or work.',
      low: "You rarely read or study intentionally. You start things and don't finish. What you consume is mostly passive — short videos, scrolling, news. Distraction takes time that should be for going deep. You don't know anything relevant today that you didn't know 6 months ago.",
      mid: 'You read or study some days a week, but inconsistently. You finish some things, abandon others halfway. Learning is more consumption than application — it enters the head, rarely leaves for use. You know a little more today, but struggle to cite concrete examples.',
      high: "Intentional study most days a week — reading, course, or technical depth. You apply, teach, or connect what you learn. You finish what you start. You can point to concrete things you know today that you didn't 6 months ago. Curiosity has focus and discipline.",
    },
    contemplate: {
      label: 'Contemplate',
      summary: 'Pause, reflection, and the capacity to anchor.',
      definition:
        'The internal side: meditation, journaling, conscious pause, the ability to stay with what arises. Covers regular practice, depth of practice, and the functional outcome — emotional clarity, capacity to anchor in stress, self-knowledge.',
      low: "You rarely stop. Head racing all day. Stress knocks you down; anxiety or rumination take over for long stretches without you finding a way out. You can't name well what you feel. There's always something 'more important' than stopping and looking inward.",
      mid: "You meditate or pause a few times a week. It works when you do it. In calm moments you know yourself well; in stressful moments you lose your center easily. You know you should practice more, can't keep consistency.",
      high: 'Near-daily contemplative practice — meditation, journaling, intentional pause. In stress, you anchor — you observe instead of react. You have clarity about what you feel and what matters, even in accelerated life. Practice depth grew over the last 6 months.',
    },
    money: {
      label: 'Money',
      summary: 'Financial health and peace with money.',
      definition:
        'How money comes in, goes out, and stays. Covers behavior (saving, spending intentionally), knowledge (knowing where it goes), outcome (financial cushion, growing assets), and friction (expensive debt, postponement out of aversion).',
      low: "You don't know where your money goes. Nothing left at month-end, or only by luck. You carry expensive debt (credit card, overdraft) that doesn't go away. Financial postponements weigh: taxes, opening an investment account, renegotiating. Money is a constant source of anxiety.",
      mid: "You close the month positive most of the time, but without fine clarity. You have some savings, not enough. You know you should invest more, don't always act. Impulse buys happen but don't dominate. Money weighs sometimes, not constantly.",
      high: 'You know where every slice of your money goes. You save 10%+ every month, without strain. Liquid assets grew over the last 12 months. No expensive debt. Spending decisions are intentional. Money stopped being anxiety — became a tool.',
    },
    career: {
      label: 'Career',
      summary: 'Deep work, output, and trajectory.',
      definition:
        "How you work and where you're going. Covers deep-work frequency, engagement quality, energy sustainability (enough left for life outside work), concrete output, and the sense of trajectory — is my work going somewhere?",
      low: "Day is taken by useless meetings, messages, interruptions. You almost can't get blocks of deep work. You work on autopilot or just fill the day. You arrive home empty. Necessary confrontation with boss/client gets shelved. You feel you're spinning in place.",
      mid: "You get some focus blocks per week, and ship concrete things — but not on every day. Energy is left over on some days, not others. The trajectory makes some sense, but with moments of 'where am I going?'. Hard confrontation gets postponed sometimes.",
      high: "Deep work most days a week, on something that matters. You make hard decisions with clarity. Energy is left over for life outside work. Your trajectory makes sense — you can articulate where you're going and why. Concrete, regular shipping.",
    },
    circle: {
      label: 'Friends & Family',
      summary: 'Real closeness with family and friends.',
      definition:
        'How connected you are to the important people — not abstractly, but concretely. Covers frequency of meaningful conversations, initiative to seek (not just wait), real presence (no phone, no rehearsing answers), and the feeling that someone truly knows you.',
      low: "You feel alone even surrounded by people. Conversations are logistics. You don't take initiative — you wait for invitations. When you're with someone you love, you're half-out — phone, distraction, mind elsewhere. Unresolved conflicts weigh for days.",
      mid: "You have 1-2 close people you know well. Meaningful conversations happen, but rarely. You take initiative sometimes. Presence is partial — you're there, not 100%. Some weeks pass without real contact with someone you love.",
      high: "Weekly meaningful conversations with family or friends. You take initiative to schedule and seek. Real presence when you're with someone — no phone, actually listening. You share what you live, don't filter. There are people who'd call if you disappeared — and vice versa.",
    },
    romance: {
      label: 'Romance',
      summary: 'Romantic connection — partnership, intimacy, presence.',
      definition:
        'The romantic side of life — in partnership or solo with intent. Covers frequency of real moments (partnership, dates, intimacy), quality of presence, honest expression of desire and need, and overall satisfaction with where this domain stands today.',
      low: "Romantic life is dry — no active partnership, no dates, no initiative to seek. In a relationship, real connection is rare: distance, unresolved fights, silence to avoid conflict. You don't express what you want. You feel something important is missing, you don't act.",
      mid: 'You have some romantic life working, but with stagnant areas. In partnership: comfortable, not vibrant. Solo: sometimes seek, sometimes give up. Presence is partial. Conflicts drag for days. Satisfied-but-low-energy describes it well.',
      high: 'Romantic life is in a good place — in partnership or single with intent. Real, regular, expressive connection. You express what you want, listen, present. Care, desire, and safety coexist. Conflict resolves in hours, not days.',
    },
    play: {
      label: 'Play',
      summary: "Real leisure — recharges, doesn't drain.",
      definition:
        'Play, games, hobby — without production goals. Covers frequency of real leisure moments, presence during them (not checking social media), permission to be bad at something, and the effect: do you finish lighter or more tired? Distinguishes active leisure from passive consumption.',
      low: "You don't know when you last truly played. Leisure became scrolling feeds, background series, TV to switch off. You finish more tired, not lighter. You feel guilty resting when 'there's stuff to do'. You don't try anything new.",
      mid: 'You have 1-2 hobbies, but practice sporadically. Leisure mixes active with passive — some hours present, some escaping. You finish sometimes recharged, sometimes just tired. Guilt over resting shows up now and then.',
      high: 'You have an active hobby most weeks. Present when you do it — no phone, no work in the background. You let yourself be bad at something just for the love of it. You finish lighter, recharged. Joy, lightness, and curiosity show up regularly in your routine.',
    },
    build: {
      label: 'Build',
      summary: 'Personal projects — finishing and showing.',
      definition:
        'Your maker life. Covers time dedicated to personal projects (creative, technical, manual), depth of work (flow vs distraction), capacity to iterate with feedback, and — the honest test — finishing and sharing, or just stacking abandoned ones.',
      low: "You have 5 started projects, none finished. Distraction or indecision pulls you off what you were doing. Perfectionism halts you halfway. When you work, you don't enter flow — you check feeds every 5 minutes. You don't share what you do, or do it very rarely.",
      mid: "You dedicate some hours a week to personal projects. You finish some, abandon others. You share occasionally — when the result is good enough. You iterate sometimes, defend yourself other times. You have things in the portfolio, not as many as you'd like.",
      high: 'You dedicate regular time to projects. Flow is frequent, distraction is controlled. You finish what you start and share. You iterate without ego — listening to feedback and improving. You have concrete things that exist because of you — you can point to them and show.',
    },
  },

  /** Generic anchor labels for the 0-5 self-assessment scale. */
  subScoreLabels: {
    0: 'Missing',
    1: 'Struggling',
    2: 'Below',
    3: 'OK',
    4: 'Strong',
    5: 'Mastery',
  },

  profile: {
    title: 'Settings',
    sections: {
      account: 'Account',
      preferences: 'Preferences',
      notifications: 'Notifications',
      tasksProgress: 'Tasks & Progress',
      data: 'Data',
      about: 'About',
    },
    fields: {
      displayName: 'Display name',
      email: 'Email',
      avatar: 'Avatar',
      username: 'Username',
      theme: 'Theme',
      language: 'Language',
      weekStart: 'Week starts on',
      confirmHighDifficulty: 'Confirm hard quests',
      confirmHighDifficultyDescription: 'Ask before completing a 4★ or 5★ task. Stops accidental taps.',
      defaultRewards: 'Default rewards',
      dayResetTime: 'Day reset time',
      midnight: 'Midnight (local)',
      comingSoon: 'Coming soon',
    },
    theme: {
      light: 'Light',
      dark: 'Dark',
      system: 'System',
      note: 'Light/system themes are coming soon — UI follows dark for now.',
    },
    language: {
      english: 'English',
      portuguese: 'Português',
    },
    weekStart: {
      sunday: 'Sunday',
      monday: 'Monday',
    },
    notifications: {
      master: 'Enable notifications',
      masterDescription: 'Master switch for all reminders below.',
      daily: 'Daily reminder',
      dailyDescription: 'A nudge if you have unfinished daily quests.',
      quest: 'Quest reminder',
      questDescription: 'Heads-up before a quest deadline.',
      momentum: 'Momentum reminder',
      momentumDescription: "Late-evening ping when today's Momentum could use a small task.",
      footnote: 'Notifications need a small native setup pass — the toggles save your choice now and will start firing once that ships.',
    },
    actions: {
      replayOnboarding: 'Replay onboarding',
      checkForUpdates: 'Check for updates',
      checking: 'Checking…',
      signOut: 'Sign out',
      confirmSignOut: 'Sign out?',
      confirmSignOutBody: 'You can log back in with the same email.',
      deleteAccount: 'Delete account',
      confirmDelete: 'Delete account?',
      confirmDeleteBody: 'This will permanently delete your character, tasks, rewards, and history. This cannot be undone.',
      deleteNotYet: 'Not yet available',
      deleteNotYetBody: 'Account deletion is wired to the server but the admin endpoint is not active yet. For now, sign out and contact us if you need the account removed.',
    },
    update: {
      devMode: 'Dev mode',
      devModeBody: 'OTA updates are only available in the installed APK, not in Expo Go / dev mode.',
      ready: 'Update ready',
      readyBody: 'Restart the app now to apply it?',
      restart: 'Restart',
      later: 'Later',
      upToDate: 'Up to date',
      upToDateBody: 'You are on the latest version.',
      couldNotCheck: 'Could not check',
      unknownError: 'Unknown error',
    },
    footer: 'Perceva · v{{version}}',
    footerUpdate: 'update {{id}}',
    version: 'Version {{version}}',
  },

  skills: {
    title: 'Skills',
    new: 'New skill',
    edit: 'Edit skill',
    fields: {
      name: 'Name',
      unit: 'Unit',
      dimension: 'Dimension',
      icon: 'Icon',
    },
    log: {
      cta: 'Log a PR',
      placeholder: 'New best',
      submit: 'Save PR',
      success: 'New PR logged',
    },
    tier: {
      beginner: 'Beginner',
      bronze: 'Bronze',
      silver: 'Silver',
      gold: 'Gold',
      master: 'Master',
    },
    history: {
      title: 'PR history',
      empty: 'No PRs logged yet',
    },
  },

  quests: {
    title: 'Quests',
    new: 'New quest',
    sections: {
      active: 'Active',
      completed: 'Completed',
      failed: 'Failed',
    },
    fields: {
      title: 'Title',
      deadline: 'Deadline',
      reward: 'Reward',
      requirements: 'Requirements',
    },
    status: {
      active: 'Active',
      completed: 'Completed',
      failed: 'Failed',
      expired: 'Expired',
      abandoned: 'Abandoned',
    },
    actions: {
      complete: 'Claim reward',
      abandon: 'Abandon',
      confirmAbandon: 'Abandon this quest?',
    },
    progress: '{{done}} / {{total}}',
    progressLabel: 'Progress',
    inProgress: 'In progress',
    readyToClaim: 'Ready to claim',
    claim: 'Claim',
    daysLeft: { one: '{{count}} day left', other: '{{count}} days left' },
    dueToday: 'Due today',
    overdue: 'Overdue',
    empty: 'No quests yet. Pick a template to start.',
    partialOk: 'partial OK',
    longPressHint: 'Long press for details',
    board: {
      title: 'Quest Board',
      subtitle: 'Long press for details',
      activeChip: { one: '{{count}} active', other: '{{count}} active' },
      createCta: 'New custom quest',
      comingSoon: 'Coming soon',
    },
    create: {
      title: 'New Quest',
      nameLabel: 'Quest name',
      namePlaceholder: 'E.g. Morning focus 30 days',
      descLabel: 'Description',
      descPlaceholder: 'What do you want to train?',
      durationLabel: 'Duration',
      tasksLabel: 'Linked tasks',
      tasksEmpty: 'You have no active tasks to link.',
      partialTitle: 'Partial OK',
      partialSub: 'Incomplete days do not reset progress',
      rewardLabel: 'Reward',
      rewardNote: 'Computed from duration',
      saveFail: 'Could not create quest',
    },
    detail: {
      title: 'Quest detail',
      notFound: 'Quest not found.',
      yourProgress: 'Your progress',
      notStarted: 'Not started',
      linkedTasks: 'Linked tasks',
      rules: 'Rules',
      rulePartialOn: 'Partial OK: incomplete days do not reset progress.',
      rulePartialOff: 'No partial: incomplete days reset the counter.',
      ruleDeadline: '{{days}} days to complete from the start date.',
      xpOnComplete: 'XP on complete',
      coinsOnComplete: 'Coins on complete',
      start: 'Start quest',
      keep: 'Keep it',
      openSkill: 'Open skill {{name}}',
      logProgress: 'Log progress',
      logProgressIn: 'Log progress in {{unit}}',
      logPlaceholder: 'How many {{unit}}?',
      logPlaceholderShort: 'Type a number',
      logCta: 'Log',
      logHint: 'Log your best value — auto-completes when target is reached.',
      logFail: 'Could not log',
      invalidValue: 'Invalid value',
      invalidValueBody: 'Enter a valid number.',
    },
    templates: {
      title: 'Quest templates',
      start: 'Start quest',
    },
  },

  selfAssessment: {
    title: 'Self-assessment',
    subtitle: 'Where do you feel each pillar is right now?',
    pillarPrompt: 'How is your {{pillar}}?',
    subAttribute: 'sub-attribute',
    recommendedTasks: 'Recommended tasks',
    scale: {
      0: 'Not at all',
      1: 'Barely',
      2: 'Some',
      3: 'Decent',
      4: 'Solid',
      5: 'Great',
    },
    insights: {
      0: 'Not tracked yet. Start with one small task.',
      1: 'Watch out. A daily task here changes the game.',
      2: 'Below baseline. Worth more focus.',
      3: 'Solid. Keep the consistency.',
      4: 'Strong. Next step: an advanced skill.',
      5: 'Mastery. Push the limits with longer quests.',
    },
    save: 'Save self-assessment',
    saved: 'Self-assessment updated',
  },

  questionnaire: {
    title: 'Questionnaire',
    intro: {
      heading: 'Assessment',
      body:
        '48 questions, 5-10 min. 4 angles per dimension (behavior, ' +
        'quality, outcome, friction) — to see where you stand honestly, ' +
        "without being hostage to a single lens.",
      bullets: {
        fast: 'Quick to answer — 5 options per question. Tap to advance.',
        private: 'Private. The result only lives on your hero.',
        retake: 'You can retake every 30-90 days to see how you evolve.',
      },
      start: 'Begin',
      skip: 'Not now',
    },
    loading: {
      preparing: 'Preparing…',
      calculating: 'Calculating…',
    },
    exit: {
      title: 'Exit the questionnaire?',
      body: "Your answers so far won't be saved.",
      stay: 'Stay',
      leave: 'Leave',
    },
    errors: {
      openTitle: "Couldn't open the questionnaire",
      saveTitle: "Couldn't save",
      tryAgain: 'Try again.',
    },
    result: {
      done: 'Done.',
      cta: 'Finish',
      aligned: {
        one: '{{count}} dimension calibrated',
        other: '{{count}} dimensions calibrated',
      },
      needsAttention: {
        one: '{{count}} needs attention',
        other: '{{count}} need attention',
      },
      feedback: {
        attention_overestimating: 'You see yourself better at {{label}} than the anchor suggests. Worth an honest look.',
        slight_overestimate: 'Reasonable at {{label}}, but maybe a slight downward adjustment in your self-view.',
        aligned: 'Calibrated on {{label}} — your perception matches the anchor.',
        slight_underestimate: "Solid at {{label}} — you might be a little hard on yourself.",
        attention_underestimating: 'You underestimate yourself on {{label}}. Acknowledge what is working.',
      },
    },
  },

  errors: {
    network: 'Network error. Check your connection and try again.',
    notAuthenticated: 'You need to be signed in for this.',
    notFound: 'Not found',
    unknown: 'Unexpected error. Try again.',
  },

  format: {
    listSeparator: ', ',
    rangeSeparator: ' – ',
  },
};

export default en;

/**
 * Recursive shape that preserves the structure of `en` but allows any string
 * value at the leaves — so other locales must match the shape without being
 * forced to use the same English text.
 */
type DeepString<T> = T extends string
  ? string
  : T extends (infer U)[]
    ? DeepString<U>[]
    : { [K in keyof T]: DeepString<T[K]> };

export type Translations = DeepString<typeof en>;
