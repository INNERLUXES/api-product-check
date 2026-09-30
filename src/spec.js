// Reading an OpenAPI 3 document: the checks see every operation with its parameters and responses resolved.
// A reference the tool cannot follow is counted and reported, never silently treated as "nothing there".

export const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

export function parseSpec(text) {
  let spec;
  try {
    spec = JSON.parse(String(text).replace(/^﻿/, ''));
  } catch (err) {
    throw new Error(`the file is not valid JSON: ${err.message}. YAML files need converting to JSON first.`);
  }
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) throw new Error('the file is not an OpenAPI document (expected an object)');
  if (typeof spec.openapi !== 'string' || !/^3\.\d+/.test(spec.openapi)) {
    const found = spec.swagger ? `Swagger ${spec.swagger}` : spec.openapi ? `openapi ${spec.openapi}` : 'no "openapi" field';
    throw new Error(`only OpenAPI 3.x is read (found ${found}); convert Swagger 2.0 files first`);
  }
  if (!spec.paths || typeof spec.paths !== 'object' || Array.isArray(spec.paths)) throw new Error('the document has no "paths" object');
  return spec;
}

// '#/components/schemas/User' -> the object, or undefined when the reference is external or broken.
export function resolveRef(spec, ref) {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return undefined;
  let node = spec;
  for (const raw of ref.slice(2).split('/')) {
    const key = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (!node || typeof node !== 'object' || !(key in node)) return undefined;
    node = node[key];
  }
  return node;
}

// Follows $ref chains (with a guard against loops). Unresolved references are recorded in `missing`.
export function deref(spec, node, missing, seen = new Set()) {
  let cur = node;
  while (cur && typeof cur === 'object' && typeof cur.$ref === 'string') {
    if (seen.has(cur.$ref)) { missing.add(`${cur.$ref} (refers to itself)`); return undefined; }
    seen.add(cur.$ref);
    const next = resolveRef(spec, cur.$ref);
    if (next === undefined) { missing.add(cur.$ref); return undefined; }
    cur = next;
  }
  return cur;
}

// Every operation in the document, in file order, with path-level and operation-level parameters merged
// (an operation parameter replaces a path parameter with the same name and place).
export function operations(spec, missing = new Set()) {
  const out = [];
  for (const [path, rawItem] of Object.entries(spec.paths)) {
    const item = deref(spec, rawItem, missing);
    if (!item || typeof item !== 'object') continue;
    const shared = (item.parameters || []).map((p) => deref(spec, p, missing)).filter(Boolean);
    for (const method of METHODS) {
      const op = item[method];
      if (!op || typeof op !== 'object') continue;
      const own = (op.parameters || []).map((p) => deref(spec, p, missing)).filter(Boolean);
      const key = (p) => `${p.in}:${p.name}`;
      const ownKeys = new Set(own.map(key));
      const parameters = [...shared.filter((p) => !ownKeys.has(key(p))), ...own];
      const responses = {};
      for (const [code, r] of Object.entries(op.responses || {})) responses[code] = deref(spec, r, missing) || {};
      const requestBody = op.requestBody ? deref(spec, op.requestBody, missing) : undefined;
      out.push({ method, path, op, parameters, responses, requestBody });
    }
  }
  return out;
}

// The property names of a schema, following $ref, allOf, oneOf and anyOf, to a limited depth.
export function propertyNames(spec, schema, missing, depth = 0) {
  const names = new Set();
  const s = deref(spec, schema, missing);
  if (!s || typeof s !== 'object' || depth > 6) return names;
  for (const k of Object.keys(s.properties || {})) names.add(k);
  for (const part of [...(s.allOf || []), ...(s.oneOf || []), ...(s.anyOf || [])]) {
    for (const k of propertyNames(spec, part, missing, depth + 1)) names.add(k);
  }
  return names;
}
