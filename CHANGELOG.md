# Changes

## 1.0.0

First release.

- Six checks on an OpenAPI 3 document: authentication, tenants chosen by the caller, paging of lists, rate limit responses, error responses, and operation ids.
- Local references followed through parameters, request bodies, responses and schemas; references that cannot be followed are listed.
- `x-public: true` marks an operation that is public on purpose.
- Reports as text, Markdown, JSON and CSV; `--fail-on problem|warning` for use in a pipeline.
- Release packages come with a CycloneDX SBOM, SHA-256 checksums and a build provenance attestation.
