/** Test script executed inside the shim sandbox (see p8-shim-e2e.cjs). */
module.exports = `(async () => {
  const db = firebase.database();

  await __test('doc read: student_001 is Liam Reyes', async () => {
    const s = await db.ref('students/student_001').once('value');
    const v = s.val();
    if (!v || !v.profile || v.profile.fullName !== 'Liam Reyes') throw new Error(JSON.stringify(v && v.profile));
    if (!s.exists()) throw new Error('exists false');
  });

  await __test('collection read: courses has 6 keys incl jlpt_n5', async () => {
    const s = await db.ref('courses').once('value');
    const k = Object.keys(s.val());
    if (k.length !== 6 || !k.includes('jlpt_n5')) throw new Error(k.join(','));
  });

  await __test('nested read: students/student_001/performance', async () => {
    const s = await db.ref('students/student_001/performance').once('value');
    if (!(s.val() && s.val().averageScore > 0)) throw new Error('no avg');
  });

  await __test('deep nested read: skillBreakdown/reading = 89', async () => {
    const s = await db.ref('students/student_001/performance/skillBreakdown/reading').once('value');
    if (s.val() !== 89) throw new Error('got ' + s.val());
  });

  await __test('missing path returns null + exists false', async () => {
    const s = await db.ref('students/student_999/profile/fullName').once('value');
    if (s.exists() || s.val() !== null) throw new Error('should be null');
  });

  await __test('query equalTo pending = 17 payments', async () => {
    const s = await db.ref('payments').orderByChild('status').equalTo('pending').once('value');
    const n = Object.keys(s.val()).length;
    if (n !== 17) throw new Error('got ' + n);
  });

  await __test('query limitToLast(2) schedules keys', async () => {
    const s = await db.ref('schedules').limitToLast(2).once('value');
    const k = Object.keys(s.val()).sort();
    if (k.join(',') !== 'schedule_05,schedule_06') throw new Error(k.join(','));
  });

  await __test('set roundtrip scratch doc', async () => {
    await db.ref('logs/shim_e2e').set({ hello: 'world', nested: { a: 1 } });
    const s = await db.ref('logs/shim_e2e/nested/a').once('value');
    if (s.val() !== 1) throw new Error('got ' + s.val());
  });

  await __test('update with slash key preserves sibling', async () => {
    await db.ref('logs/shim_e2e').update({ 'nested/b': 5 });
    const s = await db.ref('logs/shim_e2e/nested').once('value');
    if (s.val().b !== 5 || s.val().a !== 1) throw new Error(JSON.stringify(s.val()));
  });

  await __test('push chronological ids + write', async () => {
    await db.ref('logs/shim_e2e_queue').remove(); // clean slate (prior runs)
    const r1 = db.ref('logs/shim_e2e_queue').push({ item: 1 });
    const r2 = db.ref('logs/shim_e2e_queue').push({ item: 2 });
    if (!r1.key || r1.key.length !== 20 || !(r2.key > r1.key)) throw new Error(r1.key + '<=' + r2.key);
    await r2;
    const s = await db.ref('logs/shim_e2e_queue').once('value');
    if (Object.keys(s.val()).length !== 2) throw new Error('count');
  });

  await __test('remove subfield keeps siblings', async () => {
    await db.ref('logs/shim_e2e/nested/b').remove();
    const s = await db.ref('logs/shim_e2e/nested').once('value');
    if ('b' in s.val()) throw new Error('b still present');
    if (s.val().a !== 1) throw new Error('a lost');
  });

  await __test('remove whole doc', async () => {
    await db.ref('logs/shim_e2e').remove();
    const s = await db.ref('logs/shim_e2e').once('value');
    if (s.exists()) throw new Error('still exists');
  });

  await __test('cleanup scratch queue', async () => {
    await db.ref('logs/shim_e2e_queue').remove();
    const s = await db.ref('logs/shim_e2e_queue').once('value');
    if (s.exists()) throw new Error('queue remains');
  });
})();`;