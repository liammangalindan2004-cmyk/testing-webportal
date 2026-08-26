// PHASE 11/12: inline <script> syntax validation for portal HTML pages.
// Usage: node scripts/p12-syntax-check.cjs [file1.html file2.html ...]
//        (no args = validate every .html in the three portals)
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const b = path.join(__dirname, '..');

let files = process.argv.slice(2);
if (!files.length) {
  for (const d of ['UNMEIstudentsportal', 'UNMEIadminportal', 'UNMEIinstructorportal']) {
    for (const f of fs.readdirSync(path.join(b, d))) {
      if (f.endsWith('.html')) files.push(d + '/' + f);
    }
  }
}

let failures = 0;
for (const f of files) {
  const full = path.join(b, f);
  if (!fs.existsSync(full)) { console.log('MISSING: ' + f); failures++; continue; }
  const html = fs.readFileSync(full, 'utf8');
  const re = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, i = 0, bad = 0;
  while ((m = re.exec(html)) !== null) {
    i++;
    try { new vm.Script(m[1], { filename: f + '#' + i }); }
    catch (e) { bad++; failures++; console.log('SYNTAX FAIL ' + f + ' block ' + i + ': ' + e.message); }
  }
  console.log((bad ? 'FAIL ' : 'OK   ') + f + ' (' + i + ' blocks)');
}
console.log(failures === 0 ? 'SYNTAX_CHECK_PASS' : 'SYNTAX_CHECK_FAIL (' + failures + ')');
process.exit(failures ? 1 : 0);
