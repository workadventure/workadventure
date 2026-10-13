// Package actor gives each piece of shared state (a room, a space) a single owner goroutine. Every change to that
// state is a closure run on the owner, one at a time, so the state needs no lock, and different rooms run in
// parallel on all cores.
package actor

import (
	"context"
	"log/slog"
	"runtime/debug"
)

type Actor struct {
	name  string
	inbox chan func()
	done  chan struct{}
}

// Start launches the owner goroutine. The inbox holds at most size closures.
func Start(name string, size int) *Actor {
	a := &Actor{name: name, inbox: make(chan func(), size), done: make(chan struct{})}
	go a.run()
	return a
}

func (a *Actor) run() {
	defer close(a.done)
	for f := range a.inbox {
		a.safely(f)
	}
}

// safely keeps one faulty message from killing the whole process (and every other room with it), like the
// per-message catch of the TS services.
func (a *Actor) safely(f func()) {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("panic in actor", "actor", a.name, "panic", r, "stack", string(debug.Stack()))
		}
	}()
	f()
}

// Post queues f, blocking while the inbox is full. A connection reader that blocks here stops reading its socket,
// which pushes back on that client through TCP instead of buffering without bound.
func (a *Actor) Post(ctx context.Context, f func()) error {
	select {
	case a.inbox <- f:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// TryPost queues f only if there is room. For senders that must never block, such as another actor.
func (a *Actor) TryPost(f func()) bool {
	select {
	case a.inbox <- f:
		return true
	default:
		return false
	}
}

// Stop ends the actor once the closures already queued have run. Whoever owns the actor guarantees that nothing
// is posted after Stop (see registry.Refs).
func (a *Actor) Stop() { close(a.inbox) }

// Done is closed when the actor has stopped.
func (a *Actor) Done() <-chan struct{} { return a.done }
