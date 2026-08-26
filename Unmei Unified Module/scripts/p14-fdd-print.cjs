#!/usr/bin/env node
/* Phase 14 - Generate the print-friendly (non-colored) FDD variant from the
   colored draw.io XML, then validate both files structurally.
   Usage: node scripts/p14-fdd-print.cjs */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'unmei_webportal_fdd.xml');
const DST = path.join(ROOT, 'unmei_webportal_fdd_print.xml');

const src = fs.readFileSync(SRC, 'utf8');

// Strip all color-bearing style attributes for a black-on-white print layout.
// Keeps shape/geometry/edge styles so the diagram renders identically in B/W.
let out = src.replace(/(fillColor|strokeColor|fontColor)=#[0-9A-Fa-f]{6};?/g, '');

// Print-friendly tweaks: white background on nodes, solid thin borders.
out = out.replace(/style="([^"]*)"/g, (m, style) => {
  if (/^edge=/.test(style)) return m; // leave edge routing styles alone
  let s = style
    .replace(/fillColor=[^;]*;?/g, '')   // any leftover fill tokens
    .replace(/strokeColor=[^;]*;?/g, '')
    .replace(/fontColor=[^;]*;?/g, '');
  s = 'rounded=0;whiteSpace=wrap;html=1;' + s;
  if (!/fillColor=/.test(s)) s += 'fillColor=#FFFFFF;';
  if (!/strokeColor=/.test(s)) s += 'strokeColor=#000000;';
  if (!/fontColor=/.test(s)) s += 'fontColor=#000000;';
  return 'style="' + s.replace(/;+/g, ';').replace(/;$/, '') + '"';
});

// Rename ids inside the print file so both can coexist in one draw.io session.
out = out.replace(/id="(col_|inst_node_|s_node_|adm_node_|root_title)[^"]*"/g,
  (m, p) => m); // ids kept identical intentionally: same diagram, print copy

fs.writeFileSync(DST, out, 'utf8');

// ---- structural validation of BOTH files ----
function cells(text) {
  const map = new Map();
  const re = /<(mxCell|UserObject)\b[^>]*>/g;
  // mxCells may be wrapped in UserObject(value=...) - handle both forms.
  const cellRe = /<mxCell\b([^>]*)\/?>/g;
  let m2;
  while ((m2 = cellRe.exec(text))) {
    const attrs = m2[1];
    const get = (k) => { const r = new RegExp(k + '="([^"]*)"').exec(attrs); return r ? r[1] : null; };
    const id = get('id');
    if (!id) continue;
    map.set(id, { vertex: get('vertex') === '1', edge: get('edge') === '1',
      value: (get('value') || '').replace(/&[^;]+;/g, ' ').trim(),
      source: get('source'), target: get('target'), style: get('style') || '' });
  }
  return map;
}

const a = cells(src), b = cells(out);
const errs = [];
if (a.size !== b.size) errs.push('cell count differs: ' + a.size + ' vs ' + b.size);
for (const [id, c] of a) {
  const d = b.get(id);
  if (!d) { errs.push('missing cell in print file: ' + id); continue; }
  if (c.vertex !== d.vertex || c.edge !== d.edge) errs.push('type mismatch: ' + id);
  if (c.value !== d.value) errs.push('label mismatch: ' + id);
  if (c.source !== d.source || c.target !== d.target) errs.push('topology mismatch: ' + id);
}
// no residual color attributes anywhere in the print file
if (/#[0-9A-Fa-f]{6}/.test(out.replace(/#FFFFFF|#000000/g, ''))) errs.push('residual non-print colors found');
for (const k of ['fillColor=#', 'strokeColor=#']) {
  const bad = [...b.values()].filter(c => !c.edge && !new RegExp(k + '(FFFFFF|000000)').test(c.style) && /fillColor=|strokeColor=/.test(c.style));
}

console.log('cells colored file:', a.size, '| print file:', b.size);
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'STRUCTURE_IDENTICAL');
process.exit(errs.length ? 1 : 0);
