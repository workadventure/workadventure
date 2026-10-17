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
	"path"
	"slices"
	"strings"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

//go:embed wam.schema.json
var schemaJSON []byte

var fileSchema, areaSchema, entitySchema, megaphoneSchema, recordingSchema = func() (f, a, e, m, r *jsonschema.Schema) {
	doc, err := jsonschema.UnmarshalJSON(bytes.NewReader(schemaJSON))
	if err != nil {
		panic(err)
	}
	c := jsonschema.NewCompiler()
	if err := c.AddResource("wam.json", doc); err != nil {
		panic(err)
	}
	const root = "wam.json#/definitions/WAMFileFormat/properties"
	return c.MustCompile("wam.json"), c.MustCompile(root + "/areas/items"), c.MustCompile(root + "/entities/additionalProperties"),
		c.MustCompile(root + "/settings/properties/megaphone"), c.MustCompile(root + "/settings/properties/recording")
}()

// Parse decodes a WAM file. Numbers stay json.Number: what is not changed is written back as it was.
func Parse(file []byte) (map[string]any, error) {
	v, err := jsonschema.UnmarshalJSON(bytes.NewReader(file))
	if err != nil {
		return nil, err
	}
	doc, ok := v.(map[string]any)
	if !ok {
		return nil, errors.New("the WAM file is not an object")
	}
	return doc, nil
}

// Validate checks a whole file, as decoded by Parse and migrated, against the schema.
func Validate(doc map[string]any) error { return fileSchema.Validate(doc) }

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
	DeleteArea struct{ ID string }
	// CreateEntity places an entity. Width and Height are its prefab's size, which only the rights check uses: what
	// counts is where its centre falls.
	CreateEntity struct {
		ID, PrefabID, CollectionName string
		X, Y, Width, Height          int64
		Name                         *string
		Properties                   []any
	}
	// ModifyEntity moves an entity; its name when set, its properties only when ModifyProperties.
	ModifyEntity struct {
		ID                  string
		X, Y, Width, Height int64
		Name                *string
		Properties          []any
		ModifyProperties    bool
	}
	DeleteEntity struct{ ID string }
	// DeleteEntitiesOf removes the copies of a custom entity that was deleted.
	DeleteEntitiesOf struct{ PrefabID string }
	SetMegaphone     struct{ Settings any } // nil removes the megaphone settings
	SetRecording     struct{ Settings any } // nil removes the recording settings
	SetMetadata      struct {
		Name                                    string
		Description, Copyright, Thumbnail, Tags *string
	}
)

// Result is what an edit did besides the new file.
type Result struct {
	Doc     map[string]any // the edited document
	Area    map[string]any // ModifyArea: the area as it now is, which is what the editors are told
	Removed []string       // private files no property links to anymore
}

// Edit applies a command to a WAM file and returns the new file. A file that does not follow the schema is refused,
// as WAMFileFormat.parse refuses it on load: an edit must not paper over it (an "areas" that is not a list would be
// read as empty and overwritten).
func Edit(file []byte, commandID string, cmd any) ([]byte, Result, error) {
	doc, err := Parse(file)
	if err != nil {
		return nil, Result{}, err
	}
	Migrate(doc)
	if err := Validate(doc); err != nil {
		return nil, Result{}, fmt.Errorf("invalid WAM file: %w", err)
	}
	r, err := apply(doc, cmd)
	if err != nil {
		return nil, Result{}, err
	}
	doc["lastCommandId"] = commandID
	out, err := json.Marshal(doc)
	r.Doc = doc
	return out, r, err
}

func apply(doc map[string]any, cmd any) (Result, error) {
	areas, _ := doc["areas"].([]any)
	entities, _ := doc["entities"].(map[string]any)
	if entities == nil {
		entities = map[string]any{}
		doc["entities"] = entities
	}
	find := func(id string) int {
		return slices.IndexFunc(areas, func(a any) bool { m, _ := a.(map[string]any); return m["id"] == id })
	}
	switch c := cmd.(type) {
	case CreateArea:
		if find(c.ID) >= 0 {
			return Result{}, fmt.Errorf("Could not execute CreateArea Command: area %s already exists", c.ID)
		}
		area := map[string]any{"id": c.ID, "name": c.Name, "x": c.X, "y": c.Y, "width": c.Width, "height": c.Height, "visible": true, "properties": orEmpty(c.Properties)}
		if err := validate(areaSchema, area); err != nil {
			return Result{}, err
		}
		doc["areas"] = append(areas, area)
		return Result{}, nil
	case ModifyArea:
		i := find(c.ID)
		if i < 0 {
			return Result{}, fmt.Errorf("Could not execute UpdateArea Command: area %s not found", c.ID)
		}
		area := clone(areas[i])
		if c.Name != nil {
			area["name"] = *c.Name
		}
		for k, v := range map[string]*int64{"x": c.X, "y": c.Y, "width": c.Width, "height": c.Height} {
			if v != nil {
				area[k] = *v
			}
		}
		var removed []string
		if c.ModifyProperties {
			old, _ := area["properties"].([]any)
			props := keepServerData(dedupe(c.Properties), old)
			removed = filesRemoved(old, props)
			area["properties"] = props
		}
		if err := validate(areaSchema, area); err != nil {
			return Result{}, err
		}
		areas[i] = area
		return Result{Area: area, Removed: removed}, nil
	case DeleteArea:
		i := find(c.ID)
		if i < 0 {
			return Result{}, nil
		}
		props, _ := areas[i].(map[string]any)["properties"].([]any)
		doc["areas"] = slices.Delete(areas, i, i+1)
		return Result{Removed: filesRemoved(props, nil)}, nil
	case CreateEntity:
		if _, ok := entities[c.ID]; ok {
			return Result{}, fmt.Errorf("Could not execute CreateEntity Command: entity %s already exists", c.ID)
		}
		entity := map[string]any{"prefabRef": map[string]any{"id": c.PrefabID, "collectionName": c.CollectionName}, "x": c.X, "y": c.Y,
			"properties": orEmpty(c.Properties)}
		if c.Name != nil {
			entity["name"] = *c.Name
		}
		if err := validate(entitySchema, entity); err != nil {
			return Result{}, err
		}
		entities[c.ID] = entity
		return Result{}, nil
	case ModifyEntity:
		if entities[c.ID] == nil {
			return Result{}, fmt.Errorf("Could not execute UpdateEntity Command: entity %s not found", c.ID)
		}
		entity := clone(entities[c.ID])
		entity["x"], entity["y"] = c.X, c.Y
		if c.Name != nil {
			entity["name"] = *c.Name
		}
		var removed []string
		if c.ModifyProperties {
			old, _ := entity["properties"].([]any)
			props := orEmpty(c.Properties)
			removed = filesRemoved(old, props)
			entity["properties"] = props
		}
		if err := validate(entitySchema, entity); err != nil {
			return Result{}, err
		}
		entities[c.ID] = entity
		return Result{Removed: removed}, nil
	case DeleteEntity:
		var removed []string
		if e, ok := entities[c.ID].(map[string]any); ok {
			props, _ := e["properties"].([]any)
			removed = filesRemoved(props, nil)
			delete(entities, c.ID)
		}
		return Result{Removed: removed}, nil
	case DeleteEntitiesOf:
		var removed []string
		for id, e := range entities {
			m, _ := e.(map[string]any)
			if ref, _ := m["prefabRef"].(map[string]any); ref["id"] == c.PrefabID {
				props, _ := m["properties"].([]any)
				removed = append(removed, filesRemoved(props, nil)...)
				delete(entities, id)
			}
		}
		return Result{Removed: removed}, nil
	case SetMegaphone:
		return Result{}, setSetting(doc, "megaphone", c.Settings, megaphoneSchema)
	case SetRecording:
		return Result{}, setSetting(doc, "recording", c.Settings, recordingSchema)
	case SetMetadata:
		metadata, _ := doc["metadata"].(map[string]any)
		if metadata == nil {
			metadata = map[string]any{}
		}
		metadata["name"] = c.Name
		for k, v := range map[string]*string{"description": c.Description, "copyright": c.Copyright, "thumbnail": c.Thumbnail} {
			if v != nil {
				metadata[k] = *v
			} else {
				delete(metadata, k)
			}
		}
		doc["metadata"] = metadata
		vendor, _ := doc["vendor"].(map[string]any)
		if vendor == nil {
			vendor = map[string]any{}
		}
		tags := []any{}
		if c.Tags != nil && *c.Tags != "" {
			for _, t := range strings.Split(*c.Tags, ",") {
				tags = append(tags, t)
			}
		}
		vendor["tags"] = tags
		doc["vendor"] = vendor
		return Result{}, validate(fileSchema, doc)
	}
	return Result{}, fmt.Errorf("unsupported map edit %T", cmd)
}

func setSetting(doc map[string]any, key string, value any, s *jsonschema.Schema) error {
	settings, _ := doc["settings"].(map[string]any)
	if settings == nil {
		settings = map[string]any{}
	}
	if value == nil {
		delete(settings, key)
	} else {
		if err := validate(s, value); err != nil {
			return err
		}
		settings[key] = value
	}
	doc["settings"] = settings
	return nil
}

func orEmpty(props []any) []any {
	if props == nil {
		return []any{}
	}
	return props
}

func clone(v any) map[string]any {
	out := map[string]any{}
	m, _ := v.(map[string]any)
	for k, x := range m {
		out[k] = x
	}
	return out
}

// PrivateFile is where a file uploaded for an openFile property is stored (CustomFileService).
func PrivateFile(name, propertyID string) string {
	base := path.Base(name)
	ext := path.Ext(base)
	return "private/files/" + strings.TrimSuffix(base, ext) + "-" + propertyID + ext
}

// filesRemoved lists the private files of the openFile properties of old that next drops, or empties (FileModule).
func filesRemoved(old, next []any) []string {
	var out []string
	for _, o := range old {
		op, _ := o.(map[string]any)
		name, _ := op["name"].(string)
		if op["type"] != "openFile" || name == "" {
			continue
		}
		i := slices.IndexFunc(next, func(n any) bool { m, _ := n.(map[string]any); return m["id"] == op["id"] })
		if i >= 0 {
			np, _ := next[i].(map[string]any)
			newName, _ := np["name"].(string)
			newLink, _ := np["link"].(string)
			oldLink, _ := op["link"].(string)
			if !(oldLink != "" && newName == "" && newLink == "") {
				continue
			}
		}
		id, _ := op["id"].(string)
		out = append(out, PrivateFile(name, id))
	}
	return out
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

// Migrate brings a WAM file to the latest version, like wamFileMigration (WamFileMigration.ts) on load.
func Migrate(doc map[string]any) {
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
