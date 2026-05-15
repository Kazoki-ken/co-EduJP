const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// ── Watch the monorepo root so Metro can see packages/shared ──────────────────
config.watchFolders = [monorepoRoot];

// ── Module resolution paths ───────────────────────────────────────────────────
// Mobile's node_modules first (has React 19), then root (has everything else).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// ── Follow symlinks for pnpm hoisted layout ───────────────────────────────────
config.resolver.unstable_enableSymlinks = true;

// ── Force React 19 for ALL imports ────────────────────────────────────────────
// Problem: pnpm hoists React 18 (from frontend) to root/node_modules/react.
// When expo or any root-hoisted package imports "react", standard Node
// resolution finds React 18 at the root. extraNodeModules can't override
// a successful resolution — it's only a fallback.
//
// Solution: intercept all "react" and "react/*" imports via resolveRequest
// and return mobile's React 19 directly.  Everything else resolves normally.
const mobileNodeModules = path.resolve(projectRoot, 'node_modules');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Intercept react core imports → always use mobile's React 19
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    return {
      type: 'sourceFile',
      filePath: require.resolve(moduleName, { paths: [mobileNodeModules] }),
    };
  }

  // Everything else: default Metro resolution
  return context.resolveRequest(context, moduleName, platform);
};

// ── Extra node modules (fallback aliases) ─────────────────────────────────────
config.resolver.extraNodeModules = {
  '@vocabjp/shared': path.resolve(monorepoRoot, 'packages/shared/src'),
};

module.exports = withNativeWind(config, { input: './global.css' });
