package wam

import (
	"encoding/json"
	"path"
)

// Generated is the WAM file map-storage writes for a Tiled map uploaded without one (createWAMFileIfMissing).
// ponytail: no WAM_TEMPLATE_URL.
func Generated(tmjPath string, tiled []byte, entityCollections []string) []byte {
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
	out, _ := json.MarshalIndent(struct {
		Version           string              `json:"version"`
		MapURL            string              `json:"mapUrl"`
		Areas             []any               `json:"areas"`
		Entities          map[string]any      `json:"entities"`
		EntityCollections []map[string]string `json:"entityCollections"`
		Metadata          map[string]string   `json:"metadata"`
	}{"2.1.0", "./" + path.Base(tmjPath), []any{}, map[string]any{}, collections, metadata}, "", "    ")
	return out
}
