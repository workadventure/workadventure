package core

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"slices"

	"github.com/workadventure/workadventure/server-go/internal/actor"
	"github.com/workadventure/workadventure/server-go/internal/spacestate"
)

// FilterType decides which members of a space a watcher sees. Same numbering as the FilterType protobuf enum.
type FilterType int32

const (
	FilterAllUsers FilterType = iota
	FilterLiveStreamingUsers
	FilterLiveStreamingUsersWithFeedback
)

var ErrFilterMismatch = errors.New("Space filter type mismatch")

// SpaceUser is a member of a space as the other members see it (SpaceUser in messages.proto). Values are copied
// into events: never mutate a SpaceUser in place once sent.
type SpaceUser struct {
	ID                                                          string // `${roomURL}_${userID}`: the front recomputes it
	Name, PlayURI, Color                                        string
	Textures                                                    []Texture
	IsLogged                                                    bool
	AvailabilityStatus                                          AvailabilityStatus
	RoomName, VisitCardURL, JitsiParticipantID, ChatID          *string
	Tags                                                        []string
	CameraState, MicrophoneState, ScreenSharingState, Megaphone bool
	UUID                                                        string
	ShowVoiceIndicator, AttendeesState, CPULimited              bool
}

// Fields a client may change on itself with UpdateSpaceUserMessage (the rest comes from the server).
var clientMutableFields = []string{"microphoneState", "cameraState", "screenSharingState", "megaphoneState", "attendeesState", "cpuLimited"}

// Fields the server itself updates from SetPlayerDetailsMessage.
var playerDetailFields = []string{"availabilityStatus", "chatID", "showVoiceIndicator"}

func (u *SpaceUser) apply(from SpaceUser, path string) {
	switch path {
	case "microphoneState":
		u.MicrophoneState = from.MicrophoneState
	case "cameraState":
		u.CameraState = from.CameraState
	case "screenSharingState":
		u.ScreenSharingState = from.ScreenSharingState
	case "megaphoneState":
		u.Megaphone = from.Megaphone
	case "attendeesState":
		u.AttendeesState = from.AttendeesState
	case "cpuLimited":
		u.CPULimited = from.CPULimited
	case "availabilityStatus":
		u.AvailabilityStatus = from.AvailabilityStatus
	case "chatID":
		u.ChatID = from.ChatID
	case "showVoiceIndicator":
		u.ShowVoiceIndicator = from.ShowVoiceIndicator
	}
}

// Space events. Space is the name the client knows (without the world prefix).
type (
	SpaceUserAdded struct {
		Space string
		User  SpaceUser
	}
	SpaceUserUpdated struct {
		Space string
		User  SpaceUser // the whole user; the client only reads the fields in Mask
		Mask  []string
	}
	SpaceUserRemoved struct{ Space, UserID string }
	SpaceUsersInit   struct {
		Space    string
		Users    []SpaceUser
		Metadata string // JSON object
	}
	SpaceStatePatch struct{ Space, Patch string }
	// SpaceMetadataUpdated carries the keys that changed, as a JSON object.
	SpaceMetadataUpdated struct{ Space, Metadata string }
	// SpacePublicEvent relays a client's event (chat message, typing...) to the other members. Payload is the
	// event as the client encoded it: the core does not read it.
	SpacePublicEvent struct {
		Space   string
		Sender  SpaceUser
		Payload []byte
	}
	// SpacePrivateEvent goes to one member. Event is WebRTCStart, WebRTCDisconnect, SwitchStrategy, or
	// RelayedEvent (sent by another client, opaque to the core).
	SpacePrivateEvent struct {
		Space, ReceiverID string
		Sender            SpaceUser
		Event             any
	}
	WebRTCStart struct {
		UserID       string
		Initiator    bool
		ConnectionID string
	}
	WebRTCDisconnect struct{ UserID string }
	SwitchStrategy   struct{ Strategy string }
	RelayedEvent     struct{ Payload []byte }
)

// SpaceKey identifies a space: its world (the origin of the room URL, without an admin) and the name the front
// gives it. Events carry the name only.
type SpaceKey struct{ World, Local string }

// Space is a group of users sharing presence, events and media (a bubble, a meeting room, the whole world for
// the user list). Like a Room, it is an actor.
type Space struct {
	Key SpaceKey
	a   *actor.Actor
	s   *spaceState
}

func NewSpace(k SpaceKey) *Space {
	return &Space{Key: k, a: actor.Start("space "+k.World+"."+k.Local, inboxSize), s: &spaceState{
		local: k.Local, members: map[string]*spaceMember{}, conns: map[[2]string]string{},
		state: spacestate.Empty(), metadata: map[string]json.RawMessage{},
	}}
}

func (sp *Space) Stop()                 { sp.a.Stop() }
func (sp *Space) Done() <-chan struct{} { return sp.a.Done() }

type spaceState struct {
	local     string
	filter    FilterType
	filterSet bool
	media     bool // propertiesToSync has camera, microphone or screen sharing: members meet through WebRTC
	members   map[string]*spaceMember
	order     []string             // join order
	conns     map[[2]string]string // WebRTC connections, (sender, receiver) -> connection id
	state     spacestate.SpaceState
	metadata  map[string]json.RawMessage // free key/values of the scripting API
}

type spaceMember struct {
	peer     Peer
	user     SpaceUser
	watching bool // the member asked for the user list (AddSpaceFilterMessage)
}

// SpaceJoin is a JoinSpaceQuery.
type SpaceJoin struct {
	User             SpaceUser
	Filter           FilterType
	PropertiesToSync []string
}

// Join adds p to the space. reply runs on the space's goroutine before anything else about this space is sent
// to p: the front ignores messages of a space it has not got the answer for.
func (sp *Space) Join(ctx context.Context, p Peer, j SpaceJoin, reply func(error)) error {
	return sp.a.Post(ctx, func() { sp.s.join(p, j, reply) })
}

// Leave removes the member; reply runs once it is done.
func (sp *Space) Leave(ctx context.Context, userID string, reply func()) error {
	return sp.a.Post(ctx, func() {
		sp.s.leave(userID)
		if reply != nil {
			reply()
		}
	})
}

// Watch starts sending the user list to the member (AddSpaceFilterMessage). notMember runs if it is not one.
func (sp *Space) Watch(ctx context.Context, userID string, notMember func()) error {
	return sp.a.Post(ctx, func() { sp.s.watch(userID, notMember) })
}

func (sp *Space) Unwatch(ctx context.Context, userID string) error {
	return sp.a.Post(ctx, func() { sp.s.unwatch(userID) })
}

// UpdateUser applies a client's change of its own media state (UpdateSpaceUserMessage).
func (sp *Space) UpdateUser(ctx context.Context, userID string, u SpaceUser, mask []string) error {
	return sp.a.Post(ctx, func() { sp.s.update(userID, u, mask, clientMutableFields, false) })
}

// UpdatePlayerDetails applies a SetPlayerDetailsMessage (status, chat id, voice indicator).
func (sp *Space) UpdatePlayerDetails(ctx context.Context, userID string, u SpaceUser, mask []string) error {
	return sp.a.Post(ctx, func() { sp.s.update(userID, u, mask, playerDetailFields, true) })
}

func (sp *Space) PublicEvent(ctx context.Context, senderID string, payload []byte, notMember func()) error {
	return sp.a.Post(ctx, func() { sp.s.publicEvent(senderID, payload, notMember) })
}

func (sp *Space) PrivateEvent(ctx context.Context, senderID, receiverID string, payload []byte, notMember func()) error {
	return sp.a.Post(ctx, func() { sp.s.privateEvent(senderID, receiverID, payload, notMember) })
}

// RestartConnection re-establishes a WebRTC connection that failed on the front (MeetingConnectionRestartMessage).
// A connectionId that is not the current one is a stale request and is ignored.
func (sp *Space) RestartConnection(ctx context.Context, senderID, receiverID string, connectionID *string) error {
	return sp.a.Post(ctx, func() { sp.s.restart(senderID, receiverID, connectionID) })
}

// SetMetadata merges keys into the metadata of the space and sends them to every member, the sender included.
func (sp *Space) SetMetadata(ctx context.Context, userID string, delta map[string]json.RawMessage) error {
	return sp.a.Post(ctx, func() { sp.s.setMetadata(userID, delta) })
}

func (s *spaceState) toMembers(match func(*spaceMember) bool, m *Msg) {
	for _, id := range s.order {
		if member := s.members[id]; match(member) {
			member.peer.Send(m)
		}
	}
}

func (s *spaceState) join(p Peer, j SpaceJoin, reply func(error)) {
	id := j.User.ID
	if existing := s.members[id]; existing != nil {
		reply(nil) // joined twice: already a member
		return
	}
	if s.filterSet && s.filter != j.Filter {
		reply(ErrFilterMismatch)
		return
	}
	if !s.filterSet {
		s.filter, s.filterSet = j.Filter, true
		s.media = slices.ContainsFunc(j.PropertiesToSync, func(p string) bool {
			return p == "cameraState" || p == "microphoneState" || p == "screenSharingState"
		})
	}
	m := &spaceMember{peer: p, user: j.User}
	s.toMembers(func(o *spaceMember) bool { return o.watching && s.visible(&o.user, &m.user) }, NewMsg(SpaceUserAdded{Space: s.local, User: m.user}, true))
	s.members[id] = m
	s.order = append(s.order, id)

	reply(nil)
	state, _ := json.Marshal(s.state)
	p.Send(NewMsg(SpaceStatePatch{Space: s.local, Patch: `[{"op":"replace","path":"","value":` + string(state) + `}]`}, true))
	if s.media {
		// Without LiveKit (J2), a bubble always meets through WebRTC.
		p.Send(NewMsg(SpacePrivateEvent{Space: s.local, ReceiverID: id, Sender: m.user, Event: SwitchStrategy{Strategy: "WEBRTC"}}, true))
	}
}

func (s *spaceState) watch(id string, notMember func()) {
	m := s.members[id]
	if m == nil {
		if notMember != nil {
			notMember()
		}
		return
	}
	if m.watching {
		return
	}
	users := make([]SpaceUser, 0, len(s.order))
	for _, o := range s.order {
		if u := &s.members[o].user; s.visible(&m.user, u) {
			users = append(users, *u)
		}
	}
	metadata, _ := json.Marshal(s.metadata)
	m.peer.Send(NewMsg(SpaceUsersInit{Space: s.local, Users: users, Metadata: string(metadata)}, true))
	m.watching = true
	s.connect(id, s.inFilterMember)
}

// Roles of the LIVE_STREAMING_USERS_WITH_FEEDBACK filter: speakers broadcast, listeners show they follow.
type role int

const (
	roleNone role = iota
	roleListener
	roleSpeaker
)

func roleOf(u *SpaceUser) role {
	switch {
	case u.Megaphone:
		return roleSpeaker
	case u.AttendeesState:
		return roleListener
	}
	return roleNone
}

// inFilter is the filter of the back: who takes part in the media of the space.
func (s *spaceState) inFilter(u *SpaceUser) bool {
	switch s.filter {
	case FilterLiveStreamingUsers:
		return u.Megaphone
	case FilterLiveStreamingUsersWithFeedback:
		return u.Megaphone || u.AttendeesState
	}
	return true
}

// visible says whether observer sees target in its user list. With feedback (LiveStreamingNotificationStrategy):
// speakers see speakers and listeners, everybody else sees speakers only.
func (s *spaceState) visible(observer, target *SpaceUser) bool {
	if s.filter != FilterLiveStreamingUsersWithFeedback {
		return s.inFilter(target)
	}
	t := roleOf(target)
	return t == roleSpeaker || (t == roleListener && roleOf(observer) == roleSpeaker)
}

// WebRTC connections follow the events of WebRTCCommunicationStrategy: a watcher meets the members in the filter
// (watch); a watcher entering the filter meets the other watchers; leaving the filter drops the watchers outside
// it; unwatching or leaving drops everything.

// connect establishes a connection from id to each other member that matches and has none with it yet.
func (s *spaceState) connect(id string, match func(*spaceMember) bool) {
	if !s.media {
		return
	}
	for _, o := range s.order {
		if _, ok := s.conns[[2]string{id, o}]; o != id && !ok && match(s.members[o]) {
			s.establish(id, o)
		}
	}
}

// drop closes the connections between id and each other member that matches.
func (s *spaceState) drop(id string, match func(*spaceMember) bool) {
	for _, o := range s.order {
		if o != id && match(s.members[o]) {
			s.disconnect(id, o)
			s.disconnect(o, id)
		}
	}
}

func (s *spaceState) inFilterMember(m *spaceMember) bool { return s.inFilter(&m.user) }
func watching(m *spaceMember) bool                       { return m.watching }
func anyMember(*spaceMember) bool                        { return true }

func (s *spaceState) restart(senderID, receiverID string, connectionID *string) {
	sender, receiver := s.members[senderID], s.members[receiverID]
	if !s.media || sender == nil || receiver == nil {
		return
	}
	existing, ok := s.conns[[2]string{senderID, receiverID}]
	if !ok {
		existing, ok = s.conns[[2]string{receiverID, senderID}]
	}
	if ok && connectionID != nil && *connectionID != existing {
		return
	}
	s.establish(receiverID, senderID)
}

// establish starts a WebRTC connection: b receives initiator=true towards a, a receives initiator=false towards b
// (WebRTCCommunicationStrategy.establishConnection(a, b) sends both webRtcStartMessage).
func (s *spaceState) establish(a, b string) {
	ma, mb := s.members[a], s.members[b]
	conn := newUUID()
	s.conns[[2]string{a, b}], s.conns[[2]string{b, a}] = conn, conn
	mb.peer.Send(NewMsg(SpacePrivateEvent{Space: s.local, ReceiverID: b, Sender: ma.user, Event: WebRTCStart{UserID: a, Initiator: true, ConnectionID: conn}}, true))
	ma.peer.Send(NewMsg(SpacePrivateEvent{Space: s.local, ReceiverID: a, Sender: mb.user, Event: WebRTCStart{UserID: b, Initiator: false, ConnectionID: conn}}, true))
}

func (s *spaceState) unwatch(id string) {
	m := s.members[id]
	if m == nil || !m.watching {
		return
	}
	m.watching = false
	s.drop(id, s.inFilterMember)
}

// disconnect tells receiver to drop its WebRTC connection with sender, if there is one.
func (s *spaceState) disconnect(sender, receiver string) {
	key := [2]string{sender, receiver}
	if _, ok := s.conns[key]; !ok {
		return
	}
	delete(s.conns, key)
	from, to := s.members[sender], s.members[receiver]
	if from == nil || to == nil {
		return // a member that left is announced by SpaceUserRemoved instead
	}
	to.peer.Send(NewMsg(SpacePrivateEvent{Space: s.local, ReceiverID: receiver, Sender: from.user, Event: WebRTCDisconnect{UserID: sender}}, true))
}

func (s *spaceState) leave(id string) {
	m := s.members[id]
	if m == nil {
		return
	}
	s.drop(id, anyMember)
	delete(s.members, id)
	s.order = slices.DeleteFunc(s.order, func(o string) bool { return o == id })
	s.toMembers(func(o *spaceMember) bool { return o.watching && s.visible(&o.user, &m.user) }, NewMsg(SpaceUserRemoved{Space: s.local, UserID: id}, true))
	// RaiseHandManager: no ghost in the queue nor among the floor holders.
	_ = s.updateState(func(st *spacestate.SpaceState) error {
		st.RaisedHands = removeHand(st.RaisedHands, id)
		st.FloorHolders = removeFloorHolder(st.FloorHolders, id)
		return nil
	})
}

// update merges the masked fields of from into the member and tells the watchers. onlyChanged drops the fields
// whose value does not change (SetPlayerDetailsMessage carries the whole state, not a change).
func (s *spaceState) update(id string, from SpaceUser, mask, allowed []string, onlyChanged bool) {
	m := s.members[id]
	if m == nil {
		return
	}
	kept := make([]string, 0, len(mask))
	for _, path := range mask {
		if !slices.Contains(allowed, path) || slices.Contains(kept, path) {
			continue
		}
		if onlyChanged {
			before := m.user
			before.apply(from, path)
			if spaceUserEqual(before, m.user) {
				continue
			}
		}
		kept = append(kept, path)
	}
	if len(kept) == 0 {
		return
	}
	old := m.user
	for _, path := range kept {
		m.user.apply(from, path)
	}
	// Each watcher sees the user appear, change or disappear, depending on what it could see before and after.
	// The user's own view counts the change of its own role.
	added, removed := NewMsg(SpaceUserAdded{Space: s.local, User: m.user}, true), NewMsg(SpaceUserRemoved{Space: s.local, UserID: id}, true)
	updated := NewMsg(SpaceUserUpdated{Space: s.local, User: m.user, Mask: kept}, true)
	for _, o := range s.order {
		w := s.members[o]
		if !w.watching {
			continue
		}
		before, after := &w.user, &w.user
		if o == id {
			before = &old
		}
		was, is := s.visible(before, &old), s.visible(after, &m.user)
		switch {
		case !was && is:
			w.peer.Send(added)
		case was && !is:
			w.peer.Send(removed)
		case was && is:
			w.peer.Send(updated)
		}
	}
	if m.watching && s.filter == FilterLiveStreamingUsersWithFeedback && roleOf(&old) != roleOf(&m.user) {
		for _, o := range s.order {
			u := &s.members[o].user
			if o == id {
				continue
			}
			switch was, is := s.visible(&old, u), s.visible(&m.user, u); {
			case !was && is:
				m.peer.Send(NewMsg(SpaceUserAdded{Space: s.local, User: *u}, true))
			case was && !is:
				m.peer.Send(NewMsg(SpaceUserRemoved{Space: s.local, UserID: o}, true))
			}
		}
	}
	switch was, is := s.inFilter(&old), s.inFilter(&m.user); {
	case !was && is && m.watching:
		s.connect(id, watching)
	case was && !is:
		if !m.watching {
			s.drop(id, anyMember)
		}
		s.drop(id, func(o *spaceMember) bool { return o.watching && !s.inFilter(&o.user) })
	}
	if old.Megaphone && !m.user.Megaphone {
		// A floor holder who stops streaming no longer holds the floor.
		_ = s.updateState(func(st *spacestate.SpaceState) error {
			st.FloorHolders = removeFloorHolder(st.FloorHolders, id)
			return nil
		})
	}
}

func (s *spaceState) setMetadata(senderID string, delta map[string]json.RawMessage) {
	if s.members[senderID] == nil || len(delta) == 0 {
		return
	}
	for k, v := range delta {
		s.metadata[k] = v
	}
	b, _ := json.Marshal(delta)
	s.toMembers(func(*spaceMember) bool { return true }, NewMsg(SpaceMetadataUpdated{Space: s.local, Metadata: string(b)}, true))
}

func (s *spaceState) publicEvent(senderID string, payload []byte, notMember func()) {
	sender := s.members[senderID]
	if sender == nil {
		notMember()
		return
	}
	s.toMembers(func(o *spaceMember) bool { return o != sender }, NewMsg(SpacePublicEvent{Space: s.local, Sender: sender.user, Payload: payload}, true))
}

func (s *spaceState) privateEvent(senderID, receiverID string, payload []byte, notMember func()) {
	sender := s.members[senderID]
	if sender == nil {
		notMember()
		return
	}
	if receiver := s.members[receiverID]; receiver != nil {
		receiver.peer.Send(NewMsg(SpacePrivateEvent{Space: s.local, ReceiverID: receiverID, Sender: sender.user, Event: RelayedEvent{Payload: payload}}, true))
	}
}

// newUUID returns a random (version 4) UUID.
func newUUID() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	b[6] = b[6]&0x0f | 0x40
	b[8] = b[8]&0x3f | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func spaceUserEqual(a, b SpaceUser) bool {
	same := func(x, y *string) bool { return (x == nil) == (y == nil) && (x == nil || *x == *y) }
	return a.AvailabilityStatus == b.AvailabilityStatus && same(a.ChatID, b.ChatID) && a.ShowVoiceIndicator == b.ShowVoiceIndicator &&
		a.CameraState == b.CameraState && a.MicrophoneState == b.MicrophoneState && a.ScreenSharingState == b.ScreenSharingState &&
		a.Megaphone == b.Megaphone && a.AttendeesState == b.AttendeesState && a.CPULimited == b.CPULimited
}
