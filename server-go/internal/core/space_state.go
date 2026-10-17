package core

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"sort"
	"time"
	"unicode/utf16"

	"github.com/workadventure/workadventure/server-go/internal/spacestate"
)

// State queries (SpaceStateQuery in messages.proto): a client asks, the space checks, changes its state and sends
// the difference to every member as a JSON Patch.
type (
	SetKind     struct{ Kind string }
	RaiseHand   struct{ Raised bool }
	LowerHand   struct{ Target string }
	GiveFloor   struct{ Target string }
	RevokeFloor struct{ Target string }
	CreatePoll  struct {
		Question, Kind string
		Answers        []string
		MaxSelections  int32
	}
	VotePoll struct {
		PollID    string
		AnswerIDs []string
	}
	ClosePoll struct {
		PollID         string
		ClosingMessage *string
	}
	DeletePoll     struct{ PollID string }
	AskQuestion    struct{ Body string }
	UpvoteQuestion struct {
		QuestionID string
		Upvoted    bool
	}
	AnswerQuestion struct{ QuestionID string }
	DeleteQuestion struct{ QuestionID string }
	StartRecording struct{}
	StopRecording  struct{}
)

// senderNameMaxLength is PROXIMITY_POLL_SENDER_NAME_MAX_LENGTH and PROXIMITY_QA_SENDER_NAME_MAX_LENGTH.
const senderNameMaxLength = 256

var ErrNoRecording = errors.New("Recording is not available on this server")

// Query runs a state query of member userID. reply runs on the space's goroutine, after the patch was sent: when
// the sender reads the answer, its copy of the state already has the change.
func (sp *Space) Query(ctx context.Context, userID string, q any, reply func(error)) error {
	return sp.a.Post(ctx, func() {
		sender := sp.s.members[userID]
		if sender == nil {
			reply(fmt.Errorf("Could not find user %s in space %s", userID, sp.Key.Local))
			return
		}
		if _, ok := q.(StartRecording); ok {
			sp.s.startRecording(&sender.user, reply) // answered once the egress runs
			return
		}
		reply(sp.s.query(&sender.user, q))
	})
}

// query runs a space state query of sender (raised hands, floor, polls, questions, kind, recording): one method each.
func (s *spaceState) query(sender *SpaceUser, q any) error {
	switch q := q.(type) {
	case SetKind:
		return s.setKind(sender, q)
	case RaiseHand:
		return s.raiseHand(sender, q)
	case LowerHand:
		return s.lowerHand(sender, q)
	case GiveFloor:
		return s.giveFloor(sender, q)
	case RevokeFloor:
		return s.revokeFloor(sender, q)
	case CreatePoll:
		return s.createPoll(sender, q)
	case VotePoll:
		return s.votePoll(sender, q)
	case ClosePoll:
		return s.closePoll(sender, q)
	case DeletePoll:
		return s.deletePoll(sender, q)
	case AskQuestion:
		return s.askQuestion(sender, q)
	case UpvoteQuestion:
		return s.upvoteQuestion(sender, q)
	case AnswerQuestion:
		return s.answerQuestion(sender, q)
	case DeleteQuestion:
		return s.deleteQuestion(sender, q)
	case StopRecording:
		return s.stopRecording(sender)
	}
	return fmt.Errorf("unknown space state query %T", q)
}

func (s *spaceState) setKind(_ *SpaceUser, q SetKind) error {
	kind := spacestate.SpaceKind(q.Kind)
	if err := kind.Validate(); err != nil {
		return err
	}
	if err := s.updateState(func(st *spacestate.SpaceState) error { st.Kind = &kind; return nil }); err != nil {
		return err
	}
	if s.meeting != nil {
		s.meeting.KindChanged()
	}
	return nil
}

func (s *spaceState) raiseHand(sender *SpaceUser, q RaiseHand) error {
	return s.updateState(func(st *spacestate.SpaceState) error {
		if !q.Raised {
			st.RaisedHands = removeHand(st.RaisedHands, sender.ID)
		} else if !slices.ContainsFunc(st.RaisedHands, func(e spacestate.RaisedHandEntry) bool { return e.SpaceUserID == sender.ID }) {
			st.RaisedHands = append(st.RaisedHands, spacestate.RaisedHandEntry{SpaceUserID: sender.ID, Name: sender.Name, At: now()})
		}
		return nil
	})
}

func (s *spaceState) lowerHand(sender *SpaceUser, q LowerHand) error {
	if err := s.canModerate(sender); err != nil {
		return err
	}
	return s.updateState(func(st *spacestate.SpaceState) error {
		st.RaisedHands = removeHand(st.RaisedHands, q.Target)
		return nil
	})
}

func (s *spaceState) giveFloor(sender *SpaceUser, q GiveFloor) error {
	if err := s.canModerate(sender); err != nil {
		return err
	}
	target := s.members[q.Target]
	if target == nil {
		return fmt.Errorf("User %s is not in the space", q.Target)
	}
	return s.updateState(func(st *spacestate.SpaceState) error {
		st.RaisedHands = removeHand(st.RaisedHands, q.Target)
		// In a proximity (ALL_USERS) space everyone already speaks: there is no floor to hold.
		if s.filter != FilterAllUsers && !slices.ContainsFunc(st.FloorHolders, func(e spacestate.FloorHolderEntry) bool { return e.SpaceUserID == q.Target }) {
			st.FloorHolders = append(st.FloorHolders, spacestate.FloorHolderEntry{SpaceUserID: q.Target, Name: target.user.Name})
		}
		return nil
	})
}

func (s *spaceState) revokeFloor(sender *SpaceUser, q RevokeFloor) error {
	if q.Target != sender.ID {
		if err := s.canModerate(sender); err != nil {
			return err
		}
	}
	return s.updateState(func(st *spacestate.SpaceState) error {
		st.FloorHolders = removeFloorHolder(st.FloorHolders, q.Target)
		return nil
	})
}

func (s *spaceState) createPoll(sender *SpaceUser, q CreatePoll) error {
	return s.updateState(func(st *spacestate.SpaceState) error {
		if int(q.MaxSelections) > len(q.Answers) {
			return errors.New("A poll cannot allow more selections than it has answers")
		}
		answers := make([]spacestate.ProximityPollAnswer, len(q.Answers))
		for i, text := range q.Answers {
			answers[i] = spacestate.ProximityPollAnswer{ID: newUUID(), Text: text}
		}
		name := truncateJS(sender.Name, senderNameMaxLength)
		poll := spacestate.ProximityPoll{ID: newUUID(), Question: q.Question, Kind: spacestate.ProximityPollKind(q.Kind), Answers: answers,
			MaxSelections: int64(q.MaxSelections), SenderID: voterID(sender), SenderName: &name, CreatedAt: now(),
			Votes: map[string]spacestate.ProximityPollVote{}}
		st.Polls[poll.ID] = poll
		return nil
	})
}

func (s *spaceState) votePoll(sender *SpaceUser, q VotePoll) error {
	return s.updateState(func(st *spacestate.SpaceState) error {
		poll, ok := st.Polls[q.PollID]
		switch {
		case !ok:
			return fmt.Errorf("Poll %s does not exist in this space", q.PollID)
		case poll.End != nil:
			return errors.New("This poll is closed")
		case int64(len(q.AnswerIDs)) > poll.MaxSelections:
			return errors.New("Poll vote selects more answers than the poll allows")
		}
		for _, id := range q.AnswerIDs {
			if !slices.ContainsFunc(poll.Answers, func(a spacestate.ProximityPollAnswer) bool { return a.ID == id }) {
				return errors.New("Poll vote references answers that do not belong to the poll")
			}
		}
		if len(q.AnswerIDs) == 0 {
			delete(poll.Votes, voterID(sender))
		} else {
			poll.Votes[voterID(sender)] = spacestate.ProximityPollVote{AnswerIDs: slices.Clone(q.AnswerIDs), UpdatedAt: now()}
		}
		return nil
	})
}

func (s *spaceState) closePoll(sender *SpaceUser, q ClosePoll) error {
	return s.updateState(func(st *spacestate.SpaceState) error {
		poll, err := ownPoll(st, q.PollID, sender, "Only poll creators can close a poll")
		if err != nil || poll.End != nil {
			return err
		}
		poll.End = &spacestate.ProximityPollEnd{ClosingMessage: q.ClosingMessage, ClosedAt: now()}
		st.Polls[q.PollID] = poll
		return nil
	})
}

func (s *spaceState) deletePoll(sender *SpaceUser, q DeletePoll) error {
	return s.updateState(func(st *spacestate.SpaceState) error {
		if _, err := ownPoll(st, q.PollID, sender, "Only poll creators can delete a poll"); err != nil {
			return err
		}
		delete(st.Polls, q.PollID)
		return nil
	})
}

func (s *spaceState) askQuestion(sender *SpaceUser, q AskQuestion) error {
	return s.updateState(func(st *spacestate.SpaceState) error {
		name := truncateJS(sender.Name, senderNameMaxLength)
		question := spacestate.ProximityQuestion{ID: newUUID(), Body: q.Body, SenderID: voterID(sender), SenderName: &name,
			CreatedAt: now(), Upvotes: map[string]int64{}}
		st.Questions[question.ID] = question
		return nil
	})
}

func (s *spaceState) upvoteQuestion(sender *SpaceUser, q UpvoteQuestion) error {
	return s.updateState(func(st *spacestate.SpaceState) error {
		question, ok := st.Questions[q.QuestionID]
		switch {
		case !ok:
			return fmt.Errorf("Question %s does not exist in this space", q.QuestionID)
		case question.SenderID == voterID(sender):
			return errors.New("Question authors cannot upvote their own question")
		case question.Answer != nil:
			return errors.New("This question has already been answered")
		}
		if _, already := question.Upvotes[voterID(sender)]; q.Upvoted && !already {
			question.Upvotes[voterID(sender)] = now()
		} else if !q.Upvoted {
			delete(question.Upvotes, voterID(sender))
		}
		return nil
	})
}

func (s *spaceState) answerQuestion(sender *SpaceUser, q AnswerQuestion) error {
	if !isAdmin(sender) && !sender.Megaphone {
		return errors.New("Only moderators can mark a question as answered")
	}
	return s.updateState(func(st *spacestate.SpaceState) error {
		question, ok := st.Questions[q.QuestionID]
		if !ok {
			return fmt.Errorf("Question %s does not exist in this space", q.QuestionID)
		}
		if question.Answer == nil {
			question.Answer = &spacestate.ProximityQuestionAnswer{ModeratorID: voterID(sender), AnsweredAt: now()}
			st.Questions[q.QuestionID] = question
		}
		return nil
	})
}

func (s *spaceState) deleteQuestion(sender *SpaceUser, q DeleteQuestion) error {
	return s.updateState(func(st *spacestate.SpaceState) error {
		question, ok := st.Questions[q.QuestionID]
		if !ok {
			return fmt.Errorf("Question %s does not exist in this space", q.QuestionID)
		}
		if question.SenderID != voterID(sender) && !isAdmin(sender) {
			return errors.New("Only question authors or admins can delete a question")
		}
		delete(st.Questions, q.QuestionID)
		return nil
	})
}

// canModerate is RaiseHandManager.assertCanModerate: admins always; anyone in a proximity (ALL_USERS) space; in a
// broadcast space a speaker, unless it only holds the floor it was given.
func (s *spaceState) canModerate(sender *SpaceUser) error {
	if isAdmin(sender) || s.filter == FilterAllUsers {
		return nil
	}
	promoted := slices.ContainsFunc(s.state.FloorHolders, func(e spacestate.FloorHolderEntry) bool { return e.SpaceUserID == sender.ID })
	if sender.Megaphone && !promoted {
		return nil
	}
	return errors.New("Only a speaker or an admin can manage the floor")
}

// updateState is the only way to change the state: mutate works on a copy, which must pass the schema the front
// parses every state with. On success, the members get the difference.
func (s *spaceState) updateState(mutate func(*spacestate.SpaceState) error) error {
	next := cloneState(s.state)
	if err := mutate(&next); err != nil {
		return err
	}
	if err := next.Validate(); err != nil {
		return err
	}
	patch := statePatch(s.state, next)
	s.state = next
	if patch != "" {
		s.toMembers(func(*spaceMember) bool { return true }, NewMsg(SpaceStatePatch{Space: s.local, Patch: patch}, true))
	}
	return nil
}

// cloneState deep-copies through JSON. ponytail: fine for states of a few kilobytes, changed a few times a minute.
func cloneState(st spacestate.SpaceState) spacestate.SpaceState {
	b, _ := json.Marshal(st)
	var c spacestate.SpaceState
	_ = json.Unmarshal(b, &c)
	return c
}

// statePatch returns the JSON Patch from a to b, one operation per top-level key that changed, or "" when nothing
// did. ponytail: a vote replaces all the polls; a finer diff (wI2L/jsondiff) if states grow large.
func statePatch(a, b spacestate.SpaceState) string {
	var before, after map[string]json.RawMessage
	ab, _ := json.Marshal(a)
	bb, _ := json.Marshal(b)
	_ = json.Unmarshal(ab, &before)
	_ = json.Unmarshal(bb, &after)
	type op struct {
		Op    string          `json:"op"`
		Path  string          `json:"path"`
		Value json.RawMessage `json:"value,omitempty"`
	}
	var ops []op
	for k, v := range after {
		if old, ok := before[k]; !ok {
			ops = append(ops, op{"add", "/" + k, v})
		} else if string(old) != string(v) {
			ops = append(ops, op{"replace", "/" + k, v})
		}
	}
	for k := range before {
		if _, ok := after[k]; !ok {
			ops = append(ops, op{Op: "remove", Path: "/" + k})
		}
	}
	if len(ops) == 0 {
		return ""
	}
	sort.Slice(ops, func(i, j int) bool { return ops[i].Path < ops[j].Path })
	out, _ := json.Marshal(ops)
	return string(out)
}

func ownPoll(st *spacestate.SpaceState, id string, sender *SpaceUser, refused string) (spacestate.ProximityPoll, error) {
	poll, ok := st.Polls[id]
	if !ok {
		return poll, fmt.Errorf("Poll %s does not exist in this space", id)
	}
	if poll.SenderID != voterID(sender) {
		return poll, errors.New(refused)
	}
	return poll, nil
}

func removeHand(list []spacestate.RaisedHandEntry, id string) []spacestate.RaisedHandEntry {
	return slices.DeleteFunc(list, func(e spacestate.RaisedHandEntry) bool { return e.SpaceUserID == id })
}

func removeFloorHolder(list []spacestate.FloorHolderEntry, id string) []spacestate.FloorHolderEntry {
	return slices.DeleteFunc(list, func(e spacestate.FloorHolderEntry) bool { return e.SpaceUserID == id })
}

// voterID is the identity polls and questions are attributed to: the user's uuid, or its space user id.
func voterID(u *SpaceUser) string {
	if u.UUID != "" {
		return u.UUID
	}
	return u.ID
}

func isAdmin(u *SpaceUser) bool { return slices.Contains(u.Tags, "admin") }

func now() int64 { return time.Now().UnixMilli() }

// truncateJS is s.slice(0, n) of JavaScript, counted in UTF-16 units, without splitting a surrogate pair.
func truncateJS(s string, n int) string {
	units := 0
	for i, r := range s {
		w := utf16.RuneLen(r)
		if units+w > n {
			return s[:i]
		}
		units += w
	}
	return s
}
