package httpapi

import (
	_ "embed"
	"encoding/json"
	"net/http"
	"strings"
)

// The OpenAPI documents of the pusher (ENABLE_OPENAPI_ENDPOINT): what the front calls on the server, and what the
// server calls on the admin. They are the pusher's own, fetched once from its /openapi routes (swagger-jsdoc reads
// the TS sources) and kept here.
var (
	//go:embed openapi/pusher.json
	openAPIPusher []byte
	//go:embed openapi/admin.json
	openAPIAdmin []byte
)

// swaggerVersion is the swagger-ui-dist of the repository, served from a CDN rather than embedded (2 MB).
const swaggerVersion = "5.32.6"

const swaggerPage = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Swagger UI</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@` + swaggerVersion + `/swagger-ui.css">
</head><body><div id="swagger-ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@` + swaggerVersion + `/swagger-ui-bundle.js" charset="UTF-8"></script>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@` + swaggerVersion + `/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
<script charset="UTF-8">window.onload = function() {
  window.ui = SwaggerUIBundle({
    urls: [{"url":"/openapi/pusher","name":"Front -> Pusher <- Admin"},{"url":"/openapi/admin","name":"Pusher -> Admin"}], "urls.primaryName": "Pusher -> Admin",
    dom_id: '#swagger-ui', deepLinking: true,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    plugins: [SwaggerUIBundle.plugins.DownloadUrl],
    layout: "StandaloneLayout"
  });
};</script></body></html>`

func (api *API) swaggerRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /openapi/pusher", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_, _ = w.Write(openAPIPusher)
	})
	mux.HandleFunc("GET /openapi/admin", func(w http.ResponseWriter, _ *http.Request) {
		doc := openAPIAdmin
		if admin := api.cfg.AdminURL; admin != "" { // the pusher names its host after the admin's
			var m map[string]any
			if json.Unmarshal(openAPIAdmin, &m) == nil {
				m["host"] = "pusher." + strings.Replace(admin, "//", "", 1)
				doc, _ = json.Marshal(m)
			}
		}
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_, _ = w.Write(doc)
	})
	mux.HandleFunc("GET /swagger-ui/", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte(swaggerPage))
	})
}
