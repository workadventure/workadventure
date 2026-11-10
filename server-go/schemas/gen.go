// Package schemas generates, from the zod schemas the front and the admin parse with, the JSON Schemas and the Go
// types of what the server shares with them (export.mts, then go-jsonschema). See README.md.
package schemas

//go:generate sh gen.sh
