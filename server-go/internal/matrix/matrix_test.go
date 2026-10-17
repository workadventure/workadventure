package matrix

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

// synapse is a fake Synapse that records the calls and their bodies.
type synapse struct {
	mu     sync.Mutex
	calls  []string
	bodies map[string]map[string]any
	logins int
	revoke bool // the next authenticated call answers M_UNKNOWN_TOKEN
}

func (s *synapse) start(t *testing.T) *Client {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		path := strings.TrimPrefix(r.URL.EscapedPath(), "/")
		call := r.Method + " " + path
		if path == "_matrix/client/r0/login" {
			s.logins++
			_ = json.NewEncoder(w).Encode(map[string]string{"access_token": "tok" + string(rune('0'+s.logins))})
			return
		}
		if s.revoke {
			s.revoke = false
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"errcode":"M_UNKNOWN_TOKEN"}`))
			return
		}
		if r.Header.Get("Authorization") != "Bearer tok"+string(rune('0'+s.logins)) {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		s.calls = append(s.calls, call)
		s.bodies[call] = body
		switch {
		case strings.HasPrefix(path, "_matrix/client/r0/directory/room/"):
			w.WriteHeader(http.StatusNotFound)
			_, _ = w.Write([]byte(`{"errcode":"M_NOT_FOUND"}`))
		case path == "_matrix/client/r0/createRoom" && body["creation_content"] != nil:
			_, _ = w.Write([]byte(`{"room_id":"!folder:d"}`))
		case path == "_matrix/client/r0/createRoom":
			_, _ = w.Write([]byte(`{"room_id":"!area:d"}`))
		case strings.HasSuffix(path, "/state/m.room.power_levels") && r.Method == http.MethodGet:
			_, _ = w.Write([]byte(`{"ban":50,"users":{"@admin:d":100}}`))
		case strings.HasSuffix(path, "/members"):
			_, _ = w.Write([]byte(`{"chunk":[{"state_key":"@admin:d","content":{"membership":"join"}},{"state_key":"@in:d","content":{"membership":"join"}},{"state_key":"@invited:d","content":{"membership":"invite"}}]}`))
		default:
			_, _ = w.Write([]byte(`{}`))
		}
	}))
	t.Cleanup(srv.Close)
	s.bodies = map[string]map[string]any{}
	return New(srv.URL, "admin", "pw", "d")
}

func TestTheAreaRoomsOfSynapse(t *testing.T) {
	s := &synapse{}
	c := s.start(t)
	ctx := context.Background()
	id, err := c.CreateAreaRoom(ctx)
	if err != nil || id != "!area:d" {
		t.Fatal(id, err)
	}
	want := []string{
		"POST _synapse/admin/v1/users/@admin:d/override_ratelimit",
		"GET _matrix/client/r0/directory/room/%23current-visited-room:d",
		"POST _matrix/client/r0/createRoom", // the space of the area rooms
		"POST _matrix/client/r0/createRoom",
		"PUT _matrix/client/r0/rooms/%21folder:d/state/m.space.child/%21area:d",
	}
	if strings.Join(s.calls, "\n") != strings.Join(want, "\n") {
		t.Fatalf("got\n%s", strings.Join(s.calls, "\n"))
	}
	room := s.bodies["POST _matrix/client/r0/createRoom"]
	if room["visibility"] != "private" || len(room["initial_state"].([]any)) != 2 || room["power_level_content_override"].(map[string]any)["invite"] != 100.0 {
		t.Fatalf("a private room, history from the join, in the space: %v", room)
	}

	s.calls, s.revoke = nil, true
	if err := c.Promote(ctx, "@bob:d", "!area:d"); err != nil || s.logins != 2 {
		t.Fatalf("a revoked token logs in again: %v, %d logins", err, s.logins)
	}
	levels := s.bodies["PUT _matrix/client/r0/rooms/%21area:d/state/m.room.power_levels"]
	if u := levels["users"].(map[string]any); u["@bob:d"] != 50.0 || u["@admin:d"] != 100.0 || levels["ban"] != 50.0 {
		t.Fatalf("a moderator is added to the levels: %v", levels)
	}
	s.calls = nil
	if err := c.DeleteRoom(ctx, "!area:d"); err != nil {
		t.Fatal(err)
	}
	if strings.Join(s.calls, "\n") != "GET _matrix/client/r0/rooms/%21area:d/members\nPOST _matrix/client/r0/rooms/%21area:d/kick\nPOST _matrix/client/r0/rooms/%21area:d/kick" ||
		s.bodies["POST _matrix/client/r0/rooms/%21area:d/kick"]["user_id"] != "@admin:d" {
		t.Fatalf("the invited one is kicked, then the admin leaves: %v", s.calls)
	}
	if c.Invite(ctx, "@bob:d", "") != nil {
		t.Fatal("no room, no invitation")
	}
}

type memShared struct {
	mu sync.Mutex
	m  map[string]string
}

func (s *memShared) Get(_ context.Context, k string) (string, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	v, ok := s.m[k]
	return v, ok, nil
}
func (s *memShared) Set(_ context.Context, k, v string, _ time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.m[k] = v
	return nil
}
func (s *memShared) SetNX(_ context.Context, k, v string, _ time.Duration) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.m[k]; ok {
		return false, nil
	}
	s.m[k] = v
	return true, nil
}
func (s *memShared) Del(_ context.Context, k string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.m, k)
	return nil
}

func TestThePodsShareOneAdminToken(t *testing.T) {
	s := &synapse{}
	first := s.start(t) // the fake counts the logins of every client pointed at it
	shared := &memShared{m: map[string]string{}}
	first.ShareThrough(shared)
	second := New(first.api, "admin", "pw", "d").ShareThrough(shared)
	var wg sync.WaitGroup
	for _, c := range []*Client{first, second, first, second} {
		wg.Add(1)
		go func() { defer wg.Done(); _ = c.Invite(context.Background(), "@u:d", "!r:d") }()
	}
	wg.Wait()
	if s.logins != 1 || shared.m[first.tokenKey()] != "tok1" {
		t.Fatalf("one login for all the pods: %d logins, %v", s.logins, shared.m)
	}
	if _, locked := shared.m[first.lockKey()]; locked {
		t.Fatal("the lock is released")
	}
	s.revoke = true
	if err := second.Invite(context.Background(), "@u:d", "!r:d"); err != nil || s.logins != 2 || shared.m[first.tokenKey()] != "tok2" {
		t.Fatalf("a revoked token is replaced for everyone: %v %d %v", err, s.logins, shared.m)
	}
}
