const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const config = getDefaultConfig(projectRoot);
const defaultResolveRequest = config.resolver.resolveRequest;
const reactNativeMapsWebShim = path.resolve(
  projectRoot,
  'src',
  'shims',
  'react-native-maps.web.tsx',
);

function escapePathForRegex(filePath) {
  return filePath.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/[\\/]+/g, '[\\\\/]');
}

const ignoredRoots = [
  path.join(workspaceRoot, 'apps', 'web-admin', '.next'),
  path.join(workspaceRoot, 'apps', 'hiteam', '.next'),
  path.join(workspaceRoot, 'apps', 'web-admin', 'out'),
  path.join(workspaceRoot, 'apps', 'hiteam', 'out'),
  path.join(workspaceRoot, 'apps', 'web-admin', 'dist'),
  path.join(workspaceRoot, 'apps', 'hiteam', 'dist'),
];

config.resolver.blockList = [
  ...ignoredRoots.map(
    (rootPath) => new RegExp(`^${escapePathForRegex(rootPath)}(?:[\\\\/].*)?$`),
  ),
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList
      ? [config.resolver.blockList]
      : []),
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      type: 'sourceFile',
      filePath: reactNativeMapsWebShim,
    };
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
  input: path.resolve(projectRoot, 'global.css'),
  configPath: path.resolve(projectRoot, 'tailwind.config.js'),
});
