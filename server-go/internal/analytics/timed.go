package analytics

import (
	"fmt"
	"maps"
	"sync"
	"time"
)

// MaxOpenTimed bounds the timed events one connection keeps open.
const MaxOpenTimed = 32

// ConnectionHandle is the handle of the session itself (user.disconnected).
const ConnectionHandle = "connection"

// Emit hands the tracker's rows to the connection, which signs them with who it is.
type Emit func(name, eventID string, at time.Time, properties map[string]any)

// Tracker is AnalyticsTimedEventTracker for one connection: the intervals it opened, measured on the server's clock.
type Tracker struct {
	tab  string
	emit Emit
	mu   sync.Mutex
	open []openTimed // in opening order
}

type openTimed struct {
	handle, name string
	startedAt    time.Time
	properties   map[string]any
}

func NewTracker(tab string, emit Emit) *Tracker { return &Tracker{tab: tab, emit: emit} }

// IsTimed tells whether name is a timed event; byClient whether timed_event.open may open it.
func IsTimed(name string) (ok, byClient bool) {
	t, ok := timed[name]
	return ok, t.ByClient
}

// Open starts an interval, unless the handle is taken or too many are open. It emits the opensWith event if any.
func (t *Tracker) Open(handle, name string, properties map[string]any, now time.Time) bool {
	def, ok := timed[name]
	if !ok {
		return false
	}
	t.mu.Lock()
	if len(t.open) >= MaxOpenTimed || t.find(handle) >= 0 {
		t.mu.Unlock()
		return false
	}
	t.open = append(t.open, openTimed{handle: handle, name: name, startedAt: now, properties: properties})
	t.mu.Unlock()
	if def.OpensWith != "" {
		p := maps.Clone(properties)
		if p == nil {
			p = map[string]any{}
		}
		p[def.Start] = Time(now)
		t.emit(def.OpensWith, fmt.Sprintf("%s:%s:opened:%d", t.tab, handle, now.UnixMilli()), now, p)
	}
	return true
}

func (t *Tracker) find(handle string) int {
	for i, o := range t.open {
		if o.handle == handle {
			return i
		}
	}
	return -1
}

// Close ends one interval at now.
func (t *Tracker) Close(handle, reason string, now time.Time) {
	t.mu.Lock()
	i := t.find(handle)
	if i < 0 {
		t.mu.Unlock()
		return
	}
	o := t.open[i]
	t.open = append(t.open[:i], t.open[i+1:]...)
	t.mu.Unlock()
	t.write(o, reason, now)
}

// CloseAll ends every interval, the session last. A socket that went away ends them at its last message.
func (t *Tracker) CloseAll(reason string, now, lastActivity time.Time) {
	t.mu.Lock()
	open := t.open
	t.open = nil
	t.mu.Unlock()
	var session []openTimed
	for _, o := range open {
		if o.name == "user.disconnected" {
			session = append(session, o)
			continue
		}
		t.write(o, reason, endOf(o, reason, now, lastActivity))
	}
	for _, o := range session {
		t.write(o, reason, endOf(o, reason, now, lastActivity))
	}
}

func endOf(o openTimed, reason string, now, lastActivity time.Time) time.Time {
	if reason != "socket_closed" {
		return now
	}
	end := min(now.UnixMilli(), lastActivity.UnixMilli())
	return time.UnixMilli(max(o.startedAt.UnixMilli(), end))
}

func (t *Tracker) write(o openTimed, reason string, end time.Time) {
	def := timed[o.name]
	ms := end.UnixMilli() - o.startedAt.UnixMilli()
	if ms < def.MinDurationMs {
		return
	}
	p := maps.Clone(o.properties)
	if p == nil {
		p = map[string]any{}
	}
	p[def.Start], p[def.End], p[def.Reason] = Time(o.startedAt), Time(end), reason
	if o.name == "user.disconnected" {
		p["durationSeconds"] = max(0, (ms+500)/1000) // Math.round
	} else {
		p["durationSeconds"] = max(0, float64(ms)/1000)
	}
	t.emit(o.name, fmt.Sprintf("%s:%s:%d", t.tab, o.handle, end.UnixMilli()), end, p)
}
