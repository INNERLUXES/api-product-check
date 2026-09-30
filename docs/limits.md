# What a description cannot show

- **What the server does.** The tool reads the OpenAPI document, not the running API. An operation described with security may still be open in code, and a tenant id may be checked properly on the server. Test the running API as well.
- **Operations that are not described.** An endpoint missing from the document is missing from the review.
- **YAML.** The tool reads JSON. Convert a YAML description first, with any YAML to JSON converter.
- **External references.** References to other files or URLs are not followed, on purpose: following them would mean reading files or opening connections the reader did not give. They are listed so nothing reads as checked when it was not.
- **Business rules.** Whether a role may do an action, or whether a price may be changed, is not in a description in a form a tool can judge.
