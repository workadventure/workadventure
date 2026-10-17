package ws

import (
	"fmt"
	"testing"
	"time"

	"github.com/workadventure/workadventure/server-go/internal/core"
)

func moved(id, x int32) *core.Msg {
	return core.NewMsg(core.UserMoved{UserID: id, Position: core.Position{X: x}}, true)
}

func xs(items []*core.Msg) []any {
	out := make([]any, len(items))
	for i, m := range items {
		switch e := m.Event.(type) {
		case core.UserMoved:
			out[i] = [2]int32{e.UserID, e.Position.X}
		default:
			out[i] = e
		}
	}
	return out
}

func TestPositionsMergeUntilABarrierOfTheSamePlayer(t *testing.T) {
	var q moveQueue
	q.push(moved(1, 1))
	q.push(moved(2, 1))
	if !q.push(moved(1, 2)) {
		t.Fatal("a newer position of player 1 must replace the queued one")
	}
	q.push(core.NewMsg(core.UserLeft{UserID: 3}, true)) // another player: no barrier for player 1
	q.push(moved(1, 3))
	q.push(core.NewMsg(core.PlayerDetailsUpdated{UserID: 1}, true)) // barrier for player 1
	q.push(moved(1, 4))
	q.push(core.NewMsg(core.UserLeft{UserID: 1}, true))
	q.push(core.NewMsg(core.UserJoined{User: core.UserView{ID: 1}}, true))
	q.push(moved(1, 5))
	q.push(core.NewMsg(core.JoinSpaceRequest{}, false)) // a direct message ends a batch: barrier for everybody
	q.push(moved(2, 2))
	q.push(moved(1, 6))

	want := []any{
		[2]int32{1, 3}, [2]int32{2, 1}, core.UserLeft{UserID: 3}, core.PlayerDetailsUpdated{UserID: 1},
		[2]int32{1, 4}, core.UserLeft{UserID: 1}, core.UserJoined{User: core.UserView{ID: 1}}, [2]int32{1, 5},
		core.JoinSpaceRequest{}, [2]int32{2, 2}, [2]int32{1, 6},
	}
	if got := xs(q.items); fmt.Sprint(got) != fmt.Sprint(want) {
		t.Fatalf("got  %v\nwant %v", got, want)
	}
}

func TestOutboxMergesPositionsThenClosesTheSlowConsumer(t *testing.T) {
	overflowed := false
	o := newOutbox(3, func() { overflowed = true })
	o.push(moved(1, 1))
	o.push(core.NewMsg(core.UserLeft{UserID: 9}, true))
	o.push(moved(2, 1))
	for x := int32(2); x < 100; x++ {
		o.push(moved(1, x)) // a full queue still takes the newest position of a queued player
	}
	if overflowed {
		t.Fatal("merged positions take no room")
	}
	if got := xs(o.take(nil)); fmt.Sprint(got) != fmt.Sprint([]any{[2]int32{1, 99}, core.UserLeft{UserID: 9}, [2]int32{2, 1}}) {
		t.Fatalf("unexpected queue %v", got)
	}
	for i := int32(0); i < 4; i++ {
		o.push(core.NewMsg(core.UserLeft{UserID: i}, true))
	}
	if !overflowed {
		t.Fatal("a queue full of messages that cannot merge must close the consumer")
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

func TestResumeStoreFreesChunksAndKeepsFramesIntact(t *testing.T) {
	now := time.Unix(0, 0)
	r := &resumeStore{maxBytes: 64 << 10, retention: time.Hour}
	frame := make([]byte, 1000)
	for n := uint32(1); n <= 1000; n++ {
		frame[0] = byte(n)
		r.add(n, frame, now)
	}
	if r.bytes > r.maxBytes || len(r.chunks) > r.maxBytes/chunkSize+2 {
		t.Fatalf("store grew to %d bytes in %d chunks", r.bytes, len(r.chunks))
	}
	for i, f := range r.after(990) {
		if f[0] != byte(991+i) || len(f) != 1000 {
			t.Fatalf("frame %d corrupted", 991+i)
		}
	}
	if len(r.frames) > 2*r.len()+1 {
		t.Fatalf("the frame index is not reused: %d slots for %d frames", len(r.frames), r.len())
	}
}
