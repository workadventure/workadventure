package core

import (
	"sync"
	"testing"

	"github.com/workadventure/workadventure/server-go/internal/analytics"
)

type rows struct {
	mu   sync.Mutex
	list []analytics.Event
}

func (r *rows) add(e analytics.Event) { r.mu.Lock(); r.list = append(r.list, e); r.mu.Unlock() }
func (r *rows) names() []string {
	r.mu.Lock()
	defer r.mu.Unlock()
	var n []string
	for _, e := range r.list {
		n = append(n, e.EventName+":"+e.SpaceUserID)
	}
	return n
}

func TestABubbleWritesItsMeetingWhenItEnds(t *testing.T) {
	got := &rows{}
	sp := NewSpaceWithMedia(SpaceKey{"org/w", "bubble-1"}, Media{Analytics: got.add})
	defer sp.Stop()
	joinSpace(t, sp, &recorder{}, "alice")
	joinSpace(t, sp, &recorder{}, "bob")
	syncSpace(t, sp)
	if len(got.names()) != 0 {
		t.Fatal("nothing is written while the kind is unknown, nor before the end")
	}
	if err := query(t, sp, "alice", SetKind{Kind: "bubble"}); err != nil {
		t.Fatal(err)
	}
	_ = sp.Leave(ctx, "bob", nil)
	syncSpace(t, sp)
	n := got.names()
	if len(n) != 3 || n[0] != "meeting.participation.ended:alice" || n[1] != "meeting.participation.ended:bob" || n[2] != "meeting.ended:" {
		t.Fatalf("the bubble closed with its second member: %v", n)
	}
	if got.list[2].World != "org/w" || got.list[2].Properties["meetingId"] != "bubble-1" || got.list[2].Properties["meetingKind"] != "bubble" {
		t.Fatalf("%+v", got.list[2])
	}
}

func TestABroadcastCountsItsSpeakersAndEndsWithTheSpace(t *testing.T) {
	got := &rows{}
	sp := NewSpaceWithMedia(SpaceKey{"org/w", "stage"}, Media{Analytics: got.add})
	speaker, listener := &recorder{}, &recorder{}
	joinFiltered(t, sp, speaker, SpaceUser{ID: "speaker"}, FilterLiveStreamingUsers)
	joinFiltered(t, sp, listener, SpaceUser{ID: "listener"}, FilterLiveStreamingUsers)
	_ = sp.Watch(ctx, "listener", nil)
	if err := query(t, sp, "speaker", SetKind{Kind: "megaphone"}); err != nil {
		t.Fatal(err)
	}
	_ = sp.UpdateUser(ctx, "speaker", megaphone(true), []string{"megaphoneState"})
	syncSpace(t, sp)
	if len(got.names()) != 0 {
		t.Fatal("on air: the broadcast is open")
	}
	sp.Stop()
	<-sp.Done()
	n := got.names()
	if len(n) != 3 || n[2] != "meeting.ended:" {
		t.Fatalf("a space that stops ends its broadcast: %v", n)
	}
	roles := map[string]any{got.list[0].SpaceUserID: got.list[0].Properties["role"], got.list[1].SpaceUserID: got.list[1].Properties["role"]}
	if roles["speaker"] != "speaker" || roles["listener"] != "listener" || got.list[2].Properties["speakerCount"] != 1 {
		t.Fatalf("one speaker, one listener: %v", roles)
	}
}
