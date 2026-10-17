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
