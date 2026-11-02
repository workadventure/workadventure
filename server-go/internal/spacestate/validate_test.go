package spacestate

import (
	"strings"
	"testing"
)

// What the old generator checked, now the exported schema's: a state the front would refuse is refused here.
func TestAStateTheFrontRefusesIsRefused(t *testing.T) {
	ok := Empty()
	if err := ok.Validate(); err != nil {
		t.Fatalf("the empty state: %v", err)
	}
	nullHands := Empty()
	nullHands.RaisedHands = nil // null, not []: zod refuses it
	if nullHands.Validate() == nil {
		t.Fatal("a null collection passes")
	}
	noID := Empty()
	noID.RaisedHands = []RaisedHandEntry{{SpaceUserID: "", Name: "x", At: 1}}
	if noID.Validate() == nil {
		t.Fatal("an empty spaceUserId passes (zod: min(1))")
	}
	if SpaceKind("nope").Validate() == nil || SpaceKindBubble.Validate() != nil {
		t.Fatal("the space kinds")
	}
}

// A poll question at zod's maximum, written with emojis outside the BMP (2 UTF-16 units each): zod counts units,
// so does the schema here; JSON Schema's maxLength would count code points and accept twice as many.
func TestAPollQuestionLengthCountsUTF16Units(t *testing.T) {
	st := Empty()
	st.Polls["p"] = ProximityPoll{ID: "p", Kind: ProximityPollKindOpen, Question: strings.Repeat("😀", 300), SenderID: "s",
		Answers: []ProximityPollAnswer{{ID: "a", Text: "a"}, {ID: "b", Text: "b"}}, MaxSelections: 1, Votes: map[string]ProximityPollVote{}}
	if st.Validate() == nil {
		t.Fatal("300 emojis (600 units) pass a question that zod limits")
	}
}
