// PHASE 7 FDD validator: verifies unmei_webportal_fdd.xml against the
// Phase 7 spec in case-study-implementation.md.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'unmei_webportal_fdd.xml');
const xml = fs.readFileSync(file, 'utf8');

let failures = 0;
const fail = (msg) => { failures++; console.log('FAIL: ' + msg); };
const pass = (msg) => console.log('PASS: ' + msg);

// ---- Parse all mxCells into {attrs:{}, style:{}} ----
const cells = {};
const tagRe = /<mxCell\b([^>]*)>/g;
let m;
while ((m = tagRe.exec(xml)) !== null) {
  const attrs = {};
  const attrRe = /([a-zA-Z_:]+)="([^"]*)"/g;
  let a;
  while ((a = attrRe.exec(m[1])) !== null) attrs[a[1]] = a[2];
  if (attrs.id && !cells[attrs.id]) cells[attrs.id] = attrs;
}
console.log('parsed cells: ' + Object.keys(cells).length);
if ((xml.match(/<mxCell\b/g) || []).length !== Object.keys(cells).length) fail('duplicate cell ids detected');
else pass('mxCell tags balanced, ids unique');

const labelOf = (id) => (cells[id] && cells[id].value ? cells[id].value.replace(/&#xa;/g, ' ') : '');

// ---- 1) Instructor column: nodes, labels, color ----
const instSpec = {
  col_instructor: 'Instructor Portal',
  inst_node_1: 'Instructor login and authentication',
  inst_node_2: 'Dashboard with assigned courses overview',
  inst_node_3: 'View enrolled students per course',
  inst_node_4: 'View individual student performance analytics',
  inst_node_5: 'View instructor ratings and feedback',
  inst_node_6: 'Manage instructor profile and settings'
};
for (const [id, label] of Object.entries(instSpec)) {
  if (!cells[id]) { fail('missing node ' + id); continue; }
  if (!labelOf(id).includes(label)) fail(id + ' label mismatch: "' + labelOf(id) + '"');
  else if (!/fillColor=#1E3A5F/i.test(cells[id].style || '')) fail(id + ' fill is not #1E3A5F');
}
pass('instructor column checked (' + Object.keys(instSpec).length + ' nodes)');

// ---- 2) Student yellow nodes ----
for (const [id, label] of [['s_node_9', 'evaluate the professor'], ['s_node_10', 'Score tab shows performance analytics']]) {
  if (!cells[id]) { fail('missing ' + id); continue; }
  if (!labelOf(id).includes(label)) fail(id + ' label mismatch');
  else if (!/fillColor=#FFC400/.test(cells[id].style || '')) fail(id + ' is not yellow #FFC400');
}
pass('student yellow nodes checked');

// ---- 3) Admin yellow nodes + obsolete label ----
for (const [id, label] of [['adm_node_9', 'Generate student performance reports'], ['adm_node_10', 'Manage instructor accounts and credentials']]) {
  if (!cells[id]) { fail('missing ' + id); continue; }
  if (!labelOf(id).includes(label)) fail(id + ' label mismatch');
  else if (!/fillColor=#FFC400/.test(cells[id].style || '')) fail(id + ' is not yellow #FFC400');
}
pass('admin yellow nodes checked');
if (/Automated tuition balance reminders/i.test(xml)) fail('obsolete label still present');
else pass('obsolete admin label absent');

// ---- 4) Connector chains ----
const edges = {};
for (const id of Object.keys(cells)) {
  const c = cells[id];
  if (c.edge === '1') edges[id] = [c.source || '', c.target || ''];
}
function chain(name, colId, short, count) {
  // root -> column
  const rootId = 'edge_root_' + name;
  if (!edges[rootId]) fail('missing root edge ' + rootId);
  else if (edges[rootId][0] !== 'root_title' || edges[rootId][1] !== colId) fail(rootId + ' connects ' + edges[rootId].join('->'));
  // column -> node1 -> ... -> nodeN
  for (let i = 0; i < count; i++) {
    const eid = 'e_' + short + '_' + i + '_' + (i + 1);
    const from = i === 0 ? colId : short + '_node_' + i;
    const to = short + '_node_' + (i + 1);
    if (!edges[eid]) fail('missing edge ' + eid);
    else if (edges[eid][0] !== from || edges[eid][1] !== to) fail(eid + ' connects ' + edges[eid].join('->') + ' expected ' + from + '->' + to);
  }
}
chain('student', 'col_student', 's', 10);
chain('instructor', 'col_instructor', 'inst', 6);
chain('admin', 'col_admin', 'adm', 10);
pass('connector chains verified');

// ---- 5) draw.io openability sanity: mxfile root present ----
if (/^<mxfile\b/.test(xml.trim())) pass('mxfile root element present (opens in diagrams.net/draw.io)');
else fail('missing <mxfile> root');

console.log(failures === 0 ? 'FDD_VALIDATION_PASS' : 'FDD_VALIDATION_FAIL (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
