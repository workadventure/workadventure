package actor

import (
	"context"
	"sync"
	"testing"
	"time"
)

func TestClosuresRunInOrderOnOneGoroutine(t *testing.T) {
	a := Start("t", 4)
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
	a := Start("t", 1)
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
	a := Start("t", 2)
	var wg sync.WaitGroup
	wg.Add(1)
	_ = a.Post(context.Background(), func() { panic("boom") })
	_ = a.Post(context.Background(), wg.Done)
	wg.Wait()
	a.Stop()
}
