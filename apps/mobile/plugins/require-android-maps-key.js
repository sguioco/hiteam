const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function requireAndroidMapsKey(config) {
  return withAndroidManifest(config, (modConfig) => {
    const key = modConfig.android?.config?.googleMaps?.apiKey;
    if (!key) {
      throw new Error(
        'Android Maps API key is missing. Set GOOGLE_MAPS_ANDROID_API_KEY before building the Android app.',
      );
    }
    const application = modConfig.modResults.manifest.application?.[0];
    if (!application) {
      throw new Error('AndroidManifest.xml has no application element for the Google Maps API key.');
    }
    application['meta-data'] ??= [];
    const metadata = application['meta-data'];
    const keyEntry = metadata.find((entry) => entry.$?.['android:name'] === 'com.google.android.geo.API_KEY');
    if (keyEntry) {
      keyEntry.$['android:value'] = key;
    } else {
      metadata.push({ $: { 'android:name': 'com.google.android.geo.API_KEY', 'android:value': key } });
    }
    return modConfig;
  });
};
