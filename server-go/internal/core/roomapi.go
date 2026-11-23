package core

import "context"

// The Room API's side of a room: reading and writing its variables without being a player, and watching it. A
// watcher gets every change of a room variable (VariableChanged) and every event sent to the whole room, whoever
// sent it (the event as the adapter encoded it); a targeted event reaches its players only. It also gets the players
// already there, then every arrival and departure (MemberJoined, MemberLeft: the admin socket). A watcher keeps nothing
// alive: the adapter holds the room for as long as it watches.

type watcher struct{ f func(event Event) }

// MemberJoined and MemberLeft tell a watcher a connection entered or left the room (userJoinedRoom, userLeftRoom).
type MemberJoined struct{ UUID, Name, IPAddress string }
type MemberLeft struct{ UUID string }

func (s *state) toWatchers(event Event) {
	for w := range s.watchers {
		w.f(event)
	}
}

// Watch calls f, on the room's goroutine (f must not block), until stop.
func (r *Room) Watch(ctx context.Context, f func(event Event)) (stop func(), err error) {
	w := &watcher{f: f}
	if err := r.a.Post(ctx, func() {
		r.s.watchers[w] = struct{}{}
		for _, u := range r.s.users {
			f(MemberJoined{UUID: u.uuid, Name: u.name, IPAddress: u.ip})
		}
	}); err != nil {
		return nil, err
	}
	return func() { _ = r.a.Post(context.Background(), func() { delete(r.s.watchers, w) }) }, nil
}

// ReadVariable reads any room variable, whatever its readableBy; ok is false when it has no value. The room's
// variables must be loaded first (InitVariables).
func (r *Room) ReadVariable(ctx context.Context, name string) (value string, ok bool, err error) {
	type read struct {
		value string
		ok    bool
	}
	ch := make(chan read, 1)
	if err := r.a.Post(ctx, func() {
		if r.s.roomVars == nil {
			ch <- read{}
			return
		}
		v, ok := r.s.roomVars.Values[name]
		ch <- read{v, ok}
	}); err != nil {
		return "", false, err
	}
	select {
	case got := <-ch:
		return got.value, got.ok, nil
	case <-ctx.Done():
		return "", false, ctx.Err()
	}
}

// SaveVariable writes a room variable for the Room API: any variable the map declares, whatever its writableBy.
// done runs on the room's goroutine, as for SetVariable (stale: read the map again, Redeclare, retry once).
func (r *Room) SaveVariable(ctx context.Context, v Variable, mayRedeclare bool, done func(stale bool, err error)) error {
	return r.a.Post(ctx, func() { done(r.s.writeVariable(v, nil, mayRedeclare, true)) })
}
