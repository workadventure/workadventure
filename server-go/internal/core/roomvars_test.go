package core

import (
	"testing"
	"time"
)

func TestRoomVariables(t *testing.T) {
	r := NewRoom("http://play/_/global/maps/m.json", cfg)
	defer r.Stop()
	saved := map[string]string{}
	r.InitVariables(ctx, func() RoomVariables {
		return RoomVariables{
			Defs:   map[string]VarDef{"door": {Persist: true}, "secret": {ReadableBy: "admin", WritableBy: "admin"}},
			Values: map[string]string{"door": `"closed"`, "secret": `"42"`},
			Save:   func(name, value string) { saved[name] = value },
		}
	})
	admin, guest := &recorder{}, &recorder{}
	_ = r.Join(ctx, admin, JoinRequest{UUID: "admin", Name: "admin", Tags: []string{"admin"}, Position: at(0, 0), Viewport: wholeMap})
	_ = r.Join(ctx, guest, JoinRequest{UUID: "guest", Name: "guest", Position: at(900, 900), Viewport: wholeMap,
		PlayerVariables: []StoredVariable{{Name: "score", Value: "3", Public: true}}})
	sync_(t, r)
	if !has(guest.take(), func(j RoomJoined) bool {
		return len(j.RoomVariables) == 1 && j.RoomVariables[0].Name == "door" && len(j.PlayerVariables) == 1
	}) {
		t.Fatal("a guest reads what it may, and gets its stored variables back")
	}
	if !has(admin.take(), func(j UserJoined) bool { return j.User.Variables["score"] == "3" }) {
		t.Fatal("its public variables show to the others")
	}
	done := func(bool) {}
	_ = r.SetVariable(ctx, guest, Variable{Name: "secret", Value: `"0"`}, nil, true, done)
	_ = r.SetVariable(ctx, guest, Variable{Name: "door", Value: `"open"`}, nil, true, done)
	sync_(t, r)
	if !has(guest.take(), any_[RoomError]) || saved["door"] != `"open"` || has(admin.take(), func(v VariableChanged) bool { return v.Name == "secret" }) {
		t.Fatal("not writable by a guest; a persistent variable is kept")
	}
	_ = r.SetVariable(ctx, admin, Variable{Name: "secret", Value: `"1"`}, []string{"admin"}, true, done)
	sync_(t, r)
	if has(guest.take(), any_[VariableChanged]) || !has(admin.take(), func(v VariableChanged) bool { return v.Name == "secret" }) {
		t.Fatal("readable by admins only")
	}
	stale := make(chan bool, 1)
	r.s.varsAt = time.Now().Add(-time.Minute) // the map was read a while ago
	_ = r.SetVariable(ctx, guest, Variable{Name: "new", Value: "1"}, nil, true, func(s bool) { stale <- s })
	if !<-stale {
		t.Fatal("an undeclared variable on an old map asks for the map again")
	}
}

func TestMeetingInvitations(t *testing.T) {
	r := NewRoom("http://play/_/global/maps/m.json", cfg)
	defer r.Stop()
	alice := join(t, r, "alice", at(0, 0), wholeMap)
	bob := join(t, r, "bob", at(900, 900), wholeMap)
	for i := 0; i < 5; i++ {
		_ = r.InviteToMeeting(ctx, alice, "bob", false)
	}
	sync_(t, r)
	got := 0
	for _, e := range bob.take() {
		if _, ok := e.(InvitationReceived); ok {
			got++
		}
	}
	if got != 4 || !has(alice.take(), any_[InvitationTooHigh]) {
		t.Fatalf("the fifth invitation to the same player is refused: %d received", got)
	}
	_ = r.AnswerMeetingInvitation(ctx, bob, true, "alice")
	sync_(t, r)
	if !has(alice.take(), func(a InvitationAnswered) bool { return a.Accepted && a.ResponderName == "bob" }) {
		t.Fatal("the inviter learns the answer")
	}
}
