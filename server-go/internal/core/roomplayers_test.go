package core

import "testing"

func TestEjectRemovesEveryTabOfThePlayer(t *testing.T) {
	r := NewRoom("http://play/_/global/maps/empty.json", cfg)
	defer r.Stop()
	alice := join(t, r, "alice", at(100, 100), wholeMap)
	tab2 := &recorder{}
	_ = r.Join(ctx, tab2, JoinRequest{UUID: "alice", TabID: "tab2", Name: "alice", Position: at(100, 100), Viewport: wholeMap})
	bob := join(t, r, "bob", at(500, 500), wholeMap)
	_ = r.Eject(ctx, "alice", "kicked", "Too loud")
	if st := sync_(t, r); st.Users != 1 {
		t.Fatalf("both tabs leave: %+v", st)
	}
	for _, p := range []*recorder{alice, tab2} {
		if !has(p.take(), func(e Ejected) bool { return e.Type == "kicked" && e.Message == "Too loud" }) || p.kicked != "User was kicked: Too loud" {
			t.Fatal("the player is told why, then closed")
		}
	}
	if !has(bob.take(), any_[UserLeft]) {
		t.Fatal("the others see it leave")
	}
}

func TestEventsGoToEveryoneOrToTargets(t *testing.T) {
	r := NewRoom("http://play/_/global/maps/empty.json", cfg)
	defer r.Stop()
	a, b := &recorder{}, &recorder{}
	connect(t, r, a, nil)
	connect(t, r, b, nil)
	_ = r.Join(ctx, a, JoinRequest{UUID: "a", Name: "a", Position: at(0, 0), Viewport: wholeMap})
	_ = r.Join(ctx, b, JoinRequest{UUID: "b", Name: "b", Position: at(900, 900), Viewport: wholeMap})
	sync_(t, r)
	a.take()
	b.take()
	_ = r.SendEvent(ctx, NewMsg("broadcast", true), nil)
	_ = r.SendEvent(ctx, NewMsg("to b", true), []int32{3, 99}) // ids start at 2
	sync_(t, r)
	if ev := a.take(); len(ev) != 1 || ev[0] != "broadcast" {
		t.Fatalf("the sender gets its own broadcast: %#v", ev)
	}
	if ev := b.take(); len(ev) != 2 {
		t.Fatalf("a target gets both: %#v", ev)
	}
}

func TestFollowMode(t *testing.T) {
	r := NewRoom("http://play/_/global/maps/empty.json", cfg)
	defer r.Stop()
	alice := join(t, r, "alice", at(100, 100), wholeMap)
	bob := join(t, r, "bob", at(110, 100), wholeMap)
	far := join(t, r, "far", at(900, 900), wholeMap)
	sync_(t, r)
	alice.take()
	bob.take()
	_ = r.FollowRequest(ctx, alice, true)
	sync_(t, r)
	if !has(bob.take(), func(f FollowRequested) bool { return f.Leader == 2 && f.Force }) || has(far.take(), any_[FollowRequested]) {
		t.Fatal("the request goes to the bubble only")
	}
	_ = r.FollowConfirm(ctx, bob, 2)
	sync_(t, r)
	if !has(alice.take(), func(f FollowConfirmed) bool { return f.Leader == 2 && f.Follower == 3 }) {
		t.Fatal("the leader learns who follows it")
	}
	_ = r.FollowAbort(ctx, alice, 2, 0)
	sync_(t, r)
	if !has(bob.take(), func(f FollowAborted) bool { return f.Leader == 2 && f.Follower == 3 }) {
		t.Fatal("the follower is told the leader stopped")
	}
	_ = r.FollowConfirm(ctx, bob, 2)
	_ = r.Leave(ctx, alice)
	sync_(t, r)
	if !has(bob.take(), func(f FollowAborted) bool { return f.Leader == 2 }) {
		t.Fatal("a leader who leaves frees its followers")
	}
}
