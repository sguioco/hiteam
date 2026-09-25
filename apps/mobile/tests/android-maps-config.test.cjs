const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const expo = path.join(root, 'node_modules', '.bin', 'expo');
const testKey = 'android-maps-config-test-key';
const withKey = spawnSync(expo, ['config', '--type', 'introspect', '--json'], {
  cwd: root,
  env: { ...process.env, GOOGLE_MAPS_ANDROID_API_KEY: testKey },
  encoding: 'utf8',
});
assert.equal(withKey.status, 0, withKey.stderr);
const config = JSON.parse(withKey.stdout);
const metadata = config._internal.modResults.android.manifest.manifest.application[0]['meta-data'];
const keyEntries = metadata.filter((entry) => entry.$['android:name'] === 'com.google.android.geo.API_KEY');
assert.equal(keyEntries.length, 1);
assert.equal(keyEntries[0].$['android:value'], testKey);

const envWithoutKey = { ...process.env };
delete envWithoutKey.GOOGLE_MAPS_ANDROID_API_KEY;
const withoutKey = spawnSync(expo, ['config', '--type', 'introspect'], {
  cwd: root,
  env: envWithoutKey,
  encoding: 'utf8',
});
assert.notEqual(withoutKey.status, 0);
assert.match(withoutKey.stderr, /GOOGLE_MAPS_ANDROID_API_KEY/);
console.log('Android Maps build configuration tests passed');
