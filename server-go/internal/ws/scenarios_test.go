package ws

// End-to-end scenarios ported from the Rust server's bots (server-rust/crates/server/tests/bots.rs): several players
// speak the front's protobuf protocol over real WebSockets to the server started in process. The scenarios the
// other files of this package already play (map edits, kicks and bans, resume, a join without a position,
// scripting events, the admin socket, analytics, Matrix areas) are not repeated here.

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/coder/websocket"

	"github.com/workadventure/workadventure/server-go/internal/admin"
	"github.com/workadventure/workadventure/server-go/internal/auth"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
	"github.com/workadventure/workadventure/server-go/internal/store"
)

// wait is how long a scenario waits for one message. It is generous because the suite runs under the race
// detector, where hundreds of sockets are slow; a passing run never waits that long.
const wait = 10 * time.Second

// player connects name to room at (x, y) and returns once the room has accepted it.
func (h *harness) player(room, name string, x, y int32) *client {
	h.t.Helper()
	token, _ := h.auth.Create(auth.Token{Identifier: name})
	c := h.dialWithToken(token, name, "", url.Values{"roomId": {room}})
	c.send(join(x, y))
	c.waitFor("roomJoined", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool { return d.GetRoomJoinedMessage() != nil })
	return c
}

// sees waits until c sees the player with that uuid arrive, and returns its user id.
func (c *client) sees(uuid string) int32 {
	c.t.Helper()
	return expect(c, wait, uuid+" joining", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) (int32, bool) {
		u := s.GetUserJoinedMessage()
		return u.GetUserId(), u.GetUserUuid() == uuid
	})
}

// Two players see each other, one walks to the other: the move is seen, both are asked into the same bubble space
// and see the bubble with both of them. When one closes its tab, the other sees it leave and the bubble go.
func TestScenarioTwoPlayersMeetThenTheirBubbleBreaks(t *testing.T) {
	h := newHarness(t)
	alice := h.player(roomURL, "alice", 100, 100)
	bob := h.player(roomURL, "bob", 400, 100)
	b, a := alice.sees("bob"), bob.sees("alice")
	if a != alice.userID || b != bob.userID || a == b {
		t.Fatalf("ids: alice %d/%d, bob %d/%d", a, alice.userID, b, bob.userID)
	}

	bob.send(moveTo(250, 100))
	bob.send(moveTo(130, 100))
	alice.waitFor("bob at 130", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		m := s.GetUserMovedMessage()
		return m.GetUserId() == b && m.GetPosition().GetX() == 130
	})
	bubble := func(c *client) string {
		return expect(c, wait, "the bubble space", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) (string, bool) {
			n := d.GetJoinSpaceRequestMessage().GetSpaceName()
			return n, n != ""
		})
	}
	if sa, sb := bubble(alice), bubble(bob); sa != sb || !strings.HasPrefix(sa, roomURL+"#") {
		t.Fatalf("alice is asked into %q, bob into %q", sa, sb)
	}
	alice.waitFor("the bubble of both", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		ids := s.GetGroupUpdateMessage().GetUserIds()
		return len(ids) == 2 && (ids[0] == a && ids[1] == b || ids[0] == b && ids[1] == a)
	})

	_ = bob.conn.Close(websocket.StatusNormalClosure, "Page unloading")
	// The bubble goes before or after bob, as the room handles them: either order is fine.
	var left, deleted bool
	alice.waitFor("bob leaving and the bubble gone", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		left = left || s.GetUserLeftMessage().GetUserId() == b
		deleted = deleted || s.GetGroupDeleteMessage() != nil
		return left && deleted
	})
}

// Many rooms live at the same time: every player sees the last position of the others of its room, and nothing
// leaks between rooms (each room has its own x offset, so a stray position would show).
func TestScenarioManyRoomsInParallel(t *testing.T) {
	const rooms, perRoom, steps = 20, 4, 20
	h := newHarness(t)
	x := func(r, i int) int32 { return int32(100 + 200*i + r) }
	players := make([][]*client, rooms)
	for r := range rooms {
		room := fmt.Sprintf("http://play.test/_/global/maps.test/room%d.json", r)
		for i := range perRoom {
			players[r] = append(players[r], h.player(room, fmt.Sprintf("r%du%d", r, i), x(r, i), 500))
		}
	}
	for step := range steps {
		for r := range rooms {
			for i, c := range players[r] {
				c.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_UserMovesMessage{UserMovesMessage: &pb.UserMovesMessage{
					Position: &pb.PositionMessage{X: x(r, i), Y: int32(500 + step), Moving: step < steps-1},
					Viewport: &pb.ViewportMessage{Right: 1000, Bottom: 1000}}}})
			}
		}
	}
	// Each player reads its own socket in its own subtest, as each front would, all at the same time.
	for r := range rooms {
		for i, c := range players[r] {
			t.Run(fmt.Sprintf("r%du%d", r, i), func(t *testing.T) {
				t.Parallel()
				c.t = t
				last := map[int32]bool{}
				expect(c, wait, "the others' last position", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) (struct{}, bool) {
					p := s.GetUserMovedMessage().GetPosition()
					if p == nil {
						p = s.GetUserJoinedMessage().GetPosition()
					}
					if p != nil && (p.GetX()-100)%200 != int32(r) {
						t.Fatalf("room %d saw a player of another room at %v", r, p)
					}
					if m := s.GetUserMovedMessage(); m.GetPosition().GetY() == 500+steps-1 {
						last[m.GetUserId()] = true
					}
					return struct{}{}, len(last) == perRoom-1
				})
			})
		}
	}
}

// Hundreds of players in one room: each sees everybody arrive, and the last move of one player reaches all.
func TestScenarioHundredsOfPlayersInOneRoom(t *testing.T) {
	const n = 300
	h := newHarness(t)
	var players []*client
	for i := range n {
		// Far enough apart that nobody forms a bubble: this is about the fan-out.
		players = append(players, h.player(roomURL, fmt.Sprintf("u%d", i), int32(i%20)*50, int32(i/20)*60))
	}
	mover := players[0]
	mover.send(moveTo(999, 999))
	for _, c := range players[1:] {
		t.Run(fmt.Sprint(c.userID), func(t *testing.T) {
			t.Parallel()
			c.t = t
			arrived := map[int32]bool{}
			expect(c, wait, "everybody", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) (struct{}, bool) {
				if u := s.GetUserJoinedMessage(); u != nil {
					arrived[u.GetUserId()] = true
				}
				return struct{}{}, len(arrived) >= n-1
			})
			c.waitFor("the mover's last move", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
				m := s.GetUserMovedMessage()
				return m.GetUserId() == mover.userID && m.GetPosition().GetX() == 999
			})
		})
	}
}

func spaceStatePatch(s *pb.SubMessage) (string, bool) {
	p := s.GetSpaceStatePatchMessage()
	return p.GetPatch(), p != nil
}

// A space joined: the whole state comes first, as one root replace. A raised hand reaches every member as a patch,
// the one who raised it before its answer; a refused query changes nothing. Leaving lowers the hand for the others.
func TestScenarioASpaceStatePatchReachesEveryMember(t *testing.T) {
	h := newHarness(t)
	alice := h.player(roomURL, "alice", 100, 100)
	bob := h.player(roomURL, "bob", 3000, 3000)
	aliceID := alice.joinSpace(1, "hall")
	bob.joinSpace(1, "hall")
	for _, c := range []*client{alice, bob} {
		state := expect(c, wait, "the whole state", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) (string, bool) { return spaceStatePatch(s) })
		if !strings.HasPrefix(state, `[{"op":"replace","path":"","value":`) {
			t.Fatalf("the first patch is not the whole state: %s", state)
		}
	}

	alice.query(2, &pb.QueryMessage{Query: &pb.QueryMessage_SpaceStateQuery{SpaceStateQuery: &pb.SpaceStateQueryFrontToPusher{SpaceName: "hall",
		Query: &pb.SpaceStateQuery{Query: &pb.SpaceStateQuery_RaiseHand{RaiseHand: &pb.RaiseHandQuery{Raised: true}}}}}})
	var raised string
	alice.waitFor("the answer", func(d *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		if p, ok := spaceStatePatch(s); ok {
			raised = p
		}
		if a := d.GetAnswerMessage(); a.GetId() == 2 {
			if a.GetSpaceStateAnswer() == nil || raised == "" {
				t.Fatalf("answered %v, after the patch %q", a, raised)
			}
			return true
		}
		return false
	})
	if !strings.Contains(raised, "raisedHands") || !strings.Contains(raised, aliceID) {
		t.Fatalf("the raised hand: %s", raised)
	}
	if got := expect(bob, wait, "the raised hand", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) (string, bool) { return spaceStatePatch(s) }); got != raised {
		t.Fatalf("bob got %s, alice %s", got, raised)
	}

	bob.query(2, &pb.QueryMessage{Query: &pb.QueryMessage_SpaceStateQuery{SpaceStateQuery: &pb.SpaceStateQueryFrontToPusher{SpaceName: "hall",
		Query: &pb.SpaceStateQuery{Query: &pb.SpaceStateQuery_VotePoll{VotePoll: &pb.VotePollQuery{PollId: "nope"}}}}}})
	bob.waitFor("the refusal", func(d *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		if p, ok := spaceStatePatch(s); ok {
			t.Fatalf("a refused query changed the state: %s", p)
		}
		return d.GetAnswerMessage().GetError().GetMessage() == "Poll nope does not exist in this space"
	})

	alice.query(3, &pb.QueryMessage{Query: &pb.QueryMessage_LeaveSpaceQuery{LeaveSpaceQuery: &pb.LeaveSpaceQuery{SpaceName: "hall"}}})
	alice.waitFor("the leave answer", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		return d.GetAnswerMessage().GetLeaveSpaceAnswer() != nil
	})
	bob.waitFor("the hand lowered", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		p, _ := spaceStatePatch(s)
		return p == `[{"op":"replace","path":"/raisedHands","value":[]}]`
	})
}

// Two players in a bubble follow each other; an item's state reaches the room and the newcomers; an emote (emoji
// only) reaches who sees the player; the fifth invitation to the same person within the window is refused.
func TestScenarioPlayersFollowShareItemsEmoteAndInvite(t *testing.T) {
	h := newHarness(t)
	alice := h.player(roomURL, "alice", 100, 100)
	bob := h.player(roomURL, "bob", 130, 100)
	carol := h.player(roomURL, "carol", 900, 900)
	a, b := alice.userID, bob.userID
	alice.waitFor("the bubble with bob", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		return len(s.GetGroupUpdateMessage().GetUserIds()) == 2
	})

	alice.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_FollowRequestMessage{FollowRequestMessage: &pb.FollowRequestMessage{Leader: a, ForceFollow: true}}})
	bob.waitFor("the follow request", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		return d.GetFollowRequestMessage().GetLeader() == a
	})
	bob.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_FollowConfirmationMessage{FollowConfirmationMessage: &pb.FollowConfirmationMessage{Leader: a, Follower: b}}})
	alice.waitFor("the confirmation", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		return d.GetFollowConfirmationMessage().GetFollower() == b
	})
	alice.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_FollowAbortMessage{FollowAbortMessage: &pb.FollowAbortMessage{Leader: a}}})
	bob.waitFor("the abort", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		return d.GetFollowAbortMessage().GetLeader() == a
	})

	bob.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_ItemEventMessage{ItemEventMessage: &pb.ItemEventMessage{
		ItemId: 7, Event: "toggle", StateJson: "true", ParametersJson: "{}"}}})
	for _, c := range []*client{bob, carol} {
		c.waitFor("the item event", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
			return s.GetItemEventMessage().GetItemId() == 7
		})
	}
	token, _ := h.auth.Create(auth.Token{Identifier: "dave"})
	dave := h.dialWithToken(token, "dave", "", nil)
	dave.send(join(200, 200))
	dave.waitFor("the item's state at join", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		items := d.GetRoomJoinedMessage().GetItem()
		return len(items) == 1 && items[0].GetItemId() == 7 && items[0].GetStateJson() == "true"
	})

	emote := func(e string) {
		bob.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_EmotePromptMessage{EmotePromptMessage: &pb.EmotePromptMessage{Emote: e}}})
	}
	emote("not an emoji")
	emote("👋")
	alice.waitFor("bob's emote", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		e := s.GetEmoteEventMessage()
		if e != nil && (e.GetActorUserId() != b || e.GetEmote() != "👋") {
			t.Fatalf("emote %v", e)
		}
		return e != nil
	})

	invite := func() {
		alice.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_MeetingInvitationRequestMessage{
			MeetingInvitationRequestMessage: &pb.MeetingInvitationRequestMessage{ReceiverUserUuid: "bob"}}})
	}
	for range 4 {
		invite()
	}
	bob.waitFor("an invitation", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		return d.GetMeetingInvitationRequestReceivedMessage().GetSenderUserUuid() == "alice"
	})
	invite()
	alice.waitFor("the refusal", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		return d.GetMeetingInvitationRequestTooHighMessage() != nil
	})
}

// bannedWorld is an admin that refuses "eve", as the SaaS does for a banned user.
type bannedWorld struct{ admin.Admin }

func (a bannedWorld) MemberData(ctx context.Context, q admin.MemberQuery) (admin.MemberData, error) {
	if q.Identifier == "eve" {
		return admin.MemberData{}, &admin.Refusal{Data: map[string]any{"type": "error", "code": "USER_BANNED", "title": "Banned", "details": "You were banned"}}
	}
	return a.Admin.MemberData(ctx, q)
}

// A token the server did not sign is told it expired; a user the admin refuses gets the admin's error screen. In
// both cases the connection then closes, and nobody entered the room.
func TestScenarioARefusedJoin(t *testing.T) {
	h := newHarness(t)
	h.srv.admin = bannedWorld{h.srv.admin}
	refused := func(c *client, what string, ok func(*pb.ServerToClientMessage) bool) {
		t.Helper()
		direct, _, err := c.recv(wait)
		if err != nil || len(direct) != 1 || !ok(direct[0]) {
			t.Fatalf("%s: got %v %v", what, direct, err)
		}
		if _, _, err := c.recv(wait); websocket.CloseStatus(err) != websocket.StatusNormalClosure {
			t.Fatalf("%s: expected a normal close, got %v", what, err)
		}
	}
	forged := h.dialWithToken("not-a-jwt", "mallory", "", nil)
	refused(forged, "a forged token", func(d *pb.ServerToClientMessage) bool { return d.GetTokenExpiredMessage() != nil })
	token, _ := h.auth.Create(auth.Token{Identifier: "eve"})
	eve := h.dialWithToken(token, "eve", "", nil)
	refused(eve, "a banned user", func(d *pb.ServerToClientMessage) bool {
		return d.GetErrorScreenMessage().GetCode().GetValue() == "USER_BANNED" && d.GetErrorScreenMessage().GetDetails().GetValue() == "You were banned"
	})
	if n := h.rooms.Len(); n != 0 {
		t.Fatalf("%d rooms started for refused users", n)
	}
}

// A persisted room variable is written to Redis: after a reconnect, and on another server process sharing that
// Redis, the next player finds it.
func TestScenarioARoomVariableSurvivesInRedis(t *testing.T) {
	redis := miniredis.RunT(t)
	start := func() *harness {
		h := editorHarness(t)
		if err := h.srv.maps.Put("maps/office.tmj", []byte(officeTiled)); err != nil {
			t.Fatal(err)
		}
		vars := store.NewRedis(redis.Addr(), "")
		h.srv.vars, h.srv.varWriter = vars, store.NewWriter(vars)
		return h
	}
	dial := func(h *harness, name string, tags ...string) *client {
		token, _ := h.auth.Create(auth.Token{Identifier: name, Tags: tags})
		c := h.dialWithToken(token, name, "", url.Values{"roomId": {wamRoom}})
		c.send(join(100, 100))
		return c
	}
	doorAtJoin := func(c *client) string {
		return expect(c, wait, "roomJoined", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) (string, bool) {
			for _, v := range d.GetRoomJoinedMessage().GetVariable() {
				if v.GetName() == "door" {
					return v.GetValue(), true
				}
			}
			return "", d.GetRoomJoinedMessage() != nil
		})
	}

	first := start()
	admin := dial(first, "admin", "admin")
	if door := doorAtJoin(admin); door != `"closed"` {
		t.Fatalf("the default: %s", door)
	}
	admin.send(setVariable("door", `"open"`))
	admin.waitFor("the change", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		return s.GetVariableMessage().GetName() == "door"
	})
	if err := first.srv.FlushVariables(context.Background()); err != nil {
		t.Fatal(err)
	}
	if got := redis.HGet(wamRoom, "door"); got != `"open"` {
		t.Fatalf("in Redis: %q", got)
	}
	_ = admin.conn.Close(websocket.StatusNormalClosure, "Page unloading")

	if door := doorAtJoin(dial(first, "guest")); door != `"open"` {
		t.Fatalf("the same server, after a reconnect: %s", door)
	}
	if door := doorAtJoin(dial(start(), "guest")); door != `"open"` {
		t.Fatalf("another server sharing the Redis: %s", door)
	}
}
