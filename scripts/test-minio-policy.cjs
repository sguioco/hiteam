const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const policy = JSON.parse(fs.readFileSync(path.join(root, '.cd/files/minio-public-policy.json'), 'utf8').replaceAll('{{ .Values.minio.bucket }}', 'smart-local'));
const objects = policy.Statement.find(s => s.Action.includes('s3:GetObject'));
assert.deepEqual(objects.Resource, [
  'arn:aws:s3:::smart-local/employees/*/avatars/*',
  'arn:aws:s3:::smart-local/tenants/*/announcements/*',
  'arn:aws:s3:::smart-local/tenants/*/requests/*',
  'arn:aws:s3:::smart-local/exports/*',
  'arn:aws:s3:::smart-local/biometric/*',
]);
assert.deepEqual(policy.Statement[0].Action, ['s3:GetBucketLocation', 's3:ListBucket']);
const job = fs.readFileSync(path.join(root, '.cd/templates/job-minio-bucket.yaml'), 'utf8');
assert.ok(job.includes('set -eu'));
assert.ok(job.includes('anonymous set-json'));
assert.ok(!job.includes('anonymous set download'));
assert.ok(!job.includes('|| true'));
console.log('MinIO policy regression passed');
