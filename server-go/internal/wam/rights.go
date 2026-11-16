package wam

import (
	"encoding/json"
	"slices"
)

func number(v any) float64 {
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

func strings_(v any) []string {
	list, _ := v.([]any)
	out := make([]string, 0, len(list))
	for _, x := range list {
		if s, ok := x.(string); ok {
			out = append(out, s)
		}
	}
	return out
}

// CanEditAt says whether a user who may not edit the map may still place, change or delete an entity whose top-left
// corner is at (x, y): inside an area it may write in (EntityPermissions.canEdit).
func CanEditAt(file []byte, x, y float64, tags []string, uuid string) bool {
	doc, err := Parse(file)
	if err != nil {
		return false
	}
	areas, _ := doc["areas"].([]any)
	for _, a := range areas {
		area, _ := a.(map[string]any)
		ax, ay := number(area["x"]), number(area["y"])
		if x < ax || x > ax+number(area["width"]) || y < ay || y > ay+number(area["height"]) {
			continue
		}
		if writable(area, tags, uuid) {
			return true
		}
	}
	return false
}

// HasEditorAccess says whether a user who may not edit the map may write somewhere on it: that is what uploading a
// custom entity or a file takes, since an upload is tied to no position (isGameMapContainsSpecificAreas).
func HasEditorAccess(file []byte, tags []string, uuid string) bool {
	doc, err := Parse(file)
	if err != nil {
		return false
	}
	areas, _ := doc["areas"].([]any)
	return slices.ContainsFunc(areas, func(a any) bool { area, _ := a.(map[string]any); return writable(area, tags, uuid) })
}

// writable says whether the user may write in an area: one whose write tags it has, or a personal area it owns.
func writable(area map[string]any, tags []string, uuid string) bool {
	props, _ := area["properties"].([]any)
	for _, p := range props {
		m, _ := p.(map[string]any)
		switch m["type"] {
		case "restrictedRightsPropertyData":
			if slices.ContainsFunc(strings_(m["writeTags"]), func(t string) bool { return slices.Contains(tags, t) }) {
				return true
			}
		case "personalAreaPropertyData":
			if owner, _ := m["ownerId"].(string); owner != "" && owner == uuid {
				return true
			}
		}
	}
	return false
}

// EntityAt is where the entity id stands on the map, its top-left corner; ok is false when the map has no such entity.
func EntityAt(file []byte, id string) (x, y float64, ok bool) {
	doc, err := Parse(file)
	if err != nil {
		return 0, 0, false
	}
	entities, _ := doc["entities"].(map[string]any)
	e, ok := entities[id].(map[string]any)
	if !ok {
		return 0, 0, false
	}
	return number(e["x"]), number(e["y"]), true
}

// Claim turns a ModifyArea from a user who may not edit the map into what it is allowed to be: claiming a free
// personal area, or giving back its own (isModifyAreaMessageOnlyClaim). Only the owner, and the name, are taken
// from the message: whatever else it carries is ignored.
func Claim(file []byte, m ModifyArea, uuid string) (ModifyArea, bool) {
	doc, err := Parse(file)
	if err != nil || !m.ModifyProperties {
		return ModifyArea{}, false
	}
	Migrate(doc)
	areas, _ := doc["areas"].([]any)
	i := slices.IndexFunc(areas, func(a any) bool { x, _ := a.(map[string]any); return x["id"] == m.ID })
	if i < 0 {
		return ModifyArea{}, false
	}
	old, _ := areas[i].(map[string]any)["properties"].([]any)
	j := slices.IndexFunc(old, func(p any) bool { x, _ := p.(map[string]any); return x["type"] == "personalAreaPropertyData" })
	if j < 0 {
		return ModifyArea{}, false
	}
	personal := clone(old[j])
	k := slices.IndexFunc(m.Properties, func(p any) bool {
		x, _ := p.(map[string]any)
		return x["type"] == "personalAreaPropertyData" && x["id"] == personal["id"]
	})
	if k < 0 {
		return ModifyArea{}, false
	}
	owner, _ := personal["ownerId"].(string)
	next, _ := m.Properties[k].(map[string]any)["ownerId"].(string)
	claim, giveBack := owner == "" && next == uuid, owner == uuid && next == ""
	if uuid == "" || (!claim && !giveBack) {
		return ModifyArea{}, false
	}
	if next == "" {
		personal["ownerId"] = nil
	} else {
		personal["ownerId"] = next
	}
	props := slices.Clone(old)
	props[j] = personal
	return ModifyArea{ID: m.ID, Name: m.Name, Properties: props, ModifyProperties: true}, true
}
