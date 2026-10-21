package spacestate

import (
	_ "embed"

	"github.com/workadventure/workadventure/server-go/internal/zodschema"
)

//go:embed spacestate.schema.json
var schemaJSON []byte

var schemas = zodschema.Compile(schemaJSON, "SpaceState", "SpaceKind")

// Validate checks the state against the schema the front parses it with (SpaceState.ts).
func (v *SpaceState) Validate() error { return zodschema.Validate(schemas["SpaceState"], v) }

// Validate checks the kind against spaceKindSchema.
func (v SpaceKind) Validate() error { return zodschema.Validate(schemas["SpaceKind"], v) }
