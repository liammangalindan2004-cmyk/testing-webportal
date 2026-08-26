/**
 * PORTABILITY AUDIT — detects anything machine-bound in the SHIPPED system.
 * Scope: all code + operational docs. Owner-provided planning artifacts
 * (implementation_plan.md, firebase-allin-migration-implementation.md) are
 * EXCLUDED from the shipped-surface scan: their file:/// editor links were
 * authored by the planning tool, not by the product.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const walk = (dir, out = []) => {
  for (const f of fs.readdirSync(dir)) {
    if (f === 'node_modules' || f.startsWith('.') || f === 'dist') continue;
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) walk(fp, out); else out.push(fp);
  }
  return out;
};

// Owner-provided planning artifacts are excluded from the shipped surface:
// their file:/// editor links were authored by the planning tool itself.
const OWNER_DOCS = new Set([
  'implementation_plan.md',
  'firebase-allin-migration-implementation.md',
]);
const files = walk(ROOT).filter(f => !OWNER_DOCS.has(path.basename(f)))
  // exclude this audit script (self-match on its own regex literals) and
  // transient tmp-* codemods
  .filter(f => path.basename(f) !== 'portability-audit.cjs' && !/[/\\]tmp-/.test(f));
const issues = { absPath: [], userName: [], oneDrive: [], driveLetter: [], fileProto: [] };
const ABS_RE = /[A-Za-z]:\\+(?:Users|Windows|Program Files|xampp|wamp)/i;
const USER_RE = /John\s+Raphael/i;
const OD_RE = /OneDrive/i;
const DRIVE_RE = /["'\s(=:]([A-Z]):\\\//;
const FILE_RE = /file:\/\//i;

for (const f of files) {
  const ext = path.extname(f).toLowerCase();
  if (!['.html', '.js', '.jsx', '.css', '.json', '.md', '.ps1', '.cjs', '.xml', '.rules'].includes(ext)) continue;
  const rel = path.relative(ROOT, f);
  const text = fs.readFileSync(f, 'utf8');
  const lines = text.split('\n');
  lines.forEach((ln, i) => {
    const tag = rel + ':' + (i + 1);
    // firebase.json / .firebaserc may legitimately contain none; scan all
    if (ABS_RE.test(ln)) issues.absPath.push(tag + ': ' + ln.trim().slice(0, 110));
    else if (USER_RE.test(ln)) issues.userName.push(tag + ': ' + ln.trim().slice(0, 110));
    else if (OD_RE.test(ln) && ext !== '.md') issues.oneDrive.push(tag + ': ' + ln.trim().slice(0, 110));
    else if (ext !== '.md' && DRIVE_RE.test(ln)) issues.driveLetter.push(tag + ': ' + ln.trim().slice(0, 110));
    if (FILE_RE.test(ln) && ext === '.html') issues.fileProto.push(tag + ': ' + ln.trim().slice(0, 110));
  });
}
for (const k of Object.keys(issues)) {
  console.log(k.toUpperCase() + '=' + issues[k].length);
  issues[k].slice(0, 15).forEach(x => console.log('   ' + x));
}
console.log((issues.absPath.length + issues.userName.length + issues.oneDrive.length +
  issues.fileProto.length === 0 && issues.driveLetter.length === 0)
  ? 'PORTABILITY_PATH_PASS' : 'PORTABILITY_ISSUES_FOUND');