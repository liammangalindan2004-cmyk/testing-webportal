/*
 * Validates firebase-database-structure.json before reimport.
 * Exits non-zero on any failure. Run: node scripts/validate-seed-dataset.cjs
 */
const fs = require('fs');
const path = require('path');

const P = path.join(__dirname, '..', 'firebase-database-structure.json');
const errors = [];
const warnings = [];

const raw = fs.readFileSync(P);
if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) errors.push('UTF-8 BOM present (must be absent)');
let db;
try { db = JSON.parse(raw.toString('utf8')); } catch (e) { errors.push('JSON parse failed: ' + e.message); }

if (db) {
  const N = (o) => (o && typeof o === 'object' ? Object.keys(o).length : 0);

  // Required nodes for the portals (from code audit of all portal reads)
  const required = ['admins', 'announcements', 'app_download', 'config', 'contact_leads', 'courses',
    'enrollments', 'instructors', 'instructorRatings', 'logs', 'messages', 'notifications',
    'payments', 'portal_config', 'schedules', 'sections', 'settings', 'students', 'users'];
  for (const n of required) if (!(n in db)) errors.push(`missing node: ${n}`);

  // Dataset standard
  const sCount = N(db.students);
  if (sCount !== 30) errors.push(`students=${sCount}, expected 30`);
  const withPerf = Object.values(db.students).filter(s => s.performance && (s.performance.averageScore || 0) > 0).length;
  if (withPerf < 10) errors.push(`students with performance data=${withPerf}, expected >= 10`);
  // App-sync dashboard data: full/partial tiers must have it, minimal must not
  const SKILLS = ['reading', 'writing', 'pronunciation', 'grammar', 'kanji', 'vocabulary'];
  Object.entries(db.students).forEach(([uid, s]) => {
    const num = Number(uid.split('_')[1]);
    const hasSync = !!(s.progressHistory && s.appSyncData);
    if (num <= 20 && !hasSync) errors.push(`${uid}: tier student missing progressHistory/appSyncData (dashboard charts would be empty)`);
    if (num > 20 && hasSync) errors.push(`${uid}: fresh student should not have app-sync data yet`);
    if (hasSync) {
      const weeks = Object.keys(s.progressHistory);
      if (!weeks.length) errors.push(`${uid}: progressHistory has no weeks`);
      for (const w of weeks) {
        for (const k of SKILLS) {
          const v = s.progressHistory[w][k];
          if (!Number.isFinite(v) || v < 0 || v > 100) errors.push(`${uid}: progressHistory.${w}.${k} invalid (${v})`);
        }
      }
      const cm = s.appSyncData.charactersMastered || {};
      if ((cm.hiragana || 0) > 46 || (cm.katakana || 0) > 46 || (cm.kanji || 0) > 80) errors.push(`${uid}: charactersMastered exceeds caps`);
      if (!Array.isArray(s.appSyncData.modulesCompleted)) errors.push(`${uid}: appSyncData.modulesCompleted must be array`);
      if (s.appSyncData.modulesCompleted.length > (s.appSyncData.totalModules || 0)) errors.push(`${uid}: modulesCompleted > totalModules`);
    }
  });
  const iCount = N(db.instructors);
  if (iCount < 10) errors.push(`instructors=${iCount}, expected >= 10`);
  const withCreds = Object.values(db.instructors).filter(i => i.credentials && i.credentials.education && Array.isArray(i.credentials.certifications)).length;
  if (withCreds < 3) errors.push(`instructors with full credentials=${withCreds}, expected >= 3`);

  // Domain rule
  const allEmails = [];
  const walk = (v, p) => {
    if (v && typeof v === 'object') { for (const k of Object.keys(v)) walk(v[k], p + '/' + k); return; }
    if (typeof v === 'string' && /^[^@\s]+@[^@\s]+$/.test(v)) allEmails.push({ p, v });
  };
  walk(db, '');
  for (const e of allEmails) {
    if (/loginPassword/i.test(e.p)) continue; // credential values, not emails
    if (!/@unmei-ph\.com$/i.test(e.v)) errors.push(`non-unmei-ph.com email at ${e.p}: ${e.v}`);
  }

  // Unique emails per role collection
  const studentEmails = Object.values(db.students).map(s => (s.profile && s.profile.email || '').toLowerCase());
  if (new Set(studentEmails).size !== studentEmails.length) errors.push('duplicate student emails');
  const instructorEmails = Object.values(db.instructors).map(i => (i.email || '').toLowerCase());
  if (new Set(instructorEmails).size !== instructorEmails.length) errors.push('duplicate instructor emails');

  // Demo accounts stable (demo-login.html depends on these)
  const demo = [
    ['student_001', 'liam.reyes1@unmei-ph.com', 'Liam Reyes'],
    ['student_002', 'noah.santos2@unmei-ph.com', 'Noah Santos'],
    ['student_003', 'ethan.cruz3@unmei-ph.com', 'Ethan Cruz']
  ];
  for (const [uid, email, name] of demo) {
    const s = db.students[uid];
    if (!s) errors.push(`${uid} missing (demo-login depends on it)`);
    else {
      if ((s.profile.email || '').toLowerCase() !== email) errors.push(`${uid} email mismatch: ${s.profile.email}`);
      if (s.profile.fullName !== name) errors.push(`${uid} name mismatch: ${s.profile.fullName}`);
    }
  }

  // Saturday pairing rule across students, enrollments, sections, schedules
  const satDays = 'Saturday Only', satSlot = '8am - 5pm (Sat Only)';
  const checkPair = (days, slot, where) => {
    if (days === satDays && slot !== satSlot) errors.push(`${where}: Saturday Only must pair with ${satSlot}, got "${slot}"`);
    if (slot === satSlot && days !== satDays) errors.push(`${where}: ${satSlot} must pair with Saturday Only, got "${days}"`);
  };
  for (const [uid, s] of Object.entries(db.students)) {
    const e = s.enrollment || {};
    checkPair(e.scheduleDays, e.scheduleTimeSlot, `students/${uid}`);
    if (!db.sections[e.sectionId]) errors.push(`students/${uid}: enrollment.sectionId ${e.sectionId} not in sections`);
    if (!db.instructors[e.instructorId]) errors.push(`students/${uid}: instructorId ${e.instructorId} not in instructors`);
    if (!db.courses[e.courseId]) errors.push(`students/${uid}: courseId ${e.courseId} not in courses`);
  }
  for (const [pid, p] of Object.entries(db.payments)) {
    if (!db.students[p.studentUid]) errors.push(`payments/${pid}: studentUid ${p.studentUid} not in students`);
    if (!Number.isFinite(Number(p.amount)) || Number(p.amount) <= 0) errors.push(`payments/${pid}: invalid amount`);
  }
  for (const [rid, r] of Object.entries(db.instructorRatings)) {
    if (!db.instructors[r.instructorId]) errors.push(`instructorRatings/${rid}: unknown instructor ${r.instructorId}`);
    if (!db.students[r.studentUid]) errors.push(`instructorRatings/${rid}: unknown student ${r.studentUid}`);
  }
  for (const [cid, c] of Object.entries(db.courses)) {
    const ids = c.instructorIds || [];
    if (!Array.isArray(ids) || ids.length === 0) errors.push(`courses/${cid}: instructorIds must be a non-empty array`);
    for (const iid of ids) if (!db.instructors[iid]) errors.push(`courses/${cid}: instructorIds contains unknown ${iid}`);
  }
  // users mirror
  for (const uid of Object.keys(db.students)) {
    if (!db.users[uid]) errors.push(`users/${uid} missing for student`);
    else if (db.users[uid].role !== 'student') errors.push(`users/${uid}.role must be student`);
  }
  for (const pid of Object.keys(db.instructors)) {
    if (!db.users[pid]) errors.push(`users/${pid} missing for instructor`);
  }

  // Emoji scan over all string values
  const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/u;
  const findEmoji = (v, p) => {
    if (v && typeof v === 'object') { for (const k of Object.keys(v)) findEmoji(v[k], p + '/' + k); return; }
    if (typeof v === 'string' && emojiRe.test(v)) errors.push(`emoji in value at ${p}`);
  };
  findEmoji(db, '');

  // No template/sample records
  const findSample = (v, p, depth) => {
    if (depth > 2 || !v || typeof v !== 'object') return;
    for (const k of Object.keys(v)) {
      if (/^SAMPLE_|^_schema$|^rating_template/i.test(k)) errors.push(`template/sample record at ${p}/${k}`);
      findEmoji(v[k], p + '/' + k, depth + 1);
    }
  };
  findSample(db, '', 0);

  console.log(`counts: students=${sCount} (perf=${withPerf}) instructors=${iCount} (creds=${withCreds}) users=${N(db.users)} payments=${N(db.payments)} enrollments=${N(db.enrollments)} sections=${N(db.sections)} ratings=${N(db.instructorRatings)}`);
}

if (warnings.length) { console.log('WARNINGS:'); warnings.forEach(w => console.log('  - ' + w)); }
if (errors.length) {
  console.log('VALIDATION FAILED (' + errors.length + '):');
  errors.slice(0, 40).forEach(e => console.log('  - ' + e));
  process.exit(1);
}
console.log('SEED_DATASET_VALID');
