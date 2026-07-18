/**
 * Leonardo School Mobile - Metro Configuration
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDefaultConfig } = require('expo/metro-config');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('node:path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// `shared/` (repo root) holds the rich-text pipeline used by both the web app and this one.
// Metro only watches the project root by default, so the folder has to be declared here or
// the import type-checks but fails to bundle.
const sharedRoot = path.resolve(__dirname, '..', 'shared');

config.watchFolders = [...(config.watchFolders ?? []), sharedRoot];

config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...(config.resolver?.extraNodeModules ?? {}),
    '@shared': sharedRoot,
  },
  // Keep dependency resolution pinned to the app's own node_modules: `shared/` has no
  // dependencies of its own and must not pull anything from the web app's tree.
  nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
};

module.exports = config;
