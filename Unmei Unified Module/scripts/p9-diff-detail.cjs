// PHASE 9 detail: show first differing paths inside a node.
// Usage: node scripts/p9-diff-detail.cjs <node> [backup.json]
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

function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object') {
    const r = {};
    for (const k of Object.keys(v).sort()) r[k] = stable(v[k]);
    return r;
  }
  return v;
}

function walk(l, p, basePath, out, depth) {
  if (out.length >= Number(process.env.MAXDIFF || 12)) return;
  if (JSON.stringify(l) === JSON.stringify(p)) return;
  if (l !== null && p !== null && typeof l === 'object' && typeof p === 'object') {
    const keys = new Set([...Object.keys(l), ...Object.keys(p)]);
    for (const k of keys) walk(l ? l[k] : undefined, p ? p[k] : undefined, basePath + '/' + k, out, depth + 1);
  } else {
    out.push(basePath + ' :: live=' + JSON.stringify(l) + ' | payload=' + JSON.stringify(p));
  }
}

let backupArg = process.argv[3];
if (!backupArg) {
  const cands = fs.readdirSync(b).filter(f => /^firebase-backup-.*\.json$/.test(f)).sort();
  backupArg = cands[cands.length - 1];
}
const liveRaw = readJson(path.join(b, backupArg));
const payRaw = readJson(path.join(b, 'firebase-database-structure.json'));
const node = process.argv[2];
const live = stable(stripSchemas(liveRaw[node] || {}));
const pay = stable(stripSchemas(payRaw[node] || {}));
const out = [];
walk(live, pay, node, out, 0);
console.log('differing paths in ' + node + ' (showing up to ' + out.length + '):');
out.forEach(x => console.log('  ' + x));
