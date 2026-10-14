// Package wam applies the map editor's commands to WorkAdventure map files (WAM). The document stays the JSON it
// is: what the server does not touch round-trips as it came. What it touches is checked against the JSON Schema
// exported from the zod schema the front parses the file with, so that the map keeps loading for everyone.
package wam

//go:generate sh gen.sh

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"slices"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

//go:embed wam.schema.json
var schemaJSON []byte

var areaSchema, megaphoneSchema = func() (*jsonschema.Schema, *jsonschema.Schema) {
	doc, err := jsonschema.UnmarshalJSON(bytes.NewReader(schemaJSON))
	if err != nil {
		panic(err)
	}
	c := jsonschema.NewCompiler()
	if err := c.AddResource("wam.json", doc); err != nil {
		panic(err)
	}
	const root = "wam.json#/definitions/WAMFileFormat/properties"
	return c.MustCompile(root + "/areas/items"), c.MustCompile(root + "/settings/properties/megaphone")
}()

// Commands the server applies (EditMapMessage). Values are JSON as decoded: map[string]any, []any, float64, string,
// bool, nil.
type (
	CreateArea struct {
		ID, Name            string
		X, Y, Width, Height int64
		Properties          []any
	}
	// ModifyArea changes the fields that are set; the properties only when ModifyProperties.
	ModifyArea struct {
		ID                  string
		Name                *string
		X, Y, Width, Height *int64
		Properties          []any
		ModifyProperties    bool
	}
	DeleteArea   struct{ ID string }
	SetMegaphone struct{ Settings any } // nil removes the megaphone settings
)

// Edit applies a command to a WAM file and returns the new file. For ModifyArea, it also returns the area as it
// now is: that is what the editors are told.
func Edit(file []byte, commandID string, cmd any) ([]byte, map[string]any, error) {
	v, err := jsonschema.UnmarshalJSON(bytes.NewReader(file)) // numbers stay json.Number: they round-trip as written
	if err != nil {
		return nil, nil, err
	}
	doc, ok := v.(map[string]any)
	if !ok {
		return nil, nil, errors.New("the WAM file is not an object")
	}
	migrate(doc)
	area, err := apply(doc, cmd)
	if err != nil {
		return nil, nil, err
	}
	doc["lastCommandId"] = commandID
	out, err := json.Marshal(doc)
	return out, area, err
}

func apply(doc map[string]any, cmd any) (map[string]any, error) {
	areas, _ := doc["areas"].([]any)
	find := func(id string) int {
		return slices.IndexFunc(areas, func(a any) bool { m, _ := a.(map[string]any); return m["id"] == id })
	}
	switch c := cmd.(type) {
	case CreateArea:
		if find(c.ID) >= 0 {
			return nil, fmt.Errorf("Could not execute CreateArea Command: area %s already exists", c.ID)
		}
		props := c.Properties
		if props == nil {
			props = []any{}
		}
		area := map[string]any{"id": c.ID, "name": c.Name, "x": c.X, "y": c.Y, "width": c.Width, "height": c.Height, "visible": true, "properties": props}
		if err := validate(areaSchema, area); err != nil {
			return nil, err
		}
		doc["areas"] = append(areas, area)
		return nil, nil
	case ModifyArea:
		i := find(c.ID)
		if i < 0 {
			return nil, fmt.Errorf("Could not execute UpdateArea Command: area %s not found", c.ID)
		}
		area := map[string]any{}
		for k, v := range areas[i].(map[string]any) {
			area[k] = v
		}
		if c.Name != nil {
			area["name"] = *c.Name
		}
		for k, v := range map[string]*int64{"x": c.X, "y": c.Y, "width": c.Width, "height": c.Height} {
			if v != nil {
				area[k] = *v
			}
		}
		if c.ModifyProperties {
			old, _ := area["properties"].([]any)
			area["properties"] = keepServerData(dedupe(c.Properties), old)
		}
		if err := validate(areaSchema, area); err != nil {
			return nil, err
		}
		areas[i] = area
		return area, nil
	case DeleteArea:
		if i := find(c.ID); i >= 0 {
			doc["areas"] = slices.Delete(areas, i, i+1)
		}
		return nil, nil
	case SetMegaphone:
		settings, _ := doc["settings"].(map[string]any)
		if settings == nil {
			settings = map[string]any{}
		}
		if c.Settings == nil {
			delete(settings, "megaphone")
		} else {
			if err := validate(megaphoneSchema, c.Settings); err != nil {
				return nil, err
			}
			settings["megaphone"] = c.Settings
		}
		doc["settings"] = settings
		return nil, nil
	}
	return nil, fmt.Errorf("unsupported map edit %T", cmd)
}

// validate checks a value built from protobuf Values (float64, int64...) the way the schema sees JSON.
func validate(s *jsonschema.Schema, v any) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	parsed, err := jsonschema.UnmarshalJSON(bytes.NewReader(b))
	if err != nil {
		return err
	}
	return s.Validate(parsed)
}

// Properties an area may hold once (GameMapAreas.updateArea keeps the first).
var single = []string{"start", "focusable", "silent", "jitsiRoomProperty", "personalAreaPropertyData", "restrictedRightsPropertyData",
	"matrixRoomPropertyData", "tooltipPropertyData"}

func dedupe(props []any) []any {
	out := make([]any, 0, len(props))
	seen := map[string]bool{}
	for _, p := range props {
		m, _ := p.(map[string]any)
		t, _ := m["type"].(string)
		if slices.Contains(single, t) {
			if seen[t] {
				continue
			}
			seen[t] = true
		}
		out = append(out, p)
	}
	return out
}

// keepServerData keeps the serverData a property had when the editor sends it back without (or empty): clients do
// not hold it.
func keepServerData(props, old []any) []any {
	for _, p := range props {
		m, _ := p.(map[string]any)
		if data, _ := m["serverData"].(map[string]any); m == nil || (m["serverData"] != nil && len(data) > 0) {
			continue
		}
		for _, o := range old {
			if om, _ := o.(map[string]any); om["id"] == m["id"] && om["serverData"] != nil {
				m["serverData"] = om["serverData"]
			}
		}
	}
	return props
}

// migrate brings a WAM file to the latest version, like wamFileMigration (WamFileMigration.ts) on load.
func migrate(doc map[string]any) {
	areas, _ := doc["areas"].([]any)
	props := func(a any) []any { m, _ := a.(map[string]any); p, _ := m["properties"].([]any); return p }
	if v, _ := doc["version"].(string); v == "" || v == "1.0.0" {
		// 2.0.0: the Jitsi admin tag leaves jitsiRoomConfig.
		for _, a := range areas {
			for _, p := range props(a) {
				m, _ := p.(map[string]any)
				if m["type"] != "jitsiRoomProperty" {
					continue
				}
				if config, _ := m["jitsiRoomConfig"].(map[string]any); config != nil {
					if tag, ok := config["jitsiRoomAdminTag"]; ok {
						m["jitsiRoomAdminTag"] = tag
						delete(config, "jitsiRoomAdminTag")
					}
				}
			}
		}
		doc["version"] = "2.0.0"
	}
	if doc["version"] == "2.0.0" {
		// 2.1.0: a meeting room or a podium can be locked.
		for _, a := range areas {
			for _, t := range []string{"livekitRoomProperty", "jitsiRoomProperty", "speakerMegaphone"} {
				i := slices.IndexFunc(props(a), func(p any) bool { m, _ := p.(map[string]any); return m["type"] == t })
				if i < 0 {
					continue
				}
				parent := props(a)[i].(map[string]any)
				a.(map[string]any)["properties"] = append(props(a), map[string]any{"id": fmt.Sprint(parent["id"]) + "-lock", "type": "lockableAreaPropertyData"})
				break
			}
		}
		doc["version"] = "2.1.0"
	}
}
