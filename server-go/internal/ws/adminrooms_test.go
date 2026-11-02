package ws

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/golang-jwt/jwt/v5"

	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

func TestTheAdminSocketFollowsTheMembersAndBans(t *testing.T) {
	h := newHarness(t)
	h.srv.cfg.AdminSocketsToken = "sockets-secret"
	adminHTTP := httptest.NewServer(http.HandlerFunc(h.srv.AdminRooms))
	t.Cleanup(adminHTTP.Close)
	sign := func(secret string, rooms ...string) string {
		s, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"authorizedRoomIds": rooms}).SignedString([]byte(secret))
		return s
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	dial := func() *websocket.Conn {
		c, _, err := websocket.Dial(ctx, strings.Replace(adminHTTP.URL, "http", "ws", 1), nil) //nolint:bodyclose // coder/websocket closes the handshake's body
		if err != nil {
			t.Fatal(err)
		}
		return c
	}
	say := func(c *websocket.Conn, m any) {
		b, _ := json.Marshal(m)
		if err := c.Write(ctx, websocket.MessageText, b); err != nil {
			t.Fatal(err)
		}
	}
	type event struct {
		Type string            `json:"type"`
		Data map[string]string `json:"data"`
	}
	next := func(c *websocket.Conn) event {
		_, b, err := c.Read(ctx)
		if err != nil {
			t.Fatal(err)
		}
		var e event
		_ = json.Unmarshal(b, &e)
		return e
	}
	closedWith := func(c *websocket.Conn, code websocket.StatusCode) {
		if e := next(c); e.Type != "Error" {
			t.Fatalf("an error comes first: %v", e)
		}
		if _, _, err := c.Read(ctx); websocket.CloseStatus(err) != code {
			t.Fatalf("closed with %v, want %v", err, code)
		}
	}

	alice := h.dial("alice", "c-alice", nil)
	alice.send(join(100, 100))
	alice.waitFor("roomJoined", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool { return d.GetRoomJoinedMessage() != nil })

	c := dial()
	say(c, map[string]any{"event": "listen", "roomIds": []string{roomURL}, "jwt": sign("sockets-secret", roomURL)})
	if e := next(c); e.Type != "MemberJoin" || e.Data["uuid"] != "alice" || e.Data["roomId"] != roomURL {
		t.Fatalf("the players already there come first: %v", e)
	}
	bob := h.dial("bob", "c-bob", nil)
	bob.send(join(500, 500))
	if e := next(c); e.Type != "MemberJoin" || e.Data["uuid"] != "bob" {
		t.Fatalf("then each arrival: %v", e)
	}
	say(c, map[string]any{"event": "banned", "world": "maps.test", "message": map[string]string{"userUuid": "bob", "message": "Bye"},
		"jwt": sign("sockets-secret", roomURL)})
	bob.waitFor("the ban", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		return d.GetBanUserMessage().GetType() == "banned" && d.GetBanUserMessage().GetMessage() == "Bye"
	})
	if e := next(c); e.Type != "MemberLeave" || e.Data["uuid"] != "bob" {
		t.Fatalf("and each departure: %v", e)
	}

	refused := dial()
	say(refused, map[string]any{"event": "listen", "roomIds": []string{roomURL, "http://play.test/other"}, "jwt": sign("sockets-secret", roomURL)})
	closedWith(refused, websocket.StatusPolicyViolation)
	forged := dial()
	say(forged, map[string]any{"event": "listen", "roomIds": []string{roomURL}, "jwt": sign("guess", roomURL)})
	closedWith(forged, websocket.StatusPolicyViolation)
	garbage := dial()
	say(garbage, map[string]any{"event": "listen"})
	closedWith(garbage, websocket.StatusInvalidFramePayloadData)
}
