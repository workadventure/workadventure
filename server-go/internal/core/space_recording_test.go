package core

import (
	"context"
	"strings"
	"sync"
	"testing"
	"time"
)

// fakeEgress records as LiveKit's egress does: starting, then active, then complete once stopped.
type fakeEgress struct {
	mu      sync.Mutex
	status  map[string]string
	started int
}

func (f *fakeEgress) Start(_ context.Context, room string, u SpaceUser) (string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.started++
	id := "EG_" + u.ID
	f.status[id] = "EGRESS_ACTIVE"
	return id, nil
}

func (f *fakeEgress) Stop(_ context.Context, id string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.status[id] = "EGRESS_COMPLETE"
	return nil
}

func (f *fakeEgress) Status(_ context.Context, id string) (string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.status[id], nil
}

func recordingSpace(t *testing.T) (*Space, *fakeEgress) {
	t.Helper()
	recordingPoll = 10 * time.Millisecond
	egress := &fakeEgress{status: map[string]string{}}
	m := DefaultMedia(&fakeLiveKit{})
	m.Egress = egress
	m.FinalizeAfter = 20 * time.Millisecond
	sp := NewSpaceWithMedia(SpaceKey{"http://play.test", "room#1#0"}, m)
	t.Cleanup(sp.Stop)
	return sp, egress
}

func ask(t *testing.T, sp *Space, id string, q any) error {
	t.Helper()
	got := make(chan error, 1)
	if err := sp.Query(ctx, id, q, func(err error) { got <- err }); err != nil {
		t.Fatal(err)
	}
	select {
	case err := <-got:
		return err
	case <-time.After(3 * time.Second):
		t.Fatalf("%T never answered", q)
		return nil
	}
}

func sawStatus(p *recorder, status string) bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	for _, e := range p.events {
		if s, ok := e.(SpaceStatePatch); ok && strings.Contains(s.Patch, `"status":"`+status+`"`) {
			return true
		}
	}
	return false
}

func waitStatus(t *testing.T, sp *Space, p *recorder, status string) {
	t.Helper()
	for deadline := time.Now().Add(3 * time.Second); time.Now().Before(deadline); time.Sleep(5 * time.Millisecond) {
		syncSpace(t, sp)
		if sawStatus(p, status) {
			return
		}
	}
	t.Fatalf("the recording never became %s", status)
}

func TestARecordingStartsOnLiveKitAndEndsOnceItsFileIsWritten(t *testing.T) {
	sp, egress := recordingSpace(t)
	host, guest := enter(t, sp, "host"), enter(t, sp, "guest")
	if err := ask(t, sp, "host", StartRecording{}); err != nil {
		t.Fatal(err)
	}
	waitStatus(t, sp, guest, "recording")
	eventually(t, sp, guest, "a bubble of two that records moves to LiveKit", strategy(nil, "switch LIVEKIT"))
	if err := ask(t, sp, "guest", StartRecording{}); err == nil || !strings.Contains(err.Error(), "already") {
		t.Fatalf("one recording at a time: %v", err)
	}
	if err := ask(t, sp, "guest", StopRecording{}); err == nil {
		t.Fatal("only the recorder stops it")
	}
	if err := ask(t, sp, "host", StopRecording{}); err != nil {
		t.Fatal(err)
	}
	waitStatus(t, sp, host, "stopping")
	waitStatus(t, sp, host, "idle")
	if egress.started != 1 {
		t.Fatal(egress.started)
	}
}

func TestARecordingStopsWhenItsRecorderLeaves(t *testing.T) {
	sp, _ := recordingSpace(t)
	enter(t, sp, "host")
	guest := enter(t, sp, "guest")
	if err := ask(t, sp, "host", StartRecording{}); err != nil {
		t.Fatal(err)
	}
	waitStatus(t, sp, guest, "recording")
	_ = sp.Leave(ctx, "host", nil)
	waitStatus(t, sp, guest, "idle")
}

func TestWithoutEgressThereIsNoRecording(t *testing.T) {
	sp, _ := liveKitSpace(t, FilterAllUsers)
	enter(t, sp, "host")
	if err := ask(t, sp, "host", StartRecording{}); err != ErrNoRecording {
		t.Fatal(err)
	}
}
