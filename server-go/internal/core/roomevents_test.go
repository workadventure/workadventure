package core

import "testing"

func TestAnEmoteReachesThoseWhoSeeTheSenderAndOnlyIfItIsAnEmoji(t *testing.T) {
	r := NewRoom("http://play/_/global/maps/m.json", cfg)
	defer r.Stop()
	alice := join(t, r, "alice", at(100, 100), Viewport{Right: 400, Bottom: 400})
	near := join(t, r, "near", at(200, 200), Viewport{Right: 400, Bottom: 400})
	far := join(t, r, "far", at(1900, 1900), Viewport{Left: 1600, Top: 1600, Right: 2000, Bottom: 2000})
	sync_(t, r)
	near.take()
	far.take()
	for _, e := range []string{"👍", "👩🏽‍💻", "🇫🇷", "hello", "<script>", ""} {
		_ = r.Emote(ctx, alice, e)
	}
	sync_(t, r)
	got := []string{}
	for _, e := range near.take() {
		if em, ok := e.(EmoteEvent); ok {
			got = append(got, em.Emote)
		}
	}
	if len(got) != 3 || got[0] != "👍" || got[1] != "👩🏽‍💻" || got[2] != "🇫🇷" {
		t.Fatalf("emojis only, skin tones, joiners and flags included: %q", got)
	}
	if has(far.take(), any_[EmoteEvent]) {
		t.Fatal("a player who does not see alice's zone gets none")
	}
}

func TestANewcomerGetsTheStateOfTheInteractiveObjects(t *testing.T) {
	r := NewRoom("http://play/_/global/maps/m.json", cfg)
	defer r.Stop()
	alice := join(t, r, "alice", at(100, 100), wholeMap)
	_ = r.ItemEvent(ctx, ItemState{ItemID: 7, StateJSON: `{"on":true}`}, NewMsg("switched", true))
	sync_(t, r)
	if !has(alice.take(), func(s string) bool { return s == "switched" }) {
		t.Fatal("the room hears the event")
	}
	late := join(t, r, "late", at(100, 100), wholeMap)
	sync_(t, r)
	if !has(late.take(), func(j RoomJoined) bool { return len(j.Items) == 1 && j.Items[0].StateJSON == `{"on":true}` }) {
		t.Fatal("the last state comes with the join")
	}
}
