package ws

import (
	"sync"

	"github.com/workadventure/workadventure/server-go/internal/core"
	"github.com/workadventure/workadventure/server-go/internal/metrics"
)

// outbox is the bounded queue between the rooms (which must never block) and a session's writer goroutine.
// When a client reads too slowly and the queue fills up:
//  1. position updates superseded by a newer one for the same player are dropped;
//  2. if that is not enough, the session is closed: the client reconnects from scratch.
//
// It never grows past limit, unlike the unbounded resume buffer that let a TS pusher reach 2.2 GB.
type outbox struct {
	mu       sync.Mutex
	items    []*core.Msg
	limit    int
	closed   bool
	wake     chan struct{}
	overflow func()
}

func newOutbox(limit int, overflow func()) *outbox {
	return &outbox{limit: limit, wake: make(chan struct{}, 1), overflow: overflow, items: make([]*core.Msg, 0, 64)}
}

func (o *outbox) push(m *core.Msg) {
	o.mu.Lock()
	if o.closed {
		o.mu.Unlock()
		return
	}
	if len(o.items) >= o.limit {
		metrics.DroppedPositions.Add(float64(o.dropSupersededMoves()))
		if len(o.items) >= o.limit {
			o.closed = true
			o.items = nil
			o.mu.Unlock()
			metrics.SlowConsumers.Inc()
			o.overflow()
			return
		}
	}
	o.items = append(o.items, m)
	o.mu.Unlock()
	select {
	case o.wake <- struct{}{}:
	default:
	}
}

// dropSupersededMoves keeps, for each player, only its last queued move. Order is preserved.
func (o *outbox) dropSupersededMoves() int {
	seen := map[int32]bool{}
	kept := 0
	// Walk from the newest, writing kept items from the end, then shift them to the front.
	w := len(o.items)
	for r := len(o.items) - 1; r >= 0; r-- {
		m := o.items[r]
		if mv, ok := m.Event.(core.UserMoved); ok {
			if seen[mv.UserID] {
				continue
			}
			seen[mv.UserID] = true
		}
		w--
		o.items[w] = m
		kept++
	}
	dropped := len(o.items) - kept
	copy(o.items, o.items[w:])
	clear(o.items[kept:])
	o.items = o.items[:kept]
	return dropped
}

// take moves the queued messages into dst.
func (o *outbox) take(dst []*core.Msg) []*core.Msg {
	o.mu.Lock()
	dst = append(dst[:0], o.items...)
	clear(o.items)
	o.items = o.items[:0]
	o.mu.Unlock()
	return dst
}

func (o *outbox) close() {
	o.mu.Lock()
	o.closed = true
	o.items = nil
	o.mu.Unlock()
}
