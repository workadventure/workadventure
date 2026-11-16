// Package registry holds the live rooms, spaces and connections in a map split into shards, each with its own
// lock, so that thousands of connections joining and leaving do not queue on one global lock. A shard lock is
// only held for map operations, never across I/O.
package registry

import (
	"hash/maphash"
	"sync"
)

const shardCount = 64

type Map[K comparable, V any] struct {
	seed   maphash.Seed
	shards [shardCount]shard[K, V]
}

type shard[K comparable, V any] struct {
	mu sync.Mutex
	m  map[K]V
}

func New[K comparable, V any]() *Map[K, V] {
	r := &Map[K, V]{seed: maphash.MakeSeed()}
	for i := range r.shards {
		r.shards[i].m = make(map[K]V)
	}
	return r
}

func (r *Map[K, V]) shard(k K) *shard[K, V] {
	return &r.shards[maphash.Comparable(r.seed, k)%shardCount]
}

func (r *Map[K, V]) Get(k K) (V, bool) {
	s := r.shard(k)
	s.mu.Lock()
	defer s.mu.Unlock()
	v, ok := s.m[k]
	return v, ok
}

// Compute replaces the value of k with what f returns, atomically: f runs under the shard lock, so it must be
// quick and must not block. keep=false deletes the entry.
func (r *Map[K, V]) Compute(k K, f func(old V, loaded bool) (v V, keep bool)) V {
	s := r.shard(k)
	s.mu.Lock()
	defer s.mu.Unlock()
	old, loaded := s.m[k]
	v, keep := f(old, loaded)
	if keep {
		s.m[k] = v
	} else {
		delete(s.m, k)
	}
	return v
}

func (r *Map[K, V]) Delete(k K) {
	s := r.shard(k)
	s.mu.Lock()
	delete(s.m, k)
	s.mu.Unlock()
}

// Keys lists the keys, one shard at a time (not a snapshot).
func (r *Map[K, V]) Keys() []K {
	var keys []K
	for i := range r.shards {
		s := &r.shards[i]
		s.mu.Lock()
		for k := range s.m {
			keys = append(keys, k)
		}
		s.mu.Unlock()
	}
	return keys
}

// Len counts the entries, one shard at a time (not a snapshot).
func (r *Map[K, V]) Len() int {
	n := 0
	for i := range r.shards {
		s := &r.shards[i]
		s.mu.Lock()
		n += len(s.m)
		s.mu.Unlock()
	}
	return n
}
