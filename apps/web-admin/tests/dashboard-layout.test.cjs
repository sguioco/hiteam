const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const source = readFileSync(join(__dirname, "../app/globals.css"), "utf8");

function hasDeclaration(selector, declaration) {
  let start = source.indexOf(`${selector} {`);

  assert.notEqual(start, -1, `${selector} rule must exist.`);

  while (start !== -1) {
    const end = source.indexOf("\n}", start);
    const rule = source.slice(start, end + 2);
    if (declaration.test(rule)) {
      return true;
    }
    start = source.indexOf(`${selector} {`, start + selector.length + 1);
  }

  return false;
}

assert.ok(
  hasDeclaration(".dashboard-main-card", /min-width:\s*0;/),
  "The dashboard grid item must be allowed to shrink instead of expanding past the viewport.",
);
assert.ok(
  hasDeclaration(".dashboard-activity-shell", /min-width:\s*0;/),
  "The nested activity grid must not impose its content width on the parent grid.",
);
assert.ok(
  hasDeclaration(".today-attendance-head", /flex-wrap:\s*wrap;/),
  "Attendance controls must wrap before the attendance count can overflow horizontally.",
);

console.log("dashboard layout tests passed");
