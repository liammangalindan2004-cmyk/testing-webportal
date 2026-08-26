// PHASE 11: Nav integrity sweep - all portals.
// Checks per HTML page: internal hrefs + JS location targets resolve to an
// existing file in the same directory; flags dead links.
const fs = require('fs');
const path = require('path');
const b = path.join(__dirname, '..');
const portals = ['UNMEIstudentsportal', 'UNMEIadminportal', 'UNMEIinstructorportal'];

let totalLinks = 0, dead = [];
for (const portal of portals) {
  const dir = path.join(b, portal);
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(dir, f), 'utf8');
    const targets = [];
    // href="..." internal only
    for (const m of html.matchAll(/href\s*=\s*"([^"#]+)"/g)) {
      const t = m[1].trim();
      if (/^(https?:|mailto:|tel:|javascript:|data:)/i.test(t)) continue;
      targets.push(t.split('?')[0].split('#')[0]);
    }
    // location.href = '...' / location.replace('...')
    for (const m of html.matchAll(/location\.href\s*=\s*['"]([^'"]+)['"]/g)) {
      const t = m[1].trim();
      if (/^(https?:|javascript:)/i.test(t) || t.startsWith('#')) continue;
      targets.push(t.split('?')[0]);
    }
    for (const m of html.matchAll(/location\.replace\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const t = m[1].trim();
      if (/^(https?:|javascript:)/i.test(t)) continue;
      targets.push(t.split('?')[0]);
    }
    for (const t of targets) {
      totalLinks++;
      if (!t) { dead.push(portal + '/' + f + ' -> empty target'); continue; }
      if (!/\.[a-zA-Z0-9]+$/.test(t)) continue; // extensionless route (hosting rewrite, e.g. /register)
      const resolved = path.resolve(dir, t);
      if (!fs.existsSync(resolved)) dead.push(portal + '/' + f + ' -> ' + t + ' [MISSING]');
    }
  }
}
console.log('internal link targets checked: ' + totalLinks);
if (dead.length) { console.log('DEAD/BAD LINKS (' + dead.length + '):'); dead.forEach(d => console.log('  ' + d)); console.log('NAV_CHECK_FAIL'); process.exit(1); }
console.log('NAV_CHECK_PASS (zero dead links)');
