package mapedit

import (
	"encoding/json"
	"errors"
	"fmt"
	"path"
	"regexp"
	"slices"

	"github.com/workadventure/workadventure/server-go/internal/wam"
)

// Custom entities: images uploaded from the map editor, listed in a collection the front loads next to the maps
// (CustomEntityCollectionService).
const customCollection = "assets/entities/entities.json"

// The commands on custom entities and uploaded files.
type (
	UploadEntity struct {
		ID, Name, ImagePath, Direction, Color string
		Tags                                  []string
		CollisionGrid                         any // nil: none
		DepthOffset                           *int32
		File                                  []byte
	}
	ModifyCustomEntity struct {
		ID, Name      string
		Tags          []string
		CollisionGrid any
		DepthOffset   *int32
	}
	DeleteCustomEntity struct{ ID string }
	// UploadFile stores the file of an "open file" property, readable through /private/files with a token, or the
	// sound of a "play audio" one, a public map asset.
	UploadFile struct {
		Kind             wam.FileKind // what it is for, which decides where it goes
		Name, PropertyID string
		File             []byte
	}
)

var imageFile = regexp.MustCompile(`(?i)\.(jpg|jpeg|png|webp)$`)

// editCollection changes the custom entities collection; f gets its entries.
func editCollection(maps Maps, f func(entries []map[string]any) ([]map[string]any, error)) error {
	return maps.Edit(customCollection, func(file []byte) ([]byte, error) {
		c := map[string]any{"version": "1.0", "collection": []any{}, "collectionName": "custom entities", "tags": []any{}}
		if file != nil {
			if err := json.Unmarshal(file, &c); err != nil {
				return nil, err
			}
		}
		raw, _ := c["collection"].([]any)
		entries := make([]map[string]any, 0, len(raw))
		for _, e := range raw {
			if m, ok := e.(map[string]any); ok {
				entries = append(entries, m)
			}
		}
		entries, err := f(entries)
		if err != nil {
			return nil, err
		}
		c["collection"] = entries
		return json.Marshal(c)
	})
}

// uploadEntity stores the image and lists the entity, owned by whoever uploaded it.
func uploadEntity(maps Maps, ed Editor, c UploadEntity) error {
	image := path.Base(c.ImagePath)
	if !imageFile.MatchString(image) {
		return errors.New("File extension is not a supported image")
	}
	entry := map[string]any{"id": c.ID, "name": c.Name, "tags": orEmpty(c.Tags), "imagePath": c.ImagePath, "direction": c.Direction,
		"color": c.Color, "ownerId": ed.UUID}
	if c.CollisionGrid != nil {
		if !isGrid(c.CollisionGrid) {
			return errors.New("Invalid collision grid")
		}
		entry["collisionGrid"] = c.CollisionGrid
	}
	if c.DepthOffset != nil {
		entry["depthOffset"] = *c.DepthOffset
	}
	if err := maps.Put("assets/entities/"+image, c.File); err != nil {
		return err
	}
	return editCollection(maps, func(entries []map[string]any) ([]map[string]any, error) { return append(entries, entry), nil })
}

func isGrid(v any) bool {
	rows, ok := v.([]any)
	return ok && !slices.ContainsFunc(rows, func(r any) bool {
		cells, ok := r.([]any)
		return !ok || slices.ContainsFunc(cells, func(c any) bool { _, n := c.(float64); return !n })
	})
}

func orEmpty(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

// mayChange: map editors, or whoever uploaded it.
func mayChange(ed Editor, entry map[string]any, verb string) error {
	owner, _ := entry["ownerId"].(string)
	if ed.CanEdit || (owner != "" && owner == ed.UUID) {
		return nil
	}
	return fmt.Errorf("User %s is not allowed to %s the custom entity %v: only its creator or a user with map edit rights can.", ed.UUID, verb, entry["id"])
}

func modifyCustomEntity(maps Maps, ed Editor, c ModifyCustomEntity) error {
	return editCollection(maps, func(entries []map[string]any) ([]map[string]any, error) {
		i := slices.IndexFunc(entries, func(e map[string]any) bool { return e["id"] == c.ID })
		if i < 0 {
			return nil, fmt.Errorf("Custom entity %s not found", c.ID)
		}
		if err := mayChange(ed, entries[i], "modify"); err != nil {
			return nil, err
		}
		e := entries[i]
		e["name"], e["tags"] = c.Name, orEmpty(c.Tags)
		delete(e, "collisionGrid")
		if c.CollisionGrid != nil {
			if !isGrid(c.CollisionGrid) {
				return nil, errors.New("Invalid collision grid")
			}
			e["collisionGrid"] = c.CollisionGrid
		}
		delete(e, "depthOffset")
		if c.DepthOffset != nil {
			e["depthOffset"] = *c.DepthOffset
		}
		return entries, nil
	})
}

// deleteCustomEntity removes it from the collection with its image; its copies on the map go with the WAM edit.
func deleteCustomEntity(maps Maps, ed Editor, id string) error {
	var image string
	err := editCollection(maps, func(entries []map[string]any) ([]map[string]any, error) {
		i := slices.IndexFunc(entries, func(e map[string]any) bool { return e["id"] == id })
		if i < 0 {
			return entries, nil
		}
		if err := mayChange(ed, entries[i], "delete"); err != nil {
			return nil, err
		}
		image, _ = entries[i]["imagePath"].(string)
		return slices.Delete(entries, i, i+1), nil
	})
	if err == nil && image != "" {
		_ = maps.Remove("assets/entities/" + path.Base(image))
	}
	return err
}

func uploadFile(maps Maps, c UploadFile) error {
	key, err := wam.UploadedFile(c.Kind, c.Name, c.PropertyID)
	if err != nil {
		return err
	}
	return maps.Put(key, c.File)
}
