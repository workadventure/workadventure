// Package workpool runs blocking or CPU-heavy jobs (WAM map parsing, uploads, S3 calls) on a bounded number of
// goroutines, so they never run on an actor or a connection goroutine and cannot pile up without limit.
package workpool

import "context"

type Pool struct{ slots chan struct{} }

func New(size int) *Pool { return &Pool{slots: make(chan struct{}, size)} }

// Go waits for a free slot, then runs job on its own goroutine. It returns the context error if no slot frees
// up in time; job then never runs.
func (p *Pool) Go(ctx context.Context, job func()) error {
	select {
	case p.slots <- struct{}{}:
	case <-ctx.Done():
		return ctx.Err()
	}
	go func() {
		defer func() { <-p.slots }()
		job()
	}()
	return nil
}
