// Package httpapi serves the HTTP routes the front and the admin call: the initial HTML page, authentication,
// map details, woka lists, probes and metrics. It is the HTTP adapter of the server.
package httpapi

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"html"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/workadventure/workadventure/server-go/internal/admin"
	"github.com/workadventure/workadventure/server-go/internal/auth"
	"github.com/workadventure/workadventure/server-go/internal/config"
	"github.com/workadventure/workadventure/server-go/internal/metrics"
)

type API struct {
	cfg     *config.Config
	auth    *auth.Manager
	admin   admin.Admin
	front   *FrontAssets
	version string
	oidc    *openID // nil without OpenID
	maps    mapReader
}

// mapReader reads the Tiled map a room plays (the WebSocket server does, for the room variables).
type mapReader interface {
	TiledMap(ctx context.Context, roomURL string) ([]byte, error)
}

// New returns the whole HTTP handler. ws handles /ws/room.
func New(cfg *config.Config, a *auth.Manager, adm admin.Admin, front *FrontAssets, ws http.Handler, version string) http.Handler {
	api := &API{cfg: cfg, auth: a, admin: adm, front: front, version: version, oidc: newOpenID(cfg)}
	mux := http.NewServeMux()

	mux.Handle("/ws/room", ws)
	mux.HandleFunc("GET /ping", func(w http.ResponseWriter, _ *http.Request) { text(w, http.StatusOK, "pong") })
	mux.HandleFunc("GET /ready", func(w http.ResponseWriter, _ *http.Request) {
		if front.Template() == nil {
			text(w, http.StatusServiceUnavailable, "not ready")
			return
		}
		text(w, http.StatusOK, "ready")
	})
	if cfg.PrometheusPort == 0 {
		mux.Handle("GET /metrics", metrics.Handler(false, cfg.PrometheusToken))
	}

	mux.HandleFunc("POST /anonymLogin", api.anonymLogin)
	if admin, ok := ws.(interface {
		GlobalEvent(http.ResponseWriter, *http.Request)
		Rooms(http.ResponseWriter, *http.Request)
	}); ok {
		mux.HandleFunc("POST /global/event", admin.GlobalEvent)
		mux.HandleFunc("GET /rooms", admin.Rooms)
	}
	api.maps, _ = ws.(mapReader)
	api.registerOpenID(mux)
	mux.HandleFunc("GET /me", api.me)
	mux.HandleFunc("GET /map", api.mapDetails)
	mux.HandleFunc("GET /woka/list", api.authenticatedList(adm.WokaList))
	mux.HandleFunc("GET /companion/list", api.authenticatedList(adm.CompanionList))
	mux.HandleFunc("OPTIONS /woka/list", func(w http.ResponseWriter, _ *http.Request) { text(w, http.StatusOK, "") })
	mux.HandleFunc("OPTIONS /companion/list", func(w http.ResponseWriter, _ *http.Request) { text(w, http.StatusOK, "") })
	mux.HandleFunc("GET /local-script", localScript)
	mux.HandleFunc("GET /server.json", api.serverJSON)
	mux.HandleFunc("GET /manifest.json", api.manifest)

	for _, p := range []string{"/_/", "/@/", "/~/"} {
		mux.HandleFunc("GET "+p, api.displayFront)
		mux.HandleFunc("POST "+p, api.displayFront)
	}
	mux.HandleFunc("GET /{$}", api.displayFront)
	mux.HandleFunc("GET /login", api.displayFront)
	mux.HandleFunc("GET /jwt", api.displayFront)
	mux.HandleFunc("GET /index.html", func(w http.ResponseWriter, r *http.Request) { http.Redirect(w, r, "/", http.StatusSeeOther) })

	// Files that must stay same-origin with the page. Ingress rules should route them to the front container
	// directly; this proxy is the fallback when they don't (RemoteFrontAssets.registerStaticRoutes).
	if cfg.AssetsInternalURL != "" {
		proxy := assetsProxy(cfg.AssetsInternalURL)
		for _, p := range []string{"/assets/", "/static/", "/resources/", "/collections/", "/iframe_api.js", "/iframe_api.js.map",
			"/service-worker-dev.js", "/service-worker-prod.js", "/notification-service-worker.js"} {
			mux.Handle("GET "+p, proxy)
		}
	}

	mux.HandleFunc("/", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")
		text(w, http.StatusNotFound, "Not Found")
	})
	return cors(cfg, mux)
}

func text(w http.ResponseWriter, status int, body string) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(body))
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(v)
}

// cors mirrors the cors() middleware of the pusher: ALLOWED_CORS_ORIGIN, "*" reflecting the caller's origin.
func cors(cfg *config.Config, next http.Handler) http.Handler {
	allowed := cfg.AllowedCORSOrigin
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		switch {
		case allowed == "*" && origin != "":
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Add("Vary", "Origin")
		case allowed == "":
			w.Header().Set("Access-Control-Allow-Origin", "*")
		default:
			w.Header().Set("Access-Control-Allow-Origin", allowed)
			w.Header().Add("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS,PUT,PATCH,DELETE")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization,Origin,X-Requested-With,Accept,Pragma,Cache-Control,baggage,sentry-trace")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (api *API) anonymLogin(w http.ResponseWriter, _ *http.Request) {
	if api.cfg.DisableAnonymous {
		w.WriteHeader(http.StatusForbidden)
		return
	}
	userUUID := newUUID()
	token, err := api.auth.Create(auth.Token{Identifier: userUUID})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"authToken": token, "userUuid": userUUID})
}

// newUUID returns a random (version 4) UUID.
func newUUID() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	b[6] = b[6]&0x0f | 0x40
	b[8] = b[8]&0x3f | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func clientIP(r *http.Request) string {
	first, _, _ := strings.Cut(r.Header.Get("X-Forwarded-For"), ",")
	return strings.TrimSpace(first)
}

func (api *API) me(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	if !q.Has("token") || !q.Has("playUri") {
		http.Error(w, "Parameters token and playUri are required", http.StatusBadRequest)
		return
	}
	tok, err := api.auth.Verify(q.Get("token"))
	if err != nil || (tok.AccessToken != "" && api.oidc == nil) {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}
	member, err := api.admin.MemberData(r.Context(), admin.MemberQuery{
		Identifier: tok.Identifier, AccessToken: tok.AccessToken, PlayURI: q.Get("playUri"), IPAddress: clientIP(r), Locale: r.Header.Get("Accept-Language"),
		CharacterTextureIDs: q["localStorageCharacterTextureIds[]"], CompanionTextureID: q.Get("localStorageCompanionTextureId"),
		Tags: tok.Tags, ChatID: q.Get("chatID"),
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	// MeResponse: the member data plus the token and what it says about the user.
	b, _ := json.Marshal(member)
	var resp map[string]any
	_ = json.Unmarshal(b, &resp)
	resp["authToken"] = q.Get("token")
	for k, v := range map[string]string{"username": tok.Username, "locale": tok.Locale, "matrixUserId": tok.MatrixUserID, "matrixServerUrl": api.cfg.MatrixPublicURI} {
		if v != "" {
			resp[k] = v
		}
	}
	if tok.AccessToken != "" {
		// A logged user: the provider must still accept the access token. Its claims override the member data.
		claims, err := api.oidc.userinfo(r.Context(), tok.AccessToken, nil)
		if err != nil {
			slog.Warn("Error while checking token auth", "error", err)
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}
		if m := claimString(claims, "matrix_url"); m != "" {
			resp["matrixServerUrl"] = m
		}
		for k, v := range claims {
			resp[k] = v
		}
	}
	writeJSON(w, resp)
}

func (api *API) mapDetails(w http.ResponseWriter, r *http.Request) {
	playURI := r.URL.Query().Get("playUri")
	if playURI == "" {
		http.Error(w, "Parameter playUri is required", http.StatusBadRequest)
		return
	}
	details, err := api.admin.MapDetails(r.Context(), playURI)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	_, isMap := details["mapUrl"]
	_, isWam := details["wamUrl"]
	if api.cfg.DisableAnonymous && (isMap || isWam) {
		details["authenticationMandatory"] = true
	}
	writeJSON(w, details)
}

func (api *API) authenticatedList(list func() json.RawMessage) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("Authorization")
		if token == "" {
			text(w, http.StatusUnauthorized, "Undefined authorization header")
			return
		}
		if _, err := api.auth.Verify(token); err != nil {
			text(w, http.StatusUnauthorized, "Invalid token sent")
			return
		}
		if r.URL.Query().Get("roomUrl") == "" {
			text(w, http.StatusBadRequest, "bad roomUrl URL parameter")
			return
		}
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_, _ = w.Write(list())
	}
}

func localScript(w http.ResponseWriter, r *http.Request) {
	script, err := url.Parse(r.URL.Query().Get("script"))
	if err != nil || script.Scheme == "" || script.Host == "" {
		text(w, http.StatusBadRequest, "Invalid query parameters")
		return
	}
	if h := script.Hostname(); h != "localhost" && !strings.HasSuffix(h, ".localhost") {
		text(w, http.StatusBadRequest, "Script URL must be from localhost or *.localhost domain for security reasons")
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = fmt.Fprintf(w, `<!DOCTYPE html>
<html>
  <head>
    <script src="/iframe_api.js"></script>
    <script type="module" src="%s"></script>
  </head>
  <body>
  </body>
</html>`, html.EscapeString(r.URL.Query().Get("script")))
}

func (api *API) serverJSON(w http.ResponseWriter, _ *http.Request) {
	version := api.version
	if api.cfg.NodeEnv != "production" {
		version += "-dev"
	}
	writeJSON(w, map[string]string{"domain": api.cfg.PusherURL, "name": api.cfg.ServerName, "motd": api.cfg.ServerMotd, "icon": api.cfg.ServerIcon, "version": version})
}

func fullURL(r *http.Request) string {
	proto := r.Header.Get("X-Forwarded-Proto")
	if proto == "" {
		proto = "http"
		if r.TLS != nil {
			proto = "https"
		}
	}
	return proto + "://" + r.Host + r.URL.RequestURI()
}

func (api *API) displayFront(w http.ResponseWriter, r *http.Request) {
	tpl := api.front.Template()
	if tpl == nil {
		w.Header().Set("Retry-After", "2")
		text(w, http.StatusServiceUnavailable, "WorkAdventure is starting, please retry in a few seconds.")
		return
	}
	// ponytail: no access_key autologin (needs the admin).
	meta := admin.DefaultMetaTags()
	api.mapMetaTags(r, meta)
	capabilities, _ := json.Marshal(map[string]string{"api/woka/list": "v1", "api/companion/list": "v1"})
	env, _ := json.Marshal(api.cfg.FrontEnv)
	data := map[string]any{
		"url":                       fullURL(r),
		"script":                    "window.env = " + string(env) + "\nwindow.capabilities = " + string(capabilities),
		"msApplicationTileImage":    "/static/images/favicons/favicon-512x512.svg",
		"posthogApiKey":             api.cfg.FrontEnv["POSTHOG_API_KEY"],
		"posthogUrl":                api.cfg.FrontEnv["POSTHOG_URL"],
		"authToken":                 r.PostFormValue("authToken"),
		"googleDrivePickerClientId": api.cfg.GoogleDrivePickerClientID,
		"assetsOrigin":              origin(api.cfg.AssetsURL),
		"cssVariablesOverride":      "",
	}
	for k, v := range meta {
		data[k] = v
	}
	page, err := tpl.Render(data)
	if err != nil {
		slog.Error("cannot render the front page", "error", err)
		http.Error(w, "cannot render the page", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(page))
}

func origin(raw string) string {
	u, err := url.Parse(raw)
	if raw == "" || err != nil {
		return ""
	}
	return u.Scheme + "://" + u.Host
}

func (api *API) manifest(w http.ResponseWriter, r *http.Request) {
	pageURL := r.URL.Query().Get("url")
	if pageURL == "" {
		http.Error(w, "Parameter url is required", http.StatusBadRequest)
		return
	}
	meta := admin.DefaultMetaTags()
	w.Header().Set("Content-Type", "application/manifest+json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"short_name": meta["title"], "name": meta["title"], "icons": meta["manifestIcons"],
		"start_url":        strings.Replace(pageURL, "http://"+r.Host, "", 1),
		"background_color": meta["themeColor"], "display_override": []string{"window-control-overlay", "minimal-ui"},
		"display": "standalone", "orientation": "portrait-primary", "scope": "/", "lang": "en", "theme_color": meta["themeColor"],
		"shortcuts": []map[string]any{{"name": meta["title"], "short_name": meta["title"], "description": meta["description"], "url": "/",
			"icons": []map[string]string{{"src": "/static/images/favicons/android-icon-192x192.png", "sizes": "192x192", "type": "image/png"}}}},
		"description": meta["description"], "screenshots": []any{},
		"related_applications": []map[string]string{{"platform": "web", "url": "https://workadventu.re"}, {"platform": "play", "url": "https://play.workadventu.re"}},
	})
}

func assetsProxy(internalURL string) http.Handler {
	target, err := url.Parse(internalURL)
	if err != nil {
		panic(fmt.Sprintf("ASSETS_INTERNAL_URL: %v", err))
	}
	return &httputil.ReverseProxy{Rewrite: func(pr *httputil.ProxyRequest) {
		pr.SetURL(target)
		pr.Out.Header.Del("Cookie") // the front container needs none of the user's cookies
	}}
}
