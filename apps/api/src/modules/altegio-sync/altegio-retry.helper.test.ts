import assert from 'node:assert/strict';
import { altegioRetryPolicy, parseAltegioRetryAfterSeconds } from './altegio-retry.helper';

const retryAfterSeconds = parseAltegioRetryAfterSeconds('2');
assert.equal(retryAfterSeconds, 2);

const retry = altegioRetryPolicy(
  { attempt: 0, maxAttempts: 3, baseDelayMs: 600 },
  retryAfterSeconds === null ? undefined : retryAfterSeconds * 1000,
);
assert.equal(retry.kind, 'retry');
if (retry.kind === 'retry') {
  assert.ok(retry.delayMs >= 2000 && retry.delayMs <= 2150);
}

assert.deepEqual(
  altegioRetryPolicy({ attempt: 2, maxAttempts: 3 }, 2000),
  { kind: 'give_up' },
);

console.log('Altegio retry policy tests passed');
