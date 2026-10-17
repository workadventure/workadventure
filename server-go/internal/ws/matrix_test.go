package ws

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/workadventure/workadventure/server-go/internal/matrix"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

func fakeSynapse(t *testing.T) (*matrix.Client, func() []string) {
	var mu sync.Mutex
	var calls []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/login") {
			_, _ = w.Write([]byte(`{"access_token":"t"}`))
			return
		}
		mu.Lock()
		calls = append(calls, r.Method+" "+r.URL.EscapedPath())
		mu.Unlock()
		switch {
		case strings.Contains(r.URL.Path, "/directory/"):
			_, _ = w.Write([]byte(`{"room_id":"!folder:d"}`))
		case strings.HasSuffix(r.URL.Path, "/createRoom"):
			_, _ = w.Write([]byte(`{"room_id":"!area:d"}`))
		case strings.HasSuffix(r.URL.Path, "/members"):
			_, _ = w.Write([]byte(`{"chunk":[]}`))
		default:
			_, _ = w.Write([]byte(`{}`))
		}
	}))
	t.Cleanup(srv.Close)
	return matrix.New(srv.URL, "admin", "pw", "d"), func() []string { mu.Lock(); defer mu.Unlock(); return append([]string(nil), calls...) }
}

func TestRoomAreaIsTheResourceOfAChatArea(t *testing.T) {
	h := newHarness(t)
	m, calls := fakeSynapse(t)
	h.srv.SetMatrix(m)
	h.srv.cfg.MapStorageAPIToken = "ms-token"
	do := func(method, token, body string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(method, "/roomArea", strings.NewReader(body))
		if token != "" {
			r.Header.Set("Authorization", token)
		}
		w := httptest.NewRecorder()
		h.srv.RoomArea(w, r)
		return w
	}
	prop := `{"id":"p1","type":"matrixRoomPropertyData","displayName":"Hall","shouldOpenAutomatically":true,"resourceUrl":"http://play/roomArea"}`
	if do("POST", "wrong", prop).Code != http.StatusUnauthorized || do("POST", "ms-token", `{"id":"p1"}`).Code != http.StatusBadRequest {
		t.Fatal("map-storage's token, and a matrixRoomPropertyData, are required")
	}
	w := do("POST", "ms-token", prop)
	if w.Code != http.StatusCreated || !strings.Contains(w.Body.String(), `"serverData":{"matrixRoomId":"!area:d"}`) {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	withRoom := strings.Replace(prop, `"resourceUrl"`, `"serverData":{"matrixRoomId":"!area:d"},"resourceUrl"`, 1)
	if do("PATCH", "ms-token", withRoom).Code != http.StatusOK || do("DELETE", "ms-token", withRoom).Code != http.StatusNoContent {
		t.Fatal("rename, then empty the room")
	}
	got := strings.Join(calls(), "\n")
	for _, c := range []string{"PUT /_matrix/client/r0/rooms/%21area:d/state/m.room.name", "GET /_matrix/client/r0/rooms/%21area:d/members"} {
		if !strings.Contains(got, c) {
			t.Fatalf("%s missing in\n%s", c, got)
		}
	}

	h.srv.cfg.PusherURL = "http://play.test"
	h.srv.cfg.WhitelistedResourceURLs = []string{"https://extra.test/"}
	for target, ok := range map[string]bool{"http://play.test/roomArea": true, "https://extra.test/x": true, "http://evil.test/roomArea": false, "http://play.test.evil/x": false} {
		_, err := h.srv.resource("POST", target, map[string]any{})
		if blocked := err != nil && strings.Contains(err.Error(), "Unauthorized Resource URL"); blocked == ok {
			t.Fatalf("%s: allowed=%v, err=%v", target, ok, err)
		}
	}
}

func TestAPlayerEntersAndLeavesTheRoomOfAChatArea(t *testing.T) {
	h := newHarness(t)
	m, calls := fakeSynapse(t)
	h.srv.SetMatrix(m)
	invited := func(n int) {
		t.Helper()
		deadline := time.Now().Add(3 * time.Second)
		for len(calls()) < n && time.Now().Before(deadline) {
			time.Sleep(10 * time.Millisecond)
		}
	}
	anon := h.dial("anon", "c-anon", nil)
	anon.send(join(100, 100))
	anon.query(1, &pb.QueryMessage{Query: &pb.QueryMessage_EnterChatRoomAreaQuery{EnterChatRoomAreaQuery: &pb.EnterChatRoomAreaQuery{RoomID: "!area:d"}}})
	anon.waitFor("the refusal", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		return d.GetAnswerMessage().GetError().GetMessage() == "Chat ID not found"
	})
	alice := h.dial("alice", "c-alice", url.Values{"chatID": {"@alice:d"}})
	alice.send(join(100, 100))
	alice.query(2, &pb.QueryMessage{Query: &pb.QueryMessage_EnterChatRoomAreaQuery{EnterChatRoomAreaQuery: &pb.EnterChatRoomAreaQuery{RoomID: "!area:d"}}})
	alice.waitFor("the answer", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		return d.GetAnswerMessage().GetEnterChatRoomAreaAnswer() != nil
	})
	invited(2) // the rate limit, then the invitation
	alice.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_LeaveChatRoomAreaMessage{LeaveChatRoomAreaMessage: &pb.LeaveChatRoomAreaMessage{RoomID: "!area:d"}}})
	invited(3)
	alice.query(3, &pb.QueryMessage{Query: &pb.QueryMessage_EnterChatRoomAreaQuery{EnterChatRoomAreaQuery: &pb.EnterChatRoomAreaQuery{RoomID: "!area:d"}}})
	invited(4)
	_ = alice.conn.CloseNow()
	h.srv.sessions.Range(func(k, _ any) bool { k.(*Session).destroy(1000, "test"); return true })
	invited(5)
	want := []string{"POST /_synapse/admin/v1/users/@admin:d/override_ratelimit", "POST /_matrix/client/r0/rooms/%21area:d/invite",
		"POST /_matrix/client/r0/rooms/%21area:d/kick", "POST /_matrix/client/r0/rooms/%21area:d/invite", "POST /_matrix/client/r0/rooms/%21area:d/kick"}
	if got := calls(); strings.Join(got, "\n") != strings.Join(want, "\n") {
		t.Fatalf("invited, kicked on leaving, then on closing:\n%s", strings.Join(got, "\n"))
	}
}
