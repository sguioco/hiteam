const appJson = require('./app.json');

process.env.EXPO_PUBLIC_API_URL ??= 'https://api.hiteam.net';

module.exports = () => {
  const config = JSON.parse(JSON.stringify(appJson));
  const isLocalDev = process.env.SMART_LOCAL_DEV === '1';

  if (isLocalDev) {
    delete config.expo.runtimeVersion;
    delete config.expo.updates;
  }

  return config;
};
