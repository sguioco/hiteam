import path from 'node:path';

const root = path.join(__dirname, '..');

const suites = [
  'src/config/validate-environment.test.ts',
  'src/modules/mail/email-flows.test.ts',
  'src/modules/billing/billing-flows.test.ts',
  'src/modules/kommo/kommo-flows.test.ts',
  'src/modules/collaboration/collaboration-flows.test.ts',
  'src/modules/employees/employees-flows.test.ts',
  'src/modules/org/org-radius.test.ts',
  'src/modules/org/org-multi-location.test.ts',
  'src/modules/altegio-sync/altegio-sync.helpers.test.ts',
  'src/modules/altegio-sync/altegio-pilot-outbound.test.ts',
  'scripts/test-altegio-marketplace-helpers.ts',
  'src/modules/attendance/attendance-location.test.ts',
] as const;

function runSuite(relativePath: (typeof suites)[number]) {
  // Each suite self-executes on load; async suites keep the process alive until done.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require(path.join(root, relativePath));
}

for (const suite of suites) {
  runSuite(suite);
}
