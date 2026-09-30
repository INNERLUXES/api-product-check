# 1. The tenant check is a warning, not a problem

## Context

Many sound APIs put the tenant in the path (`/orgs/{orgId}/tasks`) and check on the server that the caller belongs to it. Many broken ones look exactly the same in their description. The difference is in the server code, which the tool does not read.

## Decision

- A tenant named by the caller is a warning that says what the server must do, not a problem.
- The list of names can be changed with `--tenant-names`, so a product that calls its tenants `team_id` or `store_id` is covered.

## Consequences

- A clean description with tenant warnings is normal. Each warning is a line in a test plan: call the operation as a user of another tenant and expect a refusal.
