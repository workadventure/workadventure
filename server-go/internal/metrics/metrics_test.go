package metrics

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func status(h http.Handler, auth string) int {
	r := httptest.NewRequest("GET", "/metrics", nil)
	if auth != "" {
		r.Header.Set("Authorization", auth)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w.Code
}

func TestMetricsAreClosedUnlessOnTheirOwnPortOrBehindAToken(t *testing.T) {
	if got := status(Handler(false, ""), ""); got != http.StatusNotImplemented {
		t.Fatalf("on the public port without a token: %d", got)
	}
	if got := status(Handler(true, ""), ""); got != http.StatusOK {
		t.Fatalf("on the dedicated port: %d", got)
	}
	h := Handler(false, "s3cret")
	for auth, want := range map[string]int{"": 401, "Basic s3cret": 401, "Bearer wrong": 401, "Bearer s3cret": 200} {
		if got := status(h, auth); got != want {
			t.Errorf("%q: %d, want %d", auth, got, want)
		}
	}
}

func TestTheProfilerWantsTheMetricsToken(t *testing.T) {
	profiler := Guard("s3cret", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
	if status(profiler, "") != 401 || status(profiler, "Bearer s3cret") != 200 {
		t.Fatal("the profiler is behind the token")
	}
}
