const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const source = fs.readFileSync(path.join(__dirname, '../src/components/task-proof-image.tsx'), 'utf8');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
  jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
} }).outputText, { exports: exportsObject, URL, require(name) {
  if (name === 'react') return { ...React, useState: () => ['test-token', () => {}], useEffect: () => {} };
  if (name === 'react-native') return { Image: 'image' };
  if (name === '../../lib/api') return { getTaskPhotoAccessToken: async () => 'test-token' };
  if (name === '../../lib/api-config') return { API_URL: 'https://api.example.test' };
  return require(name);
} });
const { TaskProofImage, isProtectedTaskPhoto } = exportsObject;
const uri = 'https://api.example.test/api/v1/media/task-photo-proofs/proof/file';
assert.equal(isProtectedTaskPhoto(uri), true);
const protectedImage = TaskProofImage({ source: { uri } });
assert.equal(protectedImage.props.source.headers.Authorization, 'Bearer test-token');
assert.equal(protectedImage.props.source.cache, 'reload');
for (const other of ['file:///photo.jpg', 'data:image/jpeg;base64,AA', 'https://external.test/api/v1/media/task-photo-proofs/proof/file']) {
  assert.equal(isProtectedTaskPhoto(other), false);
  assert.equal(TaskProofImage({ source: { uri: other } }).props.source.headers, undefined);
}
console.log('Mobile task photo headers and origin isolation tests passed');
