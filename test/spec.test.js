import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSpec, resolveRef, deref, operations, propertyNames } from '../src/index.js';

const doc = (paths, extra = {}) => ({ openapi: '3.0.3', info: { title: 'T', version: '1' }, paths, ...extra });

test('parseSpec: OpenAPI 3 only, JSON only, paths required', () => {
  assert.equal(parseSpec(JSON.stringify(doc({}))).openapi, '3.0.3');
  assert.equal(parseSpec('﻿' + JSON.stringify(doc({}))).openapi, '3.0.3');
  assert.throws(() => parseSpec('openapi: 3.0.0'), /not valid JSON.*YAML/);
  assert.throws(() => parseSpec('[]'), /expected an object/);
  assert.throws(() => parseSpec(JSON.stringify({ swagger: '2.0', paths: {} })), /found Swagger 2.0/);
  assert.throws(() => parseSpec(JSON.stringify({ openapi: '3.0.0' })), /no "paths" object/);
});

test('resolveRef and deref: local pointers, escapes, broken, external and looping references', () => {
  const spec = { components: { schemas: { 'a/b': { type: 'string' }, A: { $ref: '#/components/schemas/B' }, B: { type: 'integer' }, L: { $ref: '#/components/schemas/L' } } } };
  assert.deepEqual(resolveRef(spec, '#/components/schemas/a~1b'), { type: 'string' });
  assert.equal(resolveRef(spec, 'other.json#/x'), undefined);
  const missing = new Set();
  assert.deepEqual(deref(spec, { $ref: '#/components/schemas/A' }, missing), { type: 'integer' });
  assert.equal(deref(spec, { $ref: '#/components/schemas/Nope' }, missing), undefined);
  assert.equal(deref(spec, { $ref: 'other.json#/x' }, missing), undefined);
  assert.equal(deref(spec, { $ref: '#/components/schemas/L' }, missing), undefined);
  assert.deepEqual([...missing].sort(), ['#/components/schemas/L (refers to itself)', '#/components/schemas/Nope', 'other.json#/x']);
});

test('operations: every method, path parameters merged, operation parameters win', () => {
  const spec = doc({
    '/a/{id}': {
      parameters: [{ name: 'id', in: 'path' }, { name: 'q', in: 'query', description: 'path level' }],
      get: { parameters: [{ name: 'q', in: 'query', description: 'op level' }], responses: { 200: {} } },
      delete: { responses: {} },
      summary: 'not an operation'
    }
  });
  const ops = operations(spec);
  assert.deepEqual(ops.map((o) => o.method), ['get', 'delete']);
  assert.deepEqual(ops[0].parameters.map((p) => `${p.name}:${p.description || ''}`), ['id:', 'q:op level']);
  assert.equal(ops[1].parameters.length, 2);
});

test('propertyNames: follows refs and allOf, oneOf, anyOf', () => {
  const spec = { components: { schemas: { Base: { properties: { org_id: {} } } } } };
  const names = propertyNames(spec, { allOf: [{ $ref: '#/components/schemas/Base' }], oneOf: [{ properties: { x: {} } }], properties: { y: {} } }, new Set());
  assert.deepEqual([...names].sort(), ['org_id', 'x', 'y']);
});
