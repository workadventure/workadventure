package ws

import "time"

// resumeStore keeps the frames recently sent to a client, so that a client whose transport dropped can reconnect
// and get what it missed (NoncedMessageStore). It is bounded by age (CLIENT_DISCONNECTION_RETENTION_MS, like the
// TS store) and also by size, which the TS store was not: if the frames a client missed were evicted, its resume
// is refused and it reconnects from scratch.
type resumeStore struct {
	frames    []storedFrame
	bytes     int
	maxBytes  int
	retention time.Duration
	lastNonce uint32
}

type storedFrame struct {
	nonce uint32
	data  []byte
	at    time.Time
}

func (r *resumeStore) add(nonce uint32, data []byte, now time.Time) {
	r.frames = append(r.frames, storedFrame{nonce, data, now})
	r.bytes += len(data)
	r.lastNonce = nonce
	r.prune(now)
	for r.bytes > r.maxBytes && len(r.frames) > 1 {
		r.dropOldest()
	}
}

func (r *resumeStore) prune(now time.Time) {
	for len(r.frames) > 0 && now.Sub(r.frames[0].at) >= r.retention {
		r.dropOldest()
	}
}

func (r *resumeStore) dropOldest() {
	r.bytes -= len(r.frames[0].data)
	r.frames[0].data = nil
	r.frames = r.frames[1:]
}

// canResumeAfter tells whether every frame after the client's last received nonce is still here.
func (r *resumeStore) canResumeAfter(last uint32, now time.Time) bool {
	r.prune(now)
	first := r.lastNonce + 1 // nothing stored: everything up to lastNonce was evicted
	if len(r.frames) > 0 {
		first = r.frames[0].nonce
	}
	return first <= last+1 && last <= r.lastNonce
}

func (r *resumeStore) after(last uint32) [][]byte {
	var out [][]byte
	for _, f := range r.frames {
		if f.nonce > last {
			out = append(out, f.data)
		}
	}
	return out
}
