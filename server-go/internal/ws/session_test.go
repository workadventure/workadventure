package ws

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"google.golang.org/protobuf/types/known/wrapperspb"

	"github.com/workadventure/workadventure/server-go/internal/auth"
	"github.com/workadventure/workadventure/server-go/internal/core"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

// dialAs connects a player with the given token (tags, a logged-in access token) and joins the room.
func (h *harness) dialAs(tok auth.Token, connectionID string) *client {
	h.t.Helper()
	token, _ := h.auth.Create(tok)
	c := h.dialWithToken(token, tok.Identifier, connectionID, nil)
	c.send(join(100, 100))
	c.waitFor("roomJoined", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool { return d.GetRoomJoinedMessage() != nil })
	return c
}

// joinSpace joins the space and returns the space user id the server gave.
func (c *client) joinSpace(id int32, space string) string {
	c.t.Helper()
	c.query(id, &pb.QueryMessage{Query: &pb.QueryMessage_JoinSpaceQuery{JoinSpaceQuery: &pb.JoinSpaceQuery{SpaceName: space}}})
	var spaceUserID string
	c.waitFor("the join answer", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		spaceUserID = d.GetAnswerMessage().GetJoinSpaceAnswer().GetSpaceUserId()
		return spaceUserID != ""
	})
	return spaceUserID
}

func (c *client) privateEvent(space, to string, e *pb.PrivateSpaceEvent) {
	c.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_PrivateEvent{PrivateEvent: &pb.PrivateEventFrontToPusher{
		SpaceName: space, ReceiverUserId: to, SpaceEvent: e}}})
}

// Kicking someone off a space, forcing a mute, muting everybody: the admin's alone. And the receiver is told who
// sent an event by the server, never by the sender.
func TestOnlyAnAdminForcesAMuteOrKicksOff(t *testing.T) {
	h := newHarness(t)
	admin := h.dialAs(auth.Token{Identifier: "admin", Tags: []string{"admin"}}, "c-admin")
	bob := h.dialAs(auth.Token{Identifier: "bob"}, "c-bob")
	adminID, bobID := admin.joinSpace(1, "meeting"), bob.joinSpace(1, "meeting")

	bob.privateEvent("meeting", adminID, &pb.PrivateSpaceEvent{Event: &pb.PrivateSpaceEvent_KickOffUser{KickOffUser: &pb.KickOffUserPrivateMessage{}}})
	bob.waitFor("the refusal", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		return strings.HasSuffix(d.GetErrorMessage().GetMessage(), "Only admins can kick off a user")
	})
	bob.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_PublicEvent{PublicEvent: &pb.PublicEventFrontToPusher{
		SpaceName: "meeting", SpaceEvent: &pb.SpaceEvent{Event: &pb.SpaceEvent_MuteAudioForEverybody{MuteAudioForEverybody: &pb.MuteAudioForEverybodyPublicMessage{}}}}}})
	bob.waitFor("the refusal", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		return strings.HasSuffix(d.GetErrorMessage().GetMessage(), "Only admins can mute everyone")
	})

	// Bob asks the admin to mute, and claims to force it: only a request reaches the admin, signed with Bob's id.
	bob.privateEvent("meeting", adminID, &pb.PrivateSpaceEvent{Event: &pb.PrivateSpaceEvent_MuteAudio{MuteAudio: &pb.MuteAudioPrivateMessage{Force: true}}})
	admin.waitFor("bob's request", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		e := s.GetPrivateEvent()
		if m := e.GetSpaceEvent().GetMuteAudio(); m != nil {
			if m.GetForce() || e.GetSender().GetSpaceUserId() != bobID {
				t.Fatalf("forced %v, sender %q", m.GetForce(), e.GetSender().GetSpaceUserId())
			}
			return true
		}
		if e.GetSpaceEvent().GetKickOffUser() != nil {
			t.Fatal("bob's kick off reached the admin")
		}
		return false
	})
	admin.privateEvent("meeting", bobID, &pb.PrivateSpaceEvent{Event: &pb.PrivateSpaceEvent_MuteAudio{MuteAudio: &pb.MuteAudioPrivateMessage{}}})
	bob.waitFor("the admin's forced mute", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		m := s.GetPrivateEvent().GetSpaceEvent().GetMuteAudio()
		return m != nil && m.GetForce() && s.GetPrivateEvent().GetSender().GetSpaceUserId() == adminID
	})
}

// A ban sent by a player is ignored; an admin's kick ejects the player, with the reason, and frees its place.
func TestOnlyAnAdminEjectsAPlayer(t *testing.T) {
	h := newHarness(t)
	admin := h.dialAs(auth.Token{Identifier: "admin", Tags: []string{"admin"}}, "")
	bob := h.dialAs(auth.Token{Identifier: "bob"}, "")
	eve := h.dialAs(auth.Token{Identifier: "eve"}, "")
	ban := func(by *client, uuid string) {
		by.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_BanPlayerMessage{BanPlayerMessage: &pb.BanPlayerMessage{
			BanUserUuid: uuid, Kick: true, Reason: "spam"}}})
	}
	ban(eve, "bob")
	ban(admin, "eve")
	eve.waitFor("the ejection", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		return d.GetBanUserMessage().GetType() == "kicked" && d.GetBanUserMessage().GetMessage() == "spam"
	})
	// Bob is still there (eve's ban did nothing) and sees eve leave.
	bob.waitFor("eve leaving", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool { return s.GetUserLeftMessage() != nil })
}

// A logged player's persistent variable is there when it comes back, with its TTL capped by PLAYER_VARIABLES_MAX_TTL;
// an anonymous player's is not kept.
func TestALoggedPlayersPersistentVariableComesBack(t *testing.T) {
	h := newHarness(t)
	h.srv.cfg.PlayerVariablesMaxTTL = 60
	set := func(c *client, name string) {
		c.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_SetPlayerDetailsMessage{SetPlayerDetailsMessage: &pb.SetPlayerDetailsMessage{
			SetVariable: &pb.SetPlayerVariableMessage{Name: name, Value: `"blue"`, Persist: true, Public: true, Ttl: wrapperspb.Int32(3600)}}}})
	}
	logged := auth.Token{Identifier: "alice@example.com", AccessToken: "at"}
	alice := h.dialAs(logged, "")
	set(alice, "color")
	anonymous := h.dialAs(auth.Token{Identifier: "anon"}, "")
	set(anonymous, "color")
	if err := h.srv.FlushVariables(context.Background()); err != nil {
		t.Fatal(err)
	}
	stored := h.srv.vars.(interface {
		HGetAll(context.Context, string) (map[string]string, error)
	})
	if m, _ := stored.HGetAll(context.Background(), playerKey("anon", roomURL)); len(m) != 0 {
		t.Fatalf("an anonymous player's variable is stored: %v", m)
	}
	m, _ := stored.HGetAll(context.Background(), playerKey("alice@example.com", roomURL))
	expiry, rest, _ := strings.Cut(m["color"], ":")
	if rest != `1:"blue"` || len(expiry) < 13 {
		t.Fatalf("stored as %q", m["color"])
	}
	ms, _ := strconv.ParseInt(expiry, 10, 64)
	if until := time.UnixMilli(ms); time.Until(until) > 61*time.Second {
		t.Fatalf("the TTL is capped at 60 s: %v", time.Until(until))
	}

	token, _ := h.auth.Create(logged)
	back := h.dialWithToken(token, logged.Identifier, "", nil)
	back.send(join(100, 100))
	back.waitFor("its variable in RoomJoined", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		for _, v := range d.GetRoomJoinedMessage().GetPlayerVariable() {
			if v.GetName() == "color" && v.GetValue() == `"blue"` {
				return true
			}
		}
		return d.GetRoomJoinedMessage() != nil && t.Failed()
	})
}

// A client that went away and does not come back in time loses its session: the room is freed, a late resume refused.
func TestTheReconnectionWindowEnds(t *testing.T) {
	h := newHarness(t)
	h.srv.cfg.ClientDisconnectRetention = 200 * time.Millisecond
	alice := h.dialAs(auth.Token{Identifier: "alice"}, "c-alice")
	_ = alice.conn.CloseNow() // the network dropped
	for deadline := time.Now().Add(3 * time.Second); len(h.rooms.Keys()) > 0; time.Sleep(20 * time.Millisecond) {
		if time.Now().After(deadline) {
			t.Fatal("the room is still held after the window")
		}
	}
	late := h.dialWithToken(alice.token, "alice", "c-alice", map[string][]string{"lastReceivedNonce": {"1"}})
	if _, _, err := late.recv(2 * time.Second); websocket.CloseStatus(err) != websocket.StatusPolicyViolation {
		t.Fatalf("a resume after the window is refused (1008), got %v", err)
	}
}

// A client that stops answering the pings is cut after SOCKET_IDLE_TIMER, and its place freed.
func TestAClientThatStopsAnsweringIsCut(t *testing.T) {
	h := newHarness(t)
	h.srv.pingInterval, h.srv.cfg.SocketIdleTimer = 50*time.Millisecond, 100*time.Millisecond
	alice := h.dialAs(auth.Token{Identifier: "alice"}, "") // from now on, nobody reads: the pings go unanswered
	for deadline := time.Now().Add(3 * time.Second); len(h.rooms.Keys()) > 0; time.Sleep(20 * time.Millisecond) {
		if time.Now().After(deadline) {
			t.Fatal("a silent client still holds the room")
		}
	}
	_ = alice.conn.CloseNow()
}

// A client that does not read what it is sent is closed (WS_CLOSE_CODE_SESSION_DESTROYED) once its queue is full,
// instead of growing the server's memory.
func TestAClientThatDoesNotReadIsClosed(t *testing.T) {
	h := newHarness(t)
	alice := h.dialAs(auth.Token{Identifier: "alice"}, "")
	var s *Session
	h.srv.sessions.Range(func(k, _ any) bool { s = k.(*Session); return false })
	big := strings.Repeat("x", 4096)
	for range 20 * outboxLimit { // far more than the socket buffers and the queue hold
		s.Send(core.NewMsg(&pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_ErrorMessage{ErrorMessage: &pb.ErrorMessage{Message: big}}}, false))
	}
	for {
		_, _, err := alice.recv(5 * time.Second)
		if err != nil {
			var ce websocket.CloseError
			if !errors.As(err, &ce) || ce.Code != statusSessionDestroyed || !strings.Contains(ce.Reason, "Too slow") {
				t.Fatalf("closed with %v", err)
			}
			return
		}
	}
}
