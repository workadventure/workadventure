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
// lastCommandId. Map editors may do anything. The others may place and move entities where they may write, delete
// entities, change their own custom entities, upload files, and claim or give back a personal area (map-storage's
// COMMANDS_ACCESSIBLE_WITHOUT_CAN_EDIT). Who may do what is decided on the version of the map being changed.
func Apply(maps Maps, key string, ed Editor, id string, cmd any) (Result, error) {
	if key == "" {
		return Result{}, errors.New("This room has no map to edit")
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
		return cmd, mayPlace(file, key, ed, c.X, c.Y, c.Width, c.Height)
	case wam.ModifyEntity:
		return cmd, mayPlace(file, key, ed, c.X, c.Y, c.Width, c.Height)
	case wam.DeleteEntity, wam.DeleteEntitiesOf:
		// ponytail: like map-storage, anyone in the room may delete an entity.
		return cmd, nil
	}
	return nil, errNotEditor
}

// mayPlace checks that an entity is placed where ed may write: what counts is where its centre falls.
func mayPlace(file []byte, key string, ed Editor, x, y, width, height int64) error {
	if wam.CanEditAt(file, float64(x)+float64(width)/2, float64(y)+float64(height)/2, ed.Tags, ed.UUID) {
		return nil
	}
	return fmt.Errorf("User %s is not allowed to edit this entity on map %s", ed.UUID, key)
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
