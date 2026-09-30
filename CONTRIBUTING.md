# Contributing

Every change goes through a pull request and is reviewed before it is merged. The pipeline runs the tests on Linux, Windows and macOS, the repository checks, CodeQL, and a secure development check of the repository itself.

## Adding or changing a check

1. Describe the check in docs/checks.md first: what it looks for, its level, and why a product's customers care.
2. Add a test with a small, made-up document where the expected findings can be worked out by hand.
3. A finding names the method, the path and what was found.
4. A reference the check cannot follow is reported as not followed, never read as "nothing there".

## Rules for the code

- No runtime dependencies. Node 22 or newer and nothing else.
- The tool reads the file it is given and writes only when `--output` is given. It opens no network connection and follows no external reference.
- Levels stay honest: a problem is something that is wrong in any product; a warning needs a person to look.
- Never commit the API description of a real customer, even as a test fixture.

## Before you open the pull request

```
npm test
npm run check
npm run example
```
