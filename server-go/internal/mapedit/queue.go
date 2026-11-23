package mapedit

import (
	"errors"
	"sync"
)

// maxPending bounds the edits waiting for one map.
const maxPending = 256

// ErrTooManyEdits refuses an edit when its map already has maxPending waiting.
var ErrTooManyEdits = errors.New("Too many edits are waiting for this map, try again")

// Queue runs the edits of each map one after the other, in the order they arrive, on a goroutine of that map: not on
// a room's, so that a slow disk or a big upload never stops a room, and not one map after the other.
type Queue struct {
	mu   sync.Mutex
	jobs map[string][]func() // a key is present while its goroutine runs
}

func NewQueue() *Queue { return &Queue{jobs: map[string][]func(){}} }

// Run queues job behind the other edits of key.
func (q *Queue) Run(key string, job func()) error {
	q.mu.Lock()
	pending, running := q.jobs[key]
	if len(pending) >= maxPending {
		q.mu.Unlock()
		return ErrTooManyEdits
	}
	q.jobs[key] = append(pending, job)
	q.mu.Unlock()
	if !running {
		go q.drain(key)
	}
	return nil
}

func (q *Queue) drain(key string) {
	for {
		q.mu.Lock()
		jobs := q.jobs[key]
		if len(jobs) == 0 {
			delete(q.jobs, key)
			q.mu.Unlock()
			return
		}
		job := jobs[0]
		q.jobs[key] = jobs[1:]
		q.mu.Unlock()
		job()
	}
}
