package ws

import (
	"testing"
	"time"

	"github.com/workadventure/workadventure/server-go/internal/core"
)

func moved(id, x int32) *core.Msg {
	return core.NewMsg(core.UserMoved{UserID: id, Position: core.Position{X: x}}, true)
}

func TestOutboxDropsSupersededMovesThenClosesTheSlowConsumer(t *testing.T) {
	overflowed := false
	o := newOutbox(4, func() { overflowed = true })
	o.push(moved(1, 1))
	o.push(core.NewMsg(core.UserLeft{UserID: 9}, true))
	o.push(moved(1, 2))
	o.push(moved(2, 1))
	o.push(moved(1, 3)) // full: the move of player 1 superseded by x=2 goes, then x=3 is queued
	got := o.take(nil)
	if len(got) != 4 || got[0].Event.(core.UserLeft).UserID != 9 || got[1].Event.(core.UserMoved).Position.X != 2 || got[3].Event.(core.UserMoved).Position.X != 3 {
		t.Fatalf("unexpected queue %v", got)
	}
	if overflowed {
		t.Fatal("compaction was enough")
	}
	for i := int32(0); i < 5; i++ {
		o.push(core.NewMsg(core.UserLeft{UserID: i}, true))
	}
	if !overflowed {
		t.Fatal("a queue that stays full must close the consumer")
	}
	o.push(moved(1, 1))
	if len(o.take(nil)) != 0 {
		t.Fatal("a closed outbox accepts nothing")
	}
}

func TestResumeStore(t *testing.T) {
	now := time.Unix(0, 0)
	r := &resumeStore{maxBytes: 10, retention: time.Second}
	for n := uint32(1); n <= 4; n++ {
		r.add(n, []byte("abc"), now) // 3 bytes each: only 3 frames fit
	}
	if r.canResumeAfter(0, now) {
		t.Fatal("frame 1 was evicted")
	}
	if !r.canResumeAfter(1, now) || len(r.after(1)) != 3 || len(r.after(3)) != 1 {
		t.Fatal("frames 2..4 must be replayable")
	}
	if r.canResumeAfter(9, now) {
		t.Fatal("a client cannot be ahead of the server")
	}
	if r.canResumeAfter(3, now.Add(2*time.Second)) || !r.canResumeAfter(4, now.Add(2*time.Second)) {
		t.Fatal("expired frames cannot be replayed, but a client that has everything can resume")
	}
}
