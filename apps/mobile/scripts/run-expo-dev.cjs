const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const { warnIfUnsupportedNode } = require('./check-node-version.cjs');

const DEFAULT_PORT = Number(process.env.SMART_EXPO_PORT || 8082);
const MAX_PORT_ATTEMPTS = 10;
const DEFAULT_HOST = process.env.SMART_EXPO_HOST || 'auto';

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.unref();
    server.on('error', () => resolve(false));
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(startPort) {
  for (let offset = 0; offset < MAX_PORT_ATTEMPTS; offset += 1) {
    const port = startPort + offset;
    if (await isPortFree(port)) {
      return port;
    }
  }

  throw new Error(
    `[smart/mobile] Не удалось найти свободный порт в диапазоне ${startPort}-${startPort + MAX_PORT_ATTEMPTS - 1}.`,
  );
}

function getAdbPath() {
  const envCandidates = [
    process.env.ADB_PATH,
    process.env.ANDROID_SDK_ROOT
      ? path.join(process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe')
      : null,
    process.env.ANDROID_HOME
      ? path.join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe')
      : null,
    'C:\\Users\\avoka\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe',
  ].filter(Boolean);

  return envCandidates.find((candidate) => {
    try {
      return require('fs').existsSync(candidate);
    } catch {
      return false;
    }
  });
}

function execCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr || stdout || `Command failed with exit code ${code}`));
    });
  });
}

async function setupAdbReverse(port) {
  const adbPath = getAdbPath();
  if (!adbPath) {
    return false;
  }

  try {
    const devices = await execCommand(adbPath, ['devices']);
    const hasEmulator = devices.stdout
      .split(/\r?\n/)
      .some((line) => /^emulator-\d+\s+device$/.test(line.trim()));

    if (!hasEmulator) {
      return false;
    }

    await execCommand(adbPath, ['reverse', `tcp:${port}`, `tcp:${port}`]);
    console.warn(
      `[smart/mobile] ADB reverse настроен: localhost:${port} -> host:${port}.`,
    );
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[smart/mobile] Не удалось настроить adb reverse: ${message}`);
    return false;
  }
}

async function main() {
  warnIfUnsupportedNode();

  const onlineMode = process.argv.includes('--online');
  const clearCache = process.argv.includes('--clear');
  const skipDependencyValidation =
    !onlineMode && process.env.EXPO_NO_DEPENDENCY_VALIDATION === undefined;
  const requestedHostMode = process.argv.includes('--lan')
    ? 'lan'
    : process.argv.includes('--tunnel')
      ? 'tunnel'
      : process.argv.includes('--localhost')
        ? 'localhost'
        : DEFAULT_HOST;
  const port = await findAvailablePort(DEFAULT_PORT);

  if (port !== DEFAULT_PORT) {
    console.warn(
      `[smart/mobile] Порт ${DEFAULT_PORT} занят. Запускаю Expo на ${port}.`,
    );
  }

  const expoPackageJsonPath = require.resolve('expo/package.json', {
    paths: [path.resolve(__dirname, '..')],
  });
  const expoBinPath = path.join(path.dirname(expoPackageJsonPath), 'bin', 'cli');
  const shouldUseLocalhost =
    requestedHostMode === 'localhost' ||
    requestedHostMode === 'auto';
  const didSetupAdbReverse = shouldUseLocalhost
    ? await setupAdbReverse(port)
    : false;
  const useLocalhostTransport =
    requestedHostMode === 'localhost' ||
    (requestedHostMode === 'auto' && didSetupAdbReverse);
  const resolvedHostMode =
    requestedHostMode === 'auto'
      ? useLocalhostTransport
        ? 'localhost'
        : 'lan'
      : requestedHostMode;
  const shouldUseExpoOfflineFlag = !onlineMode && resolvedHostMode === 'lan';
  const args = ['start', '--port', String(port)];

  if (clearCache) {
    args.push('--clear');
  }

  if (shouldUseExpoOfflineFlag) {
    args.push('--offline');
  } else if (resolvedHostMode === 'tunnel') {
    args.push('--tunnel');
  } else if (resolvedHostMode === 'localhost') {
    args.push('--localhost');
  } else {
    args.push('--lan');
  }

  if (useLocalhostTransport) {
    console.warn(
      `[smart/mobile] Режим запуска: localhost через adb reverse, Expo URL будет указывать на 127.0.0.1:${port}.`,
    );
    if (!onlineMode) {
      console.warn(
        '[smart/mobile] Expo CLI не разрешает совмещать --offline и --localhost; запускаю без --offline.',
      );
    }
  } else {
    console.warn(
      `[smart/mobile] Режим запуска: ${resolvedHostMode}${shouldUseExpoOfflineFlag ? ' (offline)' : ''}.`,
    );
    if (!onlineMode && !shouldUseExpoOfflineFlag) {
      console.warn(
        `[smart/mobile] Expo CLI не разрешает совмещать --offline и --${resolvedHostMode}; запускаю без --offline.`,
      );
    }
  }

  if (clearCache) {
    console.warn('[smart/mobile] Metro cache будет очищен перед стартом.');
  }

  if (skipDependencyValidation) {
    console.warn(
      '[smart/mobile] Отключаю Expo dependency validation для локального запуска без сетевых запросов.',
    );
  }

  const child = spawn(process.execPath, [expoBinPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      SMART_LOCAL_DEV: '1',
      ...(skipDependencyValidation
        ? { EXPO_NO_DEPENDENCY_VALIDATION: '1' }
        : {}),
      ...(useLocalhostTransport
        ? { REACT_NATIVE_PACKAGER_HOSTNAME: '127.0.0.1' }
        : {}),
    },
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });

  child.on('error', (error) => {
    console.error(error);
    process.exit(1);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
