package httpapi

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/workadventure/workadventure/server-go/internal/admin"
	"github.com/workadventure/workadventure/server-go/internal/auth"
	"github.com/workadventure/workadventure/server-go/internal/config"
)

// keeper is an admin that keeps what it is told to save and knows the challenge of one host.
type keeper struct {
	*admin.Local
	saved []string
}

func (k *keeper) SaveUser(_ context.Context, what admin.SaveWhat, user, room string, v any) error {
	if s, ok := v.(*string); ok {
		if s == nil {
			v = "null"
		} else {
			v = *s
		}
	}
	k.saved = append(k.saved, fmt.Sprint(what, " ", user, " ", room, " ", v))
	return nil
}

func (k *keeper) Challenge(_ context.Context, host string) (string, error) {
	if host == "world.example" {
		return "cf-proof", nil
	}
	return "", errors.New("unknown host")
}

func TestThePlayersChoicesAndTheAdminsBrowserRoutes(t *testing.T) {
	cfg := &config.Config{StartRoomURL: "/_/global/start.json", OpidWokaNamePolicy: "user_input", FrontEnv: config.FrontEnv{},
		AutologinURL: "https://admin.test/workadventure/login"}
	local, _ := admin.NewLocal(cfg)
	k := &keeper{Local: local}
	tokens := auth.New("secret")
	h := New(cfg, tokens, k, NewFrontAssets("", "", "v1"), http.NotFoundHandler(), "1.0.0")
	logged, _ := tokens.Create(auth.Token{Identifier: "jo@x.test", AccessToken: "at"})
	anonymous, _ := tokens.Create(auth.Token{Identifier: "uuid-1"})
	post := func(path, token, body string) int {
		return get(h, "POST", path, strings.NewReader(body), map[string]string{"Authorization": token, "Content-Type": "application/json"}).Code
	}
	if post("/save-name", "", `{}`) != http.StatusUnauthorized || post("/save-name", "forged", `{"name":"Jo","roomUrl":"r"}`) != http.StatusUnauthorized ||
		post("/save-name", logged, `{"name":"Jo"}`) != http.StatusBadRequest {
		t.Fatal("a valid token and a whole body are required")
	}
	for _, c := range []struct{ path, body string }{
		{"/save-name", `{"name":"Jo","roomUrl":"r"}`},
		{"/save-textures", `{"textures":["a","b"],"roomUrl":"r"}`},
		{"/save-companion-texture", `{"texture":null,"roomUrl":"r"}`},
	} {
		if post(c.path, logged, c.body) != http.StatusNoContent || post(c.path, anonymous, c.body) != http.StatusNoContent {
			t.Fatal(c.path)
		}
	}
	if strings.Join(k.saved, "|") != "0 jo@x.test r Jo|1 jo@x.test r [a b]|2 jo@x.test r null" {
		t.Fatalf("only the logged player's choices reach the admin: %v", k.saved)
	}
	if get(h, "OPTIONS", "/save-textures", nil, nil).Code != http.StatusOK {
		t.Fatal("preflight")
	}

	challenge := func(host string) (int, string) {
		r := get(h, "GET", "http://"+host+"/.well-known/cf-custom-hostname-challenge/abc", nil, nil)
		return r.Code, r.Body.String()
	}
	if c, b := challenge("world.example:443"); c != http.StatusOK || b != "cf-proof" {
		t.Fatalf("%d %s", c, b)
	}
	if c, _ := challenge("other.example"); c != 526 {
		t.Fatal(c)
	}
	if c, _ := challenge("play.workadventu.re"); c != http.StatusNotFound {
		t.Fatal(c)
	}
}

func TestAccessKeyAndProfileGoToTheAdmin(t *testing.T) {
	provider := fakeProvider(t, &atomic.Int32{})
	front := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { _, _ = io.WriteString(w, template) }))
	defer front.Close()
	cfg := &config.Config{PusherURL: "http://play.test/", OpidWokaNamePolicy: "user_input", StartRoomURL: "/_/global/start.json",
		FrontEnv: config.FrontEnv{}, AdminAPIURL: "http://admin.internal", AutologinURL: "https://admin.test/workadventure/login",
		ProfileScreenProvider: "https://admin.test/profile",
		OpenID:                config.OpenID{ClientID: "client", ClientSecret: "s3cret", Issuer: provider.URL, Scope: "openid"}}
	local, _ := admin.NewLocal(cfg)
	tokens := auth.New("secret")
	assets := NewFrontAssets(front.URL, "", "v1")
	if err := assets.refresh(context.Background()); err != nil {
		t.Fatal(err)
	}
	h := New(cfg, tokens, local, assets, http.NotFoundHandler(), "1.0.0")

	page := get(h, "GET", "/@/o/w/r?access_key=k%22ey&x=1", nil, nil)
	if !strings.Contains(page.Body.String(), `"https://admin.test/workadventure/login?token=k&#34;ey&playUri="`) || page.Header().Get("Cache-Control") != "no-cache" {
		t.Fatalf("the browser goes to the admin's autologin, the key escaped: %s", page.Body)
	}

	good, _ := tokens.Create(auth.Token{Identifier: "jo@x.test", AccessToken: "at-1"})
	revoked, _ := tokens.Create(auth.Token{Identifier: "jo@x.test", AccessToken: "at-gone"})
	w := get(h, "GET", "/profile-callback?token="+good+"&playUri=http://play.test/@/o/w/r", nil, nil)
	if w.Code != http.StatusFound || w.Header().Get("Location") != "https://admin.test/profile?accessToken=at-1&playUri=http://play.test/@/o/w/r" {
		t.Fatalf("%d %s", w.Code, w.Header().Get("Location"))
	}
	if get(h, "GET", "/profile-callback?token="+revoked+"&playUri=x", nil, nil).Code != http.StatusInternalServerError {
		t.Fatal("a token the provider does not know goes nowhere")
	}
}
