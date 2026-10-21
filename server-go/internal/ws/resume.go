package ws

import (
	"sync/atomic"
	"time"

	"github.com/workadventure/workadventure/server-go/internal/metrics"
)

// resumeBudget caps the frames every session of the process keeps for a resume (RESUME_BUFFER_BUDGET_BYTES): a
// store per client bounds one client, not ten thousand. Once the budget is spent, a new session gets no resume
// buffer, and a store that grows evicts its own oldest frames: the clients concerned reconnect from scratch
// after a drop, instead of the process growing without bound.
type resumeBudget struct {
	max  int64
	used atomic.Int64
}

func (b *resumeBudget) add(n int) {
	if b != nil {
		b.used.Add(int64(n))
		metrics.ResumeBufferBytes.Add(float64(n))
	}
}

func (b *resumeBudget) spent() bool { return b != nil && b.used.Load() >= b.max }
func (b *resumeBudget) over() bool  { return b != nil && b.used.Load() > b.max }

// resumeStore keeps the frames recently sent to a client, so that a client whose transport dropped can reconnect
// and get what it missed (NoncedMessageStore). It is bounded by age (CLIENT_DISCONNECTION_RETENTION_MS, like the
// TS store) and also by size, which the TS store was not: if the frames a client missed were evicted, its resume
// is refused and it reconnects from scratch.
//
// Frames are copied into 8 KiB chunks: a busy client keeps about 300 frames for 30 s, and as separate objects they
// were most of the heap the garbage collector had to mark. A chunk is freed once all its frames are evicted.
type resumeStore struct {
	frames    []storedFrame // oldest first, from index head
	head      int
	bytes     int
	maxBytes  int           // 0: no resume buffer, the frames are not kept
	budget    *resumeBudget // nil: no budget but maxBytes
	retention time.Duration
	lastNonce uint32
	chunks    []*chunk // oldest first; the last one is being filled
}

type storedFrame struct {
	nonce uint32
	at    int64 // unix nanoseconds
	data  []byte
	chunk *chunk
}

type chunk struct {
	buf  []byte
	live int // frames of the store still pointing into buf
}

const chunkSize = 8 << 10

// add copies the frame into the store and returns the stored copy.
func (r *resumeStore) add(nonce uint32, frame []byte, now time.Time) []byte {
	r.lastNonce = nonce
	if r.maxBytes == 0 {
		return frame // a resume finds nothing to replay: only one that missed nothing succeeds
	}
	c := r.chunkFor(len(frame))
	start := len(c.buf)
	c.buf = append(c.buf, frame...)
	c.live++
	data := c.buf[start:len(c.buf):len(c.buf)]
	r.frames = append(r.frames, storedFrame{nonce: nonce, at: now.UnixNano(), data: data, chunk: c})
	r.bytes += len(data)
	r.budget.add(len(data))
	r.prune(now)
	for (r.bytes > r.maxBytes || r.budget.over()) && r.len() > 1 {
		r.dropOldest()
	}
	return data
}

// release gives the frames' bytes back to the budget once the session ended, and keeps no frame afterwards.
func (r *resumeStore) release() {
	r.budget.add(-r.bytes)
	*r = resumeStore{lastNonce: r.lastNonce}
}

func (r *resumeStore) chunkFor(n int) *chunk {
	if l := len(r.chunks); l > 0 && cap(r.chunks[l-1].buf)-len(r.chunks[l-1].buf) >= n {
		return r.chunks[l-1]
	}
	c := &chunk{buf: make([]byte, 0, max(chunkSize, n))}
	r.chunks = append(r.chunks, c)
	return c
}

func (r *resumeStore) len() int { return len(r.frames) - r.head }

func (r *resumeStore) prune(now time.Time) {
	cutoff := now.Add(-r.retention).UnixNano()
	for r.len() > 0 && r.frames[r.head].at <= cutoff {
		r.dropOldest()
	}
}

func (r *resumeStore) dropOldest() {
	f := &r.frames[r.head]
	r.bytes -= len(f.data)
	r.budget.add(-len(f.data))
	f.chunk.live--
	*f = storedFrame{}
	r.head++
	// Free the chunks nobody points into any more (frames go in order, so do chunks), but keep the one being filled.
	for len(r.chunks) > 1 && r.chunks[0].live == 0 {
		r.chunks[0] = nil
		r.chunks = r.chunks[1:]
	}
	// Reuse the front of the slice instead of letting it grow forever.
	if r.head > len(r.frames)/2 {
		n := copy(r.frames, r.frames[r.head:])
		clear(r.frames[n:])
		r.frames = r.frames[:n]
		r.head = 0
	}
}

// canResumeAfter tells whether every frame after the client's last received nonce is still here.
func (r *resumeStore) canResumeAfter(last uint32, now time.Time) bool {
	r.prune(now)
	first := r.lastNonce + 1 // nothing stored: everything up to lastNonce was evicted
	if r.len() > 0 {
		first = r.frames[r.head].nonce
	}
	return first <= last+1 && last <= r.lastNonce
}

func (r *resumeStore) after(last uint32) [][]byte {
	var out [][]byte
	for _, f := range r.frames[r.head:] {
		if f.nonce > last {
			out = append(out, f.data)
		}
	}
	return out
}
