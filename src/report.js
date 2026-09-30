// The review in four formats. Every format carries the same facts: a check that was skipped and a reference that
// could not be followed are never left out of one of them.

import { CHECKS, count } from './checks.js';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const LEVELS = ['problem', 'warning', 'info'];

function summary(r) {
  return `${r.title}${r.version ? ` ${r.version}` : ''}: ${plural(r.operations, 'operation')}, `
    + `${plural(count(r, 'problem'), 'problem')}, ${plural(count(r, 'warning'), 'warning')}`;
}

function notes(r) {
  const out = [];
  if (r.skipped.length) out.push(`Not checked (skipped on request): ${r.skipped.join(', ')}`);
  if (r.unresolved.length) out.push(`References not followed, so what they point to was not checked: ${r.unresolved.join(', ')}`);
  return out;
}

function byCheck(r) {
  return CHECKS.filter((c) => r.checked.includes(c)).map((c) => ({ check: c, items: r.findings.filter((f) => f.check === c) }));
}

export function toText(r) {
  const lines = [summary(r), ''];
  for (const { check, items } of byCheck(r)) {
    lines.push(`${check}: ${items.length ? plural(items.length, 'finding') : 'none found'}`);
    const sorted = [...items].sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level));
    for (const f of sorted) lines.push(`  ${f.level.padEnd(7)}  ${f.method} ${f.path}  ${f.message}`);
  }
  const n = notes(r);
  if (n.length) lines.push('', ...n);
  return lines.join('\n');
}

const md = (s) => String(s).replace(/[|\\`*_[\]<>]/g, (c) => `\\${c}`);

export function toMarkdown(r) {
  const lines = ['# API product check', '', md(summary(r)), ''];
  for (const { check, items } of byCheck(r)) {
    lines.push(`## ${check}: ${items.length ? plural(items.length, 'finding') : 'none found'}`, '');
    if (!items.length) continue;
    lines.push('| Level | Operation | Finding |', '|---|---|---|');
    for (const f of items) lines.push(`| ${f.level} | ${md(`${f.method} ${f.path}`)} | ${md(f.message)} |`);
    lines.push('');
  }
  const n = notes(r);
  if (n.length) lines.push('## Notes', '', ...n.map((x) => `- ${md(x)}`), '');
  return lines.join('\n').trimEnd();
}

export function toJson(r) {
  return JSON.stringify({ ...r, counts: Object.fromEntries(LEVELS.map((l) => [l, count(r, l)])), notes: notes(r) }, null, 2);
}

const cell = (v) => {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// One line per finding, ready to turn into tickets. Skipped checks and unresolved references get a line each.
export function toCsv(r) {
  const out = ['check,level,method,path,message'];
  for (const f of r.findings) out.push([f.check, f.level, f.method, f.path, f.message].map(cell).join(','));
  for (const c of r.skipped) out.push([c, 'not checked', '', '', 'skipped on request'].map(cell).join(','));
  for (const u of r.unresolved) out.push(['reference', 'not checked', '', '', `not followed: ${u}`].map(cell).join(','));
  return out.join('\n');
}
