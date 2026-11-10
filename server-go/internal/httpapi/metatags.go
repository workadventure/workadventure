package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

// mapMetaTags gives a link preview the name and description of the map, for bots only: reading the map costs a
// fetch (MetaTagsBuilder of the pusher). Any failure keeps the defaults.
func (api *API) mapMetaTags(r *http.Request, meta map[string]any) {
	ua := strings.ToLower(r.UserAgent())
	if api.maps == nil || !(strings.Contains(ua, "bot") || strings.Contains(ua, "facebook") || strings.Contains(ua, "preview")) {
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	room := fullURL(r)
	room, _, _ = strings.Cut(room, "?")
	tiled, err := api.maps.TiledMap(ctx, room)
	if err != nil {
		return
	}
	var m struct {
		Properties []struct {
			Name  string `json:"name"`
			Value any    `json:"value"`
		} `json:"properties"`
	}
	if json.Unmarshal(tiled, &m) != nil {
		return
	}
	for _, p := range m.Properties {
		v, ok := p.Value.(string)
		switch {
		case !ok:
		case p.Name == "mapName":
			meta["title"] = "WorkAdventure - " + v
		case p.Name == "mapDescription":
			meta["description"] = v
		}
	}
}
