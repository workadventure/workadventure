package core

import (
	"context"
)

// The meetings of a space, for the analytics (SessionAnalytics, through CommunicationManager.syncPresence). A member
// is present when the filter shows it or when it watches the user list; in a meeting being there is being active,
// in a broadcast only a speaker is.

func (s *spaceState) isPresent(id string) bool {
	m := s.members[id]
	return m != nil && (m.watching || s.inFilter(&m.user))
}

// syncPresence turns a change of a member into the arrival or departure it is, or into nothing.
func (s *spaceState) syncPresence(id string) {
	if s.meeting == nil {
		return
	}
	now := s.isPresent(id)
	if now == s.present[id] {
		return
	}
	if !now {
		delete(s.present, id)
		s.meeting.Leave(id)
		return
	}
	s.present[id] = true
	u := s.members[id].user
	s.meeting.Join(u.UUID, id, u.PlayURI, u.Tags, s.filter == FilterAllUsers || u.Megaphone)
}

// kind is the space's kind, as its front said (SetKind).
func (s *spaceState) kind() string {
	if s.state.Kind == nil {
		return ""
	}
	return string(*s.state.Kind)
}

// MeetingReporter writes the meetings of a space for the analytics: who was there, when, on which transport
// (internal/analytics.Meeting implements it). The space calls it on its own goroutine.
type MeetingReporter interface {
	Join(uuid, spaceUserID, roomID string, tags []string, active bool)
	SetActive(spaceUserID string, active bool)
	Leave(spaceUserID string)
	KindChanged()
	TransportChanged()
	Close(reason string) bool
}

func (s *spaceState) closeMeeting(reason string) {
	if s.meeting != nil {
		s.meeting.Close(reason)
	}
}

// CloseMeeting ends the open meeting before a shutdown takes it with it (closeAllSpaceSessions).
func (sp *Space) CloseMeeting(ctx context.Context) {
	done := make(chan struct{})
	if sp.a.Post(ctx, func() { sp.s.closeMeeting("back_shutdown"); close(done) }) != nil {
		return
	}
	select {
	case <-done:
	case <-ctx.Done():
	}
}
