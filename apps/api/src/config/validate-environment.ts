const MIN_JWT_SECRET_LENGTH = 32;
const JWT_SECRET_KEYS = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

const INSECURE_JWT_SECRETS = new Set([
  'change-me-access-secret',
  'change-me-refresh-secret',
  'change-me',
  'secret',
]);

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (config.NODE_ENV !== 'production') {
    return config;
  }

  const errors: string[] = [];

  for (const key of JWT_SECRET_KEYS) {
    const value = getString(config[key]);

    if (!value) {
      errors.push(`${key} is required`);
      continue;
    }

    if (
      value.length < MIN_JWT_SECRET_LENGTH ||
      INSECURE_JWT_SECRETS.has(value.toLowerCase())
    ) {
      errors.push(
        `${key} must contain at least ${MIN_JWT_SECRET_LENGTH} characters and must not use a placeholder value`,
      );
    }
  }

  const accessSecret = getString(config.JWT_ACCESS_SECRET);
  const refreshSecret = getString(config.JWT_REFRESH_SECRET);

  if (accessSecret && refreshSecret && accessSecret === refreshSecret) {
    errors.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid production environment configuration:\n${errors
        .map((error) => `- ${error}`)
        .join('\n')}`,
    );
  }

  return config;
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
