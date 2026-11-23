package sentryx_test

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/getsentry/sentry-go"

	"github.com/workadventure/workadventure/server-go/internal/actor"
	"github.com/workadventure/workadventure/server-go/internal/sentryx"
)

// capture points the global hub and the default logger at a client whose transport keeps the events, as main does
// with a real DSN, and puts both back after the test.
func capture(t *testing.T) *sentry.MockTransport {
	t.Helper()
	transport := &sentry.MockTransport{}
	opts := sentryx.Options("https://key@sentry.invalid/1", "test", "")
	opts.Transport = transport
	client, err := sentry.NewClient(opts)
	if err != nil {
		t.Fatal(err)
	}
	hub, logger := sentry.CurrentHub(), slog.Default()
	previous := hub.Client()
	hub.BindClient(client)
	slog.SetDefault(slog.New(sentryx.Handler(slog.DiscardHandler)))
	t.Cleanup(func() { hub.BindClient(previous); slog.SetDefault(logger) })
	return transport
}

func only(t *testing.T, transport *sentry.MockTransport) *sentry.Event {
	t.Helper()
	events := transport.Events()
	if len(events) != 1 {
		t.Fatalf("%d events sent, want 1", len(events))
	}
	return events[0]
}

func TestAPanicInAnActorReachesSentryWithTheActorNameAndTheStack(t *testing.T) {
	transport := capture(t)
	a := actor.Start("room:https://play/_/global/map.json", 1, nil, nil)
	if err := a.Post(context.Background(), func() { panic("boom") }); err != nil {
		t.Fatal(err)
	}
	a.Stop()
	<-a.Done()

	e := only(t, transport)
	if e.Tags["actor"] != "room:https://play/_/global/map.json" {
		t.Errorf("actor tag %q", e.Tags["actor"])
	}
	ex := e.Exception[0]
	if ex.Value != "boom" || ex.Mechanism == nil || ex.Mechanism.Type != "panic" {
		t.Errorf("exception %+v", ex)
	}
	// The stack ends where the panic happened, in the closure of this test, not in slog or in the recover.
	if f := ex.Stacktrace.Frames[len(ex.Stacktrace.Frames)-1]; !strings.Contains(f.Function, "TestAPanicInAnActor") {
		t.Errorf("innermost frame %s.%s", f.Module, f.Function)
	}
	if _, ok := e.Contexts["attributes"]["stack"]; ok {
		t.Error("the stack is sent twice, as text too")
	}
}

func TestAnErrorLogReachesSentryWithItsAttributesButNoPersonalDetail(t *testing.T) {
	transport := capture(t)
	slog.Error("cannot join the space", "room", "r1", "space", "s1", "user", "u-1", "email", "jane@example.com",
		"clientIP", "203.0.113.7", "error", errors.New("space is full"))

	e := only(t, transport)
	if e.Tags["room"] != "r1" || e.Tags["space"] != "s1" || e.Tags["user"] != "u-1" {
		t.Errorf("tags %v", e.Tags)
	}
	if ex := e.Exception[0]; ex.Type != "cannot join the space" || ex.Value != "space is full" {
		t.Errorf("exception %+v", ex)
	}
	attrs := e.Contexts["attributes"]
	if attrs["error"] != "space is full" || attrs["email"] != nil || attrs["clientIP"] != nil {
		t.Errorf("attributes %v", attrs)
	}
	slog.Info("not an error")
	if len(transport.Events()) != 1 {
		t.Error("an Info log was sent")
	}
}

func TestAJWTIsScrubbedFromTheMessageAndTheRequest(t *testing.T) {
	transport := capture(t)
	const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJpZGVudGlmaWVyIjoiamFuZSJ9.c2lnbmF0dXJl"
	slog.Error("admin refused", "error", errors.New("GET /api/room/access?token="+jwt+": 403"))
	if e := only(t, transport); strings.Contains(e.Exception[0].Value, "eyJ") || !strings.Contains(e.Exception[0].Value, "[jwt]") {
		t.Errorf("exception value %q", e.Exception[0].Value)
	}

	h := sentryx.Middleware(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusBadGateway) }))
	r := httptest.NewRequest(http.MethodGet, "/room?token="+jwt+"&room=r1", nil)
	r.Header.Set("Authorization", "Bearer "+jwt)
	r.Header.Set("Cookie", "authToken="+jwt)
	r.Header.Set("Referer", "https://play/login?jwt="+jwt)
	h.ServeHTTP(httptest.NewRecorder(), r)

	events := transport.Events()
	if len(events) != 2 {
		t.Fatalf("%d events, want the 502 too", len(events))
	}
	req := events[1].Request
	if req == nil || events[1].Tags["status"] != "502" {
		t.Fatalf("event %+v", events[1])
	}
	if req.QueryString != "room=r1" || req.Headers["Authorization"] != "" || req.Headers["Cookie"] != "" || req.Cookies != "" ||
		strings.Contains(req.Headers["Referer"], "eyJ") {
		t.Errorf("request %+v", req)
	}
}
