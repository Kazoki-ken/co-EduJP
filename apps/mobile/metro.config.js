const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// ── Watch the monorepo root so Metro can see packages/shared ─────────────────
// NOTE: We only watch — we do NOT add the monorepo root to nodeModulesPaths,
//       because that causes Metro to find the frontend's react@18 alongside
//       mobile's react@19, triggering the "multiple copies of React" error.
config.watchFolders = [monorepoRoot];

// ── Resolve modules from the mobile project ONLY ──────────────────────────────
// Intentionally NOT including monorepoRoot/node_modules here.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

// ── Singleton packages — always resolve to mobile's own copy ──────────────────
// This is the critical fix: any import of these packages (even from files
// inside packages/shared or the monorepo root) is redirected to the single
// copy inside apps/mobile/node_modules.
const SINGLETONS = [
  'react',
  'react-native',
  'react-native/Libraries/Renderer/shims/ReactNative',
  '@react-navigation/core',
  '@react-navigation/native',
  '@react-navigation/bottom-tabs',
  'react-native-safe-area-context',
  'react-native-screens',
];

config.resolver.extraNodeModules = {
  // @vocabjp/shared path alias
  '@vocabjp/shared': path.resolve(monorepoRoot, 'packages/shared/src'),
  // Pin every singleton to mobile's node_modules
  ...Object.fromEntries(
    SINGLETONS.map((pkg) => [
      pkg,
      path.resolve(projectRoot, 'node_modules', pkg),
    ]),
  ),
};

module.exports = withNativeWind(config, { input: './global.css' });
