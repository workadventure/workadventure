package core

import (
	"bytes"
	"log/slog"
	"strings"
	"testing"
)

// The paths that matter on the day of a switch: reconnections, map reloads and the admin's messages.

func TestAskingWhereAPlayerIsMovesOrLocates(t *testing.T) {
	r := NewRoom("http://play/_/global/maps/m.json", cfg)
	defer r.Stop()
	alice := join(t, r, "alice", at(10, 10), wholeMap)
	_ = join(t, r, "bob", at(500, 600), wholeMap)
	sync_(t, r)
	alice.take()
	_ = r.AskPosition(ctx, alice, "bob", nil, false)
	_ = r.AskPosition(ctx, alice, "bob", nil, true)
	_ = r.AskPosition(ctx, alice, "nobody", nil, true)
	sync_(t, r)
	ev := alice.take()
	if len(ev) != 2 {
		t.Fatalf("one answer per known player: %#v", ev)
	}
	if m, ok := ev[0].(MoveToPosition); !ok || m.Position.X != 500 || m.Position.Y != 600 {
		t.Fatalf("move: %#v", ev[0])
	}
	if l, ok := ev[1].(LocatePosition); !ok || l.UUID != "bob" || l.Position.X != 500 {
		t.Fatalf("locate: %#v", ev[1])
	}
}

func TestTheAdminsMessagesReachThePlayersTheyAreFor(t *testing.T) {
	r := NewRoom("http://play/_/global/maps/m.json", cfg)
	defer r.Stop()
	alice := join(t, r, "alice", at(10, 10), wholeMap)
	bob1 := join(t, r, "bob", at(500, 500), wholeMap)
	bob2 := &recorder{}
	_ = r.Join(ctx, bob2, JoinRequest{UUID: "bob", TabID: "tab2", Name: "bob", Position: at(900, 900), Viewport: wholeMap, Status: StatusOnline})
	sync_(t, r)
	for _, p := range []*recorder{alice, bob1, bob2} {
		p.take()
	}
	_ = r.SendUserMessage(ctx, UserMessage{Type: "message", Message: "closing"})
	_ = r.ToUUID(ctx, "bob", NewMsg(External{Value: "for bob"}, false))
	sync_(t, r)
	for _, p := range []*recorder{alice, bob1, bob2} {
		if !has(p.events, func(m UserMessage) bool { return m.Message == "closing" }) {
			t.Fatal("the admin's message reaches every player")
		}
	}
	if has(alice.events, any_[External]) || !has(bob1.events, any_[External]) || !has(bob2.events, any_[External]) {
		t.Fatal("a message for a player reaches every tab of that player, and no one else")
	}
}

func TestAMapReplacedOrDeletedReachesItsPlayers(t *testing.T) {
	r := NewRoom("http://play/~/maps/m.wam", cfg)
	defer r.Stop()
	alice := &recorder{} // connected to the room (it gets the map's edits), as every session is before joining
	_ = r.Connect(ctx, alice, func() []Area { return nil }, func() Event { return External{Value: "connected"} })
	sync_(t, r)
	alice.take()
	_ = r.MapChanged(ctx, false)
	sync_(t, r)
	if !has(alice.take(), func(m MapReplaced) bool { return m.RoomURL == "http://play/~/maps/m.wam" }) || alice.kicked != "" {
		t.Fatal("a replaced map is reloaded, nobody leaves")
	}
	_ = r.MapChanged(ctx, true)
	sync_(t, r)
	if !has(alice.take(), any_[MapDeleted]) || alice.kicked == "" {
		t.Fatal("a deleted map sends its players away")
	}
}

// A map read again adds its new variables at their default, and keeps the values the room already has.
func TestRedeclaringKeepsTheValuesAndAddsTheNewVariables(t *testing.T) {
	r := NewRoom("http://play/_/global/maps/m.json", cfg)
	defer r.Stop()
	r.InitVariables(ctx, func() RoomVariables {
		return RoomVariables{Defs: map[string]VarDef{"door": {}}, Values: map[string]string{"door": `"closed"`}}
	})
	alice := join(t, r, "alice", at(10, 10), wholeMap)
	done := func(bool) {}
	_ = r.SetVariable(ctx, alice, Variable{Name: "door", Value: `"open"`}, nil, false, done)
	_ = r.Redeclare(ctx, RoomVariables{Defs: map[string]VarDef{"door": {}, "light": {}}, Values: map[string]string{"door": `"closed"`, "light": `"off"`}})
	_ = r.SetVariable(ctx, alice, Variable{Name: "light", Value: `"on"`}, nil, false, done)
	sync_(t, r)
	if has(alice.events, any_[RoomError]) {
		t.Fatal("the new variable is writable")
	}
	bob := join(t, r, "bob", at(900, 900), wholeMap)
	sync_(t, r)
	if !has(bob.take(), func(j RoomJoined) bool {
		got := map[string]string{}
		for _, v := range j.RoomVariables {
			got[v.Name] = v.Value
		}
		return got["door"] == `"open"` && got["light"] == `"on"`
	}) {
		t.Fatal("the room keeps its value of door and has light")
	}
}

// A WebRTC connection the front lost is started again for the pair, with a new id; a request about an older
// connection is stale and ignored.
func TestALostWebRTCConnectionIsRestarted(t *testing.T) {
	sp := NewSpace(SpaceKey{"http://play.test", "room#1#0"})
	defer sp.Stop()
	a, b := enter(t, sp, "room_2"), enter(t, sp, "room_3")
	syncSpace(t, sp)
	start := func(p *recorder) (s WebRTCStart, n int) {
		for _, e := range p.take() {
			if pe, ok := e.(SpacePrivateEvent); ok {
				if w, ok := pe.Event.(WebRTCStart); ok {
					s, n = w, n+1
				}
			}
		}
		return s, n
	}
	first, _ := start(a)
	b.take()
	stale := "older"
	_ = sp.RestartConnection(ctx, "room_2", "room_3", &stale)
	syncSpace(t, sp)
	if _, n := start(a); n != 0 {
		t.Fatal("a request about another connection is ignored")
	}
	_ = sp.RestartConnection(ctx, "room_2", "room_3", &first.ConnectionID)
	syncSpace(t, sp)
	again, n := start(a)
	if _, m := start(b); n != 1 || m != 1 || again.ConnectionID == first.ConnectionID || again.UserID != "room_3" {
		t.Fatalf("both ends start again on a new connection: %+v (%d, %d)", again, n, m)
	}
}

// A member that lost LiveKit gets a new invitation, only while the space is on LiveKit and it was invited.
func TestAMemberThatLostLiveKitIsInvitedAgain(t *testing.T) {
	sp, _ := liveKitSpace(t, FilterAllUsers)
	var members []*recorder
	for _, id := range []string{"u1", "u2", "u3", "u4", "u5"} {
		members = append(members, enter(t, sp, id))
	}
	eventually(t, sp, members[0], "the invitation", strategy(nil, "invitation"))
	members[0].take()
	_ = sp.RestartLiveKit(ctx, "u1")
	_ = sp.RestartLiveKit(ctx, "stranger")
	eventually(t, sp, members[0], "a new invitation", strategy(nil, "invitation"))
}

// The availability a player sets reaches the watchers of its spaces; a field the server does not take from the
// player details is left alone.
func TestPlayerDetailsReachTheSpace(t *testing.T) {
	sp := NewSpace(SpaceKey{"http://play.test", "world"})
	defer sp.Stop()
	watcher := enter(t, sp, "w")
	_ = enter(t, sp, "p")
	syncSpace(t, sp)
	watcher.take()
	_ = sp.UpdatePlayerDetails(ctx, "p", SpaceUser{AvailabilityStatus: StatusBusy, Name: "renamed"}, []string{"availabilityStatus", "name"})
	syncSpace(t, sp)
	if !has(watcher.take(), func(u SpaceUserUpdated) bool {
		return u.User.ID == "p" && u.User.AvailabilityStatus == StatusBusy && u.User.Name == "p" && len(u.Mask) == 1
	}) {
		t.Fatal("the status reaches the watcher, the name is not taken from player details")
	}
}

// A shutdown closes the open meeting rather than losing it.
func TestAShutdownClosesTheOpenMeeting(t *testing.T) {
	got := &rows{}
	sp := NewSpaceWithMedia(SpaceKey{"org/w", "bubble-1"}, Media{Meetings: meetingsTo{got}})
	defer sp.Stop()
	joinSpace(t, sp, &recorder{}, "alice")
	joinSpace(t, sp, &recorder{}, "bob")
	if err := query(t, sp, "alice", SetKind{Kind: "bubble"}); err != nil {
		t.Fatal(err)
	}
	sp.CloseMeeting(ctx)
	syncSpace(t, sp)
	n := got.names()
	if len(n) == 0 || n[len(n)-1] != "meeting.ended:" {
		t.Fatalf("the meeting ends at shutdown: %v", n)
	}
	if got.list[len(got.list)-1].Properties["endReason"] != "back_shutdown" {
		t.Fatalf("with its reason: %+v", got.list[len(got.list)-1].Properties)
	}
}

// Player details that change nothing reach no one, in a live-streaming space too (the pusher computes the mask
// from the fields that really changed): an update the watcher receives would count as a join in the scripting API.
func TestPlayerDetailsThatChangeNothingAreNotSent(t *testing.T) {
	sp := NewSpace(SpaceKey{"http://play.test", "live"})
	defer sp.Stop()
	alice, bob := &recorder{}, &recorder{}
	chat := "@bob:matrix"
	for id, p := range map[string]*recorder{"alice": alice, "bob": bob} {
		if err := sp.Join(ctx, p, SpaceJoin{User: SpaceUser{ID: id, Name: id, AvailabilityStatus: StatusOnline, ChatID: &chat}, Filter: FilterLiveStreamingUsers}, func(error) {}); err != nil {
			t.Fatal(err)
		}
	}
	_ = sp.Watch(ctx, "alice", nil)
	_ = sp.UpdateUser(ctx, "bob", SpaceUser{Megaphone: true}, []string{"megaphoneState"})
	syncSpace(t, sp)
	if !has(alice.take(), func(u SpaceUserAdded) bool { return u.User.ID == "bob" }) {
		t.Fatal("bob streaming joins alice's list")
	}
	same := chat
	_ = sp.UpdatePlayerDetails(ctx, "bob", SpaceUser{AvailabilityStatus: StatusOnline, ChatID: &same, ShowVoiceIndicator: false},
		[]string{"availabilityStatus", "chatID", "showVoiceIndicator"})
	syncSpace(t, sp)
	if got := alice.take(); len(got) != 0 {
		t.Fatalf("unchanged player details reach no one: %v", got)
	}
}

// In debug, each update a member sends is traced with what it sent and what it had, changed or not.
func TestSpaceUserUpdatesAreTracedInDebug(t *testing.T) {
	var out bytes.Buffer
	prev := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&out, &slog.HandlerOptions{Level: slog.LevelDebug})))
	defer slog.SetDefault(prev)
	sp := NewSpace(SpaceKey{"http://play.test", "live"})
	defer sp.Stop()
	_ = enter(t, sp, "bob")
	_ = sp.UpdateUser(ctx, "bob", SpaceUser{Megaphone: true}, []string{"megaphoneState"})
	_ = sp.UpdateUser(ctx, "bob", SpaceUser{Megaphone: true}, []string{"megaphoneState"})
	syncSpace(t, sp)
	lines := strings.Split(strings.TrimSpace(out.String()), "\n")
	var traced []string
	for _, l := range lines {
		if strings.Contains(l, "space user update") {
			traced = append(traced, l)
		}
	}
	if len(traced) != 2 || !strings.Contains(traced[0], "changed=true") || !strings.Contains(traced[1], "changed=false") ||
		!strings.Contains(traced[1], "fields.megaphoneState.sent=true fields.megaphoneState.had=true") || !strings.Contains(traced[1], "origin=updateSpaceUser") {
		t.Fatalf("both updates traced, the second as a no-op: %q", traced)
	}
}

// A panic leaves the room's state half-changed: everyone is sent away to reconnect to a fresh room, as when the back
// crashed, and so is whoever comes before the room is dropped.
func TestAPanicInARoomKicksEveryoneAndRefusesNewcomers(t *testing.T) {
	r := NewRoom("http://play/_/global/maps/m.json", cfg)
	defer r.Stop()
	alice := join(t, r, "alice", at(10, 10), wholeMap)
	listener := &recorder{}
	_ = r.Connect(ctx, listener, func() []Area { return nil }, func() Event { return External{Value: "connected"} })
	_ = r.a.Post(ctx, func() { panic("half-way") })
	sync_(t, r)
	if alice.kicked != errBrokenReason || listener.kicked != errBrokenReason {
		t.Fatalf("everyone is kicked: %q, %q", alice.kicked, listener.kicked)
	}
	late, later := &recorder{}, &recorder{}
	_ = r.Connect(ctx, late, func() []Area { return nil }, func() Event { return External{Value: "connected"} })
	_ = r.Join(ctx, later, JoinRequest{UUID: "later", Position: at(1, 1)})
	if st := sync_(t, r); late.kicked == "" || later.kicked == "" || st.Users != 1 {
		t.Fatalf("a newcomer is kicked, not added: %q, %q, %+v", late.kicked, later.kicked, st)
	}
}

func TestAPanicInASpaceKicksItsMembersAndRefusesNewcomers(t *testing.T) {
	sp := NewSpace(SpaceKey{"http://play.test", "room#1#0"})
	defer sp.Stop()
	a := &recorder{}
	joinSpace(t, sp, a, "a")
	_ = sp.a.Post(ctx, func() { panic("half-way") })
	syncSpace(t, sp)
	if a.kicked != errBrokenReason {
		t.Fatalf("the member is kicked: %q", a.kicked)
	}
	b := &recorder{}
	var refused error
	_ = sp.Join(ctx, b, SpaceJoin{User: SpaceUser{ID: "b"}}, func(err error) { refused = err })
	syncSpace(t, sp)
	if refused == nil || b.kicked == "" {
		t.Fatalf("a newcomer is refused: %v, %q", refused, b.kicked)
	}
}
