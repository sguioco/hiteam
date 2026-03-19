const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

module.exports = withNativeWind(config, {
  input: path.resolve(projectRoot, 'global.css'),
  configPath: path.resolve(projectRoot, 'tailwind.config.js'),
});
