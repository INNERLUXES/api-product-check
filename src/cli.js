// Command line: api-product-check <openapi.json> [--tenant-names a,b] [--skip check,check]
//               [--format text|markdown|json|csv] [--output file] [--fail-on problem|warning]

import { readFile, writeFile } from 'node:fs/promises';
import { parseSpec } from './spec.js';
import { review, count, CHECKS, DEFAULT_TENANT_NAMES } from './checks.js';
import { toText, toMarkdown, toJson, toCsv } from './report.js';

export const USAGE = `api-product-check <openapi.json> [options]

Reviews the OpenAPI 3 description of a product's API for what customers of a product depend on: operations anyone
can call, tenants chosen by the caller, lists without paging, missing rate limit and error responses, and missing or
duplicate operation ids. It reads the file you give it and fetches nothing.

Options
  --tenant-names <list>   parameter and property names that identify a tenant, comma separated
                          (default: ${DEFAULT_TENANT_NAMES.join(',')})
  --skip <list>           checks to leave out: ${CHECKS.join(', ')}
  --format <f>            text (default), markdown, json or csv
  --output <file>         write the report to a file
  --fail-on <level>       exit 1 when there is a finding at this level or above: problem or warning
  --help                  this text

Exit codes: 0 done, 1 findings with --fail-on, 2 wrong usage or invalid input.`;

const list = (v) => v.split(',').map((x) => x.trim()).filter(Boolean);

export function parseArgs(argv) {
  const o = { format: 'text', skip: [], tenantNames: DEFAULT_TENANT_NAMES };
  const files = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { o.help = true; continue; }
    if (!a.startsWith('--')) { files.push(a); continue; }
    if (!['--tenant-names', '--skip', '--format', '--output', '--fail-on'].includes(a)) throw new Error(`unknown option: ${a}`);
    if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) throw new Error(`${a} needs a value`);
    const v = argv[++i];
    if (a === '--tenant-names') o.tenantNames = list(v);
    else if (a === '--skip') o.skip = list(v);
    else if (a === '--fail-on') o.failOn = v;
    else o[a.slice(2)] = v;
  }
  if (o.help) return o;
  if (files.length !== 1) throw new Error('give exactly one OpenAPI file');
  o.file = files[0];
  if (!['text', 'markdown', 'json', 'csv'].includes(o.format)) throw new Error(`unknown format: ${o.format}`);
  const bad = o.skip.filter((c) => !CHECKS.includes(c));
  if (bad.length) throw new Error(`unknown check(s) in --skip: ${bad.join(', ')}`);
  if (o.failOn !== undefined && !['problem', 'warning'].includes(o.failOn)) throw new Error('--fail-on takes problem or warning');
  if (!o.tenantNames.length) throw new Error('--tenant-names needs at least one name');
  return o;
}

export async function main(argv, { stdout = process.stdout, stderr = process.stderr } = {}) {
  let o, result;
  try {
    o = parseArgs(argv);
    if (o.help) { stdout.write(`${USAGE}\n`); return 0; }
    let text;
    try {
      text = await readFile(o.file, 'utf8');
    } catch (err) {
      throw new Error(`cannot read ${o.file}: ${err.message}`);
    }
    result = review(parseSpec(text), { tenantNames: o.tenantNames, skip: o.skip });
  } catch (err) {
    stderr.write(`${err.message}\n\n${USAGE}\n`);
    return 2;
  }
  const out = o.format === 'json' ? toJson(result) : o.format === 'csv' ? toCsv(result)
    : o.format === 'markdown' ? toMarkdown(result) : toText(result);
  if (o.output) await writeFile(o.output, `${out}\n`);
  else stdout.write(`${out}\n`);
  if (o.failOn) {
    const n = count(result, 'problem') + (o.failOn === 'warning' ? count(result, 'warning') : 0);
    if (n) {
      stderr.write(`${n} finding(s) at ${o.failOn} level or above\n`);
      return 1;
    }
  }
  return 0;
}
