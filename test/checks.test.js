import test from 'node:test';
import assert from 'node:assert/strict';
import { operations, checkAuth, checkTenant, checkPaging, checkRateLimit, checkErrors, checkOperationIds, review, count } from '../src/index.js';

const doc = (paths, extra = {}) => ({ openapi: '3.0.3', info: { title: 'T', version: '1' }, paths, ...extra });
const at = (findings) => findings.map((f) => `${f.level} ${f.method} ${f.path}`);

test('auth: missing, empty and optional security are problems; x-public is info; global security counts', () => {
  const spec = doc({
    '/open': { get: { responses: {} } },
    '/empty': { get: { security: [], responses: {} } },
    '/optional': { get: { security: [{}, { key: [] }], responses: {} } },
    '/marked': { get: { security: [], 'x-public': true, responses: {} } },
    '/closed': { get: { security: [{ key: [] }], responses: {} } }
  });
  assert.deepEqual(at(checkAuth(spec, operations(spec))), ['problem GET /open', 'problem GET /empty', 'problem GET /optional', 'info GET /marked']);
  const secured = { ...spec, security: [{ key: [] }] };
  assert.deepEqual(at(checkAuth(secured, operations(secured))), ['problem GET /empty', 'problem GET /optional', 'info GET /marked']);
});

test('tenant: names in any place and in the body, spelled any way', () => {
  const spec = doc({
    '/orgs/{orgId}': { get: { parameters: [{ name: 'orgId', in: 'path' }], responses: {} } },
    '/x': { get: { parameters: [{ name: 'X-Tenant-Id', in: 'header' }], responses: {} } },
    '/y': { post: { requestBody: { content: { 'application/json': { schema: { properties: { account_id: {}, title: {} } } } } }, responses: {} } },
    '/z': { get: { parameters: [{ name: 'id', in: 'path' }], responses: {} } }
  });
  const f = checkTenant(spec, operations(spec));
  assert.deepEqual(at(f), ['warning GET /orgs/{orgId}', 'warning GET /x', 'warning POST /y']);
  assert.match(f[1].message, /X-Tenant-Id in header/);
  assert.match(f[2].message, /account_id in body/);
  assert.deepEqual(at(checkTenant(spec, operations(spec), ['project_id'])), []);
});

test('paging: arrays and wrapped lists without a paging parameter', () => {
  const spec = doc({
    '/a': { get: { responses: { 200: { content: { 'application/json': { schema: { type: 'array', items: {} } } } } } } },
    '/b': { get: { parameters: [{ name: 'page_size', in: 'query' }], responses: { 200: { content: { 'application/json': { schema: { type: 'array' } } } } } } },
    '/c': { get: { responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/L' } } } } } } },
    '/d': { get: { responses: { 200: { content: { 'application/json': { schema: { type: 'object', properties: { name: {} } } } } } } } },
    '/e': { post: { responses: { 200: { content: { 'application/json': { schema: { type: 'array' } } } } } } }
  }, { components: { schemas: { L: { type: 'object', properties: { data: { $ref: '#/components/schemas/Arr' } } }, Arr: { type: 'array', items: {} } } } });
  assert.deepEqual(at(checkPaging(spec, operations(spec))), ['warning GET /a', 'warning GET /c']);
});

test('rate limit and errors: 429, 4XX and default are understood', () => {
  const spec = doc({
    '/a': { get: { responses: { 200: {} } } },
    '/b': { get: { responses: { 429: {}, 404: {} } } },
    '/c': { get: { responses: { '4XX': {} } } },
    '/d': { get: { responses: { default: {} } } }
  });
  const ops = operations(spec);
  assert.deepEqual(at(checkRateLimit(ops)), ['warning GET /a', 'warning GET /d']);
  assert.deepEqual(at(checkErrors(ops)), ['warning GET /a']);
});

test('operation ids: missing is a warning, a duplicate is a problem naming the first use', () => {
  const spec = doc({ '/a': { get: { operationId: 'x', responses: {} }, post: { responses: {} } }, '/b': { get: { operationId: 'x', responses: {} } } });
  const f = checkOperationIds(operations(spec));
  assert.deepEqual(at(f), ['warning POST /a', 'problem GET /b']);
  assert.match(f[1].message, /also used by GET \/a/);
});

test('review: counts, skipped checks and references that could not be followed', () => {
  const spec = doc({ '/a': { get: { operationId: 'a', parameters: [{ $ref: '#/components/parameters/Gone' }], responses: { 200: {} } } } });
  const r = review(spec, { skip: ['rate-limit'] });
  assert.equal(r.operations, 1);
  assert.deepEqual(r.skipped, ['rate-limit']);
  assert.ok(!r.checked.includes('rate-limit'));
  assert.deepEqual(r.unresolved, ['#/components/parameters/Gone']);
  assert.equal(count(r, 'problem'), 1);
  assert.equal(count(r, 'warning'), 1);
});
