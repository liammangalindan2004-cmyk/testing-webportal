// PHASE 9: order-independent deep comparison of live RTDB backup vs seed payload.
// Usage: node scripts/p9-live-diff.cjs [backup-file.json]
const fs = require('fs');
const path = require('path');
const b = path.join(__dirname, '..');

function readJson(f) {
  let t = fs.readFileSync(f, 'utf8');
  if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1); // strip BOM
  return JSON.parse(t);
}

function stripSchemas(o) {
  if (Array.isArray(o)) return o.map(stripSchemas);
  if (o && typeof o === 'object') {
    const r = {};
    for (const k of Object.keys(o)) {
      if (k === '_schema') continue;
      r[k] = stripSchemas(o[k]);
    }
    return r;
  }
  return o;
}

function stableStringify(v) {
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}';
  }
  return JSON.stringify(v);
}

let backupArg = process.argv[2];
if (!backupArg) {
  const cands = fs.readdirSync(b).filter(f => /^firebase-backup-.*\.json$/.test(f)).sort();
  if (!cands.length) { console.error('no firebase-backup-*.json found in repo root'); process.exit(1); }
  backupArg = cands[cands.length - 1];
}
console.log('comparing live backup: ' + backupArg);
const live = readJson(path.join(b, backupArg));
const payload = stripSchemas(readJson(path.join(b, 'firebase-database-structure.json')));

let differs = 0;
const nodes = new Set([...Object.keys(live), ...Object.keys(payload)]);
for (const n of [...nodes].sort()) {
  const l = n in live ? stableStringify(live[n]) : '<absent>';
  const p = n in payload ? stableStringify(payload[n]) : '<absent>';
  if (l === p) { console.log('IDENTICAL: ' + n); continue; }
  differs++;
  const lc = live[n] && typeof live[n] === 'object' ? Object.keys(live[n]).length : 0;
  const pc = payload[n] && typeof payload[n] === 'object' ? Object.keys(payload[n]).length : 0;
  console.log('DIFFERS:   ' + n + ' (live keys=' + lc + ', payload keys=' + pc + ')');
}
console.log(differs === 0 ? 'LIVE_MATCHES_PAYLOAD' : 'NODES_DIFFERING=' + differs);
