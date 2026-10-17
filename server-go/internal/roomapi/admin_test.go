package roomapi

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
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
	code := func(key string) (int, string) {
		err := a.authorize(key, "http://play.test/@/o/w/r oom")
		var st *status
		if !errors.As(err, &st) {
			return codeOK, ""
		}
		return st.code, st.msg
	}
	for key, want := range map[string]int{"good": codeOK, "elsewhere": codePermissionDenied, "garbled": codeInternal, "missing": codeNotFound, "x": codeUnauthenticated} {
		if got, msg := code(key); got != want {
			t.Errorf("%s: %d %q, want %d", key, got, msg, want)
		}
	}
	before := calls.Load()
	if c, _ := code("good"); c != codeOK || calls.Load() != before {
		t.Fatal("in production the admin's yes is kept as long as it says")
	}
}
