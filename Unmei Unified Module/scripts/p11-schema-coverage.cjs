// PHASE 11: Schema <-> code coverage report.
// 1) Every database.ref('...') root read/written by portal pages must exist
//    in the canonical payload (or be on the runtime-only allow-list).
// 2) Field-family coverage: dotted access chains (profile.*, enrollment.*,
//    performance.*, credentials.*) used by pages must exist in the dataset.
const fs = require('fs');
const path = require('path');
const b = path.join(__dirname, '..');

function readJson(f) {
  let t = fs.readFileSync(f, 'utf8');
  if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
  return JSON.parse(t);
}
function stripSchemas(o) {
  if (Array.isArray(o)) return o.map(stripSchemas);
  if (o && typeof o === 'object') { const r = {}; for (const k of Object.keys(o)) { if (k === '_schema') continue; r[k] = stripSchemas(o[k]); } return r; }
  return o;
}
function hasPath(obj, parts) {
  let cur = obj;
  for (const p of parts) {
    if (cur === null || typeof cur !== 'object' || !(p in cur)) return false;
    cur = cur[p];
  }
  return true;
}

const payload = stripSchemas(readJson(path.join(b, 'firebase-database-structure.json')));
const RUNTIME_ONLY = new Set(['logs', 'notifications', 'messages', 'contact_leads', 'session', 'payment_receipts']);

let missingRoots = [], totalRefs = 0;
const pages = [];
for (const portal of ['UNMEIstudentsportal', 'UNMEIadminportal', 'UNMEIinstructorportal']) {
  const dir = path.join(b, portal);
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.html'))) {
    pages.push({ portal, f, html: fs.readFileSync(path.join(dir, f), 'utf8') });
  }
}

const fieldFamilies = new Map(); // fam -> [{page, line, defensible}]
for (const pg of pages) {
  // 1) root refs (strip trailing /path segments -> check first segment)
  for (const m of pg.html.matchAll(/(?:database|firebase\.database\(\))\s*\.\s*ref\(\s*['"]([^'"]+)['"]/g)) {
    totalRefs++;
    const root = m[1].split('/')[0].split('?')[0].trim();
    if (!root) continue;
    if (!RUNTIME_ONLY.has(root) && !hasPath(payload, [root])) {
      missingRoots.push(pg.portal + '/' + pg.f + ' -> ref("' + m[1] + '") : node "' + root + '" not in canonical payload');
    }
  }
  // 2) field-family chains actually accessed (line-aware for defensiveness).
  // A line whose access is part of a multi-line guarded expression inherits
  // the guard from adjacent lines (e.g. "cond !== undefined\n  ? x.field").
  const lines = pg.html.split('\n');
  const guardRe = /\|\||!==\s*undefined|typeof\s+\S+\s*===\s*'number'|&&/;
  lines.forEach((line, li) => {
    for (const m of line.matchAll(/\.(profile|enrollment|performance|credentials)\.([a-zA-Z_][a-zA-Z0-9_]*)/g)) {
      const fam = m[1] + '.' + m[2];
      if (!fieldFamilies.has(fam)) fieldFamilies.set(fam, []);
      const selfGuard = guardRe.test(line);
      const prev = (lines[li - 1] || '').trim();
      const next = (lines[li + 1] || '').trim();
      const isContinuation = /^\?/.test(line.trim()) || /&&\s*$|\?\s*$/.test(prev);
      const ctxGuard = selfGuard
        || (isContinuation && (guardRe.test(prev) || guardRe.test(next)));
      fieldFamilies.get(fam).push({
        page: pg.portal + '/' + pg.f,
        lineNo: li + 1,
        text: line.trim().slice(0, 140),
        defensible: ctxGuard
      });
    }
  });
}

let famMissing = [], famDefensible = [];
const familyRootMap = {
  profile: () => Object.values(payload.students || {}),
  enrollment: () => Object.values(payload.students || {}),
  performance: () => Object.values(payload.students || {}),
  credentials: () => Object.values(payload.instructors || {})
};
for (const [fam, occurrences] of [...fieldFamilies].sort()) {
  const dot = fam.indexOf('.');
  const root = fam.slice(0, dot);
  const rest = fam.slice(dot + 1).split('.');
  let found = false;
  // _schema check first
  if (root === 'profile' || root === 'enrollment' || root === 'performance') {
    const sch = ((payload.students || {})._schema || {})[root];
    let cur = sch;
    for (const part of rest) { cur = cur && typeof cur === 'object' ? cur[part] : undefined; }
    if (cur !== undefined) found = true;
  } else if (root === 'credentials') {
    const sch = ((payload.instructors || {})._schema || {}).credentials;
    let cur = sch;
    for (const part of rest) { cur = cur && typeof cur === 'object' ? cur[part] : undefined; }
    if (cur !== undefined) found = true;
  }
  if (!found) {
    for (const rec of familyRootMap[root] ? familyRootMap[root]() : []) {
      let cur = rec ? rec[root] : undefined;
      for (const part of rest) { cur = cur && typeof cur === 'object' ? cur[part] : undefined; }
      if (cur !== undefined && cur !== null) { found = true; break; }
    }
  }
  if (!found) {
    const allDefensible = occurrences.every(o => o.defensible);
    if (allDefensible) {
      famDefensible.push(fam);
      console.log('DEFENSIBLE (guarded legacy/optional read): ' + fam);
      occurrences.forEach(o => console.log('   ' + o.page + ':' + o.lineNo + ' -> ' + o.text));
    } else {
      famMissing.push(fam);
      console.log('HARD NO-SOURCE: ' + fam);
      occurrences.forEach(o => console.log('   ' + o.page + ':' + o.lineNo + ' -> ' + o.text));
    }
  }
}

console.log('pages scanned: ' + pages.length);
console.log('database.ref() calls checked: ' + totalRefs);
console.log('missing/unknown root nodes: ' + missingRoots.length);
missingRoots.forEach(x => console.log('  MISSING ROOT: ' + x));
console.log('field families tracked: ' + fieldFamilies.size);
console.log('defensible non-canonical reads: ' + famDefensible.length);
console.log('hard no-source families: ' + famMissing.length);
if (missingRoots.length === 0 && famMissing.length === 0) { console.log('SCHEMA_COVERAGE_PASS'); process.exit(0); }
console.log('SCHEMA_COVERAGE_FAIL');
process.exit(1);
