# iOS — Config de build + runbook EAS (referência)

> Os diffs de `app.json` e `eas.json` abaixo **já foram aplicados** nesta branch.
> Esta seção fica como referência do que mudou e por quê, + o passo-a-passo de build.

## app.json — o que mudou
File: `app/app.json`. Only the `ios` block changes. Nothing else (`name`, `slug`, `scheme`, `android`, `plugins`, `updates`, etc.) is touched.

BEFORE (lines 11–13):
```json
    "ios": {
      "supportsTablet": true
    },
```

AFTER:
```json
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.andrlut.rpgtasks",
      "buildNumber": "1",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    },
```

Notes / justification for each key (this is the part you asked to "avaliar e explicar"):

- `bundleIdentifier: "com.andrlut.rpgtasks"` — matches the Android package per your locked decision. Required for any iOS build; without it EAS prompts interactively.
- `buildNumber: "1"` — iOS equivalent of Android `versionCode`. Because `cli.appVersionSource` is `"remote"` (confirmed in your eas.json), this value is only a seed: on the first build EAS initializes its remote counter from it, then manages increments server-side and IGNORES this field thereafter. It's harmless to keep and gives a clean starting point. (Source: Expo remote-version-source docs — "build version values stored in app config are ignored… You can safely remove these values.")
- `infoPlist.ITSAppUsesNonExemptEncryption: false` — NOT strictly required to build, but it pre-answers Apple's export-compliance question on every TestFlight/App Store upload. Your app uses only standard HTTPS/TLS (via Supabase), which is exempt. Setting this avoids a manual "does your app use encryption?" gate on each submission. Recommended for a smooth submit flow.

On notifications specifically — the key thing to confirm and explain:

- Your app uses ONLY LOCAL scheduled notifications (`scheduleNotificationAsync` with `DAILY` / `DATE` triggers — verified in `app/lib/notifications/scheduler.ts`). No push token, no APNs, no remote payloads.
- Local notifications do NOT require the iOS Push Notifications entitlement, do NOT require an APNs key, and do NOT require the `remote-notification` `UIBackgroundMode`. Those are only needed for REMOTE push. So no entitlement block is added.
- There is NO `NS...UsageDescription` requirement for scheduling local notifications. The permission to DISPLAY notifications is requested at runtime via the system notification-authorization prompt (`requestPermissionsAsync`), whose text is OS-controlled and not an Info.plist string. `NSUserNotificationsUsageDescription` exists but is optional and not needed here — omitting it is correct.
- Net: the `infoPlist` block above is added purely for export compliance, NOT for notifications. Notifications need zero iOS config changes because they're local-only.

Sources: [expo-notifications SDK docs](https://docs.expo.dev/versions/latest/sdk/notifications/), [Expo iOS entitlements](https://docs.expo.dev/config-plugins/introduction/).

## eas.json — o que mudou
File: `app/eas.json`. Adds an `ios` sub-block to all three build profiles and fills in `submit.production.ios`. Existing Android/env keys untouched. (JSON does not support comments — I've put a placeholder-guidance table right after the diff instead of inline `//` comments, since real comments would break the file.)

BEFORE:
```json
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "channel": "development"
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://uneqnpyzevosznwkmvvo.supabase.co",
        "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_sWLt4U0F5J4S-Se-6V7SXw_1LyQqysV"
      }
    },
    "production": {
      "channel": "production",
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://uneqnpyzevosznwkmvvo.supabase.co",
        "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_sWLt4U0F5J4S-Se-6V7SXw_1LyQqysV"
      }
    }
  },
  "submit": {
    "production": {}
  }
```

AFTER:
```json
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": true
      },
      "channel": "development"
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://uneqnpyzevosznwkmvvo.supabase.co",
        "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_sWLt4U0F5J4S-Se-6V7SXw_1LyQqysV"
      }
    },
    "production": {
      "channel": "production",
      "autoIncrement": true,
      "ios": {
        "simulator": false
      },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://uneqnpyzevosznwkmvvo.supabase.co",
        "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_sWLt4U0F5J4S-Se-6V7SXw_1LyQqysV"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "APPLE_ID_EMAIL_PLACEHOLDER",
        "ascAppId": "ASC_APP_ID_PLACEHOLDER",
        "appleTeamId": "APPLE_TEAM_ID_PLACEHOLDER"
      }
    }
  }
```

Placeholder guidance (replace the three `*_PLACEHOLDER` strings before running `eas submit`):

| Field | Value to put | Where to find it |
|---|---|---|
| `appleId` | The email of your Apple Developer account (e.g. `you@example.com`) | The Apple ID you log into [developer.apple.com](https://developer.apple.com) / App Store Connect with |
| `ascAppId` | The numeric App Store Connect app ID (e.g. `6478912345`) | App Store Connect → your app → App Information → "Apple ID" (a number, not the bundle id). Only exists AFTER you create the app record in ASC (the runbook step below creates it, or EAS can create it on first submit) |
| `appleTeamId` | 10-char alphanumeric Team ID (e.g. `A1B2C3D4E5`) | [developer.apple.com/account](https://developer.apple.com/account) → Membership details → "Team ID" |

Profile explanations:

- `development` → `ios.simulator: true`: builds a `.app` that runs in the Mac iOS Simulator (no Apple account / no UDID needed to boot it in the simulator). Note: you still need a paid Apple Developer account for on-device builds, but a simulator build is the cheapest way to smoke-test. This pairs with your existing `developmentClient: true` dev client.
- `preview` → `ios.simulator: false` + `distribution: "internal"` (inherited): produces an ad-hoc `.ipa` you install on your OWN registered iPhone (UDID must be registered via `eas device:create` — see runbook). This is your "test on my real iPhone without TestFlight" path.
- `production` → `ios.simulator: false`, default `distribution: "store"`: produces a store `.ipa` for TestFlight / App Store, uploaded with `eas submit`. `autoIncrement: true` bumps the remote build number each build.

Sources: [Configure EAS Build with eas.json](https://docs.expo.dev/build/eas-json/), [Internal distribution](https://docs.expo.dev/build/internal-distribution/), [EAS Submit iOS options](https://docs.expo.dev/eas/json/).

## Runbook: build + submit iOS (nunca fez antes)
Assumes: never done iOS before, on Windows (you don't own a Mac — that's fine, EAS builds in the cloud). Commands run from `app/` unless noted. Your machine already has `EXPO_TOKEN` set, so `eas` is authenticated.

PREREQUISITE — the one thing that costs money and can't be skipped:
- You need an ACTIVE paid Apple Developer Program membership (USD 99/year) at [developer.apple.com/programs](https://developer.apple.com/programs). Required for: registering devices, ad-hoc builds, TestFlight, and App Store. Simulator builds (development profile) are the ONLY iOS build that works without it. Enroll and wait for it to go active before the device/preview/production steps.
- Apply the two diffs above (app.json + eas.json) first. Per your coordination rules these ship in their own branch/PR without a rebuild — the config just needs to be committed before you run the iOS builds.

STEP 1 — Register your iPhone (needed for ad-hoc `preview` builds)
```
eas device:create
```
- It prints a URL + QR code. Open that link ON THE IPHONE (Safari), tap through, and install the registration profile: Settings → General → VPN & Device Management → install the downloaded profile.
- This records your iPhone's UDID in your Apple account. Ad-hoc builds only install on UDIDs registered BEFORE the build runs. Register the phone before Step 2.
- Verify anytime with `eas device:list`.

STEP 2 — Build for your own iPhone (ad-hoc, no TestFlight)
```
eas build --platform ios --profile preview
```
- First iOS build only: EAS asks about credentials — "Generate a new Apple Distribution Certificate?" and "Generate a new provisioning profile?". Answer YES / just press Enter. EAS manages certs + provisioning profiles for you on its servers; you do NOT need a Mac, Xcode, or to touch the Apple portal manually. It will ask you to log into your Apple account once so it can create these — that's expected.
- When it finishes (~10–20 min) it gives a URL/QR. Open it on the registered iPhone and install. This is your fast "see it running on real hardware" loop.
- Add `--non-interactive --no-wait` once credentials already exist if you want to fire-and-forget (matches your Android habit), but do the FIRST one interactively so you can answer the credential prompts.

STEP 3 — TestFlight (production build + submit)
Build the store binary:
```
eas build --platform ios --profile production
```
- Same auto-managed credentials (EAS reuses the distribution cert it made in Step 2, or creates one — press Enter through any prompt).
Then upload to App Store Connect / TestFlight:
```
eas submit --platform ios --profile production
```
- Before this works you (or EAS) must have an app RECORD in App Store Connect. If none exists, EAS offers to create it on first submit — say yes; it needs `appleId` + `appleTeamId` (from your eas.json) and will register the bundle id `com.andrlut.rpgtasks`. After the record exists, copy its numeric "Apple ID" into `ascAppId` in eas.json.
- `eas submit` will ask for an App Store Connect API key or your Apple login for the upload — let EAS generate/manage the API key (press Enter to accept). This is the credential that authorizes the TestFlight upload.
- After upload, Apple runs ~5–30 min of processing, then the build appears in App Store Connect → TestFlight. Add yourself as an internal tester to get it on your iPhone via the TestFlight app. No App Store review needed for internal TestFlight testers.
- Shortcut: `eas build --platform ios --profile production --auto-submit` builds AND submits in one command once credentials/app record exist.

STEP 4 — Version bumping between releases
- `buildNumber` (iOS) / `versionCode` (Android): handled AUTOMATICALLY. `cli.appVersionSource` is `"remote"` and `production` has `autoIncrement: true`, so EAS increments the build number on its servers each production build. You do nothing. (The `buildNumber: "1"` you added to app.json is only the initial seed and is ignored after the first build.)
- `version` (the user-visible marketing version, e.g. `1.0.0` → `1.0.1`): NOT auto-managed. Bump it by hand in `app.json` (`expo.version`) when you cut a release you want labeled differently in the stores. Note this also drives `runtimeVersion` (policy `appVersion`), so bumping `version` starts a new OTA runtime lineage — only bump it for real native releases, not JS-only OTA pushes.

WHAT EAS ASKS ABOUT CERTS/PROVISIONING (summary): every prompt about "Apple Distribution Certificate", "Provisioning Profile", "Push Key", or "App Store Connect API Key" → accept the default (generate/managed by EAS, press Enter). EAS stores and reuses them; you never open Xcode or the Apple Developer portal manually. The only hard requirement you can't press-Enter past is the active paid Apple Developer membership and logging into your Apple account once so EAS can act on your behalf.

Sources: [Create a build on EAS](https://docs.expo.dev/develop/development-builds/create-a-build/), [iOS device build tutorial](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/), [Internal distribution](https://docs.expo.dev/build/internal-distribution/), [eas-cli reference](https://github.com/expo/eas-cli), [App versions / remote source](https://docs.expo.dev/build-reference/app-versions/), [EAS Submit iOS options](https://docs.expo.dev/eas/json/).

Relevant absolute file paths:
- `C:\Users\André Luthold\Projetos\RPG\app\app.json` (ios block, lines 11–13)
- `C:\Users\André Luthold\Projetos\RPG\app\eas.json` (build profiles + submit.production, lines 6–37)
- `C:\Users\André Luthold\Projetos\RPG\app\lib\notifications\scheduler.ts` (confirms local-only notifications → no iOS push entitlement needed)
