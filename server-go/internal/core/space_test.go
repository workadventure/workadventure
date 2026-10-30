package core

import (
	"errors"
	"testing"
)

type answered struct{ err error }

func (answered) coreEvent() {} // the tests record the replies among the events

// joinSpace joins and records the reply in the member's own stream, to check what comes before and after it.
func joinSpace(t *testing.T, sp *Space, p *recorder, id string, props ...string) {
	t.Helper()
	err := sp.Join(ctx, p, SpaceJoin{User: SpaceUser{ID: id, Name: id}, Filter: FilterAllUsers, PropertiesToSync: props},
		func(err error) { p.Send(NewMsg(answered{err}, false)) })
	if err != nil {
		t.Fatal(err)
	}
}

// syncSpace waits until the space processed everything posted before.
func syncSpace(t *testing.T, sp *Space) {
	t.Helper()
	done := make(chan struct{})
	if err := sp.a.Post(ctx, func() { close(done) }); err != nil {
		t.Fatal(err)
	}
	<-done
}

var media = []string{"cameraState", "microphoneState", "screenSharingState"}

func TestBubbleSpaceStartsWebRTCBetweenWatchers(t *testing.T) {
	sp := NewSpace(SpaceKey{"http://play.test", "room#1#0"})
	defer sp.Stop()
	a, b := &recorder{}, &recorder{}
	joinSpace(t, sp, a, "room_2", media...)
	_ = sp.Watch(ctx, "room_2", nil)
	joinSpace(t, sp, b, "room_3", media...)
	syncSpace(t, sp)

	ev := b.take()
	if _, ok := ev[0].(answered); !ok {
		t.Fatalf("the answer must come before anything about the space: %#v", ev)
	}
	if !has(ev, func(p SpacePrivateEvent) bool { s, ok := p.Event.(SwitchStrategy); return ok && s.Strategy == "WEBRTC" }) {
		t.Fatalf("a media space switches the joiner to WebRTC: %#v", ev)
	}
	if !has(a.take(), func(e SpaceUserAdded) bool { return e.User.ID == "room_3" }) {
		t.Fatal("a watcher hears about new members")
	}

	_ = sp.Watch(ctx, "room_3", nil)
	syncSpace(t, sp)
	if !has(b.take(), func(i SpaceUsersInit) bool { return len(i.Users) == 2 }) {
		t.Fatal("watching starts with the whole user list")
	}
	var aStart WebRTCStart
	for _, e := range a.take() {
		if p, ok := e.(SpacePrivateEvent); ok {
			aStart, _ = p.Event.(WebRTCStart)
		}
	}
	if aStart.UserID != "room_3" || !aStart.Initiator {
		t.Fatalf("the existing member initiates towards the new watcher: %+v", aStart)
	}

	_ = sp.Unwatch(ctx, "room_3")
	syncSpace(t, sp)
	if !has(a.take(), func(p SpacePrivateEvent) bool { d, ok := p.Event.(WebRTCDisconnect); return ok && d.UserID == "room_3" }) {
		t.Fatal("unwatching tears the WebRTC connections down")
	}

	_ = sp.Leave(ctx, "room_3", nil)
	syncSpace(t, sp)
	if !has(a.take(), func(r SpaceUserRemoved) bool { return r.UserID == "room_3" }) {
		t.Fatal("watchers hear about departures")
	}
}

func TestSpaceRulesAndRelays(t *testing.T) {
	sp := NewSpace(SpaceKey{"http://play.test", "allWorldUser"})
	defer sp.Stop()
	a, b := &recorder{}, &recorder{}
	joinSpace(t, sp, a, "a", "availabilityStatus", "chatID")
	joinSpace(t, sp, b, "b", "availabilityStatus", "chatID")
	_ = sp.Watch(ctx, "a", nil)
	syncSpace(t, sp)
	if has(b.take(), any_[SpacePrivateEvent]) {
		t.Fatal("no WebRTC without media properties")
	}

	mismatch := &recorder{}
	_ = sp.Join(ctx, mismatch, SpaceJoin{User: SpaceUser{ID: "c"}, Filter: FilterLiveStreamingUsers}, func(err error) {
		mismatch.Send(NewMsg(answered{err}, false))
	})
	syncSpace(t, sp)
	if !has(mismatch.take(), func(r answered) bool { return errors.Is(r.err, ErrFilterMismatch) }) {
		t.Fatal("a join with another filter type must fail")
	}

	a.take()
	_ = sp.UpdateUser(ctx, "b", SpaceUser{CameraState: true, Name: "hacked"}, []string{"cameraState", "name"})
	syncSpace(t, sp)
	ev := a.take()
	if !has(ev, func(u SpaceUserUpdated) bool { return u.User.CameraState && u.User.Name == "b" && len(u.Mask) == 1 }) {
		t.Fatalf("only media fields may be changed by the client: %#v", ev)
	}

	notMember := false
	_ = sp.PublicEvent(ctx, "b", []byte("hi"), func() { notMember = true })
	_ = sp.PrivateEvent(ctx, "a", "b", []byte("psst"), nil)
	_ = sp.PublicEvent(ctx, "stranger", []byte("hi"), func() { notMember = true })
	syncSpace(t, sp)
	if !has(a.take(), func(e SpacePublicEvent) bool { return e.Sender.ID == "b" }) || !has(b.take(), func(e SpacePrivateEvent) bool { return e.Sender.ID == "a" }) {
		t.Fatal("events must be relayed with their sender")
	}
	if !notMember {
		t.Fatal("a stranger cannot publish")
	}
}

// 29ca208789: the pusher registered a watcher with the back after waiting for the space's user list, by which time
// the user might have left; the back then kept a ghost watcher that WebRTC paired with every newcomer. Here the
// user list and the registration are one closure on the space: a departure comes either before it (the watch finds
// no member) or after it (the departure undoes it), never in between.
func TestAWatcherThatLeftIsNotKeptAsOne(t *testing.T) {
	sp := NewSpace(SpaceKey{"http://play.test", "room#1#0"})
	defer sp.Stop()
	after, before := &recorder{}, &recorder{}
	joinSpace(t, sp, after, "room_2", media...)
	_ = sp.Watch(ctx, "room_2", nil)
	_ = sp.Leave(ctx, "room_2", nil) // left once watching
	joinSpace(t, sp, before, "room_4", media...)
	_ = sp.Leave(ctx, "room_4", nil)
	notMember := make(chan struct{}, 1)
	_ = sp.Watch(ctx, "room_4", func() { notMember <- struct{}{} }) // the watch comes after the departure
	newcomer := &recorder{}
	joinSpace(t, sp, newcomer, "room_3", media...)
	_ = sp.Watch(ctx, "room_3", nil)
	syncSpace(t, sp)

	select {
	case <-notMember:
	default:
		t.Fatal("a watch after the departure is refused")
	}
	for _, gone := range []*recorder{after, before} {
		for _, e := range gone.take() {
			if a, ok := e.(SpaceUserAdded); ok && a.User.ID == "room_3" {
				t.Fatalf("a user who left still watches: %#v", e)
			}
		}
	}
	ev := newcomer.take()
	if has(ev, func(p SpacePrivateEvent) bool { s, ok := p.Event.(WebRTCStart); return ok && s.UserID != "room_3" }) {
		t.Fatalf("the newcomer is paired with nobody who left: %#v", ev)
	}
	if !has(ev, func(i SpaceUsersInit) bool { return len(i.Users) == 1 }) {
		t.Fatalf("the newcomer sees itself alone: %#v", ev)
	}
}
