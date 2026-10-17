package ws

import (
	"context"
	"encoding/json"
	"log/slog"
	"slices"
	"strconv"
	"sync"
	"unicode/utf16"

	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/fieldmaskpb"
	"google.golang.org/protobuf/types/known/wrapperspb"

	"github.com/workadventure/workadventure/server-go/internal/core"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

// spaceUserID is the id the front recomputes as roomUrl + "_" + userId.
func (s *Session) spaceUserID() string {
	return s.info.roomID + "_" + strconv.Itoa(int(s.userID.Load()))
}

// spaceKey puts the name the front uses in the world of the session, like the "." prefix of
// IoSocketController.
func (s *Session) spaceKey(local string) core.SpaceKey {
	return core.SpaceKey{World: s.info.member.World, Local: local}
}

// memberships are the spaces a session joined, by the name the front uses, each holding a reference in the registry.
type memberships struct {
	mu       sync.Mutex
	spaces   map[string]*core.Space
	joinedBy map[int32]string // the joinSpaceQuery that joined each space, for its abortQueryMessage
}

func (m *memberships) get(local string) *core.Space {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.spaces[local]
}

// room says whether local is already joined, and whether there is room for another space.
func (m *memberships) room(local string) (already, full bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	_, already = m.spaces[local]
	return already, len(m.spaces) >= maxSpacesPerSession
}

func (m *memberships) add(query int32, local string, space *core.Space) {
	m.mu.Lock()
	m.spaces[local] = space
	m.joinedBy[query] = local
	m.mu.Unlock()
}

// remove forgets local and the queries that joined it; it returns the space, nil if it was not joined.
func (m *memberships) remove(local string) *core.Space {
	m.mu.Lock()
	defer m.mu.Unlock()
	space := m.spaces[local]
	delete(m.spaces, local)
	for q, l := range m.joinedBy {
		if l == local {
			delete(m.joinedBy, q)
		}
	}
	return space
}

// takeAll forgets every space and returns them.
func (m *memberships) takeAll() map[string]*core.Space {
	m.mu.Lock()
	defer m.mu.Unlock()
	spaces := m.spaces
	m.spaces = map[string]*core.Space{}
	return spaces
}

func (m *memberships) all() []*core.Space {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]*core.Space, 0, len(m.spaces))
	for _, space := range m.spaces {
		out = append(out, space)
	}
	return out
}

func (m *memberships) joinedByQuery(id int32) (string, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	local, ok := m.joinedBy[id]
	return local, ok
}

// joinedSpace returns the space if the session is a member (it then holds a reference on it in the registry).
func (s *Session) joinedSpace(local string) *core.Space { return s.memberships.get(local) }

// Each space is an actor: one client must not be able to create them without limit. The front joins a handful.
const (
	maxSpacesPerSession = 100
	maxSpaceNameLength  = 4096
)

func (s *Session) joinSpace(id int32, q *pb.JoinSpaceQuery) {
	if s.userID.Load() == 0 {
		s.answerError(id, "Cannot join a space before joining the room")
		return
	}
	local := q.GetSpaceName()
	if len(local) > maxSpaceNameLength {
		s.answerError(id, "Space name too long")
		return
	}
	already, full := s.memberships.room(local)
	if full && !already {
		s.answerError(id, "Too many spaces joined")
		return
	}
	if already {
		s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_JoinSpaceAnswer{JoinSpaceAnswer: &pb.JoinSpaceAnswer{SpaceUserId: s.spaceUserID()}}})
		return
	}

	space := s.srv.spaces.Acquire(s.spaceKey(local))
	result := make(chan error, 1)
	err := space.Join(s.ctx, s, core.SpaceJoin{User: s.spaceUser(), Filter: core.FilterType(q.GetFilterType()), PropertiesToSync: q.GetPropertiesToSync()},
		func(err error) {
			// On the space's goroutine: the answer is queued before anything else about the space.
			if err != nil {
				s.answerError(id, err.Error())
			} else {
				s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_JoinSpaceAnswer{JoinSpaceAnswer: &pb.JoinSpaceAnswer{SpaceUserId: s.spaceUserID()}}})
			}
			result <- err
		})
	if err == nil {
		select {
		case err = <-result:
		case <-s.ctx.Done():
			err = s.ctx.Err()
		}
	}
	if err != nil {
		// The space never recorded us (or we stop waiting because the session ends: destroy leaves it then).
		if s.ctx.Err() == nil {
			s.srv.spaces.Release(s.spaceKey(local))
			return
		}
	}
	s.memberships.add(id, local, space)
}

func (s *Session) leaveSpace(id int32, local string) {
	space := s.memberships.remove(local)
	reply := func() {
		if id != 0 { // 0: left on an abort, nobody waits for an answer
			s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_LeaveSpaceAnswer{LeaveSpaceAnswer: &pb.LeaveSpaceAnswer{}}})
		}
	}
	if space == nil {
		reply()
		return
	}
	_ = space.Leave(context.Background(), s.spaceUserID(), reply)
	s.srv.spaces.Release(s.spaceKey(local))
}

// leaveAllSpaces runs when the session ends, after its readers stopped.
func (s *Session) leaveAllSpaces() {
	for local, space := range s.memberships.takeAll() {
		_ = space.Leave(context.Background(), s.spaceUserID(), nil)
		s.srv.spaces.Release(s.spaceKey(local))
	}
}

func (s *Session) spaceUser() core.SpaceUser {
	name, status := s.presence.get()
	u := core.SpaceUser{
		ID: s.spaceUserID(), Name: name, PlayURI: s.info.roomID, Color: colorByString(name),
		Textures: coreTextures(s.info.member.CharacterTextures), IsLogged: s.info.isLogged, AvailabilityStatus: status,
		VisitCardURL: s.info.member.VisitCardURL, Tags: s.info.member.Tags, UUID: s.info.userUUID,
	}
	if s.info.roomName != "" {
		u.RoomName = &s.info.roomName
	}
	if id := s.chat.get(); id != "" {
		u.ChatID = &id
	}
	return u
}

func (s *Session) isAdmin() bool { return slices.Contains(s.info.member.Tags, "admin") }

func (s *Session) notPartOf(local string) func() {
	return func() { s.sendError("Client is not part of space " + local) }
}

func (s *Session) sendError(message string) {
	s.push(&pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_ErrorMessage{
		ErrorMessage: &pb.ErrorMessage{Message: "An error occurred in pusher: " + message}}})
}

// handleSpaceMessage routes the space messages of a client, one handler per message; it says whether m was one.
func (s *Session) handleSpaceMessage(m *pb.ClientToServerMessage) bool {
	switch msg := m.Message.(type) {
	case *pb.ClientToServerMessage_AddSpaceFilterMessage:
		s.onWatch(msg.AddSpaceFilterMessage.GetSpaceFilterMessage().GetSpaceName())
	case *pb.ClientToServerMessage_RemoveSpaceFilterMessage:
		if space := s.joinedSpace(msg.RemoveSpaceFilterMessage.GetSpaceFilterMessage().GetSpaceName()); space != nil {
			_ = space.Unwatch(s.ctx, s.spaceUserID())
		}
	case *pb.ClientToServerMessage_UpdateSpaceUserMessage:
		u := msg.UpdateSpaceUserMessage
		if space := s.joinedSpace(u.GetSpaceName()); space != nil {
			_ = space.UpdateUser(s.ctx, s.spaceUserID(), fromSpaceUser(u.GetUser()), u.GetUpdateMask().GetPaths())
		}
	case *pb.ClientToServerMessage_PublicEvent:
		s.onPublicEvent(msg.PublicEvent)
	case *pb.ClientToServerMessage_PrivateEvent:
		s.onPrivateEvent(msg.PrivateEvent)
	case *pb.ClientToServerMessage_UpdateSpaceMetadataMessage:
		s.onSpaceMetadata(msg.UpdateSpaceMetadataMessage)
	case *pb.ClientToServerMessage_BackEvent:
		s.onBackEvent(msg.BackEvent)
	default:
		return false
	}
	return true
}

func (s *Session) onWatch(local string) {
	if space := s.joinedSpace(local); space != nil {
		_ = space.Watch(s.ctx, s.spaceUserID(), s.notPartOf(local))
	} else {
		s.notPartOf(local)()
	}
}

// onPublicEvent relays an event to the space; muting everybody is the admin's.
func (s *Session) onPublicEvent(e *pb.PublicEventFrontToPusher) {
	space := s.joinedSpace(e.GetSpaceName())
	if space == nil {
		s.sendError("Trying to send a public event to a space that does not exist: " + e.GetSpaceName())
		return
	}
	switch e.GetSpaceEvent().GetEvent().(type) {
	case *pb.SpaceEvent_MuteAudioForEverybody, *pb.SpaceEvent_MuteVideoForEverybody:
		if !s.isAdmin() {
			s.sendError("Only admins can mute everyone")
			return
		}
	}
	payload, _ := proto.Marshal(e.GetSpaceEvent())
	_ = space.PublicEvent(s.ctx, s.spaceUserID(), payload, s.notPartOf(e.GetSpaceName()))
}

// onPrivateEvent relays an event to one member, after the server's own rules: kicking off is the admin's, a mute is
// forced only by an admin, a file offer carries the sender's real name and woka.
func (s *Session) onPrivateEvent(e *pb.PrivateEventFrontToPusher) {
	space := s.joinedSpace(e.GetSpaceName())
	if space == nil {
		s.sendError("Trying to send a private event to a space that does not exist: " + e.GetSpaceName())
		return
	}
	ev := e.GetSpaceEvent()
	switch v := ev.GetEvent().(type) {
	case *pb.PrivateSpaceEvent_KickOffUser:
		if !s.isAdmin() {
			s.sendError("Only admins can kick off a user")
			return
		}
	case *pb.PrivateSpaceEvent_MuteAudio:
		v.MuteAudio.Force = s.isAdmin()
	case *pb.PrivateSpaceEvent_MuteVideo:
		v.MuteVideo.Force = s.isAdmin()
	case *pb.PrivateSpaceEvent_ProximityFileTransferOffer:
		u := s.spaceUser()
		v.ProximityFileTransferOffer.CharacterTextures, v.ProximityFileTransferOffer.Name = characterTextures(u.Textures), proto.String(u.Name)
	}
	payload, _ := proto.Marshal(ev)
	_ = space.PrivateEvent(s.ctx, s.spaceUserID(), e.GetReceiverUserId(), payload, s.notPartOf(e.GetSpaceName()))
}

// onSpaceMetadata merges a JSON object into the space's metadata (the z.record of the pusher); anything else is dropped.
func (s *Session) onSpaceMetadata(u *pb.UpdateSpaceMetadataMessage) {
	var delta map[string]json.RawMessage
	if json.Unmarshal([]byte(u.GetMetadata()), &delta) != nil || delta == nil {
		slog.Warn("invalid space metadata", "space", u.GetSpaceName())
		return
	}
	if space := s.joinedSpace(u.GetSpaceName()); space != nil {
		_ = space.SetMetadata(s.ctx, s.spaceUserID(), delta)
	}
}

// onBackEvent is the front asking for a media connection again: a new LiveKit token, or a WebRTC pair restarted.
func (s *Session) onBackEvent(e *pb.BackEventFrontToPusherMessage) {
	restart := e.GetBackEvent().GetMeetingConnectionRestartMessage()
	space := s.joinedSpace(e.GetSpaceName())
	switch {
	case restart == nil || space == nil:
	case restart.UserId == nil: // the front lost LiveKit: a new token
		_ = space.RestartLiveKit(s.ctx, s.spaceUserID())
	default:
		_ = space.RestartConnection(s.ctx, s.spaceUserID(), restart.GetUserId(), restart.ConnectionId)
	}
}

// spaceStateQuery runs a SpaceStateQuery (raised hands, floor, polls, questions, kind).
func (s *Session) spaceStateQuery(id int32, q *pb.SpaceStateQueryFrontToPusher) {
	space := s.joinedSpace(q.GetSpaceName())
	if space == nil {
		s.answerError(id, "Space "+q.GetSpaceName()+" not found")
		return
	}
	query := stateQuery(q.GetQuery())
	if query == nil {
		s.answerError(id, "SpaceStateQuery has no query")
		return
	}
	switch query.(type) {
	case core.StartRecording, core.StopRecording:
		if !s.info.member.CanRecord {
			s.answerError(id, "You are not allowed to record")
			return
		}
	}
	_ = space.Query(s.ctx, s.spaceUserID(), query, func(err error) {
		if err != nil {
			s.answerError(id, err.Error())
			return
		}
		s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_SpaceStateAnswer{SpaceStateAnswer: &pb.SpaceStateAnswer{}}})
	})
}

func stateQuery(q *pb.SpaceStateQuery) any {
	switch v := q.GetQuery().(type) {
	case *pb.SpaceStateQuery_SetKind:
		return core.SetKind{Kind: v.SetKind.GetKind()}
	case *pb.SpaceStateQuery_RaiseHand:
		return core.RaiseHand{Raised: v.RaiseHand.GetRaised()}
	case *pb.SpaceStateQuery_LowerHand:
		return core.LowerHand{Target: v.LowerHand.GetTargetSpaceUserId()}
	case *pb.SpaceStateQuery_GiveFloor:
		return core.GiveFloor{Target: v.GiveFloor.GetTargetSpaceUserId()}
	case *pb.SpaceStateQuery_RevokeFloor:
		return core.RevokeFloor{Target: v.RevokeFloor.GetTargetSpaceUserId()}
	case *pb.SpaceStateQuery_StartRecording:
		return core.StartRecording{}
	case *pb.SpaceStateQuery_StopRecording:
		return core.StopRecording{}
	case *pb.SpaceStateQuery_CreatePoll:
		c := v.CreatePoll
		return core.CreatePoll{Question: c.GetQuestion(), Kind: c.GetKind(), Answers: c.GetAnswers(), MaxSelections: c.GetMaxSelections()}
	case *pb.SpaceStateQuery_VotePoll:
		return core.VotePoll{PollID: v.VotePoll.GetPollId(), AnswerIDs: v.VotePoll.GetAnswerIds()}
	case *pb.SpaceStateQuery_ClosePoll:
		return core.ClosePoll{PollID: v.ClosePoll.GetPollId(), ClosingMessage: v.ClosePoll.ClosingMessage}
	case *pb.SpaceStateQuery_DeletePoll:
		return core.DeletePoll{PollID: v.DeletePoll.GetPollId()}
	case *pb.SpaceStateQuery_AskQuestion:
		return core.AskQuestion{Body: v.AskQuestion.GetBody()}
	case *pb.SpaceStateQuery_UpvoteQuestion:
		return core.UpvoteQuestion{QuestionID: v.UpvoteQuestion.GetQuestionId(), Upvoted: v.UpvoteQuestion.GetUpvoted()}
	case *pb.SpaceStateQuery_AnswerQuestion:
		return core.AnswerQuestion{QuestionID: v.AnswerQuestion.GetQuestionId()}
	case *pb.SpaceStateQuery_DeleteQuestion:
		return core.DeleteQuestion{QuestionID: v.DeleteQuestion.GetQuestionId()}
	}
	return nil
}

// updateSpacesWithPlayerDetails mirrors a SetPlayerDetailsMessage in every space of the session.
func (s *Session) updateSpacesWithPlayerDetails(d core.PlayerDetails) {
	var u core.SpaceUser
	var mask []string
	if d.AvailabilityStatus != core.StatusUnchanged {
		u.AvailabilityStatus, mask = d.AvailabilityStatus, append(mask, "availabilityStatus")
	}
	if d.ChatID != nil {
		u.ChatID, mask = d.ChatID, append(mask, "chatID")
	}
	if d.ShowVoiceIndicator != nil {
		u.ShowVoiceIndicator, mask = *d.ShowVoiceIndicator, append(mask, "showVoiceIndicator")
	}
	if len(mask) == 0 {
		return
	}
	for _, sp := range s.memberships.all() {
		_ = sp.UpdatePlayerDetails(s.ctx, s.spaceUserID(), u, mask)
	}
}

// colorByString is Color.getColorByString of shared-utils (JavaScript 32-bit integer arithmetic on UTF-16 units).
func colorByString(s string) string {
	if s == "" {
		return "#000000"
	}
	var hash int32
	for _, c := range utf16.Encode([]rune(s)) {
		hash = int32(c) + (hash << 5) - hash
	}
	const hex = "0123456789abcdef"
	out := []byte{'#'}
	for i := 0; i < 3; i++ {
		v := (hash >> (i * 8)) & 255
		out = append(out, hex[v>>4], hex[v&15])
	}
	return string(out)
}

// Codec of the space events.

func spaceUser(u core.SpaceUser) *pb.SpaceUser {
	str := func(p *string) *wrapperspb.StringValue {
		if p == nil {
			return nil
		}
		return wrapperspb.String(*p)
	}
	return &pb.SpaceUser{
		SpaceUserId: u.ID, Name: u.Name, PlayUri: u.PlayURI, Color: u.Color, CharacterTextures: characterTextures(u.Textures),
		IsLogged: u.IsLogged, AvailabilityStatus: int32(u.AvailabilityStatus), RoomName: str(u.RoomName),
		VisitCardUrl: str(u.VisitCardURL), Tags: u.Tags, CameraState: u.CameraState, MicrophoneState: u.MicrophoneState,
		ScreenSharingState: u.ScreenSharingState, MegaphoneState: u.Megaphone, JitsiParticipantId: str(u.JitsiParticipantID),
		Uuid: u.UUID, ChatID: str(u.ChatID), ShowVoiceIndicator: u.ShowVoiceIndicator, AttendeesState: u.AttendeesState,
		CpuLimited: u.CPULimited,
	}
}

// fromSpaceUser reads the fields a client may update on itself.
func fromSpaceUser(m *pb.SpaceUser) core.SpaceUser {
	return core.SpaceUser{
		CameraState: m.GetCameraState(), MicrophoneState: m.GetMicrophoneState(), ScreenSharingState: m.GetScreenSharingState(),
		Megaphone: m.GetMegaphoneState(), AttendeesState: m.GetAttendeesState(), CPULimited: m.GetCpuLimited(),
	}
}

func spaceSubMessage(ev core.Event) *pb.SubMessage {
	switch e := ev.(type) {
	case core.SpaceUserAdded:
		return &pb.SubMessage{Message: &pb.SubMessage_AddSpaceUserMessage{AddSpaceUserMessage: &pb.AddSpaceUserMessage{SpaceName: e.Space, User: spaceUser(e.User)}}}
	case core.SpaceUserUpdated:
		return &pb.SubMessage{Message: &pb.SubMessage_UpdateSpaceUserMessage{UpdateSpaceUserMessage: &pb.UpdateSpaceUserPusherToFrontMessage{
			SpaceName: e.Space, User: spaceUser(e.User), UpdateMask: &fieldmaskpb.FieldMask{Paths: e.Mask}}}}
	case core.SpaceUserRemoved:
		return &pb.SubMessage{Message: &pb.SubMessage_RemoveSpaceUserMessage{RemoveSpaceUserMessage: &pb.RemoveSpaceUserPusherToFrontMessage{SpaceName: e.Space, SpaceUserId: e.UserID}}}
	case core.SpaceUsersInit:
		users := make([]*pb.SpaceUser, len(e.Users))
		for i, u := range e.Users {
			users[i] = spaceUser(u)
		}
		return &pb.SubMessage{Message: &pb.SubMessage_InitSpaceUsersMessage{InitSpaceUsersMessage: &pb.InitSpaceUsersMessage{SpaceName: e.Space, Users: users, Metadata: e.Metadata}}}
	case core.SpaceMetadataUpdated:
		return &pb.SubMessage{Message: &pb.SubMessage_UpdateSpaceMetadataMessage{UpdateSpaceMetadataMessage: &pb.UpdateSpaceMetadataMessage{SpaceName: e.Space, Metadata: e.Metadata}}}
	case core.SpaceStatePatch:
		return &pb.SubMessage{Message: &pb.SubMessage_SpaceStatePatchMessage{SpaceStatePatchMessage: &pb.SpaceStatePatchMessage{SpaceName: e.Space, Patch: e.Patch}}}
	case core.SpacePublicEvent:
		var ev pb.SpaceEvent
		_ = proto.Unmarshal(e.Payload, &ev)
		// The server signs chat messages and typing notices with the sender's name and woka (EventProcessorInit).
		switch v := ev.GetEvent().(type) {
		case *pb.SpaceEvent_SpaceMessage:
			v.SpaceMessage.Name, v.SpaceMessage.CharacterTextures = &e.Sender.Name, characterTextures(e.Sender.Textures)
		case *pb.SpaceEvent_SpaceIsTyping:
			v.SpaceIsTyping.Name, v.SpaceIsTyping.CharacterTextures = &e.Sender.Name, characterTextures(e.Sender.Textures)
		}
		return &pb.SubMessage{Message: &pb.SubMessage_PublicEvent{PublicEvent: &pb.PublicEvent{SpaceName: e.Space, SpaceEvent: &ev, SenderUserId: e.Sender.ID}}}
	case core.SpacePrivateEvent:
		return &pb.SubMessage{Message: &pb.SubMessage_PrivateEvent{PrivateEvent: &pb.PrivateEventPusherToFront{
			SpaceName: e.Space, ReceiverUserId: e.ReceiverID, Sender: spaceUser(e.Sender), SpaceEvent: privateSpaceEvent(e.Event)}}}
	}
	return nil
}

func privateSpaceEvent(ev core.PrivateEvent) *pb.PrivateSpaceEvent {
	switch e := ev.(type) {
	case core.WebRTCStart:
		return &pb.PrivateSpaceEvent{Event: &pb.PrivateSpaceEvent_WebRtcStartMessage{WebRtcStartMessage: &pb.WebRtcStartMessage{UserId: e.UserID, Initiator: e.Initiator, ConnectionId: e.ConnectionID}}}
	case core.WebRTCDisconnect:
		return &pb.PrivateSpaceEvent{Event: &pb.PrivateSpaceEvent_WebRtcDisconnectMessage{WebRtcDisconnectMessage: &pb.WebRtcDisconnectMessage{UserId: e.UserID}}}
	case core.SwitchStrategy:
		return &pb.PrivateSpaceEvent{Event: &pb.PrivateSpaceEvent_SwitchMessage{SwitchMessage: &pb.SwitchMessage{Strategy: e.Strategy}}}
	case core.FinalizeSwitch:
		return &pb.PrivateSpaceEvent{Event: &pb.PrivateSpaceEvent_FinalizeSwitchMessage{FinalizeSwitchMessage: &pb.FinalizeSwitchMessage{Strategy: e.Strategy}}}
	case core.LiveKitInvitation:
		return &pb.PrivateSpaceEvent{Event: &pb.PrivateSpaceEvent_LivekitInvitationMessage{LivekitInvitationMessage: &pb.LivekitInvitationMessage{Token: e.Token, ServerUrl: e.ServerURL}}}
	case core.LiveKitDisconnect:
		return &pb.PrivateSpaceEvent{Event: &pb.PrivateSpaceEvent_LivekitDisconnectMessage{LivekitDisconnectMessage: &pb.LivekitDisconnectMessage{}}}
	case core.RelayedEvent:
		var p pb.PrivateSpaceEvent
		_ = proto.Unmarshal(e.Payload, &p)
		return &p
	}
	panic("ws: unknown private space event")
}
