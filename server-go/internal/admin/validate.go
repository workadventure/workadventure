package admin

import (
	_ "embed"
	"encoding/json"
	"fmt"

	"github.com/workadventure/workadventure/server-go/internal/zodschema"
)

//go:embed admin.schema.json
var schemaJSON []byte

// The admin's answers, checked against the zod schemas the pusher parses them with (AdminApi.ts).
var schemas = zodschema.Compile(schemaJSON, "MapDetailsData", "RoomRedirect", "ErrorApiErrorData", "MemberAccessGranted",
	"Capabilities", "ShortMapDescriptionList", "WorldChatMembers", "ChatMember")

func valid(schema string, v any) bool { return zodschema.Validate(schemas[schema], v) == nil }

// checked decodes raw into out once it follows schema; each, for a list of schema's items.
func checked(raw json.RawMessage, schema string, each bool, out any) error {
	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
		return err
	}
	items := []any{v}
	if each {
		list, ok := v.([]any)
		if !ok {
			return fmt.Errorf("admin: %s: not a list", schema)
		}
		items = list
	}
	for _, it := range items {
		if err := zodschema.Validate(schemas[schema], it); err != nil {
			return fmt.Errorf("admin: the answer does not follow %s: %w", schema, err)
		}
	}
	return json.Unmarshal(raw, out)
}
