package httpapi

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/workadventure/workadventure/server-go/internal/admin"
	"github.com/workadventure/workadventure/server-go/internal/auth"
	"github.com/workadventure/workadventure/server-go/internal/config"
)

const template = `<html><head><meta name="wa-api-version" content="v1"><script type="module" src="./assets/index-abc.js"></script>
<link rel="icon" href="./static/favicon.png"><title>{{ title }}</title>{{#favIcons}}<link rel="{{ rel }}" href="{{ src }}">{{/favIcons}}
<script>{{{ script }}}</script><input id="authToken" value="{{ authToken }}"></head></html>`

func newAPI(t *testing.T) (http.Handler, *FrontAssets) {
	t.Helper()
	front := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/index.html" {
			_, _ = io.WriteString(w, template)
			return
		}
		_, _ = io.WriteString(w, "asset "+r.URL.Path)
	}))
	t.Cleanup(front.Close)
	cfg := &config.Config{AssetsURL: "http://front.test", AssetsInternalURL: front.URL, StartRoomURL: "/_/global/start.json",
		OpidWokaNamePolicy: "user_input", FrontEnv: map[string]any{"PUSHER_URL": "http://play.test"}}
	adm, err := admin.NewLocal(cfg)
	if err != nil {
		t.Fatal(err)
	}
	assets := NewFrontAssets(front.URL, cfg.AssetsURL, "v1")
	return New(cfg, auth.New("secret"), adm, assets, http.NotFoundHandler(), "1.0.0"), assets
}

func get(h http.Handler, method, target string, body io.Reader, header map[string]string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, target, body)
	for k, v := range header {
		r.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

func TestFrontPage(t *testing.T) {
	h, assets := newAPI(t)
	if w := get(h, "GET", "/_/global/maps.test/a.json", nil, nil); w.Code != http.StatusServiceUnavailable {
		t.Fatalf("not ready yet: %d", w.Code)
	}
	if err := assets.refresh(context.Background()); err != nil {
		t.Fatal(err)
	}
	w := get(h, "POST", "/_/global/maps.test/a.json", strings.NewReader("authToken=tok%22en"), map[string]string{"Content-Type": "application/x-www-form-urlencoded"})
	page := w.Body.String()
	for _, want := range []string{
		`src="http://front.test/assets/index-abc.js"`, // built files go to the assets domain
		`href="./static/favicon.png"`,                 // public files stay on the page's origin
		`<title>WorkAdventure</title>`,
		`window.env = {"PUSHER_URL":"http://play.test"}`,
		`value="tok&#34;en"`, // escaped
		`href="/static/images/favicons/favicon-512x512.svg"`,
	} {
		if !strings.Contains(page, want) {
			t.Errorf("page lacks %s:\n%s", want, page)
		}
	}
	if get(h, "GET", "/static/x.png", nil, nil).Body.String() != "asset /static/x.png" {
		t.Error("same-origin static files must be proxied to the front container")
	}
}

func TestAnonymousLoginThenMe(t *testing.T) {
	h, _ := newAPI(t)
	w := get(h, "POST", "/anonymLogin", nil, nil)
	var login struct{ AuthToken, UserUUID string }
	if err := json.NewDecoder(w.Body).Decode(&login); err != nil || login.AuthToken == "" {
		t.Fatalf("got %d %v", w.Code, err)
	}
	w = get(h, "GET", "/me?token="+login.AuthToken+"&playUri=http://play.test/_/global/maps.test/a.json&localStorageCharacterTextureIds[]=male1", nil, nil)
	var me map[string]any
	_ = json.NewDecoder(w.Body).Decode(&me)
	if me["status"] != "ok" || me["authToken"] != login.AuthToken || me["isCharacterTexturesValid"] != true {
		t.Fatalf("got %v", me)
	}
	if w := get(h, "GET", "/me?token=bad&playUri=x", nil, nil); w.Code != http.StatusUnauthorized {
		t.Fatalf("bad token: %d", w.Code)
	}
	if w := get(h, "GET", "/woka/list?roomUrl=x", nil, map[string]string{"Authorization": login.AuthToken}); w.Code != 200 || !strings.Contains(w.Body.String(), "male1") {
		t.Fatalf("woka list: %d", w.Code)
	}
}

func TestLocalScriptOnlyServesLocalhostScripts(t *testing.T) {
	h, _ := newAPI(t)
	w := get(h, "GET", `/local-script?script=http://maps.test.localhost/a.js%22%3E%3Cscript%3E`, nil, nil)
	if w.Code != 200 || strings.Contains(w.Body.String(), `"><script>`) {
		t.Fatalf("must escape the script URL: %s", w.Body.String())
	}
	if w := get(h, "GET", "/local-script?script=https://evil.example/a.js", nil, nil); w.Code != http.StatusBadRequest {
		t.Fatalf("remote script accepted: %d", w.Code)
	}
}

func TestProbesTellLivenessReadinessAndTheProtocol(t *testing.T) {
	h, assets := newAPI(t)
	if w := get(h, "GET", "/ping", nil, nil); w.Code != 200 || w.Body.String() != "pong" {
		t.Fatalf("liveness: %d %s", w.Code, w.Body)
	}
	if w := get(h, "GET", "/ready", nil, nil); w.Code != http.StatusServiceUnavailable {
		t.Fatalf("not ready before the front's template is loaded: %d", w.Code)
	}
	if err := assets.refresh(context.Background()); err != nil {
		t.Fatal(err)
	}
	if w := get(h, "GET", "/ready", nil, nil); w.Code != 200 {
		t.Fatalf("ready: %d", w.Code)
	}
	if w := get(h, "GET", "/api-version", nil, nil); w.Body.String() != "v1" {
		t.Fatalf("the protocol hash, for the SaaS pipeline: %s", w.Body)
	}
}

// saas is an admin that refuses everybody and describes maps with their Jitsi secrets.
type saas struct{ *admin.Local }

func (saas) MemberData(context.Context, admin.MemberQuery) (admin.MemberData, error) {
	return admin.MemberData{}, &admin.Refusal{Data: map[string]any{"status": "error", "type": "error", "code": "BANNED"}}
}

func (saas) MapDetails(context.Context, admin.MapQuery) (map[string]any, error) {
	return map[string]any{"group": "g", "wamUrl": "https://w.test/a.wam", "thirdParty": map[string]any{"jitsi": map[string]any{"secret": "s"}}}, nil
}

func TestTheAdminsRefusalAndSecretsOnTheHTTPRoutes(t *testing.T) {
	cfg := &config.Config{StartRoomURL: "/_/global/start.json", OpidWokaNamePolicy: "user_input", FrontEnv: map[string]any{}}
	local, _ := admin.NewLocal(cfg)
	tokens := auth.New("secret")
	h := New(cfg, tokens, saas{local}, NewFrontAssets("", "", "v1"), http.NotFoundHandler(), "1.0.0")
	token, _ := tokens.Create(auth.Token{Identifier: "a@b.c"})
	w := get(h, "GET", "/me?token="+token+"&playUri=https://w.test/@/o/w/r", nil, nil)
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"code":"BANNED"`) {
		t.Fatalf("/me answers the admin's error as is: %d %s", w.Code, w.Body)
	}
	w = get(h, "GET", "/map?playUri=https://w.test/@/o/w/r&authToken="+token, nil, nil)
	if w.Code != 200 || strings.Contains(w.Body.String(), "thirdParty") || !strings.Contains(w.Body.String(), "wamUrl") {
		t.Fatalf("/map never hands out the Jitsi and BBB secrets: %s", w.Body)
	}
	if w := get(h, "GET", "/map?playUri=https://w.test/r&authToken=forged", nil, nil); w.Code != 401 {
		t.Fatalf("an invalid token is refused before the admin is asked: %d", w.Code)
	}
}
