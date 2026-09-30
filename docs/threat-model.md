# Threat model

The tool reads the description of a product's API, which may not be public, and prints findings that decide what gets fixed before release. The risks are a missed finding, a document that makes the tool misbehave, and the description going where it should not.

| Threat | Response |
|---|---|
| An open operation is missed because its security sits at the top of the document or is an empty object | Operation security, document security, empty lists and optional (`{}`) requirements are all handled and tested. |
| A tenant id is missed because it is spelled differently | Names are compared without case, `_`, `-` or spaces, and `X-` headers are understood. |
| A part of the document is not checked and reads as clean | References that cannot be followed are listed in every format. |
| A reference loop makes the tool hang | Every reference chain is followed with a guard; a loop is reported as a reference that refers to itself. |
| A reference makes the tool read another file or open a connection | Only references inside the document are followed. |
| A path or id runs as a formula when the CSV is opened | Cells that start with a formula character are prefixed with an apostrophe. |
| The description leaves the machine | The tool opens no network connection and writes a file only when `--output` is given. |

## Outside this model

- What the running server does; docs/limits.md says why.
- A modified copy of the tool. Install from a release and check the attestation and checksums.
