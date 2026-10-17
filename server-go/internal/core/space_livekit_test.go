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

// deletedSoon waits for the deletions, which are called off the space's goroutine.
func (f *fakeLiveKit) deletedSoon(n int) []string {
	for deadline := time.Now().Add(2 * time.Second); time.Now().Before(deadline); time.Sleep(5 * time.Millisecond) {
		if _, deleted := f.rooms(); len(deleted) >= n {
			return deleted
		}
	}
	_, deleted := f.rooms()
	return deleted
}

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

// eventually waits for p to have received what match describes (whatever it received before, too).
func eventually(t *testing.T, sp *Space, p *recorder, what string, match func(SpacePrivateEvent) bool) {
	t.Helper()
	for deadline := time.Now().Add(2 * time.Second); time.Now().Before(deadline); time.Sleep(5 * time.Millisecond) {
		syncSpace(t, sp)
		p.mu.Lock()
		found := has(p.events, match)
		p.mu.Unlock()
		if found {
			return
		}
	}
	t.Fatalf("never got %s: %#v", what, p.events)
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
	if deleted := lk.deletedSoon(1); len(deleted) != 1 {
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
	time.Sleep(150 * time.Millisecond) // past the return delay
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
	if deleted := lk.deletedSoon(1); len(deleted) != 1 {
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
