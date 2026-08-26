/** Live E2E: runs the REAL firestore-shim.js against LIVE Cloud Firestore
 *  using firebase@9.22.2 compat (same major as the pages' gstatic SDKs). */
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FB9 = path.join(__dirname, 'tmp-fb9', 'node_modules');
const firebase = require(path.join(FB9, 'firebase/compat/app'));
require(path.join(FB9, 'firebase/compat/firestore'));
global.window = {};
firebase.initializeApp({
  apiKey: 'AIzaSyDI9ziVzajecsq7Ab4NPeCFb3VLDsa35UU',
  projectId: 'unmei-nihongo-center'
});
// Load the real shim exactly as browsers do
require('fs').readFileSync(path.join(ROOT, 'UNMEIstudentsportal', 'assets', 'firestore-shim.js'), 'utf8');
eval(require('fs').readFileSync(path.join(ROOT, 'UNMEIstudentsportal', 'assets', 'firestore-shim.js'), 'utf8'));
if (!firebase.database) { console.error('SHIM did not expose firebase.database'); process.exit(2); }
let pass = 0, fail = 0; const results = [];
global.__test = async (name, fn) => {
  try { await fn(); pass++; results.push('PASS  ' + name); }
  catch (e) { fail++; results.push('FAIL  ' + name + ' :: ' + (e && e.message)); }
};
const testsSource = require(path.join(__dirname, 'p8-shim-tests.cjs'));
(async () => {
  await eval(testsSource);
  results.forEach(r => console.log(r));
  console.log(`SHIM_LIVE_E2E: ${fail === 0 ? 'PASS' : 'FAIL'} (${pass}/${pass + fail})`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('RUNNER_ERROR:', e.message); process.exit(2); });
