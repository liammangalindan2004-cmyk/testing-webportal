/** Final security & cleanliness battery (Phase 8 close-out). */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const PORTALS = ['UNMEIstudentsportal', 'UNMEIadminportal', 'UNMEIinstructorportal'];
const walk = (dir, out = []) => {
  for (const f of fs.readdirSync(dir)) {
    if (f === 'node_modules' || f.startsWith('.')) continue;
    const fp = path.join(dir, f);
    const st = fs.statSync(fp);
    if (st.isDirectory()) walk(fp, out);
    else out.push(fp);
  }
  return out;
};

let files = [];
for (const p of PORTALS) files = files.concat(walk(path.join(ROOT, p)));
files = files.concat(walk(path.join(ROOT, 'UNMEIwebsite')));
// regis source only (dist is minified bundle)
files = files.filter(f => !f.includes(`${path.sep}dist${path.sep}`))
  .concat(walk(path.join(ROOT, 'UNMEIregis', 'src')));

const rawDialogRe = /(^|[^.\w])(alert|confirm|prompt)\s*\(/;
const emojiRe = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
let rawHits = [], emojiHits = [], consoleLogHits = [];
for (const f of files) {
  const ext = path.extname(f).toLowerCase();
  if (!['.html', '.js', '.jsx', '.css'].includes(ext)) continue;
  const text = fs.readFileSync(f, 'utf8');
  const rel = path.relative(ROOT, f);
  // strip custom impls: showConfirm/showAlert/showToast are sanctioned
  const stripped = text.replace(/show(Alert|Confirm|Prompt|Input|Toast)\s*\(/g, 'OK(');
  if (rawDialogRe.test(stripped)) rawHits.push(rel);
  if (emojiRe.test(text)) emojiHits.push(rel);
  if (ext !== '.css') {
    text.split('\n').forEach((line, i) => {
      if (/console\.log\(/.test(line) && !/min/.test(f)) consoleLogHits.push(rel + ':' + (i + 1));
    });
  }
}
console.log('FILES_SCANNED=' + files.length);
console.log('RAW_DIALOG_HITS=' + rawHits.length + (rawHits.length ? '\n  ' + rawHits.join('\n  ') : ''));
console.log('EMOJI_HITS=' + emojiHits.length + (emojiHits.length ? '\n  ' + emojiHits.join('\n  ') : ''));
console.log('CONSOLE_LOG_HITS=' + consoleLogHits.length);

// Ghost artifacts sweep
const rootEntries = fs.readdirSync(ROOT).filter(n => !n.startsWith('.'));
const tmpLike = [];
(function sweep(dir) {
  for (const f of fs.readdirSync(dir)) {
    if (f === 'node_modules') continue;
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) sweep(fp);
    else if (/\.(tmp|bak|log)$|^tmp-|~$/.test(f)) tmpLike.push(path.relative(ROOT, fp));
  }
})(ROOT);
console.log('TMP_ARTIFACTS=' + tmpLike.length + (tmpLike.length ? '\n  ' + tmpLike.join('\n  ') : ''));
console.log('ROOT_ENTRIES=' + rootEntries.join(', '));

const ok = rawHits.length === 0 && emojiHits.length === 0 && tmpLike.length === 0 && consoleLogHits.length === 0;
console.log(ok ? 'CLOSEOUT_SECURITY_PASS' : 'CLOSEOUT_ISSUES_FOUND');