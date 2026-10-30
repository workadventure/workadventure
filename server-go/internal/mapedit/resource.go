package mapedit

import (
	"encoding/json"
	"log/slog"
	"reflect"

	"github.com/workadventure/workadventure/server-go/internal/wam"
)

// The resourceUrl of an area property (ResourceUrlModule of map-storage): the service behind it hears when the
// property is added (POST), changed (PATCH) or removed (DELETE), and its answer to POST or PATCH replaces the
// property: that is how a Matrix room's id ends up in serverData. A service that fails leaves the property as the
// editor sent it.

// Resource calls a resourceUrl with a property; the answer is the property to keep, or nil.
type Resource func(method, url string, property map[string]any) (map[string]any, error)

// Resources runs the hooks an area edit asks for, before it is applied; after is to run once it was, for the
// properties of a deleted area. Only a map editor's edits call them: a claim never touches a resourceUrl.
func Resources(maps Maps, key string, ed Editor, cmd any, call Resource) (out any, after func()) {
	after = func() {}
	switch c := cmd.(type) {
	case wam.CreateArea:
		c.Properties = added(maps, call, c.Properties, true)
		return c, after
	case wam.CreateEntity:
		c.Properties = added(maps, call, c.Properties, false)
		return c, after
	}
	if call == nil || !ed.CanEdit {
		return cmd, after
	}
	switch c := cmd.(type) {
	case wam.ModifyArea:
		if !c.ModifyProperties {
			return cmd, after
		}
		old := areaProperties(maps, key, c.ID)
		props := make([]any, len(c.Properties))
		for i, p := range c.Properties {
			props[i] = p
			np, _ := p.(map[string]any)
			url, _ := np["resourceUrl"].(string)
			if np == nil || url == "" {
				continue
			}
			before, existed := old[np["id"]]
			switch {
			case !existed:
				delete(np, "serverData")
				props[i] = hook(call, "POST", url, np)
			case !reflect.DeepEqual(before, np):
				props[i] = hook(call, "PATCH", url, np)
			}
		}
		for id, p := range old {
			if !slicesHasID(c.Properties, id) {
				if url, _ := p["resourceUrl"].(string); url != "" {
					hook(call, "DELETE", url, p)
				}
			}
		}
		c.Properties = props
		return c, after
	case wam.DeleteArea:
		old := areaProperties(maps, key, c.ID)
		return cmd, func() {
			for _, p := range old {
				if url, _ := p["resourceUrl"].(string); url != "" {
					hook(call, "DELETE", url, p)
				}
			}
		}
	}
	return cmd, after
}

// added runs the "property added" hooks of a new area or entity (CreateAreaMapStorageCommand), as ModifyArea does
// for the properties it adds: a copied area gets its own resource (a Matrix room), and a copied property its own
// copy of the uploaded file. Only an area has resourceUrl properties.
func added(store Maps, call Resource, props []any, area bool) []any {
	out := make([]any, len(props))
	for i, p := range props {
		out[i] = p
		np, _ := p.(map[string]any)
		if np == nil {
			continue
		}
		if url, _ := np["resourceUrl"].(string); area && call != nil && url != "" {
			delete(np, "serverData")
			np, _ = hook(call, "POST", url, np).(map[string]any)
			out[i] = np
		}
		if from, to, link, ok := wam.SharedFile(np); ok {
			file, err := store.Read(from)
			if err == nil {
				err = store.Put(to, file)
			}
			if err != nil {
				slog.Warn("could not copy the file of a copied property", "file", from, "error", err)
				continue
			}
			field := "link"
			if np["type"] == "playAudio" {
				field = "audioLink"
			}
			np[field] = link
		}
	}
	return out
}

// hook calls the service and returns the property to keep.
func hook(call Resource, method, url string, p map[string]any) any {
	got, err := call(method, url, p)
	if err != nil {
		slog.Warn("resourceUrl hook failed", "method", method, "url", url, "error", err)
		return p
	}
	if id, _ := got["id"].(string); id == "" || id != p["id"] || got["type"] == nil { // not an AreaDataProperty of it
		return p
	}
	return got
}

// areaProperties are the properties of an area as stored, by id.
func areaProperties(maps Maps, key, areaID string) map[any]map[string]any {
	out := map[any]map[string]any{}
	file, err := maps.Read(key)
	if err != nil {
		return out
	}
	var doc struct {
		Areas []struct {
			ID         string           `json:"id"`
			Properties []map[string]any `json:"properties"`
		} `json:"areas"`
	}
	if json.Unmarshal(file, &doc) != nil {
		return out
	}
	for _, a := range doc.Areas {
		if a.ID == areaID {
			for _, p := range a.Properties {
				out[p["id"]] = p
			}
		}
	}
	return out
}

func slicesHasID(props []any, id any) bool {
	for _, p := range props {
		if m, _ := p.(map[string]any); m != nil && m["id"] == id {
			return true
		}
	}
	return false
}
