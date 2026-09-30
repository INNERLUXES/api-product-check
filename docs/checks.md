# The checks

Every operation in `paths` is checked, with the path-level parameters merged into it (an operation parameter replaces a path parameter with the same name and place). Local references (`#/...`) are followed; a reference that points outside the file, points nowhere or refers to itself is listed under "references not followed", because what it points to could not be checked.

| Check | Level | Finding |
|---|---|---|
| `auth` | problem | The operation has no security requirement: none on the operation and none at the top of the document, an empty list, or an empty object (`{}`) that makes authentication optional. |
| `auth` | info | The same, but the operation carries `x-public: true`: public on purpose, such as sign-up or a health check. |
| `tenant` | warning | A parameter (path, query, header or cookie) or a top-level request body property names a tenant: `tenant_id`, `org_id`, `organization_id`, `organisation_id`, `account_id`, `workspace_id`, `customer_id` or `company_id`, in any spelling (`orgId`, `X-Tenant-Id`). Change the list with `--tenant-names`. |
| `paging` | warning | A GET whose 2xx JSON response is an array, or an object whose `items`, `data`, `results`, `records` or `entries` is an array, has no query parameter for paging (`limit`, `cursor`, `page`, `page_size`, `offset` and similar). |
| `rate-limit` | warning | No `429` or `4XX` response is documented. |
| `errors` | warning | No 4xx response and no `default` response is documented. |
| `operation-id` | warning | The operation has no `operationId`. |
| `operation-id` | problem | The `operationId` is already used by another operation, which is named. |

## Why each one matters for a product

- **auth**: an operation anyone can call is open to every customer's competitor too. Marking the public ones makes the rest reviewable.
- **tenant**: when the caller says which tenant it means, the server must check that the caller belongs to it. Skipping that check is the most common way one customer reads another customer's data. The tool cannot see the server, so this is a warning to confirm, not a verdict.
- **paging**: a list without paging returns everything, and everything grows with every customer until the response times out.
- **rate-limit**: a limit clients cannot see in the description is a limit they discover in production.
- **errors**: without documented errors, a client cannot tell its own mistake from an outage.
- **operation-id**: client libraries generated from the description name their functions after these ids; a duplicate breaks the build.
