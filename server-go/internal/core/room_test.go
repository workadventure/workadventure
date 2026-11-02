package core

import (
	"context"
	"fmt"
	"math/rand/v2"
	"sync"
	"testing"
	"time"
)

var cfg = Config{MinimumDistance: 64, GroupRadius: 48, MaxPerGroup: 4}

// recorder is a Peer that remembers what it received.
type recorder struct {
	mu     sync.Mutex
	events []any
	kicked string
}

func (r *recorder) Send(m *Msg) {
	r.mu.Lock()
	r.events = append(r.events, m.Event)
	r.mu.Unlock()
}

func (r *recorder) Kick(reason string) {
	r.mu.Lock()
	r.kicked = reason
	r.mu.Unlock()
}

// take returns and forgets the events received so far.
func (r *recorder) take() []any {
	r.mu.Lock()
	defer r.mu.Unlock()
	ev := r.events
	r.events = nil
	return ev
}

var ctx = context.Background()

// sync waits until the room has processed everything posted before.
func sync_(t *testing.T, r *Room) Stats {
	t.Helper()
	st, err := r.Stats(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if err := r.check(); err != nil {
		t.Fatal(err)
	}
	return st
}

func at(x, y int32) Position { return Position{X: x, Y: y, Direction: DirectionDown} }

var wholeMap = Viewport{Left: 0, Top: 0, Right: 2000, Bottom: 2000}

func join(t *testing.T, r *Room, name string, pos Position, vp Viewport) *recorder {
	t.Helper()
	p := &recorder{}
	if err := r.Join(ctx, p, JoinRequest{UUID: name, TabID: "tab", Name: name, Position: pos, Viewport: vp, Status: StatusOnline}); err != nil {
		t.Fatal(err)
	}
	return p
}

func has[T any](events []any, match func(T) bool) bool {
	for _, e := range events {
		if v, ok := e.(T); ok && match(v) {
			return true
		}
	}
	return false
}

func any_[T any](T) bool { return true }

func TestTwoPlayersFormABubbleThenBurstIt(t *testing.T) {
	r := NewRoom("http://play/_/global/maps/empty.json", cfg)
	defer r.Stop()
	alice := join(t, r, "alice", at(100, 100), wholeMap)
	bob := join(t, r, "bob", at(120, 100), wholeMap)
	if st := sync_(t, r); st.Users != 2 || st.Groups != 1 {
		t.Fatalf("expected one bubble of two, got %+v", st)
	}

	a, b := alice.take(), bob.take()
	if _, ok := a[0].(RoomJoined); !ok {
		t.Fatalf("RoomJoined must come first, got %#v", a[0])
	}
	if _, ok := b[0].(RoomJoined); !ok {
		t.Fatalf("RoomJoined must come first, got %#v", b[0])
	}
	for name, ev := range map[string][]any{"alice": a, "bob": b} {
		if !has(ev, any_[JoinSpaceRequest]) {
			t.Errorf("%s was not asked to join the bubble space: %#v", name, ev)
		}
		if !has(ev, func(g GroupUpdated) bool { return g.Size == 2 && len(g.UserIDs) == 2 }) {
			t.Errorf("%s did not see the bubble: %#v", name, ev)
		}
	}
	if !has(a, func(u UserJoined) bool { return u.User.Name == "bob" }) || !has(b, func(u UserJoined) bool { return u.User.Name == "alice" }) {
		t.Fatalf("players must see each other: %#v / %#v", a, b)
	}

	// Bob walks away: the bubble bursts, Alice still sees him (whole-map viewport) move.
	if err := r.Move(ctx, bob, at(900, 900), nil); err != nil {
		t.Fatal(err)
	}
	if st := sync_(t, r); st.Groups != 0 {
		t.Fatalf("bubble should be gone: %+v", st)
	}
	a, b = alice.take(), bob.take()
	if !has(a, any_[GroupDeleted]) || !has(a, any_[LeaveSpaceRequest]) || !has(b, any_[LeaveSpaceRequest]) {
		t.Fatalf("burst not notified: %#v / %#v", a, b)
	}
	if !has(a, func(m UserMoved) bool { return m.Position.X == 900 }) {
		t.Fatalf("a zone change seen by a listener of both zones is a move: %#v", a)
	}
}

func TestWalkingOrSilentPlayersDoNotJoin(t *testing.T) {
	r := NewRoom("room", cfg)
	defer r.Stop()
	alice := join(t, r, "alice", at(100, 100), wholeMap)
	bob := join(t, r, "bob", Position{X: 300, Y: 300}, wholeMap)
	walking := Position{X: 110, Y: 100, Moving: true}
	_ = r.Move(ctx, bob, walking, nil)
	if st := sync_(t, r); st.Groups != 0 {
		t.Fatal("a walking player must not join")
	}
	_ = r.SetPlayerDetails(ctx, bob, PlayerDetails{AvailabilityStatus: StatusDoNotDisturb})
	_ = r.Move(ctx, bob, at(110, 100), nil)
	if st := sync_(t, r); st.Groups != 0 {
		t.Fatal("a do-not-disturb player must not join")
	}
	alice.take()
	_ = r.SetPlayerDetails(ctx, bob, PlayerDetails{AvailabilityStatus: StatusOnline})
	if st := sync_(t, r); st.Groups != 1 {
		t.Fatal("back online next to someone: joins without moving")
	}
	if !has(alice.take(), func(d PlayerDetailsUpdated) bool { return d.Details.AvailabilityStatus == StatusOnline }) {
		t.Fatal("the status change must be relayed")
	}
	_ = r.SetPlayerDetails(ctx, bob, PlayerDetails{AvailabilityStatus: StatusBackInAMoment})
	if st := sync_(t, r); st.Groups != 0 {
		t.Fatal("going silent leaves the bubble")
	}
}

func TestBubbleCapacityAndLock(t *testing.T) {
	r := NewRoom("room", Config{MinimumDistance: 64, GroupRadius: 48, MaxPerGroup: 2})
	defer r.Stop()
	alice := join(t, r, "alice", at(100, 100), wholeMap)
	join(t, r, "bob", at(110, 100), wholeMap)
	join(t, r, "carol", at(105, 110), wholeMap)
	if st := sync_(t, r); st.Groups != 1 {
		t.Fatalf("carol cannot join a full bubble: %+v", st)
	}

	r2 := NewRoom("room2", cfg)
	defer r2.Stop()
	a2 := join(t, r2, "alice", at(100, 100), wholeMap)
	join(t, r2, "bob", at(110, 100), wholeMap)
	sync_(t, r2)
	_ = r2.LockGroup(ctx, a2, true)
	sync_(t, r2)
	if !has(a2.take(), func(g GroupUpdated) bool { return g.Locked }) {
		t.Fatal("lock must be broadcast")
	}
	join(t, r2, "carol", at(105, 110), wholeMap)
	if st := sync_(t, r2); st.Groups != 1 {
		t.Fatal("carol must not form her own bubble from a locked one")
	}
	_ = alice
}

func TestViewportSubscription(t *testing.T) {
	r := NewRoom("room", cfg)
	defer r.Stop()
	join(t, r, "alice", at(100, 100), Viewport{0, 0, 300, 300})
	far := Viewport{Left: 3200, Top: 3200, Right: 3500, Bottom: 3500}
	bob := join(t, r, "bob", at(3300, 3300), far)
	sync_(t, r)
	if has(bob.take(), func(u UserJoined) bool { return u.User.Name == "alice" }) {
		t.Fatal("bob does not see alice's zone")
	}
	_ = r.SetViewport(ctx, bob, Viewport{0, 0, 300, 300})
	sync_(t, r)
	if !has(bob.take(), func(u UserJoined) bool { return u.User.Name == "alice" }) {
		t.Fatal("subscribing to a zone must replay who is in it")
	}
	_ = r.SetViewport(ctx, bob, far)
	sync_(t, r)
	if !has(bob.take(), any_[UserLeft]) {
		t.Fatal("leaving a zone must forget who is in it")
	}
}

func TestOversizedViewportIsCropped(t *testing.T) {
	tl, br := boundZoneRectangle(zoneKey{-1 << 20, -1 << 20}, zoneKey{1 << 20, 1 << 20})
	if n := int64(br.i-tl.i+1) * int64(br.j-tl.j+1); n > MaxZonesPerViewport || n < MaxZonesPerViewport/2 {
		t.Fatalf("cropped to %d zones", n)
	}
	tl, br = boundZoneRectangle(zoneKey{0, 0}, zoneKey{1 << 30, 0})
	if n := int64(br.i-tl.i+1) * int64(br.j-tl.j+1); n > MaxZonesPerViewport {
		t.Fatalf("elongated viewport cropped to %d zones", n)
	}
}

func TestSameTabReconnectionReplacesTheStaleUser(t *testing.T) {
	r := NewRoom("room", cfg)
	defer r.Stop()
	stale := join(t, r, "alice", at(100, 100), wholeMap)
	fresh := join(t, r, "alice", at(100, 100), wholeMap)
	if st := sync_(t, r); st.Users != 1 {
		t.Fatalf("expected the stale user to be gone: %+v", st)
	}
	stale.mu.Lock()
	defer stale.mu.Unlock()
	if stale.kicked == "" {
		t.Fatal("stale connection must be kicked")
	}
	if has(fresh.take(), any_[DuplicateUserConnected]) {
		t.Fatal("the same tab is not a duplicate")
	}
}

func TestPrivateVariablesStayOnTheServer(t *testing.T) {
	r := NewRoom("room", cfg)
	defer r.Stop()
	alice := join(t, r, "alice", at(100, 100), wholeMap)
	bob := join(t, r, "bob", at(900, 900), wholeMap)
	sync_(t, r)
	bob.take()
	_ = r.SetPlayerDetails(ctx, alice, PlayerDetails{SetVariable: &PlayerVariable{Name: "secret", Value: "1"}})
	_ = r.SetPlayerDetails(ctx, alice, PlayerDetails{Say: &Say{Message: "hello"}})
	sync_(t, r)
	ev := bob.take()
	if len(ev) != 1 || !has(ev, func(d PlayerDetailsUpdated) bool { return d.Details.Say != nil }) {
		t.Fatalf("only the say message may reach bob: %#v", ev)
	}
}

// TestManyRoomsInParallel is the contention test: rooms are independent actors, so they must run side by side
// without data races (go test -race) and without losing anybody.
func TestManyRoomsInParallel(t *testing.T) {
	const rooms, usersPerRoom, moves = 64, 12, 40
	var wg sync.WaitGroup
	errs := make(chan error, rooms)
	for ri := 0; ri < rooms; ri++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			r := NewRoom(fmt.Sprintf("room-%d", ri), cfg)
			defer r.Stop()
			rng := rand.New(rand.NewPCG(uint64(ri), 1))
			peers := make([]*recorder, usersPerRoom)
			for i := range peers {
				peers[i] = &recorder{}
				_ = r.Join(ctx, peers[i], JoinRequest{UUID: fmt.Sprint(i), Position: at(rng.Int32N(640), rng.Int32N(640)), Viewport: wholeMap})
			}
			for m := 0; m < moves; m++ {
				for _, p := range peers {
					_ = r.Move(ctx, p, Position{X: rng.Int32N(640), Y: rng.Int32N(640), Moving: rng.IntN(2) == 0}, &Viewport{0, 0, 640, 640})
				}
			}
			if err := r.check(); err != nil {
				errs <- err
				return
			}
			for _, p := range peers {
				_ = r.Leave(ctx, p)
			}
			if st, err := r.Stats(ctx); err != nil || st.Users != 0 || st.Groups != 0 || st.Zones != 0 {
				errs <- fmt.Errorf("room %d not empty after everyone left: %+v %v", ri, st, err)
			}
		}()
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		t.Error(err)
	}
}

// TestBigRoom puts hundreds of players in one room and checks the invariants hold while they all move.
func TestBigRoom(t *testing.T) {
	const users, rounds = 500, 20
	r := NewRoom("big", cfg)
	defer r.Stop()
	rng := rand.New(rand.NewPCG(42, 42))
	peers := make([]*recorder, users)
	for i := range peers {
		peers[i] = &recorder{}
		_ = r.Join(ctx, peers[i], JoinRequest{UUID: fmt.Sprint(i), Position: at(rng.Int32N(3200), rng.Int32N(3200)), Viewport: Viewport{0, 0, 1280, 720}})
	}
	start := time.Now()
	for round := 0; round < rounds; round++ {
		for _, p := range peers {
			x, y := rng.Int32N(3200), rng.Int32N(3200)
			_ = r.Move(ctx, p, Position{X: x, Y: y, Moving: round%2 == 0}, &Viewport{x - 640, y - 360, x + 640, y + 360})
		}
	}
	st := sync_(t, r)
	t.Logf("%d moves in %v, %+v", users*rounds, time.Since(start), st)
	if st.Users != users {
		t.Fatalf("lost players: %+v", st)
	}
}

// check verifies the room's invariants on its own goroutine.
func (r *Room) check() error {
	ch := make(chan error, 1)
	if err := r.a.Post(ctx, func() { ch <- r.s.check() }); err != nil {
		return err
	}
	return <-ch
}

func (s *state) check() error {
	for _, u := range s.users {
		if u.zone == nil || u.zone.key != userZoneKey(u.pos) {
			return fmt.Errorf("user %d is in the wrong zone", u.id)
		}
		if _, ok := u.zone.users[u]; !ok {
			return fmt.Errorf("zone does not hold user %d", u.id)
		}
		for k, z := range u.listened {
			if _, ok := z.listeners[u]; !ok || s.zones[k] != z {
				return fmt.Errorf("listener %d / zone %v out of sync", u.id, k)
			}
		}
		if g := u.group; g != nil && s.groups[g.id] != g {
			return fmt.Errorf("user %d is in a dead group", u.id)
		}
	}
	for _, g := range s.groups {
		if len(g.users) < 2 || len(g.users) > s.cfg.MaxPerGroup {
			return fmt.Errorf("group %d has %d users", g.id, len(g.users))
		}
		for _, u := range g.users {
			if u.group != g {
				return fmt.Errorf("group %d member %d points elsewhere", g.id, u.id)
			}
		}
		if g.zone == nil || g.zone.key != groupZoneKey(g.x, g.y) {
			return fmt.Errorf("group %d is in the wrong zone", g.id)
		}
	}
	for k, z := range s.zones {
		if len(z.users)+len(z.groups)+len(z.listeners) == 0 {
			return fmt.Errorf("empty zone %v not collected", k)
		}
	}
	return nil
}
