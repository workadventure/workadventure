package core

import (
	"encoding/json"
	"strings"
	"testing"
)

func joinFiltered(t *testing.T, sp *Space, p *recorder, u SpaceUser, f FilterType) {
	t.Helper()
	if err := sp.Join(ctx, p, SpaceJoin{User: u, Filter: f, PropertiesToSync: media}, func(error) {}); err != nil {
		t.Fatal(err)
	}
}

func megaphone(on bool) SpaceUser { return SpaceUser{Megaphone: on} }

func TestLiveStreamingShowsOnlyStreamers(t *testing.T) {
	sp := NewSpace(SpaceKey{"http://play.test", "stream"})
	defer sp.Stop()
	alice, bob := &recorder{}, &recorder{}
	joinFiltered(t, sp, alice, SpaceUser{ID: "alice"}, FilterLiveStreamingUsers)
	_ = sp.Watch(ctx, "alice", nil)
	joinFiltered(t, sp, bob, SpaceUser{ID: "bob"}, FilterLiveStreamingUsers)
	_ = sp.Watch(ctx, "bob", nil)
	syncSpace(t, sp)
	if ev := alice.take(); !has(ev, func(i SpaceUsersInit) bool { return len(i.Users) == 0 }) || has(ev, any_[SpaceUserAdded]) ||
		has(ev, func(p SpacePrivateEvent) bool { _, ok := p.Event.(WebRTCStart); return ok }) {
		t.Fatalf("nobody streams: nothing to see, nobody to call: %#v", ev)
	}

	_ = sp.UpdateUser(ctx, "bob", megaphone(true), []string{"megaphoneState"})
	syncSpace(t, sp)
	if ev := alice.take(); !has(ev, func(a SpaceUserAdded) bool { return a.User.ID == "bob" }) ||
		!has(ev, func(p SpacePrivateEvent) bool { _, ok := p.Event.(WebRTCStart); return ok }) {
		t.Fatalf("a streamer appears and calls the watchers: %#v", ev)
	}
	_ = sp.UpdateUser(ctx, "bob", SpaceUser{Megaphone: true, CameraState: true}, []string{"cameraState"})
	syncSpace(t, sp)
	if !has(alice.take(), func(u SpaceUserUpdated) bool { return u.User.ID == "bob" && u.Mask[0] == "cameraState" }) {
		t.Fatal("a visible streamer is updated")
	}
	bob.take()
	_ = sp.UpdateUser(ctx, "bob", megaphone(false), []string{"megaphoneState"})
	syncSpace(t, sp)
	// Alice's front closes its peer when Bob leaves its list; Bob is told.
	if ev := alice.take(); !has(ev, func(r SpaceUserRemoved) bool { return r.UserID == "bob" }) {
		t.Fatalf("a streamer who stops disappears: %#v", ev)
	}
	if !has(bob.take(), func(p SpacePrivateEvent) bool { e, ok := p.Event.(WebRTCDisconnect); return ok && e.UserID == "alice" }) {
		t.Fatal("and hangs up")
	}
}

func TestFeedbackListenersSeeSpeakersOnly(t *testing.T) {
	sp := NewSpace(SpaceKey{"http://play.test", "podium"})
	defer sp.Stop()
	speaker, listener, other := &recorder{}, &recorder{}, &recorder{}
	for id, p := range map[string]*recorder{"speaker": speaker, "listener": listener, "other": other} {
		joinFiltered(t, sp, p, SpaceUser{ID: id}, FilterLiveStreamingUsersWithFeedback)
		_ = sp.Watch(ctx, id, nil)
	}
	_ = sp.UpdateUser(ctx, "listener", SpaceUser{AttendeesState: true}, []string{"attendeesState"})
	syncSpace(t, sp)
	if has(other.take(), any_[SpaceUserAdded]) {
		t.Fatal("listeners only show to speakers")
	}
	_ = sp.UpdateUser(ctx, "speaker", megaphone(true), []string{"megaphoneState"})
	syncSpace(t, sp)
	if !has(other.take(), func(a SpaceUserAdded) bool { return a.User.ID == "speaker" }) || !has(listener.take(), func(a SpaceUserAdded) bool { return a.User.ID == "speaker" }) {
		t.Fatal("everybody sees a speaker")
	}
	if ev := speaker.take(); !has(ev, func(a SpaceUserAdded) bool { return a.User.ID == "listener" }) || has(ev, func(a SpaceUserAdded) bool { return a.User.ID == "other" }) {
		t.Fatalf("becoming a speaker shows the listeners, not the others: %#v", ev)
	}
}

func TestMetadataGoesToEveryMemberAndToNewWatchers(t *testing.T) {
	sp := NewSpace(SpaceKey{"http://play.test", "meta"})
	defer sp.Stop()
	alice, bob := &recorder{}, &recorder{}
	joinSpace(t, sp, alice, "alice")
	_ = sp.SetMetadata(ctx, "alice", map[string]json.RawMessage{"hello": json.RawMessage(`"world"`)})
	_ = sp.SetMetadata(ctx, "stranger", map[string]json.RawMessage{"x": json.RawMessage(`1`)})
	joinSpace(t, sp, bob, "bob")
	_ = sp.Watch(ctx, "bob", nil)
	syncSpace(t, sp)
	if !has(alice.take(), func(m SpaceMetadataUpdated) bool { return m.Metadata == `{"hello":"world"}` }) {
		t.Fatal("the sender gets its change too")
	}
	if !has(bob.take(), func(i SpaceUsersInit) bool { return i.Metadata == `{"hello":"world"}` }) {
		t.Fatal("a new watcher gets the metadata, without the stranger's")
	}
}

func query(t *testing.T, sp *Space, id string, q any) error {
	t.Helper()
	res := make(chan error, 1)
	if err := sp.Query(ctx, id, q, func(err error) { res <- err }); err != nil {
		t.Fatal(err)
	}
	return <-res
}

func lastPatch(t *testing.T, p *recorder) string {
	t.Helper()
	patch := ""
	for _, e := range p.take() {
		if s, ok := e.(SpaceStatePatch); ok {
			patch = s.Patch
		}
	}
	return patch
}

func TestRaiseHandAndFloor(t *testing.T) {
	sp := NewSpace(SpaceKey{"http://play.test", "stage"})
	defer sp.Stop()
	host, guest, admin := &recorder{}, &recorder{}, &recorder{}
	joinFiltered(t, sp, host, SpaceUser{ID: "host", Name: "Host"}, FilterLiveStreamingUsers)
	joinFiltered(t, sp, guest, SpaceUser{ID: "guest", Name: "Guest"}, FilterLiveStreamingUsers)
	joinFiltered(t, sp, admin, SpaceUser{ID: "admin", Tags: []string{"admin"}}, FilterLiveStreamingUsers)
	_ = sp.UpdateUser(ctx, "host", megaphone(true), []string{"megaphoneState"})

	if err := query(t, sp, "guest", RaiseHand{Raised: true}); err != nil {
		t.Fatal(err)
	}
	if p := lastPatch(t, admin); !strings.Contains(p, `"path":"/raisedHands"`) || !strings.Contains(p, `"spaceUserId":"guest","name":"Guest"`) {
		t.Fatalf("every member gets the raised hand: %s", p)
	}
	if query(t, sp, "guest", LowerHand{Target: "guest"}) == nil {
		t.Fatal("a listener cannot moderate")
	}
	if err := query(t, sp, "host", GiveFloor{Target: "guest"}); err != nil {
		t.Fatal(err)
	}
	if p := lastPatch(t, guest); !strings.Contains(p, `{"op":"replace","path":"/floorHolders","value":[{"spaceUserId":"guest","name":"Guest"}]}`) ||
		!strings.Contains(p, `{"op":"replace","path":"/raisedHands","value":[]}`) {
		t.Fatalf("the floor goes to the guest, whose hand goes down: %s", p)
	}
	_ = sp.UpdateUser(ctx, "guest", megaphone(true), []string{"megaphoneState"})
	if query(t, sp, "guest", LowerHand{Target: "admin"}) == nil {
		t.Fatal("a promoted guest cannot moderate")
	}
	_ = sp.UpdateUser(ctx, "guest", megaphone(false), []string{"megaphoneState"})
	syncSpace(t, sp)
	if p := lastPatch(t, admin); p != `[{"op":"replace","path":"/floorHolders","value":[]}]` {
		t.Fatalf("a floor holder who stops streaming loses the floor: %s", p)
	}
	if err := query(t, sp, "admin", RaiseHand{Raised: true}); err != nil {
		t.Fatal(err)
	}
	_ = sp.Leave(ctx, "admin", nil)
	syncSpace(t, sp)
	if p := lastPatch(t, host); p != `[{"op":"replace","path":"/raisedHands","value":[]}]` {
		t.Fatalf("leaving lowers the hand: %s", p)
	}
	if err := query(t, sp, "host", SetKind{Kind: "megaphone"}); err != nil || lastPatch(t, host) != `[{"op":"add","path":"/kind","value":"megaphone"}]` {
		t.Fatalf("kind: %v", err)
	}
	if query(t, sp, "host", SetKind{Kind: "stadium"}) == nil {
		t.Fatal("a kind outside the enum is refused")
	}
}

func TestPollsAndQuestions(t *testing.T) {
	sp := NewSpace(SpaceKey{"http://play.test", "bubble"})
	defer sp.Stop()
	alice, bob := &recorder{}, &recorder{}
	joinSpace(t, sp, alice, "alice")
	joinSpace(t, sp, bob, "bob")
	if query(t, sp, "alice", CreatePoll{Question: strings.Repeat("é", 341), Kind: "open", Answers: []string{"a", "b"}, MaxSelections: 1}) == nil {
		t.Fatal("the schema's limits apply")
	}
	if query(t, sp, "alice", CreatePoll{Question: "Lunch?", Kind: "open", Answers: []string{"a", "b"}, MaxSelections: 3}) == nil {
		t.Fatal("more selections than answers")
	}
	bob.take()
	if err := query(t, sp, "alice", CreatePoll{Question: "Lunch?", Kind: "open", Answers: []string{"pizza", "sushi"}, MaxSelections: 1}); err != nil {
		t.Fatal(err)
	}
	var state struct {
		Value map[string]struct {
			ID      string `json:"id"`
			Answers []struct {
				ID string `json:"id"`
			} `json:"answers"`
		} `json:"value"`
	}
	var ops []json.RawMessage
	_ = json.Unmarshal([]byte(lastPatch(t, bob)), &ops)
	_ = json.Unmarshal(ops[0], &state)
	var pollID, answerID string
	for id, p := range state.Value {
		pollID, answerID = id, p.Answers[1].ID
	}
	if err := query(t, sp, "bob", VotePoll{PollID: pollID, AnswerIDs: []string{answerID}}); err != nil {
		t.Fatal(err)
	}
	if query(t, sp, "bob", VotePoll{PollID: pollID, AnswerIDs: []string{"forged"}}) == nil {
		t.Fatal("a vote for an answer of another poll")
	}
	if query(t, sp, "bob", ClosePoll{PollID: pollID}) == nil {
		t.Fatal("only the creator closes a poll")
	}
	if err := query(t, sp, "alice", ClosePoll{PollID: pollID}); err != nil {
		t.Fatal(err)
	}
	if query(t, sp, "bob", VotePoll{PollID: pollID, AnswerIDs: nil}) == nil {
		t.Fatal("no vote on a closed poll")
	}

	if err := query(t, sp, "bob", AskQuestion{Body: "Why?"}); err != nil {
		t.Fatal(err)
	}
	if query(t, sp, "bob", AnswerQuestion{QuestionID: "x"}) == nil || query(t, sp, "alice", DeleteQuestion{QuestionID: "x"}) == nil {
		t.Fatal("unknown question")
	}
	if query(t, sp, "alice", RaiseHand{Raised: true}) != nil || query(t, sp, "alice", LowerHand{Target: "alice"}) != nil {
		t.Fatal("anyone moderates a proximity space")
	}
	if query(t, sp, "stranger", RaiseHand{Raised: true}) == nil {
		t.Fatal("a stranger cannot query")
	}
}

// A listener's front closes its peer with a speaker who goes back to listening (the speaker leaves its list): the
// server must forget that connection and open a new one when the speaker comes back.
func TestASpeakerBackOnStageGetsANewConnection(t *testing.T) {
	sp := NewSpace(SpaceKey{"http://play.test", "auditorium"})
	defer sp.Stop()
	a, c, d := &recorder{}, &recorder{}, &recorder{}
	for id, p := range map[string]*recorder{"a": a, "c": c, "d": d} {
		joinFiltered(t, sp, p, SpaceUser{ID: id}, FilterLiveStreamingUsersWithFeedback)
		_ = sp.Watch(ctx, id, nil)
	}
	listener := SpaceUser{AttendeesState: true}
	_ = sp.UpdateUser(ctx, "c", megaphone(true), []string{"megaphoneState"})
	_ = sp.UpdateUser(ctx, "a", listener, []string{"attendeesState"})
	_ = sp.UpdateUser(ctx, "d", listener, []string{"attendeesState"})
	_ = sp.UpdateUser(ctx, "a", SpaceUser{Megaphone: true, AttendeesState: true}, []string{"megaphoneState"})
	syncSpace(t, sp)
	d.take()
	a.take()

	_ = sp.UpdateUser(ctx, "a", listener, []string{"megaphoneState"})
	syncSpace(t, sp)
	// Both are still in the filter: the connection d's front just closed is opened again.
	if ev := d.take(); !has(ev, func(r SpaceUserRemoved) bool { return r.UserID == "a" }) ||
		!has(ev, func(p SpacePrivateEvent) bool { e, ok := p.Event.(WebRTCStart); return ok && e.UserID == "a" }) {
		t.Fatalf("d no longer lists a, and gets a new connection with it: %#v", ev)
	}
	ev := a.take()
	if !has(ev, func(p SpacePrivateEvent) bool { e, ok := p.Event.(WebRTCDisconnect); return ok && e.UserID == "d" }) ||
		!has(ev, func(p SpacePrivateEvent) bool { e, ok := p.Event.(WebRTCStart); return ok && e.UserID == "d" }) {
		t.Fatalf("a drops the old connection with d and starts the new one: %#v", ev)
	}

	_ = sp.UpdateUser(ctx, "a", SpaceUser{Megaphone: true, AttendeesState: true}, []string{"megaphoneState"})
	syncSpace(t, sp)
	if ev := d.take(); !has(ev, func(x SpaceUserAdded) bool { return x.User.ID == "a" }) {
		t.Fatalf("d lists a again, over the live connection: %#v", ev)
	}
}
