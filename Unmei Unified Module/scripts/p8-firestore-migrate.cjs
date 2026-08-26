/**
 * PHASE 8 — RTDB -> Cloud Firestore Migration
 * Source of truth: p8-live-export.json (fresh export, verified identical to
 * firebase-database-structure.json canonical payload on 2026-08-25).
 *
 * Modes:
 *   node scripts/p8-firestore-migrate.cjs --dry-run   (no writes; plan only)
 *   node scripts/p8-firestore-migrate.cjs --execute   (real migration)
 *
 * Run from repo root:  node scripts/p8-firestore-migrate.cjs ...
 * firebase SDK resolved from UNMEIregis/node_modules via module.paths below.
 *
 * Idempotent: every document is written with its ORIGINAL RTDB key as the
 * Firestore document ID via setDoc (upsert). Re-running produces no dupes.
 * RTDB is NEVER written to or deleted by this script.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Resolve firebase web SDK from UNMEIregis install.
module.paths.push(path.join(__dirname, '..', 'UNMEIregis', 'node_modules'));
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, writeBatch, getDocs } = require('firebase/firestore');

const ROOT = path.join(__dirname, '..');
const SRC = process.argv.includes('--execute') ? null : null; // placeholder clarity
const SOURCE_FILE = path.join(ROOT, 'p8-live-export.json');
const EXECUTE = process.argv.includes('--execute');

const PROJECT_ID = 'unmei-nihongo-center';
const API_KEY = 'AIzaSyDI9ziVzajecsq7Ab4NPeCFb3VLDsa35UU';
const APP_ID = '1:357352911990:web:91994d403c6153db635b57';

// Collection-style entities: each child key becomes a document ID.
const COLLECTION_ENTITIES = [
  'admins', 'announcements', 'app_download', 'contact_leads', 'courses',
  'enrollments', 'instructors', 'instructorRatings', 'logs', 'messages',
  'notifications', 'payments', 'schedules', 'sections', 'students', 'users',
];
// Singleton flat objects -> one document under collection 'global'.
const SINGLETON_ENTITIES = ['config', 'portal_config', 'settings'];

/** Recursively strip `undefined` (Firestore rejects it); keep nulls/arrays/maps. */
function sanitize(value) {
  if (value === undefined) return null;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitize);
  const out = {};
  for (const k of Object.keys(value)) {
    if (value[k] === undefined) continue;
    out[k] = sanitize(value[k]);
  }
  return out;
}

function buildPlan(data) {
  const ops = [];
  for (const ent of COLLECTION_ENTITIES) {
    const recs = data[ent] && typeof data[ent] === 'object' ? data[ent] : {};
    for (const id of Object.keys(recs)) {
      ops.push({ coll: ent, id, body: sanitize(recs[id]) });
    }
  }
  for (const ent of SINGLETON_ENTITIES) {
    const body = sanitize(data[ent] || {});
    ops.push({ coll: ent, id: 'global', body });
  }
  return ops;
}

async function main() {
  const raw = fs.readFileSync(SOURCE_FILE, 'utf8');
  const data = JSON.parse(raw.replace(/^\uFEFF/, ''));
  const ops = buildPlan(data);

  console.log('=== P8 FIRESTORE MIGRATION ===');
  console.log('MODE: ' + (EXECUTE ? 'EXECUTE' : 'DRY-RUN'));
  const byColl = {};
  for (const op of ops) byColl[op.coll] = (byColl[op.coll] || 0) + 1;
  for (const c of [...COLLECTION_ENTITIES, ...SINGLETON_ENTITIES]) {
    console.log('  ' + c + ' = ' + (byColl[c] || 0));
  }
  console.log('TOTAL DOCUMENTS TO WRITE = ' + ops.length);
  if (!EXECUTE) {
    console.log('SAMPLE IDS: students[0]=' + ops.filter(o => o.coll === 'students')[0].id +
      ', courses[0]=' + ops.filter(o => o.coll === 'courses')[0].id);
    console.log('DRY_RUN_COMPLETE - no writes performed.');
    return;
  }

  const app = initializeApp({ apiKey: API_KEY, projectId: PROJECT_ID, appId: APP_ID });
  const db = getFirestore(app);

  // Write in batches of <=400 (Firestore limit 500).
  let written = 0;
  for (let i = 0; i < ops.length; i += 400) {
    const slice = ops.slice(i, i + 400);
    const batch = writeBatch(db);
    for (const op of slice) batch.set(doc(db, op.coll, op.id), op.body);
    await batch.commit();
    written += slice.length;
    console.log('  committed ' + written + '/' + ops.length);
  }
  console.log('WRITE_PHASE_DONE total=' + written);

  // Read-back verification.
  let pass = 0, fail = 0;
  for (const c of [...COLLECTION_ENTITIES, ...SINGLETON_ENTITIES]) {
    const expected = byColl[c] || 0;
    const snap = await getDocs(collection(db, c));
    const ok = snap.size === expected;
    ok ? pass++ : fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + c + ': firestore=' + snap.size + ' source=' + expected);
  }
  console.log('VERIFY_SUMMARY pass=' + pass + ' fail=' + fail);
  console.log(fail === 0 ? 'MIGRATION_WRITE_VERIFIED' : 'MIGRATION_INCOMPLETE');
}

main().then(() => process.exit(0)).catch(e => { console.error('FATAL ' + e.code + ' :: ' + e.message); process.exit(1); });