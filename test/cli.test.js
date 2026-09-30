import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, main } from '../src/cli.js';

const EX = join(fileURLToPath(import.meta.url), '..', '..', 'examples', 'openapi.json');

function sink() {
  let data = '';
  return { write(s) { data += s; }, get text() { return data; } };
}

test('parseArgs', () => {
  const o = parseArgs(['api.json', '--skip', 'paging, errors', '--tenant-names', 'org_id,team_id', '--fail-on', 'warning']);
  assert.equal(o.file, 'api.json');
  assert.deepEqual(o.skip, ['paging', 'errors']);
  assert.deepEqual(o.tenantNames, ['org_id', 'team_id']);
  assert.equal(o.failOn, 'warning');
  assert.throws(() => parseArgs([]), /exactly one OpenAPI file/);
  assert.throws(() => parseArgs(['a.json', 'b.json']), /exactly one/);
  assert.throws(() => parseArgs(['a.json', '--skip', 'nope']), /unknown check\(s\) in --skip: nope/);
  assert.throws(() => parseArgs(['a.json', '--fail-on', 'info']), /problem or warning/);
  assert.throws(() => parseArgs(['a.json', '--format', 'xml']), /unknown format/);
  assert.throws(() => parseArgs(['a.json', '--format']), /needs a value/);
  assert.throws(() => parseArgs(['a.json', '--nope', 'x']), /unknown option/);
  assert.equal(parseArgs(['--help']).help, true);
});

test('help', async () => {
  const out = sink();
  assert.equal(await main(['--help'], { stdout: out, stderr: sink() }), 0);
  assert.match(out.text, /Exit codes/);
});

test('the example review', async () => {
  const out = sink();
  assert.equal(await main([EX], { stdout: out, stderr: sink() }), 0);
  assert.match(out.text, /7 operations, 3 problems, 10 warnings/);
  assert.match(out.text, /problem  POST \/admin\/reindex  no authentication required/);
  assert.match(out.text, /operationId createTask is also used by POST \/orgs\/\{orgId\}\/tasks/);
});

test('--fail-on sets the exit code', async () => {
  const err = sink();
  assert.equal(await main([EX, '--fail-on', 'problem'], { stdout: sink(), stderr: err }), 1);
  assert.match(err.text, /3 finding\(s\) at problem level/);
  assert.equal(await main([EX, '--fail-on', 'warning', '--skip', 'auth,operation-id,tenant,paging,rate-limit,errors'], { stdout: sink(), stderr: sink() }), 0);
});

test('--output writes the file, bad input exits 2', async (t) => {
  const d = await mkdtemp(join(tmpdir(), 'apc-'));
  t.after(() => rm(d, { recursive: true, force: true }));
  const file = join(d, 'r.json');
  assert.equal(await main([EX, '--format', 'json', '--output', file], { stdout: sink(), stderr: sink() }), 0);
  assert.equal(JSON.parse(await readFile(file, 'utf8')).operations, 7);
  await writeFile(join(d, 'swagger.json'), JSON.stringify({ swagger: '2.0', paths: {} }));
  const err = sink();
  assert.equal(await main([join(d, 'swagger.json')], { stdout: sink(), stderr: err }), 2);
  assert.match(err.text, /only OpenAPI 3.x/);
  assert.equal(await main([join(d, 'missing.json')], { stdout: sink(), stderr: sink() }), 2);
});
