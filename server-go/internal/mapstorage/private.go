package mapstorage

import (
	"net/http"
	"net/url"
	"slices"
	"strings"

	"github.com/golang-jwt/jwt/v5"

	"github.com/workadventure/workadventure/server-go/internal/wam"
)

// privateFile serves a file uploaded for an openFile property (GET /private/files/...). The front adds a token
// (MapStorageJwtAnswer): the file must be the link of an openFile property of that map, and the reader must have
// the read tags of its area.
func (s *Store) privateFile(w http.ResponseWriter, r *http.Request, secret string) {
	raw := r.URL.Query().Get("token")
	if raw == "" {
		http.Error(w, "Missing token", http.StatusForbidden)
		return
	}
	var claims struct {
		WamURL string   `json:"wamUrl"`
		Tags   []string `json:"tags"`
		jwt.RegisteredClaims
	}
	if _, err := jwt.ParseWithClaims(raw, &claims, func(*jwt.Token) (any, error) { return []byte(secret), nil },
		jwt.WithValidMethods([]string{"HS256"})); err != nil || claims.WamURL == "" {
		http.Error(w, "Invalid token", http.StatusForbidden)
		return
	}
	u, err := url.Parse(claims.WamURL)
	if err != nil {
		http.Error(w, "Invalid token", http.StatusBadRequest)
		return
	}
	// Behind a path prefix (PATH_PREFIX, /map-storage on a single domain), the proxy strips it from the request
	// but the URLs of the map and of its files keep it.
	prefix := strings.TrimRight(s.pathPrefix, "/")
	key := strings.TrimPrefix(strings.TrimPrefix(u.Path, prefix), "/")
	if s.useDomain {
		key = strings.ToLower(u.Hostname()) + "/" + key // the map's world is the host of its URL
	}
	file, err := s.Read(key)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	doc, err := wam.Parse(file)
	if err != nil || !allowsFile(doc, prefix+r.URL.Path, claims.Tags) {
		http.NotFound(w, r)
		return
	}
	s.serve(w, r, "private, no-cache")
}

// allowsFile says whether an openFile property of the map links to path, readable with tags.
func allowsFile(doc map[string]any, path string, tags []string) bool {
	links := func(props []any) bool {
		return slices.ContainsFunc(props, func(p any) bool {
			m, _ := p.(map[string]any)
			link, _ := m["link"].(string)
			u, err := url.Parse(link)
			return m["type"] == "openFile" && err == nil && link != "" && u.Path == path
		})
	}
	areas, _ := doc["areas"].([]any)
	for _, a := range areas {
		area, _ := a.(map[string]any)
		props, _ := area["properties"].([]any)
		if !links(props) {
			continue
		}
		for _, p := range props {
			m, _ := p.(map[string]any)
			read, _ := m["readTags"].([]any)
			if m["type"] == "restrictedRightsPropertyData" && len(read) > 0 &&
				!slices.ContainsFunc(read, func(t any) bool { s, _ := t.(string); return slices.Contains(tags, s) }) {
				return false
			}
		}
		return true
	}
	entities, _ := doc["entities"].(map[string]any)
	for _, e := range entities {
		entity, _ := e.(map[string]any)
		if props, _ := entity["properties"].([]any); links(props) {
			return true
		}
	}
	return false
}
