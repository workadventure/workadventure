package core

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"
)

// fakeEgress records as LiveKit's egress does: starting, then active, then complete once stopped.
type fakeEgress struct {
	mu        sync.Mutex
	status    map[string]string
	failStops int // the next Stop calls that fail, as when LiveKit cannot be reached
	started   int
	ended     []RecordingEnded // what the admin was told
}

// RecordingEnded keeps what the admin was told (RecordingReporter).
func (f *fakeEgress) RecordingEnded(e RecordingEnded) {
	f.mu.Lock()
	f.ended = append(f.ended, e)
	f.mu.Unlock()
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
	if f.failStops > 0 {
		f.failStops--
		return errors.New("connection refused")
	}
	f.status[id] = "EGRESS_COMPLETE"
	return nil
}

func (f *fakeEgress) Status(_ context.Context, id string) (EgressInfo, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	info := EgressInfo{Status: f.status[id]}
	if info.Status == "EGRESS_COMPLETE" {
		info.Files = []EgressFile{{Filename: id + ".mp4", SizeBytes: 1000, Duration: 61500 * time.Millisecond}}
	}
	return info, nil
}

func recordingSpace(t *testing.T) (*Space, *fakeEgress) {
	t.Helper()
	egress := &fakeEgress{status: map[string]string{}}
	m := DefaultMedia(&fakeLiveKit{})
	m.Provider = ServerLiveKit{LiveKit: m.Provider.(ServerLiveKit).LiveKit, Egress: egress}
	m.Recordings = egress
	m.FinalizeAfter = 20 * time.Millisecond
	m.Clock = newFakeClock()
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
	var err error
	if !until(t, sp, func() bool {
		select {
		case err = <-got:
			return true
		default:
			return false
		}
	}) {
		t.Fatalf("%T never answered", q)
	}
	return err
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
	if !until(t, sp, func() bool { return sawStatus(p, status) }) {
		t.Fatalf("the recording never became %s", status)
	}
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
	until(t, sp, func() bool {
		egress.mu.Lock()
		defer egress.mu.Unlock()
		return len(egress.ended) > 0
	})
	egress.mu.Lock()
	defer egress.mu.Unlock()
	if egress.started != 1 {
		t.Fatal(egress.started)
	}
	if len(egress.ended) != 1 || egress.ended[0].Recorder.ID != "host" || egress.ended[0].EgressID != "EG_host" ||
		len(egress.ended[0].SessionID) != 36 || egress.ended[0].Info.Status != "EGRESS_COMPLETE" || len(egress.ended[0].Info.Files) != 1 {
		t.Fatalf("the admin learns the recording ended, with its file: %+v", egress.ended)
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

func TestARecordingUsesTheEgressOfTheWorldsLiveKit(t *testing.T) {
	world := &fakeLiveKit{}
	egress := &fakeEgress{status: map[string]string{}}
	var askedFor LiveKit
	m := DefaultMedia(nil)
	m.FinalizeAfter = 20 * time.Millisecond
	m.Clock = newFakeClock()
	m.Provider = worldLiveKit{liveKit: func(context.Context, string) (LiveKit, error) { return world, nil },
		egress: func(lk LiveKit) Egress { askedFor = lk; return egress }}
	sp := NewSpaceWithMedia(SpaceKey{"org/w", "room#1#0"}, m)
	defer sp.Stop()
	host, guest := enter(t, sp, "host"), enter(t, sp, "guest")
	if err := ask(t, sp, "host", StartRecording{}); err != nil {
		t.Fatal(err)
	}
	waitStatus(t, sp, guest, "recording")
	if askedFor != LiveKit(world) || egress.started != 1 {
		t.Fatalf("the egress of the room's LiveKit records: %v, %d", askedFor, egress.started)
	}
	if err := ask(t, sp, "host", StopRecording{}); err != nil {
		t.Fatal(err)
	}
	waitStatus(t, sp, host, "stopping")
}

// A stop that did not reach the egress is asked again: the recording does not stay "stopping" forever.
func TestALostStopIsAskedAgain(t *testing.T) {
	sp, egress := recordingSpace(t)
	host := enter(t, sp, "host")
	if err := ask(t, sp, "host", StartRecording{}); err != nil {
		t.Fatal(err)
	}
	waitStatus(t, sp, host, "recording")
	egress.mu.Lock()
	egress.failStops = 2
	egress.mu.Unlock()
	if err := ask(t, sp, "host", StopRecording{}); err != nil {
		t.Fatal(err)
	}
	if !until(t, sp, func() bool {
		egress.mu.Lock()
		defer egress.mu.Unlock()
		return len(egress.ended) == 1
	}) {
		t.Fatal("the recording stayed stopping")
	}
}
