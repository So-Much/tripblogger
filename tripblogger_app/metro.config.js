const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

function resolveNodeModule(moduleName) {
  const candidates = [
    path.resolve(projectRoot, 'node_modules', moduleName),
    path.resolve(workspaceRoot, 'node_modules', moduleName),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[1];
}

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Keep hierarchical lookup so hoisted workspace packages (e.g.
// @react-native/virtualized-lists at the monorepo root) resolve when
// react-native lives under tripblogger_app/node_modules.
config.resolver.disableHierarchicalLookup = false;
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@react-native/virtualized-lists': resolveNodeModule(
    '@react-native/virtualized-lists',
  ),
  '@tripblogger/itinerary-engine': path.resolve(
    workspaceRoot,
    'packages/itinerary-engine',
  ),
};

module.exports = config;
