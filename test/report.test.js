import test from 'node:test';
import assert from 'node:assert/strict';
import { review, toText, toMarkdown, toJson, toCsv } from '../src/index.js';

const spec = {
  openapi: '3.0.3',
  info: { title: 'Demo', version: '2' },
  paths: {
    '/a': { get: { operationId: '=cmd|x', parameters: [{ $ref: '#/components/parameters/Gone' }], responses: { 200: {}, 429: {}, 400: {} } } },
    '/b': { get: { operationId: 'b', security: [{ k: [] }], responses: { 429: {}, 400: {} } } }
  }
};

test('text: summary, a line for every check, notes', () => {
  const t = toText(review(spec, { skip: ['paging'] }));
  assert.match(t, /^Demo 2: 2 operations, 1 problem, 0 warnings/);
  assert.match(t, /auth: 1 finding\n  problem  GET \/a  no authentication required/);
  assert.match(t, /tenant: none found/);
  assert.doesNotMatch(t, /^paging:/m);
  assert.match(t, /Not checked \(skipped on request\): paging/);
  assert.match(t, /References not followed.*#\/components\/parameters\/Gone/);
});

test('every format carries skipped checks and unresolved references', () => {
  const r = review(spec, { skip: ['paging'] });
  assert.match(toMarkdown(r), /Not checked \(skipped on request\): paging/);
  assert.match(toMarkdown(r), /References not followed/);
  const j = JSON.parse(toJson(r));
  assert.deepEqual(j.skipped, ['paging']);
  assert.deepEqual(j.unresolved, ['#/components/parameters/Gone']);
  assert.deepEqual(j.counts, { problem: 1, warning: 0, info: 0 });
  assert.match(toCsv(r), /^paging,not checked,,,skipped on request$/m);
  assert.match(toCsv(r), /^reference,not checked,,,not followed: #\/components\/parameters\/Gone$/m);
});

test('markdown escapes table characters, csv defuses formulas', () => {
  const dup = { ...spec, paths: { ...spec.paths, '/c': { get: { operationId: '=cmd|x', security: [{ k: [] }], responses: { 429: {}, 400: {} } } } } };
  const r = review(dup);
  assert.match(toMarkdown(r), /=cmd\\\|x/);
  assert.match(toCsv(r), /,"?operationId =cmd\|x is also used by GET \/a"?$/m);
  const csvFormula = toCsv({ ...r, findings: [{ check: 'x', level: 'warning', method: 'GET', path: '=1+1', message: '@m' }] });
  assert.match(csvFormula, /,'=1\+1,'@m$/m);
});
