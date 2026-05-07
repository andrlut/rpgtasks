/**
 * English translations.
 *
 * Keys are namespaced by feature/screen. Keep groups small and predictable —
 * if a group grows past ~30 entries, split it.
 *
 * For dynamic interpolation use `{name}` placeholders, e.g.
 *   greeting.morning: 'Good morning, {name}'
 *
 * For pluralization use the i18n-js convention:
 *   tasks.count: { one: '1 task', other: '{count} tasks' }
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
      title: 'RPG Tasks',
      tagline: 'Turn your life into an RPG',
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
      emailSentBody: 'Check {email} for a link. Open it on this device — the app will pick it up and let you set a new password.',
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
    brand: 'RPG · Tasks',
    skip: 'Skip',
    continue: 'Continue',
    start: 'Start your journey',
    slide1: {
      eyebrow: 'WELCOME, HERO',
      title: 'Turn your life into an RPG.',
      body: 'Real tasks. Real XP. Real rewards. The grind, but make it yours.',
    },
    slide2: {
      eyebrow: 'THE LOOP',
      title: 'Train. Earn. Redeem.',
      body: 'Complete habits to gain XP and coins. Spend coins on rewards you set yourself.',
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
    hero: 'Hero',
    rewards: 'Rewards',
    settings: 'Settings',
  },

  home: {
    greeting: {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
      night: 'Good night',
    },
    sections: {
      today: 'Today',
      upcoming: 'Upcoming',
      anytime: 'Anytime',
      completed: 'Completed today',
      empty: 'Nothing here yet',
      addTask: 'Add a task',
    },
    streak: {
      label: 'Streak',
      days: { one: '{count} day', other: '{count} days' },
      best: 'Best: {count}',
      atRisk: 'At risk',
    },
    completedDrawer: {
      title: 'Completed today',
      empty: 'Complete your first task to see it here.',
      undo: 'Undo',
      addExtra: '+ Extra',
      unskip: 'Unskip',
    },
    pullToRefresh: 'Pull to refresh',
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
      confirmHighDifficulty: 'This is a {stars}-star task. Mark complete?',
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
      logFor: 'Log for {date}',
      removeEntry: 'Remove this entry?',
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
      confirmRedeem: 'Spend {cost} coins on "{title}"?',
      archive: 'Archive',
      unarchive: 'Unarchive',
      delete: 'Delete',
      confirmDelete: 'Delete this reward?',
    },
    insufficient: 'Not enough coins. You need {short} more.',
    coins: { one: '{count} coin', other: '{count} coins' },
    history: {
      title: 'Redemption history',
      empty: 'No redemptions yet',
    },
    bank: {
      title: 'Suggestions',
      subtitle: 'Tap to add to your shop.',
      added: 'Added',
    },
  },

  character: {
    title: 'Character',
    level: 'Level',
    xp: 'XP',
    coins: 'Coins',
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
      lastUpdated: 'Last updated {when}',
    },
    questionnaire: {
      cta: 'Take the questionnaire',
      lastTaken: 'Last taken {when}',
      never: 'Never taken',
      due: 'Due now',
    },
  },

  dimensions: {
    health: 'Health',
    strength: 'Strength',
    mind: 'Mind',
    wealth: 'Wealth',
    bonds: 'Bonds',
    craft: 'Craft',
  },

  subs: {
    sleep: 'Sleep',
    nutrition: 'Nutrition',
    movement: 'Movement',
    dexterity: 'Dexterity',
    learn: 'Learn',
    contemplate: 'Contemplate',
    money: 'Money',
    career: 'Career',
    circle: 'Circle',
    romance: 'Romance',
    play: 'Play',
    build: 'Build',
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
      streak: 'Streak reminder',
      streakDescription: "Late-evening ping if today's streak is at risk.",
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
    footer: 'RPG Tasks · v{version}',
    footerUpdate: 'update {id}',
    version: 'Version {version}',
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
    progress: '{done} / {total}',
    daysLeft: { one: '{count} day left', other: '{count} days left' },
    overdue: 'Overdue',
    empty: 'No quests yet. Pick a template to start.',
    templates: {
      title: 'Quest templates',
      start: 'Start quest',
    },
  },

  selfAssessment: {
    title: 'Self-assessment',
    subtitle: 'Where do you feel each pillar is right now?',
    pillarPrompt: 'How is your {pillar}?',
    scale: {
      0: 'Not at all',
      1: 'Barely',
      2: 'Some',
      3: 'Decent',
      4: 'Solid',
      5: 'Great',
    },
    save: 'Save self-assessment',
    saved: 'Self-assessment updated',
  },

  questionnaire: {
    title: 'Questionnaire',
    intro: {
      title: 'Periodic check-in',
      body: 'A deeper read on each pillar. Plan for {minutes} minutes.',
      cta: 'Begin',
    },
    progress: '{current} of {total}',
    submit: 'Submit',
    submitting: 'Saving…',
    result: {
      title: 'Your results',
      subtitle: 'How the questionnaire compares to your self-assessment.',
      delta: 'Δ {delta}',
      bucketLabel: {
        attention_overestimating: 'Attention — possible blind spot',
        slight_overestimate: 'Slightly overestimating',
        aligned: 'Aligned',
        slight_underestimate: 'Slightly underestimating',
        attention_underestimating: 'Attention — possibly underestimating',
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
