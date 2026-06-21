import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function testRealTaskCreatesAreSyncedToKommo() {
  const sourcePath = resolve(__dirname, 'collaboration.service.ts');
  const lines = readFileSync(sourcePath, 'utf8').split(/\r?\n/);
  const taskCreateLineIndexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.includes('tx.task.create({'))
    .map(({ index }) => index);

  assert.equal(
    taskCreateLineIndexes.length,
    3,
    'Update this invariant when adding or removing real task creation paths.',
  );

  for (const index of taskCreateLineIndexes) {
    const nearbySource = lines.slice(index, index + 150).join('\n');
    assert.match(
      nearbySource,
      /kommoService\.recordTaskCreated\(/,
      `Task created near line ${index + 1} must be synced to Kommo.`,
    );
  }
}

function testFallbackEmployeeCreatesAreSyncedToKommo() {
  const sourcePath = resolve(__dirname, 'collaboration.service.ts');
  const lines = readFileSync(sourcePath, 'utf8').split(/\r?\n/);
  const employeeCreateLineIndexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.includes('tx.employee.create({'))
    .map(({ index }) => index);

  assert.equal(
    employeeCreateLineIndexes.length,
    1,
    'Update this invariant when collaboration employee fallback creation paths change.',
  );

  for (const index of employeeCreateLineIndexes) {
    const nearbySource = lines.slice(index, index + 80).join('\n');
    assert.match(
      nearbySource,
      /kommoService\.recordEmployeeCreated\(/,
      `Employee created near line ${index + 1} must be synced to Kommo.`,
    );
  }
}

async function main() {
  testRealTaskCreatesAreSyncedToKommo();
  testFallbackEmployeeCreatesAreSyncedToKommo();
  console.log('collaboration flow tests passed');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
