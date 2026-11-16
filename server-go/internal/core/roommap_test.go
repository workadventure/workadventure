package core

import "testing"

func connect(t *testing.T, r *Room, p *recorder, areas []Area) {
	t.Helper()
	if err := r.Connect(ctx, p, func() []Area { return areas }, func() Event { return External{Value: "connected"} }); err != nil {
		t.Fatal(err)
	}
}

func TestLockedAreaUnlocksWhenItEmpties(t *testing.T) {
	r := NewRoom("http://play/~/maps/empty.wam", cfg)
	defer r.Stop()
	two := 2
	areas := []Area{
		{ID: "meeting", X: 0, Y: 0, Width: 100, Height: 100, Properties: []AreaProperty{{ID: "lock", Type: lockable, AllowedTags: []string{"admin"}}}},
		{ID: "small", X: 500, Y: 500, Width: 100, Height: 100, Properties: []AreaProperty{{ID: "cap", Type: maxUsersCap, MaxUsers: &two}}},
	}
	admin, guest, late := &recorder{}, &recorder{}, &recorder{}
	connect(t, r, admin, areas)
	connect(t, r, guest, nil) // the areas are loaded once per room
	_ = r.Join(ctx, admin, JoinRequest{UUID: "admin", Name: "admin", Position: at(50, 50), Viewport: wholeMap})
	_ = r.Join(ctx, guest, JoinRequest{UUID: "guest", Name: "guest", Position: at(50, 60), Viewport: wholeMap})
	lock := AreaVariable{AreaID: "meeting", PropertyID: "lock", Key: "lock", Value: "true"}
	_ = r.SetAreaVariable(ctx, guest, lock, nil)
	sync_(t, r)
	if has(admin.take(), any_[AreaVariableChanged]) {
		t.Fatal("only the allowed tags lock")
	}
	_ = r.SetAreaVariable(ctx, admin, lock, []string{"admin"})
	connect(t, r, late, nil)
	sync_(t, r)
	if !has(guest.take(), func(v AreaVariableChanged) bool { return v.Variable.Value == "true" }) {
		t.Fatal("everybody hears about the lock")
	}
	_ = r.Join(ctx, late, JoinRequest{UUID: "late", Name: "late", Position: at(300, 300), Viewport: wholeMap})
	sync_(t, r)
	if !has(late.take(), func(j RoomJoined) bool { return len(j.Variables) == 1 && j.Variables[0].Value == "true" }) {
		t.Fatal("a newcomer gets the lock when it joins")
	}
	_ = r.Move(ctx, admin, at(300, 300), nil)
	_ = r.Move(ctx, guest, at(510, 510), nil)
	_ = r.Move(ctx, late, at(520, 520), nil)
	sync_(t, r)
	ev := admin.take()
	if !has(ev, func(v AreaVariableChanged) bool { return v.Variable.Key == "lock" && v.Variable.Value == "false" }) ||
		!has(ev, func(v AreaVariableChanged) bool {
			return v.Variable.Key == "maxUsersReached" && v.Variable.Value == "true"
		}) {
		t.Fatalf("the empty room unlocks, the small one is full: %#v", ev)
	}
}

func TestEditsReachConnectionsBeforeTheyJoin(t *testing.T) {
	r := NewRoom("http://play/~/maps/empty.wam", cfg)
	defer r.Stop()
	editor, newcomer := &recorder{}, &recorder{}
	connect(t, r, editor, nil)
	connect(t, r, newcomer, nil)
	logged := false
	_ = r.MapEdited(ctx, MapEdit{Command: []byte("edit")}, []Area{}, func() { logged = true })
	sync_(t, r)
	if ev := newcomer.take(); len(ev) != 2 || ev[0] != (External{Value: "connected"}) || string(ev[1].(MapEdit).Command) != "edit" {
		t.Fatalf("a connection that has not joined yet gets the edits: %#v", ev)
	}
	if !has(editor.take(), func(e MapEdit) bool { return string(e.Command) == "edit" }) || !logged {
		t.Fatal("the editor gets its own edit back, logged first for those who connect later")
	}
}

func lockedMeeting(x float64) []Area {
	return []Area{{ID: "meeting", X: x, Y: 0, Width: 100, Height: 100, Properties: []AreaProperty{{ID: "lock", Type: lockable}}}}
}

func TestALockedAreaMovedAwayFromEveryoneUnlocks(t *testing.T) {
	r := NewRoom("http://play/~/maps/empty.wam", cfg)
	defer r.Stop()
	host := &recorder{}
	connect(t, r, host, lockedMeeting(0))
	_ = r.Join(ctx, host, JoinRequest{UUID: "host", Name: "host", Position: at(50, 50), Viewport: wholeMap})
	_ = r.SetAreaVariable(ctx, host, AreaVariable{AreaID: "meeting", PropertyID: "lock", Key: "lock", Value: "true"}, nil)
	sync_(t, r)
	host.take()
	_ = r.MapEdited(ctx, MapEdit{Command: []byte("moved")}, lockedMeeting(1000), nil) // an editor drags the area away from the host
	sync_(t, r)
	if !has(host.take(), func(v AreaVariableChanged) bool { return v.Variable.Key == "lock" && v.Variable.Value == "false" }) {
		t.Fatal("nobody is left in the area: it unlocks")
	}
}

func TestAFullAreaHasRoomAgainWhenSomeoneLeaves(t *testing.T) {
	r := NewRoom("http://play/~/maps/empty.wam", cfg)
	defer r.Stop()
	one := 1
	booth := []Area{{ID: "booth", X: 0, Y: 0, Width: 100, Height: 100, Properties: []AreaProperty{{ID: "cap", Type: maxUsersCap, MaxUsers: &one}}}}
	alice, bob := &recorder{}, &recorder{}
	connect(t, r, alice, booth)
	connect(t, r, bob, nil)
	_ = r.Join(ctx, alice, JoinRequest{UUID: "alice", Name: "alice", Position: at(50, 50), Viewport: wholeMap})
	_ = r.Join(ctx, bob, JoinRequest{UUID: "bob", Name: "bob", Position: at(500, 500), Viewport: wholeMap})
	sync_(t, r)
	full := func(value string) func(AreaVariableChanged) bool {
		return func(v AreaVariableChanged) bool {
			return v.Variable.Key == "maxUsersReached" && v.Variable.Value == value
		}
	}
	if !has(bob.take(), full("true")) {
		t.Fatal("one person fills the booth: everybody is told")
	}
	_ = r.Move(ctx, alice, at(300, 300), nil)
	sync_(t, r)
	if !has(bob.take(), full("false")) {
		t.Fatal("alice left the booth: there is room again")
	}
}

func TestOnlyTheAllowedTagsLockAnArea(t *testing.T) {
	r := NewRoom("http://play/~/maps/empty.wam", cfg)
	defer r.Stop()
	areas := []Area{{ID: "meeting", X: 0, Y: 0, Width: 100, Height: 100, Properties: []AreaProperty{{ID: "lock", Type: lockable, AllowedTags: []string{"staff"}}}}}
	guest, staff := &recorder{}, &recorder{}
	connect(t, r, guest, areas)
	connect(t, r, staff, nil)
	_ = r.Join(ctx, guest, JoinRequest{UUID: "guest", Name: "guest", Position: at(10, 10), Viewport: wholeMap})
	_ = r.Join(ctx, staff, JoinRequest{UUID: "staff", Name: "staff", Position: at(20, 20), Viewport: wholeMap})
	lock := AreaVariable{AreaID: "meeting", PropertyID: "lock", Key: "lock", Value: "true"}
	_ = r.SetAreaVariable(ctx, guest, lock, []string{"member"})
	_ = r.SetAreaVariable(ctx, staff, AreaVariable{AreaID: "meeting", PropertyID: "lock", Key: "colour", Value: "red"}, []string{"staff"})
	sync_(t, r)
	if has(guest.take(), any_[AreaVariableChanged]) {
		t.Fatal("a guest does not lock, and only the lock is a variable a player sets")
	}
	_ = r.SetAreaVariable(ctx, staff, lock, []string{"staff"})
	sync_(t, r)
	if !has(guest.take(), func(v AreaVariableChanged) bool { return v.Variable.Value == "true" }) {
		t.Fatal("the staff locks it")
	}
}
