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
  return candidates[0];
}

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Prevent Metro from walking into nested node_modules and loading a second
// copy of React (Invalid hook call / useMemoCache of null).
config.resolver.disableHierarchicalLookup = true;
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  react: resolveNodeModule('react'),
  'react-dom': resolveNodeModule('react-dom'),
  'react-native': resolveNodeModule('react-native'),
  scheduler: resolveNodeModule('scheduler'),
  '@react-native/virtualized-lists': resolveNodeModule(
    '@react-native/virtualized-lists',
  ),
  '@tripblogger/itinerary-engine': path.resolve(
    workspaceRoot,
    'packages/itinerary-engine',
  ),
};

module.exports = config;
