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

	"github.com/workadventure/workadventure/server-go/internal/admin"
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

// Kicking someone off a space, forcing a mute, muting everybody: the moderator's alone, and anybody else's is dropped
// (ModerationRights.ts). The receiver is told who sent an event by the server, never by the sender.
func TestOnlyAModeratorForcesAMuteOrKicksOff(t *testing.T) {
	h := newHarness(t)
	admin := h.dialAs(auth.Token{Identifier: "admin", Tags: []string{"admin"}}, "c-admin")
	bob := h.dialAs(auth.Token{Identifier: "bob"}, "c-bob")
	adminID, bobID := admin.joinSpace(1, "meeting"), bob.joinSpace(1, "meeting")
	assertModeration(t, admin, bob, "meeting", adminID, bobID)
}

// The moderator tag of a meeting room (livekitRoomAdminTag) gives its holders the moderator's rights in that room.
func TestTheMeetingRoomTagModeratesTheMeeting(t *testing.T) {
	h := editorHarness(t)
	if err := h.srv.maps.Put("maps/office.wam", []byte(`{"version":"2.0.0","mapUrl":"./office.tmj","entities":{},"entityCollections":[],
		"areas":[{"id":"a1","name":"","x":0,"y":0,"width":32,"height":32,"visible":true,"properties":[
		{"id":"p1","type":"livekitRoomProperty","roomName":"Board","livekitRoomAdminTag":"chair"}]}]}`)); err != nil {
		t.Fatal(err)
	}
	chair := h.dialWAM(auth.Token{Identifier: "chair", Tags: []string{"chair"}})
	bob := h.dialWAM(auth.Token{Identifier: "bob", Tags: []string{"other"}})
	space := slugifyJitsiRoomName("Board", wamRoom, false)
	chairID, bobID := chair.joinSpace(1, space), bob.joinSpace(1, space)
	assertModeration(t, chair, bob, space, chairID, bobID)

	// In another space, the tag is nobody's moderator.
	chairID, bobID = chair.joinSpace(2, "elsewhere"), bob.joinSpace(2, "elsewhere")
	chair.privateEvent("elsewhere", bobID, &pb.PrivateSpaceEvent{Event: &pb.PrivateSpaceEvent_MuteAudio{MuteAudio: &pb.MuteAudioPrivateMessage{Force: true}}})
	bob.waitFor("the chair's request", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		m := s.GetPrivateEvent().GetSpaceEvent().GetMuteAudio()
		if m != nil && m.GetForce() {
			t.Fatal("the chair forced a mute outside its meeting room")
		}
		return m != nil && s.GetPrivateEvent().GetSender().GetSpaceUserId() == chairID
	})
}

// assertModeration checks that bob's kick off and mute of everybody are dropped and his mute is only a request,
// while the moderator's mute is forced.
func assertModeration(t *testing.T, moderator, bob *client, space, moderatorID, bobID string) {
	t.Helper()
	bob.privateEvent(space, moderatorID, &pb.PrivateSpaceEvent{Event: &pb.PrivateSpaceEvent_KickOffUser{KickOffUser: &pb.KickOffUserPrivateMessage{}}})
	bob.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_PublicEvent{PublicEvent: &pb.PublicEventFrontToPusher{
		SpaceName: space, SpaceEvent: &pb.SpaceEvent{Event: &pb.SpaceEvent_MuteAudioForEverybody{MuteAudioForEverybody: &pb.MuteAudioForEverybodyPublicMessage{}}}}}})

	// Bob asks to mute, and claims to force it: only a request reaches the moderator, signed with Bob's id.
	bob.privateEvent(space, moderatorID, &pb.PrivateSpaceEvent{Event: &pb.PrivateSpaceEvent_MuteAudio{MuteAudio: &pb.MuteAudioPrivateMessage{Force: true}}})
	moderator.waitFor("bob's request", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		if s.GetPublicEvent().GetSpaceEvent().GetMuteAudioForEverybody() != nil {
			t.Fatal("bob muted everybody")
		}
		e := s.GetPrivateEvent()
		if e.GetSpaceEvent().GetKickOffUser() != nil {
			t.Fatal("bob's kick off reached the moderator")
		}
		if m := e.GetSpaceEvent().GetMuteAudio(); m != nil {
			if m.GetForce() || e.GetSender().GetSpaceUserId() != bobID {
				t.Fatalf("forced %v, sender %q", m.GetForce(), e.GetSender().GetSpaceUserId())
			}
			return true
		}
		return false
	})
	moderator.privateEvent(space, bobID, &pb.PrivateSpaceEvent{Event: &pb.PrivateSpaceEvent_MuteAudio{MuteAudio: &pb.MuteAudioPrivateMessage{}}})
	bob.waitFor("the moderator's forced mute", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		m := s.GetPrivateEvent().GetSpaceEvent().GetMuteAudio()
		return m != nil && m.GetForce() && s.GetPrivateEvent().GetSender().GetSpaceUserId() == moderatorID
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

// refusingAdmin refuses to ban bob; the other bans go to the local admin, which cannot record them.
type refusingAdmin struct{ admin.Admin }

func (a refusingAdmin) Ban(ctx context.Context, b admin.Ban) error {
	if b.UUID == "bob" {
		return admin.ErrBanRefused
	}
	return a.Admin.Ban(ctx, b)
}

// A ban the admin refuses ejects no one: the moderator is told, the user stays. An admin that cannot be asked (none
// here) still gets the user out, as a kick, and the moderator is told it was only that.
func TestARefusedBanEjectsNoOne(t *testing.T) {
	h := newHarness(t)
	h.srv.admin = refusingAdmin{h.srv.admin}
	moderator := h.dialAs(auth.Token{Identifier: "admin", Tags: []string{"admin"}}, "")
	bob := h.dialAs(auth.Token{Identifier: "bob"}, "")
	eve := h.dialAs(auth.Token{Identifier: "eve"}, "")
	ban := func(uuid string) {
		moderator.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_BanPlayerMessage{BanPlayerMessage: &pb.BanPlayerMessage{
			BanUserUuid: uuid, BanUserName: uuid, Reason: "spam"}}})
	}
	toldModerator := func(what string) {
		moderator.waitFor(what, func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
			return strings.Contains(d.GetSendUserMessage().GetMessage(), what)
		})
	}

	ban("eve") // the local admin records nothing: a kick
	eve.waitFor("the kick", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		return d.GetBanUserMessage().GetType() == "kicked"
	})
	toldModerator("eve was only kicked")

	ban("bob")
	toldModerator("bob was not banned")
	bob.send(moveTo(120, 120)) // bob is still in the room: the moderator sees him move
	moderator.waitFor("bob moving", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool { return s.GetUserMovedMessage() != nil })
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
		s.Send(core.NewMsg(core.External{Value: &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_ErrorMessage{ErrorMessage: &pb.ErrorMessage{Message: big}}}}, false))
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

func (c *client) stateQuery(id int32, space string, q *pb.SpaceStateQuery) *pb.AnswerMessage {
	c.t.Helper()
	c.query(id, &pb.QueryMessage{Query: &pb.QueryMessage_SpaceStateQuery{SpaceStateQuery: &pb.SpaceStateQueryFrontToPusher{SpaceName: space, Query: q}}})
	var got *pb.AnswerMessage
	c.waitFor("the answer", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		got = d.GetAnswerMessage()
		return got.GetId() == id
	})
	return got
}

// The space state queries reach the space; recording is refused to whoever may not record, before the space.
func TestSpaceStateQueriesAndTheRecordingRight(t *testing.T) {
	h := newHarness(t)
	alice := h.dialAs(auth.Token{Identifier: "alice"}, "")
	alice.joinSpace(1, "meeting")
	if a := alice.stateQuery(2, "meeting", &pb.SpaceStateQuery{Query: &pb.SpaceStateQuery_RaiseHand{RaiseHand: &pb.RaiseHandQuery{Raised: true}}}); a.GetSpaceStateAnswer() == nil {
		t.Fatalf("raise hand: %v", a)
	}
	if a := alice.stateQuery(3, "meeting", &pb.SpaceStateQuery{Query: &pb.SpaceStateQuery_StartRecording{StartRecording: &pb.StartRecordingQuery{}}}); a.GetError().GetMessage() != "You are not allowed to record" {
		t.Fatalf("recording without the right: %v", a)
	}
	if a := alice.stateQuery(4, "elsewhere", &pb.SpaceStateQuery{Query: &pb.SpaceStateQuery_RaiseHand{RaiseHand: &pb.RaiseHandQuery{Raised: true}}}); a.GetError().GetMessage() != "Space elsewhere not found" {
		t.Fatalf("a space not joined: %v", a)
	}
}
