package ws

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

// A player must not make the server fetch an address of its own network.
func TestAPlayerCannotMakeTheServerFetchAPrivateAddress(t *testing.T) {
	local := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {}))
	defer local.Close()
	for _, u := range []string{local.URL, "http://10.0.0.1/", "http://169.254.169.254/latest/meta-data/", "http://[::1]/"} {
		if state, ok, msg := embeddable(context.Background(), u, "http://play.test", nil); state || ok || msg != "URL is not reachable" {
			t.Errorf("%s: %v %v %q", u, state, ok, msg)
		}
	}
	if state, ok, _ := embeddable(context.Background(), "http://intranet.example/x", "http://play.test", []string{"example"}); !state || !ok {
		t.Fatal("a domain of EMBEDDED_DOMAINS_WHITELIST is not fetched at all")
	}
}

// Whether a browser will show a site in the front's iframe (isFrameable of the pusher): CSP frame-ancestors wins
// over X-Frame-Options.
func TestASiteIsFrameableAsTheBrowserDecides(t *testing.T) {
	for _, c := range []struct {
		csp, xfo string
		want     bool
	}{
		{"", "", true},
		{"", "DENY", false},
		{"", "sameorigin", false},
		{"default-src 'self'; frame-ancestors 'none'", "", false},
		{"frame-ancestors 'self'", "", false},
		{"frame-ancestors *", "DENY", true}, // CSP wins
		{"frame-ancestors https:", "", true},
		{"frame-ancestors https://play.test", "", true},
		{"frame-ancestors https://*.test", "", true},
		{"frame-ancestors https://other.test", "", false},
		{"script-src 'self'", "DENY", false}, // no frame-ancestors: X-Frame-Options decides
	} {
		h := http.Header{}
		if c.csp != "" {
			h.Set("Content-Security-Policy", c.csp)
		}
		if c.xfo != "" {
			h.Set("X-Frame-Options", c.xfo)
		}
		if got := frameable(h, "play.test"); got != c.want {
			t.Errorf("CSP %q, XFO %q: %v", c.csp, c.xfo, got)
		}
	}
}
