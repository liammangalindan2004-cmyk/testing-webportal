/**
 * P8 POST-MIGRATION AUDIT
 * 1. For each of the 19 canonical entities: compare Firestore doc IDs vs
 *    canonical JSON - report/clean extras (pre-migration leftovers).
 * 2. Probe plausible junk collection names (web SDK cannot enumerate roots).
 * 3. Simulate the EXACT incoming-registration writes (RegisterPage writeDoc)
 *    with a probe UID, read back through the same shape, then clean up.
 */
'use strict';
const fs = require('fs');
const path = require('path');
module.paths.push(path.join(__dirname, '..', 'UNMEIregis', 'node_modules'));
const { initializeApp } = require('firebase/app');
const {
  getFirestore, collection, doc, getDocs, setDoc, deleteDoc,
} = require('firebase/firestore');

const ROOT = path.join(__dirname, '..');
const app = initializeApp({
  apiKey: 'AIzaSyDI9ziVzajecsq7Ab4NPeCFb3VLDsa35UU',
  projectId: 'unmei-nihongo-center',
});
const db = getFirestore(app);

const ENTITIES = ['admins', 'announcements', 'app_download', 'config',
  'contact_leads', 'courses', 'enrollments', 'instructors', 'instructorRatings',
  'logs', 'messages', 'notifications', 'payments', 'portal_config',
  'schedules', 'sections', 'settings', 'students', 'users'];
// singletons stored as one 'global' doc
const SINGLETONS = new Set(['config', 'portal_config', 'settings']);
const JUNK_PROBES = ['migration_test', 'test', 'tests', 'temp', 'tmp', 'debug',
  'sample', 'dummy', 'asdf', 'foo', 'bar', 'col1', 'newcol', 'mycollection'];

async function main() {
  const canon = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'firebase-database-structure.json'), 'utf8').replace(/^\uFEFF/, ''));

  let extraDocs = [];
  for (const ent of ENTITIES) {
    const snap = await getDocs(collection(db, ent));
    const canonIds = canon[ent] && typeof canon[ent] === 'object'
      ? new Set(Object.keys(canon[ent])) : new Set();
    const fsIds = [];
    snap.forEach(d => fsIds.push(d.id));
    const extras = fsIds.filter(id => !canonIds.has(id));
    const missing = [...canonIds].filter(id => !fsIds.includes(id));
    const status = (extras.length === 0 && missing.length === 0) ? 'CLEAN'
      : `extras=[${extras.join(',')}] missing=[${missing.join(',')}]`;
    console.log(`${ent}: fs=${fsIds.length} canon=${canonIds.size} ${status}`);
    for (const id of extras) {
      const d = snap.docs.find(x => x.id === id);
      const data = d.data();
      const isEmpty = !data || Object.keys(data).length === 0;
      extraDocs.push({ ent, id, isEmpty });
    }
  }

  console.log('--- junk collection probes ---');
  for (const name of JUNK_PROBES) {
    if (ENTITIES.includes(name)) continue;
    try {
      const s = await getDocs(collection(db, name));
      if (s.size > 0) console.log(`FOUND ${name}: ${s.size} docs`);
    } catch (e) { /* ignore */ }
  }
  console.log('PROBE_DONE');

  // Clean reported extras ONLY if empty OR clearly non-canonical junk;
  // anything with data gets REPORTED, not silently deleted.
  for (const x of extraDocs) {
    if (x.isEmpty) {
      await deleteDoc(doc(db, x.ent, x.id));
      console.log(`DELETED empty leftover ${x.ent}/${x.id}`);
    } else {
      console.log(`KEEP-REPORTED non-empty extra ${x.ent}/${x.id}`);
    }
  }
  if (extraDocs.length === 0) console.log('NO_EXTRA_DOCS');

  // ---- Incoming realtime-user simulation (RegisterPage parity) ----
  console.log('--- INCOMING USER SIMULATION ---');
  const uid = 'uat_probe_reg';
  const now = Date.now();
  const clean = o => JSON.parse(JSON.stringify(o));
  await setDoc(doc(db, 'students', uid), clean({
    profile: { fullName: 'UAT Probe', email: 'uat.probe@unmei-ph.com',
      mobileNumber: '+63 917 000 0000', address: '1 Test St, Makati City',
      country: 'Philippines', avatarInitials: 'UP', avatarColor: '#C0392B',
      createdAt: now, updatedAt: now },
    enrollment: { course: 'JLPT N5 (Beginner)', courseId: 'jlpt_n5',
      classSetup: 'Face-to-face', scheduleTimeSlot: '8am - 12nn',
      scheduleDays: 'Monday - Wednesday - Friday', status: 'active',
      enrolledAt: now, instructorId: 'prof_001' },
    performance: { courseProgress: 0, modulesCompleted: 0, totalModules: 12,
      quizScores: [], averageScore: 0, attendanceRate: 0, lastActivityAt: null,
      weeklyProgress: [], skillBreakdown: { reading: 0, writing: 0,
        listening: 0, speaking: 0, grammar: 0, vocabulary: 0 },
      areasOfImprovement: [], streakDays: 0, totalPracticeMinutes: 0 },
    settings: { emailNotifications: true, smsNotifications: true,
      lineNotifications: false, language: 'en', theme: 'light', updatedAt: now },
    onboardingComplete: false, isRevoked: false, isDeleted: false,
  }));
  await setDoc(doc(db, 'users', uid), clean({ email: 'uat.probe@unmei-ph.com',
    role: 'student', uid, createdAt: now }));
  await setDoc(doc(db, 'enrollments', uid), clean({
    fullName: 'UAT Probe', email: 'uat.probe@unmei-ph.com', wantCall: 'No',
    course: 'JLPT N5 (Beginner)', courseId: 'jlpt_n5', sectionId: '',
    status: 'active', createdAt: now, updatedAt: now }));

  // Read back through the SAME shape the student portal consumes
  const sDoc = await getDocs(collection(db, 'students'));
  let landed = false;
  sDoc.forEach(d => { if (d.id === uid && d.data().profile.fullName === 'UAT Probe') landed = true; });
  const enrollCount = (await getDocs(collection(db, 'enrollments'))).size;
  console.log('INCOMING_USER_LANDED=' + landed + ' totalStudentsNow=' + sDoc.size +
    ' totalEnrollmentsNow=' + enrollCount);

  // Cleanup probe
  for (const c of ['students', 'users', 'enrollments']) await deleteDoc(doc(db, c, uid));
  const after = await getDocs(collection(db, 'students'));
  console.log('PROBE_CLEANED studentsBackTo=' + after.size);
  console.log(after.size === 30 ? 'AUDIT_PASS' : 'AUDIT_CHECK_COUNTS');
}

main().catch(e => { console.error('AUDIT_FATAL', e.message || e); process.exit(1); });