import assert from 'node:assert/strict';
import { requestTelemetryAttributes } from './request-attributes';

assert.deepEqual(
  requestTelemetryAttributes({
    'x-hiteam-client': 'mobile',
    'x-hiteam-client-platform': 'Android',
    'x-hiteam-client-version': '1.4.0',
  }),
  {
    'hiteam.client.type': 'mobile',
    'hiteam.client.platform': 'android',
    'hiteam.client.version': '1.4.0',
  },
);

assert.deepEqual(
  requestTelemetryAttributes({
    'x-hiteam-client': 'untrusted-client',
    'x-hiteam-client-platform': 'android;email=person@example.com',
    'x-hiteam-client-version': 'build 123',
  }),
  {
    'hiteam.client.type': 'unknown',
    'hiteam.client.platform': 'unknown',
    'hiteam.client.version': 'unknown',
  },
);

console.log('OpenTelemetry request attributes tests passed');
