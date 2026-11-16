package core

import (
	"context"
	"slices"
	"sync"
	"testing"
	"time"
)

// A bubble that grows, shrinks and changes, with a fake LiveKit that records the rooms it is asked for.

type fakeLiveKit struct {
	mu      sync.Mutex
	created []string
	deleted []string
}

func (f *fakeLiveKit) CreateRoom(_ context.Context, room string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.created = append(f.created, room)
	return nil
}

func (f *fakeLiveKit) DeleteRoom(_ context.Context, room string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.deleted = append(f.deleted, room)
	return nil
}

func (f *fakeLiveKit) Token(room string, u SpaceUser) (string, error) { return room + "/" + u.ID, nil }
func (f *fakeLiveKit) URL() string                                    { return "ws://livekit.test" }

func (f *fakeLiveKit) rooms() (created, deleted []string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return slices.Clone(f.created), slices.Clone(f.deleted)
}

func liveKitSpace(t *testing.T, _ FilterType) (*Space, *fakeLiveKit) {
	t.Helper()
	lk := &fakeLiveKit{}
	m := DefaultMedia(lk)
	m.BackToWebRTCAfter, m.FinalizeAfter = 80*time.Millisecond, 30*time.Millisecond
	m.Clock = newFakeClock()
	sp := NewSpaceWithMedia(SpaceKey{"http://play.test", "room#1#0"}, m)
	t.Cleanup(sp.Stop)
	return sp, lk
}

// enter joins and watches, as every member of a bubble does.
func enter(t *testing.T, sp *Space, id string) *recorder {
	t.Helper()
	p := &recorder{}
	joinSpace(t, sp, p, id, media...)
	_ = sp.Watch(ctx, id, nil)
	return p
}

func strategy(ev []any, kind string) func(p SpacePrivateEvent) bool {
	return func(p SpacePrivateEvent) bool {
		switch e := p.Event.(type) {
		case SwitchStrategy:
			return kind == "switch "+e.Strategy
		case FinalizeSwitch:
			return kind == "finalize "+e.Strategy
		case LiveKitInvitation:
			return kind == "invitation"
		case LiveKitDisconnect:
			return kind == "disconnect"
		}
		return false
	}
}

// fakeClock is a Clock that moves only when a test moves it: the timers of a space run without the test sleeping.
type fakeClock struct {
	mu     sync.Mutex
	now    time.Time
	timers []*fakeTimer
}

type fakeTimer struct {
	at   time.Time
	f    func()
	done bool // ran or stopped
}

func newFakeClock() *fakeClock { return &fakeClock{now: time.Unix(1_700_000_000, 0)} }

func (c *fakeClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.now
}

func (c *fakeClock) AfterFunc(d time.Duration, f func()) func() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	t := &fakeTimer{at: c.now.Add(d), f: f}
	c.timers = append(c.timers, t)
	return func() bool {
		c.mu.Lock()
		defer c.mu.Unlock()
		stopped := !t.done
		t.done = true
		return stopped
	}
}

// Advance moves the clock by d, running the timers due by then, earliest first.
func (c *fakeClock) Advance(d time.Duration) {
	until := c.Now().Add(d)
	for c.fire(until) {
	}
	c.mu.Lock()
	c.now = until
	c.mu.Unlock()
}

// Next moves the clock to the next timer and runs it; false when no timer is pending.
func (c *fakeClock) Next() bool { return c.fire(time.Time{}) }

// fire runs the earliest pending timer due by until (any, when until is zero).
func (c *fakeClock) fire(until time.Time) bool {
	c.mu.Lock()
	c.timers = slices.DeleteFunc(c.timers, func(t *fakeTimer) bool { return t.done })
	var next *fakeTimer
	for _, t := range c.timers {
		if (until.IsZero() || !t.at.After(until)) && (next == nil || t.at.Before(next.at)) {
			next = t
		}
	}
	if next == nil {
		c.mu.Unlock()
		return false
	}
	next.done = true
	if next.at.After(c.now) {
		c.now = next.at
	}
	c.mu.Unlock()
	next.f() // outside the lock: f may start another timer
	return true
}

// clockOf is the fake clock of a space built by these tests.
func clockOf(sp *Space) *fakeClock {
	c, _ := sp.s.mediaCfg.Clock.(*fakeClock)
	return c
}

// settle runs what the space has in flight: its queued closures, then its LiveKit calls, then their answers.
func settle(t *testing.T, sp *Space) {
	t.Helper()
	syncSpace(t, sp)
	if sp.calls != nil {
		done := make(chan struct{})
		sp.calls <- func() { close(done) }
		<-done
	}
	syncSpace(t, sp)
}

// until settles the space until cond holds, running its next timer each time it does not: what the space does
// over time, without waiting for the time to pass.
func until(t *testing.T, sp *Space, cond func() bool) bool {
	t.Helper()
	for range 1000 {
		settle(t, sp)
		if cond() {
			return true
		}
		if c := clockOf(sp); c != nil {
			c.Next()
		}
	}
	return false
}

// eventually waits for p to have received what match describes (whatever it received before, too).
func eventually(t *testing.T, sp *Space, p *recorder, what string, match func(SpacePrivateEvent) bool) {
	t.Helper()
	if !until(t, sp, func() bool {
		p.mu.Lock()
		defer p.mu.Unlock()
		return has(p.events, match)
	}) {
		t.Fatalf("never got %s: %#v", what, p.events)
	}
}

func TestABubblePastFourMovesToLiveKitAndEveryoneGetsAToken(t *testing.T) {
	sp, lk := liveKitSpace(t, FilterAllUsers)
	members := []*recorder{}
	for _, id := range []string{"a", "b", "c", "d"} {
		members = append(members, enter(t, sp, id))
	}
	syncSpace(t, sp)
	if created, _ := lk.rooms(); len(created) != 0 {
		t.Fatal("four people stay on WebRTC")
	}
	members = append(members, enter(t, sp, "e"))
	for i, p := range members {
		eventually(t, sp, p, "the switch to LiveKit", strategy(nil, "switch LIVEKIT"))
		if i < 4 {
			eventually(t, sp, p, "a LiveKit token", strategy(nil, "invitation"))
		}
	}
	eventually(t, sp, members[0], "the end of WebRTC, once LiveKit is up", strategy(nil, "finalize WEBRTC"))
	if created, _ := lk.rooms(); !slices.Equal(created, []string{"http://play.test.room#1#0"}) {
		t.Fatalf("one room, named after the space and its world: %v", created)
	}
}

func TestABubbleGoesBackToWebRTCOnlyOnceItStayedSmall(t *testing.T) {
	sp, lk := liveKitSpace(t, FilterAllUsers)
	var a *recorder
	for _, id := range []string{"a", "b", "c", "d", "e"} {
		p := enter(t, sp, id)
		if a == nil {
			a = p
		}
	}
	eventually(t, sp, a, "LiveKit", strategy(nil, "invitation"))
	a.take() // the switch to WebRTC of its arrival is behind it
	_ = sp.Leave(ctx, "e", nil)
	syncSpace(t, sp)
	if has(a.take(), strategy(nil, "switch WEBRTC")) {
		t.Fatal("not right away: someone may come back")
	}
	eventually(t, sp, a, "the return to WebRTC", strategy(nil, "switch WEBRTC"))
	eventually(t, sp, a, "the end of LiveKit", strategy(nil, "finalize LIVEKIT"))
	settle(t, sp) // the deletion is called off the space's goroutine
	if _, deleted := lk.rooms(); len(deleted) != 1 {
		t.Fatalf("the LiveKit room is deleted, not left to its empty timeout: %v", deleted)
	}
}

func TestSomeoneComingBackKeepsTheBubbleOnLiveKit(t *testing.T) {
	sp, _ := liveKitSpace(t, FilterAllUsers)
	var a *recorder
	for _, id := range []string{"a", "b", "c", "d", "e"} {
		p := enter(t, sp, id)
		if a == nil {
			a = p
		}
	}
	eventually(t, sp, a, "LiveKit", strategy(nil, "invitation"))
	a.take() // the switch to WebRTC of its arrival is behind it
	_ = sp.Leave(ctx, "e", nil)
	enter(t, sp, "f")
	syncSpace(t, sp)
	clockOf(sp).Advance(150 * time.Millisecond) // past the return delay
	syncSpace(t, sp)
	if has(a.take(), strategy(nil, "switch WEBRTC")) {
		t.Fatal("five again before the delay: the return is cancelled")
	}
}

func TestAMemberShortOfCPUMovesABubbleOfThree(t *testing.T) {
	sp, _ := liveKitSpace(t, FilterAllUsers)
	a := enter(t, sp, "a")
	enter(t, sp, "b")
	enter(t, sp, "c")
	syncSpace(t, sp)
	_ = sp.UpdateUser(ctx, "b", SpaceUser{CPULimited: true}, []string{"cpuLimited"})
	eventually(t, sp, a, "LiveKit for a CPU-limited member", strategy(nil, "switch LIVEKIT"))
}

func TestAMegaphoneRoomLastsAsLongAsSomeoneSpeaks(t *testing.T) {
	sp, lk := liveKitSpace(t, FilterLiveStreamingUsers)
	speaker := &recorder{}
	if err := sp.Join(ctx, speaker, SpaceJoin{User: SpaceUser{ID: "speaker", Megaphone: true}, Filter: FilterLiveStreamingUsers, PropertiesToSync: media},
		func(error) {}); err != nil {
		t.Fatal(err)
	}
	var audience []*recorder
	for _, id := range []string{"l1", "l2", "l3", "l4", "l5"} {
		p := &recorder{}
		_ = sp.Join(ctx, p, SpaceJoin{User: SpaceUser{ID: id}, Filter: FilterLiveStreamingUsers, PropertiesToSync: media}, func(error) {})
		_ = sp.Watch(ctx, id, nil)
		audience = append(audience, p)
	}
	for _, p := range audience {
		eventually(t, sp, p, "a token to hear the speaker", strategy(nil, "invitation"))
	}
	_ = sp.UpdateUser(ctx, "speaker", SpaceUser{Megaphone: false}, []string{"megaphoneState"})
	eventually(t, sp, audience[0], "the end of the broadcast", strategy(nil, "disconnect"))
	settle(t, sp)
	if _, deleted := lk.rooms(); len(deleted) != 1 {
		t.Fatalf("nobody speaks: the room goes: %v", deleted)
	}
}

func TestWithoutLiveKitABubbleStaysOnWebRTCWhateverItsSize(t *testing.T) {
	sp := NewSpace(SpaceKey{"http://play.test", "room#1#0"})
	defer sp.Stop()
	var a *recorder
	for _, id := range []string{"a", "b", "c", "d", "e", "f"} {
		p := enter(t, sp, id)
		if a == nil {
			a = p
		}
	}
	syncSpace(t, sp)
	if has(a.take(), strategy(nil, "switch LIVEKIT")) {
		t.Fatal("no LiveKit configured")
	}
}

// worldLiveKit is a MediaProvider that asks for the LiveKit of each world, as the admin's credentials do.
type worldLiveKit struct {
	liveKit func(ctx context.Context, playURI string) (LiveKit, error)
	egress  func(LiveKit) Egress
}

func (w worldLiveKit) LiveKitFor(ctx context.Context, playURI string) (LiveKit, error) {
	return w.liveKit(ctx, playURI)
}

func (w worldLiveKit) EgressFor(lk LiveKit) Egress {
	if w.egress == nil {
		return nil
	}
	return w.egress(lk)
}

func (w worldLiveKit) CanRecord() bool { return w.egress != nil }

func TestAWorldsOwnLiveKitIsAskedForEachMove(t *testing.T) {
	lk := &fakeLiveKit{}
	var asked []string
	var mu sync.Mutex
	m := DefaultMedia(nil)
	m.FinalizeAfter = 30 * time.Millisecond
	m.Clock = newFakeClock()
	m.Provider = worldLiveKit{liveKit: func(_ context.Context, playURI string) (LiveKit, error) {
		mu.Lock()
		asked = append(asked, playURI)
		mu.Unlock()
		return lk, nil
	}}
	sp := NewSpaceWithMedia(SpaceKey{"org/w", "bubble"}, m)
	defer sp.Stop()
	var first *recorder
	for _, id := range []string{"a", "b", "c", "d", "e"} {
		p := &recorder{}
		if first == nil {
			first = p
		}
		if err := sp.Join(ctx, p, SpaceJoin{User: SpaceUser{ID: id, PlayURI: "http://play.test/@/org/w/r"}, Filter: FilterAllUsers, PropertiesToSync: media},
			func(error) {}); err != nil {
			t.Fatal(err)
		}
		_ = sp.Watch(ctx, id, nil)
	}
	eventually(t, sp, first, "a token from the world's LiveKit", strategy(nil, "invitation"))
	mu.Lock()
	defer mu.Unlock()
	if len(asked) != 1 || asked[0] != "http://play.test/@/org/w/r" {
		t.Fatalf("the admin is asked with a member's play URI: %v", asked)
	}
}
