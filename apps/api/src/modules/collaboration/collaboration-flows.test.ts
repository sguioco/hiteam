import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function assertNearbySource(
  lines: string[],
  marker: string,
  pattern: RegExp,
  message: string,
  windowSize = 180,
) {
  const index = lines.findIndex((line) => line.includes(marker));
  assert.notEqual(index, -1, `Marker "${marker}" must exist.`);
  const nearbySource = lines.slice(index, index + windowSize).join('\n');
  assert.match(nearbySource, pattern, message);
}

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

function testTaskActivityUpdatesAreSyncedToKommo() {
  const sourcePath = resolve(__dirname, 'collaboration.service.ts');
  const lines = readFileSync(sourcePath, 'utf8').split(/\r?\n/);

  for (const marker of [
    'async setTaskStatus',
    'async rescheduleTask',
    'async toggleChecklistItem',
    'async addTaskComment',
    'async addTaskPhotoProof',
    'async deleteTaskPhotoProof',
  ]) {
    assertNearbySource(
      lines,
      marker,
      /kommoService\.recordTaskUpdated\(/,
      `${marker} must sync task activity to Kommo.`,
      260,
    );
  }

  for (const marker of [
    'private async setRecurringTaskStatus',
    'private async addRecurringTaskPhotoProof',
    'private async deleteRecurringTaskPhotoProof',
  ]) {
    assertNearbySource(
      lines,
      marker,
      /kommoService\.recordRecurringTaskUpdated\(/,
      `${marker} must sync recurring task activity to Kommo.`,
      260,
    );
  }
}

function testTaskTemplateLifecycleIsSyncedToKommo() {
  const sourcePath = resolve(__dirname, 'collaboration.service.ts');
  const lines = readFileSync(sourcePath, 'utf8').split(/\r?\n/);

  assertNearbySource(
    lines,
    'async createTaskTemplate',
    /kommoService\.recordTaskTemplateCreated\(/,
    'Recurring task template creation must be synced to Kommo.',
    140,
  );

  assertNearbySource(
    lines,
    'async updateTaskTemplate',
    /kommoService\.recordTaskTemplateUpdated\(/,
    'Recurring task template updates must be synced to Kommo.',
    180,
  );

  assertNearbySource(
    lines,
    'async toggleTaskTemplate',
    /kommoService\.recordTaskTemplateUpdated\(/,
    'Recurring task template pause/activation must be synced to Kommo.',
    120,
  );

  assertNearbySource(
    lines,
    'async deleteTaskTemplate',
    /kommoService\.recordTaskTemplateDeleted\(/,
    'Recurring task template deletion must be synced to Kommo.',
    180,
  );
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
  testTaskActivityUpdatesAreSyncedToKommo();
  testTaskTemplateLifecycleIsSyncedToKommo();
  testFallbackEmployeeCreatesAreSyncedToKommo();
  console.log('collaboration flow tests passed');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
