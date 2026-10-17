package core

import (
	"context"
	"github.com/workadventure/workadventure/server-go/internal/analytics"
	"log/slog"
	"time"
)

// A space with media meets through WebRTC, each member connected to the others, until it grows past
// MaxUsersForWebRTC members (or a member says its CPU is limited, in a bubble of three or more): it then moves to
// LiveKit, one connection per member to a media server. It moves back BackToWebRTCAfter the condition went away.
// After a move, the old strategy is finalized FinalizeAfter later, so that the fronts keep their old connections
// until the new ones are up (TransitionPolicy, CommunicationManager and StateLifecycleManager of the back).

// LiveKit is the media server. Its calls run off the space's goroutine, one at a time per space.
type LiveKit interface {
	CreateRoom(ctx context.Context, room string) error
	DeleteRoom(ctx context.Context, room string) error
	// Token lets u join room: publish its camera, microphone and screen, and subscribe to the others.
	Token(room string, u SpaceUser) (string, error)
	URL() string // where the fronts connect (ws://, wss://)
}

// Media is how the spaces meet.
type Media struct {
	LiveKit LiveKit // nil: WebRTC only
	// LiveKitFor, when set, gives the LiveKit of a world for a play URI of it (A24, api/livekit/credentials),
	// asked each time a space moves to LiveKit; it is called off the space's goroutine.
	LiveKitFor func(ctx context.Context, playURI string) (LiveKit, error)
	// EgressFor is the egress of a LiveKit given by LiveKitFor, to record on the world's LiveKit.
	EgressFor         func(LiveKit) Egress
	Egress            Egress // nil: no recording
	MaxUsersForWebRTC int    // MAX_USERS_FOR_WEBRTC
	SwitchOnCPULimit  bool   // LIVEKIT_SWITCH_ON_CPU_LIMITATION
	BackToWebRTCAfter time.Duration
	FinalizeAfter     time.Duration
	Analytics         func(analytics.Event) // the back's analytics queue (meetings); nil: none
	// RecordingEnded tells the admin a recording ended (A23); it must not block.
	RecordingEnded func(RecordingEnded)
}

// DefaultMedia is the back's: 4 users, 20 s back, 5 s to finalize.
func DefaultMedia(lk LiveKit) Media {
	return Media{LiveKit: lk, MaxUsersForWebRTC: 4, SwitchOnCPULimit: true, BackToWebRTCAfter: 20 * time.Second, FinalizeAfter: 5 * time.Second}
}

const (
	strategyWebRTC  = "WEBRTC"
	strategyLiveKit = "LIVEKIT"
)

// Private events of LiveKit, sent by the server to one member.
type (
	LiveKitInvitation struct{ Token, ServerURL string }
	LiveKitDisconnect struct{}
	FinalizeSwitch    struct{ Strategy string }
)

type lkRoomState int

const (
	lkNone lkRoomState = iota
	lkCreating
	lkReady
)

type liveKitState struct {
	room    lkRoomState
	gen     int             // bumped when the room is created or deleted: a late answer about an older one is ignored
	invited map[string]bool // members who got a token for the current room
	client  LiveKit         // the LiveKit of the current room
}

// hasLiveKit says whether the space may move to LiveKit.
func (s *spaceState) hasLiveKit() bool {
	return s.mediaCfg.LiveKit != nil || s.mediaCfg.LiveKitFor != nil
}

// takesPart: a member in the filter streams; a watcher receives.
func (s *spaceState) takesPart(m *spaceMember) bool { return s.inFilter(&m.user) || m.watching }

func (s *spaceState) wantsLiveKit() bool {
	n, cpu := len(s.members), 0
	for _, m := range s.members {
		if m.user.CPULimited {
			cpu++
		}
	}
	return n > s.mediaCfg.MaxUsersForWebRTC || (s.mediaCfg.SwitchOnCPULimit && cpu > 0 && n > 2)
}

// mayGoBack: small enough again, and no member with a limited CPU (a bubble moved for one goes back only once it left).
func (s *spaceState) mayGoBack() bool {
	if len(s.members) > s.mediaCfg.MaxUsersForWebRTC || s.rec != nil { // a recording stays on LiveKit
		return false
	}
	for _, m := range s.members {
		if m.user.CPULimited && s.mediaCfg.SwitchOnCPULimit {
			return false
		}
	}
	return true
}

// evaluate applies the policy after any change of the members.
func (s *spaceState) evaluate() {
	if !s.media || !s.hasLiveKit() {
		return
	}
	switch s.strategy {
	case strategyWebRTC:
		if s.wantsLiveKit() {
			s.switchTo(strategyLiveKit)
		}
	case strategyLiveKit:
		if !s.mayGoBack() {
			s.cancelBack()
		} else if s.backTimer == nil {
			gen := s.backGen
			s.backTimer = time.AfterFunc(s.mediaCfg.BackToWebRTCAfter, func() {
				s.later(func() {
					if gen != s.backGen {
						return
					}
					s.backTimer = nil
					if s.strategy == strategyLiveKit && s.mayGoBack() {
						s.switchTo(strategyWebRTC)
					}
				})
			})
		}
	}
	s.lkSync()
}

func (s *spaceState) cancelBack() {
	if s.backTimer != nil {
		s.backTimer.Stop()
		s.backTimer = nil
		s.backGen++
	}
}

// switchTo moves the space to target: the members are told, the new strategy starts, the old one is finalized later.
func (s *spaceState) switchTo(target string) {
	if s.finalizing != "" {
		s.finalize()
	}
	s.cancelBack()
	old := s.strategy
	s.strategy = target
	if s.meeting != nil {
		s.meeting.TransportChanged()
	}
	slog.Info("space switches", "space", s.roomName, "from", old, "to", target, "members", len(s.members))
	for _, id := range s.order {
		if m := s.members[id]; s.takesPart(m) {
			m.peer.Send(NewMsg(SpacePrivateEvent{Space: s.local, ReceiverID: id, Sender: m.user, Event: SwitchStrategy{Strategy: target}}, true))
		}
	}
	if target == strategyWebRTC {
		for _, id := range s.order {
			if s.members[id].watching {
				s.connect(id, s.inFilterMember)
			}
		}
	}
	s.finalizing = old
	gen := s.finalizeGen
	s.finalizeTimer = time.AfterFunc(s.mediaCfg.FinalizeAfter, func() {
		s.later(func() {
			if gen == s.finalizeGen {
				s.finalize()
			}
		})
	})
}

// finalize ends the strategy the space left: the fronts drop its connections; a LiveKit room is deleted.
func (s *spaceState) finalize() {
	old := s.finalizing
	s.finalizing = ""
	s.finalizeGen++
	if s.finalizeTimer != nil {
		s.finalizeTimer.Stop()
		s.finalizeTimer = nil
	}
	for _, id := range s.order {
		if m := s.members[id]; s.takesPart(m) {
			m.peer.Send(NewMsg(SpacePrivateEvent{Space: s.local, ReceiverID: id, Sender: m.user, Event: FinalizeSwitch{Strategy: old}}, true))
		}
	}
	switch old {
	case strategyWebRTC:
		clear(s.conns)
	case strategyLiveKit:
		s.lkDelete() // the back left it to LiveKit's empty timeout: an orphan room meanwhile
	}
}

// lkSync makes LiveKit match the members: a room while someone streams, a token for each member taking part.
func (s *spaceState) lkSync() {
	if s.strategy != strategyLiveKit {
		return
	}
	streaming := false
	for _, m := range s.members {
		if s.inFilter(&m.user) {
			streaming = true
			break
		}
	}
	if !streaming {
		s.stopByServer() // nobody to record any more
		for _, id := range s.order {
			if s.lk.invited[id] {
				m := s.members[id]
				m.peer.Send(NewMsg(SpacePrivateEvent{Space: s.local, ReceiverID: id, Sender: m.user, Event: LiveKitDisconnect{}}, true))
			}
		}
		s.lkDelete()
		return
	}
	switch s.lk.room {
	case lkNone:
		s.lk.room, s.lk.gen = lkCreating, s.lk.gen+1
		gen, room, lk, lkFor := s.lk.gen, s.roomName, s.mediaCfg.LiveKit, s.mediaCfg.LiveKitFor
		var playURI string
		if len(s.order) > 0 {
			playURI = s.members[s.order[0]].user.PlayURI
		}
		s.call(func() {
			var err error
			if lkFor != nil {
				lk, err = lkFor(context.Background(), playURI)
			}
			if err == nil {
				err = lk.CreateRoom(context.Background(), room)
			}
			s.later(func() {
				if gen != s.lk.gen || s.lk.room != lkCreating {
					return
				}
				if err != nil {
					slog.Error("cannot create the LiveKit room", "room", room, "error", err)
					s.lk.room = lkNone // tried again at the next change
					return
				}
				s.lk.room, s.lk.client = lkReady, lk
				slog.Info("LiveKit room ready", "room", room)
				s.lkSync()
				s.recordWhenReady()
			})
		})
		return
	case lkCreating:
		return
	}
	for id := range s.lk.invited {
		if s.members[id] == nil {
			delete(s.lk.invited, id) // left: its front closed everything
		}
	}
	for _, id := range s.order {
		m := s.members[id]
		switch want := s.takesPart(m); {
		case want && !s.lk.invited[id]:
			s.lkInvite(m)
		case !want && s.lk.invited[id]:
			delete(s.lk.invited, id)
			m.peer.Send(NewMsg(SpacePrivateEvent{Space: s.local, ReceiverID: id, Sender: m.user, Event: LiveKitDisconnect{}}, true))
		}
	}
}

func (s *spaceState) lkInvite(m *spaceMember) {
	token, err := s.lk.client.Token(s.roomName, m.user)
	if err != nil {
		slog.Error("cannot sign a LiveKit token", "error", err)
		return
	}
	s.lk.invited[m.user.ID] = true
	slog.Debug("LiveKit invitation", "room", s.roomName, "member", m.user.ID)
	m.peer.Send(NewMsg(SpacePrivateEvent{Space: s.local, ReceiverID: m.user.ID, Sender: m.user,
		Event: LiveKitInvitation{Token: token, ServerURL: s.lk.client.URL()}}, true))
}

func (s *spaceState) lkDelete() {
	if s.lk.room == lkNone {
		return
	}
	s.lk.room, s.lk.gen = lkNone, s.lk.gen+1
	clear(s.lk.invited)
	room, lk := s.roomName, s.lk.client
	s.lk.client = nil
	if lk == nil { // still being created: the late answer is ignored, and the room
		lk = s.mediaCfg.LiveKit
	}
	if lk == nil {
		return // ponytail: a per-world room created while it was being deleted stays until LiveKit empties it
	}
	s.call(func() {
		if err := lk.DeleteRoom(context.Background(), room); err != nil {
			slog.Warn("cannot delete the LiveKit room", "room", room, "error", err)
		}
	})
}

// restartLiveKit is meetingConnectionRestart without a peer: the front lost LiveKit and wants a new token.
func (s *spaceState) restartLiveKit(id string) {
	if m := s.members[id]; m != nil && s.strategy == strategyLiveKit && s.lk.invited[id] {
		s.lkInvite(m)
	}
}

// RestartLiveKit gives a member a new LiveKit token (backEvent meetingConnectionRestart without a user).
func (sp *Space) RestartLiveKit(ctx context.Context, id string) error {
	return sp.a.Post(ctx, func() { sp.s.restartLiveKit(id) })
}
