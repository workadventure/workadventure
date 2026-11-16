# zod → JSON Schema → Go

The server shares its contracts with the front and the admin through their zod schemas. A single pipeline makes
the Go side of them, so that nothing is copied by hand:

1. **zod → JSON Schema**: `export.mts` exports each schema with `zod-to-json-schema` (already used for WAM and
   analytics), one file per Go package, with a named definition per Go type
   (`internal/spacestate/spacestate.schema.json`, `internal/admin/admin.schema.json`);
2. **JSON Schema → Go types**: `go-jsonschema` (`github.com/atombender/go-jsonschema`, a `tool` of `go.mod`) writes
   `*.gen.go`, the models only;
3. **validation**: `internal/zodschema` compiles the embedded schemas with `santhosh-tekuri/jsonschema`.

```sh
cd server-go && go generate ./schemas/...   # needs the repository's node_modules
```

The CI job `.github/workflows/server-go-generated.yml` runs `go generate ./...` and fails on any diff.

## What zod and JSON Schema say differently

- **String lengths**: zod's `.min()`/`.max()` count UTF-16 code units (JavaScript's `String.length`), JSON Schema's
  `minLength`/`maxLength` count code points. An emoji outside the BMP is 1 code point and 2 units. The export
  writes them `minLengthUTF16`/`maxLengthUTF16`, a vocabulary of `internal/zodschema`, so Go decides as the front
  does (`TestStringLengthsCountUTF16CodeUnitsAsZodDoes`, `TestAPollQuestionLengthCountsUTF16Units`).
- **Extra keys**: zod drops them, JSON Schema accepts them by default: `additionalProperties: true` is left out
  (otherwise `go-jsonschema` gives every struct a field for them).
- **Key order**: the generated structs list their fields alphabetically; the JSON the server writes follows them,
  not zod's order (the front does not care; two tests compared strings and were changed).
- **Integers**: `z.number().int()` is Go's `int` (64 bits on the server's platforms), no longer `int64`.

## Checked by hand

`export.mts` lists on stderr every zod node JSON Schema cannot express (`.refine`, `.superRefine`, `.transform`,
`.preprocess`). Today, one:

| Schema | Node | In Go |
|---|---|---|
| `WorldChatMembersData` (`play/src/pusher/services/WorldChatMembersData.ts`) | `members[].email`: `.transform(null → undefined)` | a JSON `null` decodes to a nil pointer, an absent field in the protobuf answer: what `undefined` is for the front (`TestAChatMemberWithoutEmailHasNone`) |

## Left out on purpose

- **The configuration** (`internal/config`) and **the ws query** (`validateQuery`): they convert strings (env,
  query parameters) into typed values, with defaults and fallbacks; they are not schemas of a JSON document.
- **`MapDetailsData`**: validated against its schema, as the pusher does, but read as a map: the server hands the
  admin's answer on to the front as it came (its extra keys included), and the generated types of its many nullable
  unions would not be read anyway.
- **The member access answer** keeps two checks stricter than zod (`userUuid` and `world` not empty): a member
  without them could not be served.
