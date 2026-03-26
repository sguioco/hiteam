const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

const appDir = path.resolve(__dirname, '..', 'apps', 'api');
const prismaSchema = 'prisma/schema.prisma';
const profileArg = process.argv.find((arg) => arg.startsWith('--profile='));
const profile = profileArg ? profileArg.split('=')[1] : 'local';
const command = process.argv[2];

const profileEnv = {
  docker: {
    DATABASE_URL: 'postgresql://smart:smart@localhost:5433/smart',
  },
  local: {},
};

function loadApiEnv() {
  const env = {};
  const files = ['.env', '.env.local'];

  for (const file of files) {
    const fullPath = path.join(appDir, file);
    if (!fs.existsSync(fullPath)) {
      continue;
    }

    Object.assign(env, dotenv.parse(fs.readFileSync(fullPath)));
  }

  return env;
}

function runPnpm(args, env) {
  const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const result = spawnSync(pnpmCommand, args, {
    cwd: appDir,
    env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function buildEnv() {
  const overrides = profileEnv[profile];

  if (!overrides) {
    console.error(`Unknown Prisma profile: ${profile}`);
    process.exit(1);
  }

  return {
    ...loadApiEnv(),
    ...process.env,
    ...overrides,
  };
}

function run(commandName, env) {
  switch (commandName) {
    case 'generate':
      runPnpm(['exec', 'prisma', 'generate', '--schema', prismaSchema], env);
      return;
    case 'push':
      runPnpm(['exec', 'prisma', 'db', 'push', '--schema', prismaSchema], env);
      return;
    case 'migrate':
      runPnpm(['exec', 'prisma', 'migrate', 'dev', '--schema', prismaSchema], env);
      return;
    case 'seed':
      run('generate', env);
      runPnpm(['exec', 'ts-node', 'prisma/seed.ts'], env);
      return;
    default:
      console.error('Usage: node scripts/run-api-prisma.cjs <generate|push|migrate|seed> [--profile=local|docker]');
      process.exit(1);
  }
}

run(command, buildEnv());
