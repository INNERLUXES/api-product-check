# Security

## Reporting a problem

Write to info@innerluxes.dev with the subject line "api-product-check security", or use private vulnerability reporting on this repository. Please do not open a public issue for a vulnerability.

Include a document that shows the problem (a made-up API is best), what you expected and what happened. Do not send the API description of a product that is not public.

## Scope

In scope:

- a document that passes the checks while an operation in it has no authentication, or names a tenant the check should catch
- a document that makes the tool hang or use unbounded memory, for example through reference loops
- a CSV report that runs as a formula when opened in a spreadsheet
- anything that makes the tool open a network connection, follow an external reference, or read or write a file it was not given

Out of scope: what the server really does. The tool reads the description, not the running API; docs/limits.md lists what that means.

Read [docs/threat-model.md](docs/threat-model.md) for the rest.
