package wam

import (
	"encoding/json"
	"fmt"
	"path"
)

// Generated is the WAM file map-storage writes for a Tiled map uploaded without one (createWAMFileIfMissing). With a
// template (WAM_TEMPLATE_URL), it is the template, with the map's URL and the map's own name, description,
// thumbnail and copyright; otherwise an empty map with the given entity collections.
func Generated(tmjPath string, tiled []byte, entityCollections []string, template []byte) ([]byte, error) {
	collections := make([]map[string]string, 0, len(entityCollections))
	for _, u := range entityCollections {
		collections = append(collections, map[string]string{"url": u, "type": "file"})
	}
	var m struct {
		Properties []struct {
			Name  string `json:"name"`
			Value any    `json:"value"`
		} `json:"properties"`
	}
	_ = json.Unmarshal(tiled, &m)
	metadata := map[string]string{}
	for _, p := range m.Properties {
		key := map[string]string{"mapName": "name", "mapDescription": "description", "mapImage": "thumbnail", "mapCopyright": "copyright"}[p.Name]
		if v, ok := p.Value.(string); ok && key != "" {
			metadata[key] = v
		}
	}
	if template != nil {
		doc, err := Parse(template)
		if err != nil {
			return nil, fmt.Errorf("WAM template: %w", err)
		}
		Migrate(doc)
		doc["mapUrl"] = "./" + path.Base(tmjPath)
		meta, _ := doc["metadata"].(map[string]any)
		if meta == nil {
			meta = map[string]any{}
		}
		for _, k := range []string{"name", "description", "thumbnail", "copyright"} {
			if v, ok := metadata[k]; ok {
				meta[k] = v
			} else {
				delete(meta, k)
			}
		}
		doc["metadata"] = meta
		if err := Validate(doc); err != nil {
			return nil, fmt.Errorf("WAM template: %w", err)
		}
		return json.MarshalIndent(doc, "", "    ")
	}
	return json.MarshalIndent(struct {
		Version           string              `json:"version"`
		MapURL            string              `json:"mapUrl"`
		Areas             []any               `json:"areas"`
		Entities          map[string]any      `json:"entities"`
		EntityCollections []map[string]string `json:"entityCollections"`
		Metadata          map[string]string   `json:"metadata"`
	}{"2.1.0", "./" + path.Base(tmjPath), []any{}, map[string]any{}, collections, metadata}, "", "    ")
}
