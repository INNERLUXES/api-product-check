// The checks. docs/checks.md says the same in words; a change here changes that page too.
// Each finding: { check, level, method, path, message }. Levels: problem, warning, info.

import { operations, propertyNames, deref } from './spec.js';

export const DEFAULT_TENANT_NAMES = ['tenant_id', 'org_id', 'organization_id', 'organisation_id', 'account_id', 'workspace_id', 'customer_id', 'company_id'];
const PAGING = new Set(['limit', 'page', 'pagesize', 'perpage', 'cursor', 'offset', 'after', 'before', 'first', 'last', 'top', 'skip', 'size', 'maxresults', 'pagetoken', 'nexttoken', 'starting_after']);
const LIST_KEYS = ['items', 'data', 'results', 'records', 'entries'];

const norm = (s) => String(s).toLowerCase().replace(/[-_\s]/g, '');
const finding = (check, level, o, message) => ({ check, level, method: o.method.toUpperCase(), path: o.path, message });

// 1. Authentication: an operation with no security requirement is open to anyone, unless marked x-public on purpose.
export function checkAuth(spec, ops) {
  const out = [];
  for (const o of ops) {
    const reqs = o.op.security !== undefined ? o.op.security : spec.security;
    const none = !Array.isArray(reqs) || reqs.length === 0;
    const optional = Array.isArray(reqs) && reqs.some((r) => r && typeof r === 'object' && Object.keys(r).length === 0);
    if (!none && !optional) continue;
    if (o.op['x-public'] === true) out.push(finding('auth', 'info', o, 'public on purpose (x-public)'));
    else out.push(finding('auth', 'problem', o, optional ? 'authentication is optional ({} in security)' : 'no authentication required'));
  }
  return out;
}

// 2. Tenant chosen by the caller: a tenant id in the path, query, header, cookie or body means the server must check
// that the caller belongs to that tenant. Not wrong in itself; the most common way one customer reads another's data.
export function checkTenant(spec, ops, names = DEFAULT_TENANT_NAMES, missing = new Set()) {
  const wanted = new Set(names.map(norm));
  const out = [];
  for (const o of ops) {
    // a header may carry the usual X- prefix: X-Tenant-Id is tenant_id
    const named = (p) => wanted.has(norm(p.name)) || (p.in === 'header' && /^x-/i.test(p.name) && wanted.has(norm(p.name.slice(2))));
    const hits = o.parameters.filter(named).map((p) => `${p.name} in ${p.in}`);
    const json = o.requestBody?.content?.['application/json']?.schema;
    if (json) for (const k of propertyNames(spec, json, missing)) if (wanted.has(norm(k))) hits.push(`${k} in body`);
    if (hits.length) out.push(finding('tenant', 'warning', o, `the caller names the tenant (${hits.join(', ')}): the server must check the caller belongs to it`));
  }
  return out;
}

function returnsList(spec, o, missing) {
  const ok = Object.entries(o.responses).filter(([c]) => /^2/.test(c));
  for (const [, r] of ok) {
    const schema = r.content?.['application/json']?.schema;
    if (!schema) continue;
    const s = deref(spec, schema, missing);
    if (!s) continue;
    if (s.type === 'array') return true;
    const props = s.properties || {};
    if (LIST_KEYS.some((k) => { const v = props[k] && deref(spec, props[k], missing); return v && (v.type === 'array' || v.items); })) return true;
  }
  return false;
}

// 3. Paging: a GET that returns a list without any paging parameter returns everything, which grows with every customer.
export function checkPaging(spec, ops, missing = new Set()) {
  const out = [];
  for (const o of ops) {
    if (o.method !== 'get' || !returnsList(spec, o, missing)) continue;
    if (o.parameters.some((p) => p.in === 'query' && PAGING.has(norm(p.name)))) continue;
    out.push(finding('paging', 'warning', o, 'returns a list with no paging parameter (limit, cursor, page...)'));
  }
  return out;
}

// 4. Limits: no 429 response documented, so clients cannot know there is a rate limit or how to back off.
export function checkRateLimit(ops) {
  return ops.filter((o) => !('429' in o.responses) && !('4XX' in o.responses))
    .map((o) => finding('rate-limit', 'warning', o, 'no 429 response documented'));
}

// 5. Errors: no 4xx response and no default response, so clients cannot tell a bad request from an outage.
export function checkErrors(ops) {
  return ops.filter((o) => !Object.keys(o.responses).some((c) => /^4/.test(c) || c === 'default'))
    .map((o) => finding('errors', 'warning', o, 'no 4xx or default response documented'));
}

// 6. Operation ids: generated client libraries name their functions after them; a duplicate breaks the build.
export function checkOperationIds(ops) {
  const out = [];
  const seen = new Map();
  for (const o of ops) {
    const id = o.op.operationId;
    if (!id) { out.push(finding('operation-id', 'warning', o, 'no operationId')); continue; }
    if (seen.has(id)) out.push(finding('operation-id', 'problem', o, `operationId ${id} is also used by ${seen.get(id)}`));
    else seen.set(id, `${o.method.toUpperCase()} ${o.path}`);
  }
  return out;
}

export const CHECKS = ['auth', 'tenant', 'paging', 'rate-limit', 'errors', 'operation-id'];

export function review(spec, { tenantNames = DEFAULT_TENANT_NAMES, skip = [] } = {}) {
  const missing = new Set();
  const ops = operations(spec, missing);
  const run = {
    auth: () => checkAuth(spec, ops),
    tenant: () => checkTenant(spec, ops, tenantNames, missing),
    paging: () => checkPaging(spec, ops, missing),
    'rate-limit': () => checkRateLimit(ops),
    errors: () => checkErrors(ops),
    'operation-id': () => checkOperationIds(ops)
  };
  const findings = [];
  const checked = [];
  for (const c of CHECKS) {
    if (skip.includes(c)) continue;
    checked.push(c);
    findings.push(...run[c]());
  }
  return {
    title: spec.info?.title || '(no title)',
    version: spec.info?.version || '',
    operations: ops.length,
    checked,
    skipped: CHECKS.filter((c) => skip.includes(c)),
    findings,
    unresolved: [...missing].sort()
  };
}

export function count(result, level) {
  return result.findings.filter((f) => f.level === level).length;
}
