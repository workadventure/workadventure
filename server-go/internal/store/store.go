// Package store keeps the variables that outlive a room and a restart: room variables declared persistent by the
// map, and the persistent variables of logged-in players. It is Redis when REDIS_HOST is set, memory otherwise
// (enough for the bench, and lost on restart). Keys and values are the back's, so a TS back and this server can
// read each other's data.
package store

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"
)

// Hash is the part of Redis the variables use.
type Hash interface {
	HGetAll(ctx context.Context, key string) (map[string]string, error)
	HSet(ctx context.Context, key, field, value string) error
	HDel(ctx context.Context, key, field string) error
	Expire(ctx context.Context, key string, d time.Duration) error
}

// Memory is a Hash in the process.
type Memory struct {
	mu sync.Mutex
	m  map[string]map[string]string
}

func NewMemory() *Memory { return &Memory{m: map[string]map[string]string{}} }

func (s *Memory) HGetAll(_ context.Context, key string) (map[string]string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make(map[string]string, len(s.m[key]))
	for k, v := range s.m[key] {
		out[k] = v
	}
	return out, nil
}

func (s *Memory) HSet(_ context.Context, key, field, value string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.m[key] == nil {
		s.m[key] = map[string]string{}
	}
	s.m[key][field] = value
	return nil
}

func (s *Memory) HDel(_ context.Context, key, field string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.m[key], field)
	return nil
}

// Expire: the expiry is also in the values (players' variables), which is what is checked on load.
func (s *Memory) Expire(context.Context, string, time.Duration) error { return nil }

// Writer applies writes off the callers' goroutines, so that a slow or absent Redis never blocks a room. Only the
// last value of each field is kept until it is stored: the queue grows with the variables, not with how often
// they change, and nothing is ever dropped. A write that fails is tried again, with a growing delay, until Redis
// is back (node-redis's offline queue does the same for the TS back). Flush waits for the queue to drain.
type Writer struct {
	h       Hash
	mu      sync.Mutex
	pending map[field]write
	order   []field       // pending fields, oldest first
	wake    chan struct{} // a write arrived
}

type field struct{ key, name string }

type write struct {
	value string // "" deletes the field
	ttl   time.Duration
}

// retryDelay bounds the delay between two attempts to store a write while Redis is down.
const retryDelay = 5 * time.Second

func NewWriter(h Hash) *Writer {
	w := &Writer{h: h, pending: map[field]write{}, wake: make(chan struct{}, 1)}
	go w.run()
	return w
}

// Set writes a field, or deletes it when value is "", then sets the expiry of the key when ttl > 0.
func (w *Writer) Set(key, name, value string, ttl time.Duration) {
	f := field{key, name}
	w.mu.Lock()
	if _, queued := w.pending[f]; !queued {
		w.order = append(w.order, f)
	}
	w.pending[f] = write{value, ttl}
	w.mu.Unlock()
	select {
	case w.wake <- struct{}{}:
	default:
	}
}

func (w *Writer) run() {
	delay := 100 * time.Millisecond
	for {
		w.mu.Lock()
		if len(w.order) == 0 {
			w.mu.Unlock()
			<-w.wake
			continue
		}
		f := w.order[0]
		wr := w.pending[f]
		w.mu.Unlock()
		if err := w.store(f, wr); err != nil {
			slog.Warn("cannot store a variable, trying again", "key", f.key, "field", f.name, "in", delay, "error", err)
			time.Sleep(delay)
			delay = min(2*delay, retryDelay)
			continue
		}
		delay = 100 * time.Millisecond
		w.mu.Lock()
		if w.pending[f] == wr { // not changed meanwhile: done; otherwise the new value goes next
			delete(w.pending, f)
			w.order = w.order[1:]
		}
		w.mu.Unlock()
	}
}

func (w *Writer) store(f field, wr write) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if wr.value == "" {
		return w.h.HDel(ctx, f.key, f.name)
	}
	if err := w.h.HSet(ctx, f.key, f.name, wr.value); err != nil {
		return err
	}
	if wr.ttl > 0 {
		return w.h.Expire(ctx, f.key, wr.ttl)
	}
	return nil
}

// Pending counts the writes not stored yet.
func (w *Writer) Pending() int {
	w.mu.Lock()
	defer w.mu.Unlock()
	return len(w.order)
}

// Flush waits until every write is stored, or ctx ends (then it returns how many are lost).
func (w *Writer) Flush(ctx context.Context) error {
	for {
		n := w.Pending()
		if n == 0 {
			return nil
		}
		select {
		case <-ctx.Done():
			return fmt.Errorf("%d variable writes not stored: %w", n, ctx.Err())
		case <-time.After(20 * time.Millisecond):
		}
	}
}

// Load reads a key, giving up after 2 s: a join must not wait for an unreachable Redis.
func Load(h Hash, key string) map[string]string {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	m, err := h.HGetAll(ctx, key)
	if err != nil {
		slog.Warn("cannot read stored variables", "key", key, "error", err)
	}
	return m
}
