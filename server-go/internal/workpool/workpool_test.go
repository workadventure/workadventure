package workpool

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestAtMostSizeJobsRunAtOnce(t *testing.T) {
	p := New(3)
	var running, peak atomic.Int32
	var wg sync.WaitGroup
	for i := 0; i < 30; i++ {
		wg.Add(1)
		if err := p.Go(context.Background(), func() {
			defer wg.Done()
			n := running.Add(1)
			for {
				old := peak.Load()
				if n <= old || peak.CompareAndSwap(old, n) {
					break
				}
			}
			time.Sleep(time.Millisecond)
			running.Add(-1)
		}); err != nil {
			t.Fatal(err)
		}
	}
	wg.Wait()
	if peak.Load() > 3 {
		t.Fatalf("peak %d > 3", peak.Load())
	}
}

func TestGoGivesUpWithTheContext(t *testing.T) {
	p := New(1)
	block := make(chan struct{})
	_ = p.Go(context.Background(), func() { <-block })
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()
	if err := p.Go(ctx, func() {}); err == nil {
		t.Fatal("expected a timeout")
	}
	close(block)
}
