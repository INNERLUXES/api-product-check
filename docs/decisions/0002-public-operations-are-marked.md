# 2. Public operations are marked, not guessed

## Context

Every product has operations that must be public: sign-up, sign-in, a health check, a webhook receiver. A tool could guess them from their paths, but a guess that lets `/admin/signup-report` through because it contains "signup" is worse than no check.

## Decision

- An operation without security is a problem unless it carries `x-public: true`, an OpenAPI extension that tools which do not know it ignore.
- Marked operations are still listed, as info, so the list of public operations can be reviewed in one place.

## Consequences

- The first run on an existing description reports every public operation as a problem until someone marks it. That review is the point.
