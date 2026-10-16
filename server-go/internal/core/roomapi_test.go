package core

import (
	"sync"
	"testing"
)

// A room as the Room API sees it: variables read and written from outside, events watched.

func apiRoom(t *testing.T) (*Room, map[string]string) {
	t.Helper()
	r := NewRoom("http://play/_/global/maps/m.json", cfg)
	t.Cleanup(r.Stop)
	saved := map[string]string{}
	r.InitVariables(ctx, func() RoomVariables {
		return RoomVariables{
			Defs:   map[string]VarDef{"door": {Persist: true}, "secret": {ReadableBy: "admin", WritableBy: "admin"}},
			Values: map[string]string{"door": `"closed"`, "secret": `"42"`},
			Save:   func(name, value string) { saved[name] = value },
		}
	})
	return r, saved
}

// watch collects what a Room API listener sees.
type watched struct {
	mu     sync.Mutex
	events []any
}

func (w *watched) take() []any {
	w.mu.Lock()
	defer w.mu.Unlock()
	ev := w.events
	w.events = nil
	return ev
}

func watch(t *testing.T, r *Room) *watched {
	t.Helper()
	w := &watched{}
	stop, err := r.Watch(ctx, func(e any) { w.mu.Lock(); w.events = append(w.events, e); w.mu.Unlock() })
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(stop)
	return w
}

func TestTheRoomAPIReadsEveryVariableWhateverItsReadableBy(t *testing.T) {
	r, _ := apiRoom(t)
	if v, ok, err := r.ReadVariable(ctx, "secret"); err != nil || !ok || v != `"42"` {
		t.Fatalf("an admin-only variable is readable: %q %v %v", v, ok, err)
	}
	if _, ok, _ := r.ReadVariable(ctx, "never-set"); ok {
		t.Fatal("a variable without a value reads as nothing")
	}
}

func TestTheRoomAPIWritesWhatPlayersMayNotAndEveryoneSeesIt(t *testing.T) {
	r, saved := apiRoom(t)
	admin, guest := &recorder{}, &recorder{}
	_ = r.Join(ctx, admin, JoinRequest{UUID: "admin", Name: "admin", Tags: []string{"admin"}, Position: at(0, 0), Viewport: wholeMap})
	_ = r.Join(ctx, guest, JoinRequest{UUID: "guest", Name: "guest", Position: at(900, 900), Viewport: wholeMap})
	listener := watch(t, r)
	sync_(t, r)
	admin.take()
	guest.take()
	errs := make(chan error, 2)
	_ = r.SaveVariable(ctx, Variable{Name: "secret", Value: `"7"`}, true, func(_ bool, err error) { errs <- err })
	_ = r.SaveVariable(ctx, Variable{Name: "door", Value: `"open"`}, true, func(_ bool, err error) { errs <- err })
	if err := <-errs; err != nil {
		t.Fatal("writableBy does not bind the Room API:", err)
	}
	<-errs
	sync_(t, r)
	if !has(admin.take(), func(v VariableChanged) bool { return v.Name == "secret" }) || has(guest.take(), func(v VariableChanged) bool { return v.Name == "secret" }) {
		t.Fatal("players see the change only if they may read it")
	}
	if got := listener.take(); len(got) != 2 || saved["door"] != `"open"` {
		t.Fatalf("the listener sees both changes, and the persistent one is kept: %v %v", got, saved)
	}
	_ = r.SaveVariable(ctx, Variable{Name: "door", Value: `"open"`}, true, func(bool, error) {})
	sync_(t, r)
	if len(listener.take()) != 0 {
		t.Fatal("writing the same value again notifies nobody")
	}
}

func TestTheRoomAPICannotInventAVariable(t *testing.T) {
	r, _ := apiRoom(t)
	errs := make(chan error, 1)
	_ = r.SaveVariable(ctx, Variable{Name: "invented", Value: "1"}, false, func(_ bool, err error) { errs <- err })
	if <-errs == nil {
		t.Fatal("only the map declares variables")
	}
}

func TestARoomAPIListenerHearsEventsToTheWholeRoomOnly(t *testing.T) {
	r, _ := apiRoom(t)
	alice := &recorder{}
	connect(t, r, alice, nil) // every connection hears the room's events, as in the WebSocket layer
	_ = r.Join(ctx, alice, JoinRequest{UUID: "alice", Name: "alice", Position: at(0, 0), Viewport: wholeMap})
	listener := watch(t, r)
	_ = r.SendEvent(ctx, NewMsg("to everyone", true), nil)
	_ = r.SendEvent(ctx, NewMsg("to alice", true), []int32{2})
	sync_(t, r)
	if got := listener.take(); len(got) != 1 || got[0] != "to everyone" {
		t.Fatalf("a targeted event never reaches a listener: %v", got)
	}
	if ev := alice.take(); !has(ev, func(s string) bool { return s == "to alice" }) || !has(ev, func(s string) bool { return s == "to everyone" }) {
		t.Fatalf("alice gets both: %v", ev)
	}
}
