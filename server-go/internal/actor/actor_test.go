package actor

import (
	"context"
	"sync"
	"testing"
	"time"
)

func TestClosuresRunInOrderOnOneGoroutine(t *testing.T) {
	a := Start("t", 4, nil)
	var got []int // touched only by the actor: the race detector checks there is no other writer
	for i := 0; i < 100; i++ {
		if err := a.Post(context.Background(), func() { got = append(got, i) }); err != nil {
			t.Fatal(err)
		}
	}
	a.Stop()
	<-a.Done()
	for i, v := range got {
		if v != i {
			t.Fatalf("out of order at %d: %v", i, got)
		}
	}
}

func TestPostBlocksWhenFullAndHonoursContext(t *testing.T) {
	a := Start("t", 1, nil)
	release := make(chan struct{})
	_ = a.Post(context.Background(), func() { <-release }) // occupies the goroutine
	_ = a.Post(context.Background(), func() {})            // fills the inbox
	if a.TryPost(func() {}) {
		t.Fatal("TryPost must fail on a full inbox")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	if err := a.Post(ctx, func() {}); err == nil {
		t.Fatal("Post must give up when the context ends")
	}
	close(release)
	a.Stop()
	<-a.Done()
}

func TestPanicDoesNotKillTheActor(t *testing.T) {
	a := Start("t", 2, nil)
	var wg sync.WaitGroup
	wg.Add(1)
	_ = a.Post(context.Background(), func() { panic("boom") })
	_ = a.Post(context.Background(), wg.Done)
	wg.Wait()
	a.Stop()
}

// manualTimers fires the last timer started when the test says so.
type manualTimers struct{ fire func() }

func (m *manualTimers) AfterFunc(_ time.Duration, f func()) func() bool {
	m.fire = f
	return func() bool { m.fire = nil; return true }
}

func TestAfterRunsOnTheActorAndNotOnceItStopped(t *testing.T) {
	timers := &manualTimers{}
	a := Start("t", 1, timers)
	ran := make(chan struct{})
	a.After(time.Second, func() { close(ran) })
	timers.fire()
	<-ran
	stop := a.After(time.Second, func() { t.Error("stopped") })
	stop()
	if timers.fire != nil {
		t.Fatal("stop cancels the timer")
	}
	a.After(time.Second, func() { t.Error("ran after the actor stopped") })
	a.Stop()
	<-a.Done()
	timers.fire() // must neither run nor post on the closed inbox
}
