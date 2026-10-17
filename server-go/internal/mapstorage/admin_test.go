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
	if strings.Join(got, "|") != "delete acme.ms.test maps/office.wam|delete globex.ms.test maps/office.wam|update acme.ms.test maps/office.wam|update acme.ms.test maps/office.wam" {
		t.Fatalf("each write and the deletion: %v", got)
	}
}
