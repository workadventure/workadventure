// Package actor gives each piece of shared state (a room, a space) a single owner goroutine. Every change to that
// state is a closure run on the owner, one at a time, so the state needs no lock, and different rooms run in
// parallel on all cores.
package actor

import (
	"context"
	"log/slog"
	"runtime/debug"
	"sync"
	"time"
)

type Actor struct {
	name   string
	inbox  chan func()
	done   chan struct{}
	timers Timers
	// Later and the timers post from other goroutines, which may outlive the actor: stopped keeps them from
	// posting on a closed inbox.
	mu      sync.RWMutex
	stopped bool
}

// Timers schedules f after d; stop cancels it and says whether it did. A core.Clock is one: the real clock, or a
// fake one that tests advance by hand.
type Timers interface {
	AfterFunc(d time.Duration, f func()) (stop func() bool)
}

type realTimers struct{}

func (realTimers) AfterFunc(d time.Duration, f func()) func() bool { return time.AfterFunc(d, f).Stop }

// Start launches the owner goroutine. The inbox holds at most size closures. timers runs After; nil is the real
// clock.
func Start(name string, size int, timers Timers) *Actor {
	if timers == nil {
		timers = realTimers{}
	}
	a := &Actor{name: name, inbox: make(chan func(), size), done: make(chan struct{}), timers: timers}
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

// Later queues f from any goroutine, a timer or an answer from the network, unless the actor stopped: then f is
// dropped, as the state it would touch is gone.
func (a *Actor) Later(f func()) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	if !a.stopped {
		_ = a.Post(context.Background(), f) // without a deadline, Post cannot fail
	}
}

// After runs f on the actor once d has passed, unless the actor stopped by then. stop cancels it; f may still run
// if it was already queued, so f checks that it is still wanted.
func (a *Actor) After(d time.Duration, f func()) (stop func()) {
	s := a.timers.AfterFunc(d, func() { a.Later(f) })
	return func() { s() }
}

// Stop ends the actor once the closures already queued have run. Whoever owns the actor guarantees that nothing
// is posted after Stop (see registry.Refs), except through Later and After, which drop what comes too late.
func (a *Actor) Stop() {
	a.mu.Lock()
	a.stopped = true
	a.mu.Unlock()
	close(a.inbox)
}

// Done is closed when the actor has stopped.
func (a *Actor) Done() <-chan struct{} { return a.done }
