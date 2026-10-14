package core

import "testing"

func connect(t *testing.T, r *Room, p *recorder, areas []Area) {
	t.Helper()
	if err := r.Connect(ctx, p, func() []Area { return areas }, func() any { return "connected" }); err != nil {
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
	_ = r.EditMap(ctx, editor, func() (any, any, []Area) { return "edit", nil, []Area{} })
	_ = r.EditMap(ctx, editor, func() (any, any, []Area) { return nil, "refused", nil })
	sync_(t, r)
	if ev := newcomer.take(); len(ev) != 2 || ev[0] != "connected" || ev[1] != (MapEdit{Event: "edit"}) {
		t.Fatalf("a connection that has not joined yet gets the edits, not the refusals: %#v", ev)
	}
	if !has(editor.take(), func(e MapEdit) bool { return e.Event == "refused" }) {
		t.Fatal("the editor gets its refusal")
	}
}
