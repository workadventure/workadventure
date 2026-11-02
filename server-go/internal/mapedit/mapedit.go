// Package mapedit is the map editor of the rooms: who may change what on a map, and applying the commands to the
// stored maps, one map at a time and never on a room's goroutine. It knows no transport: the WebSocket layer turns
// the front's messages into these commands, then announces what was applied.
package mapedit

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"

	"github.com/workadventure/workadventure/server-go/internal/core"
	"github.com/workadventure/workadventure/server-go/internal/wam"
)

// Maps is where the maps and their files are stored: map-storage's directory in production, memory in tests.
type Maps interface {
	Read(key string) ([]byte, error)
	// Edit replaces the document at key with what change returns (change gets nil when there is none), without
	// losing what another writer stored meanwhile.
	Edit(key string, change func([]byte) ([]byte, error)) error
	Put(key string, data []byte) error
	Remove(key string) error
}

// Editor is who sends a command.
type Editor struct {
	UUID    string
	Tags    []string
	CanEdit bool // a map editor may do anything
}

// Result is what a command changed.
type Result struct {
	Area  map[string]any // after a ModifyArea, the area as it now is: what the room is told
	Areas []core.Area    // the areas of the map after a WAM command; nil when the map was not touched
}

var errNotEditor = errors.New("You are not allowed to edit this map")

// Apply runs one command of ed on the map stored at key; id is the command's id, which the map keeps as its
// lastCommandId. Map editors may do anything. The others may place, move and delete entities where they may write,
// change their own custom entities, upload when they may write somewhere on the map, and claim or give back a
// personal area (map-storage's COMMANDS_ACCESSIBLE_WITHOUT_CAN_EDIT). Who may do what is decided on the version of the map being changed.
func Apply(maps Maps, key string, ed Editor, id string, cmd any) (Result, error) {
	if key == "" {
		return Result{}, errors.New("This room has no map to edit")
	}
	switch cmd.(type) {
	case UploadEntity, UploadFile:
		if err := mayUpload(maps, key, ed); err != nil {
			return Result{}, err
		}
	}
	switch c := cmd.(type) {
	case UploadEntity:
		return Result{}, uploadEntity(maps, ed, c)
	case ModifyCustomEntity:
		return Result{}, modifyCustomEntity(maps, ed, c)
	case DeleteCustomEntity:
		if err := deleteCustomEntity(maps, ed, c.ID); err != nil {
			return Result{}, err
		}
		cmd = wam.DeleteEntitiesOf{PrefabID: c.ID}
	case UploadFile:
		return Result{}, uploadFile(maps, c)
	}
	var res wam.Result
	err := maps.Edit(key, func(file []byte) ([]byte, error) {
		allowed, err := allow(file, key, ed, cmd)
		if err != nil {
			return nil, err
		}
		out, r, err := wam.Edit(file, id, allowed)
		res = r
		return out, err
	})
	if err != nil {
		return Result{}, err
	}
	for _, f := range res.Removed {
		if err := maps.Remove(f); err != nil {
			slog.Warn("cannot remove a file no property links to", "file", f, "error", err)
		}
	}
	return Result{Area: res.Area, Areas: RoomAreas(res.Doc)}, nil
}

// allow returns the command as ed may apply it to file, or why it may not.
func allow(file []byte, key string, ed Editor, cmd any) (any, error) {
	if ed.CanEdit {
		return cmd, nil
	}
	switch c := cmd.(type) {
	case wam.ModifyArea:
		claimed, ok := wam.Claim(file, c, ed.UUID)
		if !ok {
			return nil, fmt.Errorf("User %s is not allowed to edit the map and this modification is not a valid claim or revoke on map %s", ed.UUID, key)
		}
		return claimed, nil
	case wam.CreateEntity:
		return cmd, mayEditAt(file, key, ed, float64(c.X), float64(c.Y))
	case wam.ModifyEntity:
		// Both where the entity is and where it goes: a member may not pull furniture out of a zone it may not
		// write in, nor push it into one.
		if x, y, ok := wam.EntityAt(file, c.ID); ok {
			if err := mayEditAt(file, key, ed, x, y); err != nil {
				return nil, err
			}
		}
		return cmd, mayEditAt(file, key, ed, float64(c.X), float64(c.Y))
	case wam.DeleteEntity:
		// An entity already gone (a concurrent delete) is not checked: the delete is a no-op that every client still
		// gets, so that they agree.
		if x, y, ok := wam.EntityAt(file, c.ID); ok {
			return cmd, mayEditAt(file, key, ed, x, y)
		}
		return cmd, nil
	case wam.DeleteEntitiesOf:
		// The copies of a custom entity go with it, wherever they are: whether ed may delete the entity was decided
		// on the entity (mayChange).
		return cmd, nil
	}
	return nil, errNotEditor
}

// mayEditAt checks that ed may write where an entity's top-left corner is. The corner is the only point of an entity
// the server knows: the map stores no size, and the size the client sends cannot be trusted, since a made-up size
// would move the centre into the editor's zone.
func mayEditAt(file []byte, key string, ed Editor, x, y float64) error {
	if wam.CanEditAt(file, x, y, ed.Tags, ed.UUID) {
		return nil
	}
	return fmt.Errorf("User %s is not allowed to edit an entity at (%g, %g) on map %s", ed.UUID, x, y, key)
}

// mayUpload checks that ed may write somewhere on the map: an upload is tied to no position.
func mayUpload(maps Maps, key string, ed Editor) error {
	if ed.CanEdit {
		return nil
	}
	file, err := maps.Read(key)
	if err == nil && wam.HasEditorAccess(file, ed.Tags, ed.UUID) {
		return nil
	}
	return fmt.Errorf("User %s has no editor access and is not allowed to upload on map %s", ed.UUID, key)
}

// RoomAreas is what a room needs of the areas of a map: where they are, and their lock and capacity.
func RoomAreas(doc map[string]any) []core.Area {
	list, _ := doc["areas"].([]any)
	areas := make([]core.Area, 0, len(list))
	for _, a := range list {
		m, _ := a.(map[string]any)
		id, _ := m["id"].(string)
		area := core.Area{ID: id, X: num(m["x"]), Y: num(m["y"]), Width: num(m["width"]), Height: num(m["height"])}
		props, _ := m["properties"].([]any)
		for _, p := range props {
			pm, _ := p.(map[string]any)
			pid, _ := pm["id"].(string)
			typ, _ := pm["type"].(string)
			prop := core.AreaProperty{ID: pid, Type: typ}
			if tags, ok := pm["allowedTags"].([]any); ok {
				for _, t := range tags {
					if s, ok := t.(string); ok {
						prop.AllowedTags = append(prop.AllowedTags, s)
					}
				}
			}
			if n, ok := pm["maxUsers"]; ok && n != nil {
				v := int(num(n))
				prop.MaxUsers = &v
			}
			area.Properties = append(area.Properties, prop)
		}
		areas = append(areas, area)
	}
	return areas
}

// num reads a number of a document, decoded from disk (json.Number) or set by a command (int64, float64).
func num(v any) float64 {
	switch n := v.(type) {
	case json.Number:
		f, _ := n.Float64()
		return f
	case float64:
		return n
	case int64:
		return float64(n)
	}
	return 0
}
