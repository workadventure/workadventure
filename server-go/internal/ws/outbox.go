package ws

import (
	"sync"

	"github.com/workadventure/workadventure/server-go/internal/core"
	"github.com/workadventure/workadventure/server-go/internal/metrics"
)

// moveQueue is a list of messages in which a player's new position takes the place of its previous one still
// queued (common rule of the candidates, 2026-10-14). A barrier stops that: another message about the same player
// (arrival, departure, details), or a direct message, which ends a batch. A replaced position only jumps over
// messages about other players, which commute with it. The front keeps only the last position per frame and
// handles a batch in one frame, so what it draws does not change.
type moveQueue struct {
	items []*core.Msg
	moves map[int32]int // player → index in items of its position that a newer one may replace
}

// replaces tells whether pushing m would take the place of a queued position instead of growing the queue.
func (q *moveQueue) replaces(m *core.Msg) bool {
	if mv, ok := m.Event.(core.UserMoved); ok {
		_, found := q.moves[mv.UserID]
		return found
	}
	return false
}

// push queues m, or puts it in the place of the player's previous position. It reports whether it replaced one.
func (q *moveQueue) push(m *core.Msg) bool {
	switch e := m.Event.(type) {
	case core.UserMoved:
		if i, ok := q.moves[e.UserID]; ok {
			q.items[i] = m
			return true
		}
		if q.moves == nil {
			q.moves = map[int32]int{}
		}
		q.moves[e.UserID] = len(q.items)
	case core.UserJoined:
		delete(q.moves, e.User.ID)
	case core.UserLeft:
		delete(q.moves, e.UserID)
	case core.PlayerDetailsUpdated:
		delete(q.moves, e.UserID)
	default:
		if !m.Batched {
			clear(q.moves)
		}
	}
	q.items = append(q.items, m)
	return false
}

func (q *moveQueue) reset() {
	clear(q.items)
	q.items = q.items[:0]
	clear(q.moves)
}

// outbox is the bounded queue between the rooms (which must never block) and a session's writer goroutine.
// Positions are merged as they arrive (moveQueue), so a slow client gets the latest position of each player rather
// than all of them. If the queue still fills up, the session is closed: the client reconnects from scratch.
// It never grows past limit, unlike the unbounded resume buffer that let a TS pusher reach 2.2 GB.
type outbox struct {
	mu       sync.Mutex
	q        moveQueue
	limit    int
	closed   bool
	wake     chan struct{}
	overflow func()
}

func newOutbox(limit int, overflow func()) *outbox {
	return &outbox{limit: limit, wake: make(chan struct{}, 1), overflow: overflow, q: moveQueue{items: make([]*core.Msg, 0, 64)}}
}

func (o *outbox) push(m *core.Msg) {
	o.mu.Lock()
	if o.closed {
		o.mu.Unlock()
		return
	}
	if o.q.replaces(m) {
		// Its slot was queued with a wake-up the writer has not acted on yet: no new one needed.
		o.q.push(m)
		o.mu.Unlock()
		metrics.CoalescedPositions.Inc()
		return
	}
	if len(o.q.items) >= o.limit {
		o.closed = true
		o.q = moveQueue{}
		o.mu.Unlock()
		metrics.SlowConsumers.Inc()
		o.overflow()
		return
	}
	o.q.push(m)
	o.mu.Unlock()
	select {
	case o.wake <- struct{}{}:
	default:
	}
}

// take moves the queued messages into dst.
func (o *outbox) take(dst []*core.Msg) []*core.Msg {
	o.mu.Lock()
	dst = append(dst[:0], o.q.items...)
	o.q.reset()
	o.mu.Unlock()
	return dst
}

func (o *outbox) close() {
	o.mu.Lock()
	o.closed = true
	o.q = moveQueue{}
	o.mu.Unlock()
}
