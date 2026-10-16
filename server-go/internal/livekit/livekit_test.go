package livekit

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/golang-jwt/jwt/v5"

	"github.com/workadventure/workadventure/server-go/internal/core"
)

func parse(t *testing.T, token string) jwt.MapClaims {
	t.Helper()
	claims := jwt.MapClaims{}
	if _, err := jwt.ParseWithClaims(token, claims, func(*jwt.Token) (any, error) { return []byte("secret"), nil }); err != nil {
		t.Fatal(err)
	}
	return claims
}

func TestAMemberGetsATokenForItsSpaceRoom(t *testing.T) {
	c := New("https://livekit.test", "key", "secret")
	token, err := c.Token("http://play.test.room#1#0", core.SpaceUser{ID: "room_2", Name: "Alice", UUID: "u-1"})
	if err != nil {
		t.Fatal(err)
	}
	claims := parse(t, token)
	v := claims["video"].(map[string]any)
	if claims["iss"] != "key" || claims["sub"] != "room_2" || claims["name"] != "Alice" || v["room"] != "http://play.test.room#1#0" ||
		v["roomJoin"] != true || len(v["canPublishSources"].([]any)) != 4 || !strings.Contains(claims["metadata"].(string), `"uuid":"u-1"`) {
		t.Fatalf("claims: %v", claims)
	}
	if c.URL() != "wss://livekit.test" {
		t.Fatal(c.URL())
	}
	if long := RoomName(strings.Repeat("x", 300)); len(long) != 64 {
		t.Fatal("a long space name becomes a hash")
	}
}

func TestARoomIsCreatedOnceAndDeleted(t *testing.T) {
	var mu sync.Mutex
	var calls []string
	exists := false
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		claims := jwt.MapClaims{}
		if _, err := jwt.ParseWithClaims(auth, claims, func(*jwt.Token) (any, error) { return []byte("secret"), nil }); err != nil {
			http.Error(w, "unauthenticated", http.StatusUnauthorized)
			return
		}
		body, _ := io.ReadAll(r.Body)
		mu.Lock()
		calls = append(calls, strings.TrimPrefix(r.URL.Path, "/twirp/livekit.RoomService/")+" "+string(body))
		mu.Unlock()
		switch {
		case strings.HasSuffix(r.URL.Path, "/ListRooms") && exists:
			_ = json.NewEncoder(w).Encode(map[string]any{"rooms": []any{map[string]string{"name": "r"}}})
		case strings.HasSuffix(r.URL.Path, "/CreateRoom"):
			exists = true
			_, _ = w.Write([]byte(`{"name":"r"}`))
		default:
			_, _ = w.Write([]byte(`{}`))
		}
	}))
	defer srv.Close()
	c := New(srv.URL, "key", "secret")
	for range 2 {
		if err := c.CreateRoom(context.Background(), "r"); err != nil {
			t.Fatal(err)
		}
	}
	if err := c.DeleteRoom(context.Background(), "r"); err != nil {
		t.Fatal(err)
	}
	want := []string{`ListRooms {"names":["r"]}`, `CreateRoom {"name":"r"}`, `ListRooms {"names":["r"]}`, `DeleteRoom {"room":"r"}`}
	if strings.Join(calls, "|") != strings.Join(want, "|") {
		t.Fatalf("calls: %v", calls)
	}
}
