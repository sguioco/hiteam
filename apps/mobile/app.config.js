const staticExpoConfig = require('./app.base.json').expo;

process.env.EXPO_PUBLIC_API_URL ??= 'https://api.hiteam.net';

module.exports = () => {
  const resolvedConfig = JSON.parse(JSON.stringify(staticExpoConfig));
  const isLocalDev = process.env.SMART_LOCAL_DEV === '1';

  if (isLocalDev) {
    delete resolvedConfig.runtimeVersion;
    delete resolvedConfig.updates;
  }

  return resolvedConfig;
};
