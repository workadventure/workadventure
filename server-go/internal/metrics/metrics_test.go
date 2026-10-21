package metrics

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/prometheus/client_golang/prometheus"
	dto "github.com/prometheus/client_model/go"
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

func TestAnIgnoredErrorIsCountedUnlessItIsACancellation(t *testing.T) {
	Ignore("test.op", nil)
	Ignore("test.op", context.Canceled)
	Ignore("test.op", fmt.Errorf("post: %w", context.Canceled))
	if n := counted(ignoredErrors.WithLabelValues("test.op")); n != 0 {
		t.Fatalf("nil and cancellations counted: %v", n)
	}
	Ignore("test.op", errors.New("boom"))
	Ignore("test.op", context.DeadlineExceeded) // an actor that did not answer in time is a real failure
	if n := counted(ignoredErrors.WithLabelValues("test.op")); n != 2 {
		t.Fatalf("got %v, want 2", n)
	}
}

// counted reads a counter without prometheus/testutil, which would pull one more module.
func counted(c prometheus.Counter) float64 {
	var m dto.Metric
	_ = c.Write(&m)
	return m.GetCounter().GetValue()
}
