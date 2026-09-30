# api-product-check

Reviews the OpenAPI 3 description of a software product's API for the things its customers depend on.

A product's API is used by strangers: customers, their developers, and anyone who finds it. Before a release, the description answers questions a product team has to be sure of:

- Which operations can anyone call without signing in, and were they meant to be public?
- Where does the caller say which tenant it means, so the server must check the caller belongs to it?
- Which lists come back without paging, and will grow with every customer?
- Where are the rate limit and error responses clients need to handle?
- Are the operation ids complete and unique, so generated client libraries build?

Plain JavaScript, no dependencies. It reads the file you give it and fetches nothing; the description stays on your machine.

```
npm test
```

```
# tests 18
# pass 18
# fail 0
```

## Try it

Requires Node 22 or newer. There is nothing to install.

```
git clone https://github.com/INNERLUXES/api-product-check.git
cd api-product-check
npm run example
```

```
Example task tracker API (made up) 1.4.0: 7 operations, 3 problems, 10 warnings

auth: 4 findings
  problem  POST /admin/reindex  no authentication required
  problem  GET /reports/export  authentication is optional ({} in security)
  info     GET /health  public on purpose (x-public)
  info     POST /signup  public on purpose (x-public)
tenant: 3 findings
  warning  GET /orgs/{orgId}/tasks  the caller names the tenant (orgId in path): the server must check the caller belongs to it
  warning  POST /orgs/{orgId}/tasks  the caller names the tenant (orgId in path, workspace_id in body): the server must check the caller belongs to it
  warning  GET /reports/export  the caller names the tenant (account_id in query): the server must check the caller belongs to it
paging: 1 finding
  warning  GET /tasks/{id}/comments  returns a list with no paging parameter (limit, cursor, page...)
rate-limit: 4 findings
  warning  GET /health  no 429 response documented
  warning  POST /signup  no 429 response documented
  warning  GET /tasks/{id}/comments  no 429 response documented
  warning  GET /reports/export  no 429 response documented
errors: 2 findings
  warning  GET /health  no 4xx or default response documented
  warning  GET /tasks/{id}/comments  no 4xx or default response documented
operation-id: 1 finding
  problem  GET /reports/export  operationId createTask is also used by POST /orgs/{orgId}/tasks
```

The API in `examples/` is made up.

## Your own API

Give it one OpenAPI 3.0 or 3.1 document in JSON. A YAML description needs converting to JSON first. Mark operations that are public on purpose with `x-public: true`, an extension other tools ignore.

[docs/checks.md](docs/checks.md) gives the exact rule behind each check and why a product's customers care about it.

## Options

| Option | What it does |
|---|---|
| `--tenant-names <list>` | Names that identify a tenant, comma separated (default: tenant_id, org_id, organization_id, organisation_id, account_id, workspace_id, customer_id, company_id) |
| `--skip <list>` | Checks to leave out: auth, tenant, paging, rate-limit, errors, operation-id |
| `--format text\|markdown\|json\|csv` | CSV has one line per finding, ready to turn into tickets |
| `--output <file>` | Write the report to a file |
| `--fail-on problem\|warning` | Exit 1 when there is a finding at that level or above |

Exit codes: 0 done, 1 findings with `--fail-on`, 2 wrong usage or invalid input.

## Rules that keep the review honest

- Security at the top of the document, on the operation, empty, or optional (`{}`) is read the way an API gateway reads it.
- A reference the tool cannot follow is listed as not followed, in every format, never read as "nothing there". A skipped check is listed too.
- A tenant named by the caller is a warning to confirm on the server, not a verdict: the description cannot show the server code. [docs/limits.md](docs/limits.md) lists what a description cannot show.

## As a library

```js
import { parseSpec, review, toMarkdown } from './src/index.js';

const result = review(parseSpec(jsonText), { skip: ['rate-limit'] });
console.log(toMarkdown(result));
```

## How this repository is kept

- No runtime dependencies, a committed lock file, `npm ci` in the pipeline.
- Tests on Linux, Windows and macOS with Node 22 and 24, CodeQL, and repository checks for syntax, exports, credentials and leftovers.
- Every workflow sets its token permissions and pins every action to a full commit hash; Dependabot keeps them current.
- The pipeline checks the repository against NIST SP 800-218 with [ssdf-repo-check](https://github.com/INNERLUXES/ssdf-repo-check).
- Releases come with a CycloneDX SBOM, SHA-256 checksums and a build provenance attestation.
- [SECURITY.md](SECURITY.md), [threat model](docs/threat-model.md), [secure defaults](docs/secure-defaults.md), [design decisions](docs/decisions).

## Related

Built by the team behind [software product development services at INNERLUXES](https://innerluxes.dev/software-development/product).

## License

MIT
