package registry

// Refs keeps one shared object per key (a room per URL) alive while someone holds it, and stops it when the last
// holder releases it. Acquire and Release run under the shard lock, so a holder can never reach an object that
// was already stopped: whoever posts to a room between Acquire and Release posts to a live room.
type Refs[K comparable, V any] struct {
	m      *Map[K, *counted[V]]
	create func(K) V
	stop   func(V)
}

type counted[V any] struct {
	v    V
	refs int
}

func NewRefs[K comparable, V any](create func(K) V, stop func(V)) *Refs[K, V] {
	return &Refs[K, V]{m: New[K, *counted[V]](), create: create, stop: stop}
}

// Acquire returns the object for k, creating it if needed. create and stop run under the shard lock: they must
// not block (starting or stopping an actor is fine).
func (r *Refs[K, V]) Acquire(k K) V {
	return r.m.Compute(k, func(c *counted[V], ok bool) (*counted[V], bool) {
		if !ok {
			c = &counted[V]{v: r.create(k)}
		}
		c.refs++
		return c, true
	}).v
}

func (r *Refs[K, V]) Release(k K) {
	r.m.Compute(k, func(c *counted[V], ok bool) (*counted[V], bool) {
		if !ok {
			panic("registry: release without acquire")
		}
		c.refs--
		if c.refs > 0 {
			return c, true
		}
		r.stop(c.v)
		return nil, false
	})
}

func (r *Refs[K, V]) Get(k K) (V, bool) {
	c, ok := r.m.Get(k)
	if !ok {
		var zero V
		return zero, false
	}
	return c.v, true
}

func (r *Refs[K, V]) Len() int { return r.m.Len() }

// Keys lists the live keys (not a snapshot).
func (r *Refs[K, V]) Keys() []K { return r.m.Keys() }
