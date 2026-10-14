// Package store keeps the variables that outlive a room and a restart: room variables declared persistent by the
// map, and the persistent variables of logged-in players. It is Redis when REDIS_HOST is set, memory otherwise
// (enough for the bench, and lost on restart). Keys and values are the back's, so a TS back and this server can
// read each other's data.
package store

import (
	"context"
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

// Writer applies writes one at a time, in order, off the callers' goroutines: a slow or absent Redis never
// blocks a room. ponytail: a write still queued when the process dies is lost.
type Writer struct {
	h  Hash
	ch chan func(context.Context) error
}

func NewWriter(h Hash) *Writer {
	w := &Writer{h: h, ch: make(chan func(context.Context) error, 4096)}
	go func() {
		for f := range w.ch {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			if err := f(ctx); err != nil {
				slog.Warn("cannot store a variable", "error", err)
			}
			cancel()
		}
	}()
	return w
}

func (w *Writer) enqueue(f func(context.Context) error) {
	select {
	case w.ch <- f:
	default:
		slog.Warn("variable writes are queued too long: one is dropped")
	}
}

// Set writes a field, or deletes it when value is "", then sets the expiry of the key when ttl > 0.
func (w *Writer) Set(key, field, value string, ttl time.Duration) {
	w.enqueue(func(ctx context.Context) error {
		if value == "" {
			return w.h.HDel(ctx, key, field)
		}
		if err := w.h.HSet(ctx, key, field, value); err != nil {
			return err
		}
		if ttl > 0 {
			return w.h.Expire(ctx, key, ttl)
		}
		return nil
	})
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
