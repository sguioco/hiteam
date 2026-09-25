const staticExpoConfig = require('./app.base.json').expo;

process.env.EXPO_PUBLIC_API_URL ??= 'https://api.hiteam.net';

module.exports = () => {
  const resolvedConfig = JSON.parse(JSON.stringify(staticExpoConfig));
  const isLocalDev = process.env.SMART_LOCAL_DEV === '1';
  const androidMapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();

  if (androidMapsKey) {
    resolvedConfig.android.config = {
      ...resolvedConfig.android.config,
      googleMaps: { apiKey: androidMapsKey },
    };
  }

  if (isLocalDev) {
    delete resolvedConfig.runtimeVersion;
    delete resolvedConfig.updates;
  }

  return resolvedConfig;
};
