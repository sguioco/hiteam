import assert from 'node:assert/strict';
import { validateEnvironment } from './validate-environment';

function run() {
  const developmentConfig = { NODE_ENV: 'development' };
  assert.equal(validateEnvironment(developmentConfig), developmentConfig);

  assert.throws(
    () => validateEnvironment({ NODE_ENV: 'production' }),
    (error: unknown) => {
      assert(error instanceof Error);
      assert.match(error.message, /JWT_ACCESS_SECRET is required/);
      assert.match(error.message, /JWT_REFRESH_SECRET is required/);
      return true;
    },
  );

  assert.throws(
    () =>
      validateEnvironment({
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'change-me-access-secret',
        JWT_REFRESH_SECRET: 'change-me-refresh-secret',
      }),
    /must contain at least 32 characters/,
  );

  assert.throws(
    () =>
      validateEnvironment({
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'a'.repeat(32),
      }),
    /must be different/,
  );

  const productionConfig = {
    NODE_ENV: 'production',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
  };
  assert.equal(validateEnvironment(productionConfig), productionConfig);

  console.log('environment validation tests passed');
}

run();
