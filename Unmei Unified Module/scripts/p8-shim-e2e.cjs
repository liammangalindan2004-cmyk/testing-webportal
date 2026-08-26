/**
 * P8 SHIM E2E HARNESS â€” runs the REAL firestore-shim.js in a browser-like
 * vm sandbox backed by modular Firestore (proven transport). Verifies every
 * shim behavior against LIVE Cloud Firestore.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const TESTS = require('./p8-shim-tests.cjs');

const ROOT = path.join(__dirname, '..');
module.paths.push(path.join(ROOT, 'UNMEIregis', 'node_modules'));
const { initializeApp } = require('firebase/app');
const {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, onSnapshot,
} = require('firebase/firestore');

const app = initializeApp({
  apiKey: 'AIzaSyDI9ziVzajecsq7Ab4NPeCFb3VLDsa35UU',
  projectId: 'unmei-nihongo-center',
});
const db = getFirestore(app);

function compatFs() {
  return {
    collection: function (name) {
      return {
        doc: function (id) {
          const dref = doc(db, name, id);
          return {
            // Clone crossing vm-realm boundary: Firestore rejects foreign-
            // realm objects ("custom Object"), browsers never hit this.
            set: (data, opts) => setDoc(dref, JSON.parse(JSON.stringify(data === undefined ? null : data)), opts),
            update: (patch) => updateDoc(dref, JSON.parse(JSON.stringify(patch))),
            delete: () => deleteDoc(dref),
            get: () => getDoc(dref),
            onSnapshot: (ok, err) => onSnapshot(dref, ok, err || (() => {})),
          };
        },
        get: () => getDocs(collection(db, name)),
        onSnapshot: (ok, err) => onSnapshot(collection(db, name), ok, err || (() => {})),
      };
    },
  };
}

async function main() {
  const sandbox = {
    console, setTimeout, clearTimeout, Date, Math, JSON, Promise,
    Object, Array, String, Number, Boolean, Error, RegExp, Symbol, Map, Set,
    isNaN, parseInt, parseFloat,
    __results: [],
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.firebase = { apps: [app], firestore: compatFs };
  vm.createContext(sandbox);

  const shimSrc = fs.readFileSync(
    path.join(ROOT, 'UNMEIstudentsportal', 'assets', 'firestore-shim.js'), 'utf8');
  console.log('[checkpoint] loading shim'); vm.runInContext(shimSrc, sandbox, { filename: 'firestore-shim.js' }); console.log('[checkpoint] shim loaded, running tests');
  if (!sandbox.__UNMEI_FIRESTORE_SHIM) throw new Error('shim did not activate');

  const T = async (name, fn) => {
    process.stdout.write('>> ' + name + ' ... ');
    try { await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error('TEST_TIMEOUT_15S')), 15000))]); sandbox.__results.push(['PASS', name]); console.log('PASS'); }
    catch (e) { sandbox.__results.push(['FAIL', name + ' :: ' + (e.message || e)]); console.log('FAIL ' + (e.message || e)); }
  };
  sandbox.__test = T;

  const watchdog = setTimeout(() => { console.log('WATCHDOG_TIMEOUT'); process.exit(2); }, 25000); await vm.runInContext(TESTS, sandbox, { filename: 'p8-shim-tests.cjs' });

  let fail = 0;
  for (const [st, name] of sandbox.__results) {
    console.log(st.padEnd(5) + ' ' + name);
    if (st === 'FAIL') fail++;
  }
  clearTimeout(watchdog); console.log(fail === 0
    ? 'SHIM_E2E_PASS (' + sandbox.__results.length + '/' + sandbox.__results.length + ')'
    : 'SHIM_E2E_FAIL failures=' + fail);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('HARNESS_FATAL', e.message || e); process.exit(1); });