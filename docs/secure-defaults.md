# Secure defaults

| Setting | Default | Why |
|---|---|---|
| Operation without security | Problem, unless marked `x-public: true` | An open operation should be a decision someone wrote down, not an omission. |
| Optional authentication (`{}` in security) | Problem | An anonymous call succeeds, which is the same as no authentication for an attacker. |
| Tenant names | Eight common spellings, checked in every place | The check should catch `orgId` and `X-Tenant-Id` without configuration. |
| References that cannot be followed | Listed in every format | A part that was not checked must never read as clean. |
| External references | Never followed | Following them would read files or open connections the reader did not give. |
| Exit code | 0, unless `--fail-on` is given | The tool reports by default; a pipeline decides whether findings block it. |
| CSV cells | Formula characters prefixed with an apostrophe | Paths and ids are free text and must not run in a spreadsheet. |
| Network | Never used | An API description of a product that is not public stays on the machine. |
| Output | Terminal | Nothing is written to disk unless `--output` is given. |
