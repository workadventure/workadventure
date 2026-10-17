package roomapi

import (
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestTheAdminDecidesWhoUsesTheRoomAPI(t *testing.T) {
	var calls atomic.Int32
	admin := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		switch r.Header.Get("X-API-Key") {
		case "good":
			if r.URL.Query().Get("roomUrl") != "http://play.test/@/o/w/r%20oom" {
				t.Errorf("roomUrl is encodeURI'd: %q", r.URL.Query().Get("roomUrl"))
			}
			w.Header().Set("Cache-Control", "public, max-age=3600")
			_, _ = w.Write([]byte(`{"success":true}`))
		case "elsewhere":
			_, _ = w.Write([]byte(`{"success":false,"error":"PERMISSION_DENIED","message":"Not your world"}`))
		case "garbled":
			_, _ = w.Write([]byte(`{"ok":1}`))
		case "missing":
			w.WriteHeader(http.StatusNotFound)
			_, _ = w.Write([]byte("no such key"))
		default:
			w.WriteHeader(http.StatusTeapot)
			_, _ = w.Write([]byte("who?"))
		}
	}))
	defer admin.Close()
	a := NewAdminAuthorizer(admin.URL, true)
	code := func(key string) (codes.Code, string) {
		st := status.Convert(a.authorize(key, "http://play.test/@/o/w/r oom"))
		return st.Code(), st.Message()
	}
	for key, want := range map[string]codes.Code{"good": codes.OK, "elsewhere": codes.PermissionDenied, "garbled": codes.Internal, "missing": codes.NotFound, "x": codes.Unauthenticated} {
		if got, msg := code(key); got != want {
			t.Errorf("%s: %d %q, want %d", key, got, msg, want)
		}
	}
	before := calls.Load()
	if c, _ := code("good"); c != codes.OK || calls.Load() != before {
		t.Fatal("in production the admin's yes is kept as long as it says")
	}
}
