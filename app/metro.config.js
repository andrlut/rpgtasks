// metro.config.js — explicitly extend Expo's Metro defaults.
//
// Without this file, `npx expo doctor` warns about a "custom metro
// config that does not extend expo/metro-config" — the warning fires
// in pnpm workspaces where Metro auto-detection can't tell whose
// config is in play. Extending explicitly silences the warning AND
// keeps us future-proof against Expo Metro changes (custom transformers,
// asset resolvers, etc).

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
