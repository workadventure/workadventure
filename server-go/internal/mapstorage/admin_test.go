package mapstorage

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestTheAdminAuthorizesWorldsAndHearsOfTheirMaps(t *testing.T) {
	var mu sync.Mutex
	var hooks []map[string]string
	var asked []string
	admin := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		switch r.URL.Path {
		case "/api/map-storage/authorization":
			asked = append(asked, r.URL.Query().Get("domain")+" "+r.Header.Get("X-API-Key"))
			if r.Header.Get("X-API-Key") != "world-key" || r.URL.Query().Get("domain") != "acme.ms.test" {
				w.WriteHeader(http.StatusForbidden)
				return
			}
		case "/api/map-storage/webhook":
			if r.Header.Get("Authorization") != "hook-token" {
				t.Errorf("webhook token: %q", r.Header.Get("Authorization"))
			}
			var b map[string]string
			_ = json.NewDecoder(r.Body).Decode(&b)
			hooks = append(hooks, b)
		}
	}))
	defer admin.Close()
	hs := newHarness(t)
	hs.h = hs.s.Handler(Options{UseDomainNameInPath: true, MaxUncompressed: 1 << 20,
		Auth:    Auth{Bearer: true, Token: "static", Validator: &Validator{URL: admin.URL + "/api/map-storage/authorization", Production: true}},
		WebHook: WebHook{URL: admin.URL + "/api/map-storage/webhook", Token: "hook-token"}})
	send := func(method, host, token string) int {
		r := httptest.NewRequest(method, "/maps/office.wam", strings.NewReader(wamFile))
		r.Host = host
		r.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		hs.h.ServeHTTP(w, r)
		return w.Code
	}
	if c := send("PUT", "globex.ms.test", "world-key"); c != http.StatusUnauthorized {
		t.Fatalf("another world's key is refused: %d", c)
	}
	if c := send("PUT", "acme.ms.test", "world-key"); c/100 != 2 {
		t.Fatalf("the world's own key: %d", c)
	}
	if c := send("PUT", "acme.ms.test", "world-key"); c/100 != 2 {
		t.Fatal(c)
	}
	if c := send("DELETE", "globex.ms.test", "static"); c/100 != 2 && c != http.StatusNotFound {
		t.Fatalf("the static token is not asked: %d", c)
	}
	if c := send("DELETE", "acme.ms.test", "static"); c/100 != 2 {
		t.Fatal(c)
	}
	time.Sleep(200 * time.Millisecond) // the webhook is called off the request
	mu.Lock()
	defer mu.Unlock()
	if len(asked) != 2 {
		t.Fatalf("a yes is kept in production, the static token never asked: %v", asked)
	}
	var got []string
	for _, h := range hooks {
		got = append(got, h["action"]+" "+h["domain"]+" "+h["mapPath"])
	}
	sort.Strings(got)
	// A write names its map; a deletion is an update of the whole domain, as map-storage's generateCacheFile.
	if strings.Join(got, "|") != "update acme.ms.test |update acme.ms.test maps/office.wam|update acme.ms.test maps/office.wam|update globex.ms.test " {
		t.Fatalf("each write and the deletions: %v", got)
	}
}

func TestAnUploadOrACopyTellsTheWebhookOnceForTheDomain(t *testing.T) {
	got := make(chan map[string]string, 8)
	hook := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		var b map[string]string
		_ = json.NewDecoder(r.Body).Decode(&b)
		got <- b
	}))
	defer hook.Close()
	hs := newHarness(t)
	hs.h = hs.s.Handler(Options{Auth: Auth{Basic: true, User: "john.doe", Password: "password"}, MaxUncompressed: 1 << 20,
		WebHook: WebHook{URL: hook.URL}})
	if w := hs.do("POST", "/upload", zipOf(t, map[string]string{"dir/a.tmj": tiled, "dir/b.tmj": tiled, "assets/t.png": "png"}), "zip"); w.Code != 200 {
		t.Fatal(w.Code, w.Body)
	}
	if w := hs.do("POST", "/copy", []byte(`{"source":"dir/a.wam","destination":"dir/c.wam"}`), "application/json"); w.Code/100 != 2 {
		t.Fatal(w.Code, w.Body)
	}
	for i := 0; i < 2; i++ {
		select {
		case b := <-got:
			if _, has := b["mapPath"]; has || b["action"] != "update" {
				t.Fatalf("one domain-wide update, without a map: %v", b)
			}
		case <-time.After(2 * time.Second):
			t.Fatal("no webhook")
		}
	}
	select {
	case b := <-got:
		t.Fatalf("an upload of two maps is one call: %v", b)
	case <-time.After(200 * time.Millisecond):
	}
}
