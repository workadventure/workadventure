package registry

import (
	"sync"
	"sync/atomic"
	"testing"
)

func TestRefsCreateOnceAndStopOnLastRelease(t *testing.T) {
	var created, stopped atomic.Int32
	r := NewRefs(func(k string) *int { created.Add(1); v := 0; return &v }, func(*int) { stopped.Add(1) })

	var wg sync.WaitGroup
	for i := 0; i < 200; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			r.Acquire("room")
		}()
	}
	wg.Wait()
	if created.Load() != 1 {
		t.Fatalf("created %d times", created.Load())
	}
	for i := 0; i < 199; i++ {
		r.Release("room")
	}
	if stopped.Load() != 0 || r.Len() != 1 {
		t.Fatal("stopped while still held")
	}
	r.Release("room")
	if stopped.Load() != 1 || r.Len() != 0 {
		t.Fatal("not stopped after last release")
	}
	r.Acquire("room")
	if created.Load() != 2 {
		t.Fatal("a released key must be created again")
	}
}

func TestShardedMapUnderContention(t *testing.T) {
	m := New[int, int]()
	var wg sync.WaitGroup
	for g := 0; g < 8; g++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := 0; i < 1000; i++ {
				m.Compute(i%100, func(v int, _ bool) (int, bool) { return v + 1, true })
			}
		}()
	}
	wg.Wait()
	total := 0
	for i := 0; i < 100; i++ {
		v, _ := m.Get(i)
		total += v
	}
	if total != 8000 {
		t.Fatalf("lost updates: %d", total)
	}
}
