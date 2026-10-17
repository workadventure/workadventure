package ws

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"

	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

func TestTheBacksDebugRoutes(t *testing.T) {
	h := newHarness(t)
	h.srv.cfg.AdminAPIToken = "123"
	call := func(handler http.HandlerFunc, method, query string) *httptest.ResponseRecorder {
		w := httptest.NewRecorder()
		handler(w, httptest.NewRequest(method, "/?"+query, nil))
		return w
	}
	if w := call(h.srv.Dump, "GET", "token=nope"); w.Code != http.StatusUnauthorized {
		t.Fatal(w.Code)
	}
	alice := h.dial("alice", "c-alice", nil)
	alice.send(join(100, 100))
	alice.waitFor("roomJoined", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool { return d.GetRoomJoinedMessage() != nil })
	if w := call(h.srv.Dump, "GET", "token=123"); !strings.Contains(w.Body.String(), `"roomUrl":"`+roomURL+`","users":1`) {
		t.Fatalf("the room alive: %s", w.Body)
	}

	if w := call(h.srv.CloseSpaceConnection, "POST", "token=123"); w.Code != http.StatusBadRequest {
		t.Fatal(w.Code)
	}
	if w := call(h.srv.CloseSpaceConnection, "POST", "token=123&spaceName=meeting"); w.Code != http.StatusInternalServerError {
		t.Fatal("unknown space", w.Code)
	}
	alice.query(7, &pb.QueryMessage{Query: &pb.QueryMessage_JoinSpaceQuery{JoinSpaceQuery: &pb.JoinSpaceQuery{SpaceName: "meeting"}}})
	alice.waitFor("the join answer", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		return d.GetAnswerMessage().GetJoinSpaceAnswer() != nil
	})
	if w := call(h.srv.CloseSpaceConnection, "POST", "token=123&spaceName=meeting"); w.Code != http.StatusOK || w.Body.String() != "Space connection closed" {
		t.Fatal(w.Code, w.Body)
	}

	_ = alice.conn.Close(websocket.StatusNormalClosure, "Page unloading")
	for deadline := time.Now().Add(5 * time.Second); time.Now().Before(deadline); time.Sleep(20 * time.Millisecond) {
		if w := call(h.srv.Dump, "GET", "token=123"); w.Body.String() == "[]\n" {
			return
		}
	}
	t.Fatal("a room nobody is in is gone from the dump")
}
