package ws

import (
	"context"
	"slices"
	"strconv"
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

// joinedSpace returns the space if the session is a member (it then holds a reference on it in the registry).
func (s *Session) joinedSpace(local string) *core.Space {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.spaces[local]
}

func (s *Session) joinSpace(id int32, q *pb.JoinSpaceQuery) {
	if s.userID.Load() == 0 {
		s.answerError(id, "Cannot join a space before joining the room")
		return
	}
	local := q.GetSpaceName()
	s.mu.Lock()
	_, already := s.spaces[local]
	s.mu.Unlock()
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
	s.mu.Lock()
	s.spaces[local] = space
	s.mu.Unlock()
}

func (s *Session) leaveSpace(id int32, local string) {
	s.mu.Lock()
	space := s.spaces[local]
	delete(s.spaces, local)
	s.mu.Unlock()
	reply := func() {
		s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_LeaveSpaceAnswer{LeaveSpaceAnswer: &pb.LeaveSpaceAnswer{}}})
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
	s.mu.Lock()
	spaces := s.spaces
	s.spaces = map[string]*core.Space{}
	s.mu.Unlock()
	for local, space := range spaces {
		_ = space.Leave(context.Background(), s.spaceUserID(), nil)
		s.srv.spaces.Release(s.spaceKey(local))
	}
}

func (s *Session) spaceUser() core.SpaceUser {
	s.mu.Lock()
	name, status := s.name, s.status
	s.mu.Unlock()
	u := core.SpaceUser{
		ID: s.spaceUserID(), Name: name, PlayURI: s.info.roomID, Color: colorByString(name),
		Textures: coreTextures(s.info.member.CharacterTextures), IsLogged: s.info.isLogged, AvailabilityStatus: status,
		VisitCardURL: s.info.member.VisitCardURL, Tags: s.info.member.Tags, UUID: s.info.userUUID,
	}
	if s.info.roomName != "" {
		u.RoomName = &s.info.roomName
	}
	if s.info.chatID != "" {
		u.ChatID = &s.info.chatID
	}
	return u
}

func (s *Session) isAdmin() bool { return slices.Contains(s.info.member.Tags, "admin") }

func (s *Session) notPartOf(local string) func() {
	return func() { s.sendError("Client is not part of space " + local) }
}

func (s *Session) sendError(message string) {
	s.out.push(core.NewMsg(&pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_ErrorMessage{
		ErrorMessage: &pb.ErrorMessage{Message: "An error occurred in pusher: " + message}}}, false))
}

func (s *Session) handleSpaceMessage(m *pb.ClientToServerMessage) bool {
	switch msg := m.Message.(type) {
	case *pb.ClientToServerMessage_AddSpaceFilterMessage:
		local := msg.AddSpaceFilterMessage.GetSpaceFilterMessage().GetSpaceName()
		if space := s.joinedSpace(local); space != nil {
			_ = space.Watch(s.ctx, s.spaceUserID(), s.notPartOf(local))
		} else {
			s.notPartOf(local)()
		}
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
		e := msg.PublicEvent
		space := s.joinedSpace(e.GetSpaceName())
		if space == nil {
			s.sendError("Trying to send a public event to a space that does not exist: " + e.GetSpaceName())
			return true
		}
		switch e.GetSpaceEvent().GetEvent().(type) {
		case *pb.SpaceEvent_MuteAudioForEverybody, *pb.SpaceEvent_MuteVideoForEverybody:
			if !s.isAdmin() {
				s.sendError("Only admins can mute everyone")
				return true
			}
		}
		payload, _ := proto.Marshal(e.GetSpaceEvent())
		_ = space.PublicEvent(s.ctx, s.spaceUserID(), payload, s.notPartOf(e.GetSpaceName()))
	case *pb.ClientToServerMessage_PrivateEvent:
		e := msg.PrivateEvent
		space := s.joinedSpace(e.GetSpaceName())
		if space == nil {
			s.sendError("Trying to send a private event to a space that does not exist: " + e.GetSpaceName())
			return true
		}
		ev := e.GetSpaceEvent()
		switch v := ev.GetEvent().(type) {
		case *pb.PrivateSpaceEvent_KickOffUser:
			if !s.isAdmin() {
				s.sendError("Only admins can kick off a user")
				return true
			}
		case *pb.PrivateSpaceEvent_MuteAudio:
			v.MuteAudio.Force = s.isAdmin()
		case *pb.PrivateSpaceEvent_MuteVideo:
			v.MuteVideo.Force = s.isAdmin()
		}
		payload, _ := proto.Marshal(ev)
		_ = space.PrivateEvent(s.ctx, s.spaceUserID(), e.GetReceiverUserId(), payload, s.notPartOf(e.GetSpaceName()))
	case *pb.ClientToServerMessage_BackEvent:
		e := msg.BackEvent
		restart := e.GetBackEvent().GetMeetingConnectionRestartMessage()
		if restart == nil || restart.UserId == nil {
			return true // a LiveKit restart: no LiveKit yet
		}
		if space := s.joinedSpace(e.GetSpaceName()); space != nil {
			_ = space.RestartConnection(s.ctx, s.spaceUserID(), restart.GetUserId(), restart.ConnectionId)
		}
	default:
		return false
	}
	return true
}

// spaceStateQuery answers SetSpaceKindQuery. ponytail: raised hands, floor, recording, polls and questions come
// with J2.
func (s *Session) spaceStateQuery(id int32, q *pb.SpaceStateQueryFrontToPusher) {
	space := s.joinedSpace(q.GetSpaceName())
	setKind := q.GetQuery().GetSetKind()
	if space == nil || setKind == nil {
		s.answerError(id, "Space state query not supported by this server yet")
		return
	}
	_ = space.SetKind(s.ctx, s.spaceUserID(), setKind.GetKind(), func(err error) {
		if err != nil {
			s.answerError(id, err.Error())
			return
		}
		s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_SpaceStateAnswer{SpaceStateAnswer: &pb.SpaceStateAnswer{}}})
	})
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
	s.mu.Lock()
	spaces := make([]*core.Space, 0, len(s.spaces))
	for _, space := range s.spaces {
		spaces = append(spaces, space)
	}
	s.mu.Unlock()
	for _, sp := range spaces {
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

func spaceSubMessage(ev any) *pb.SubMessage {
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
		return &pb.SubMessage{Message: &pb.SubMessage_InitSpaceUsersMessage{InitSpaceUsersMessage: &pb.InitSpaceUsersMessage{SpaceName: e.Space, Users: users, Metadata: "{}"}}}
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

func privateSpaceEvent(ev any) *pb.PrivateSpaceEvent {
	switch e := ev.(type) {
	case core.WebRTCStart:
		return &pb.PrivateSpaceEvent{Event: &pb.PrivateSpaceEvent_WebRtcStartMessage{WebRtcStartMessage: &pb.WebRtcStartMessage{UserId: e.UserID, Initiator: e.Initiator, ConnectionId: e.ConnectionID}}}
	case core.WebRTCDisconnect:
		return &pb.PrivateSpaceEvent{Event: &pb.PrivateSpaceEvent_WebRtcDisconnectMessage{WebRtcDisconnectMessage: &pb.WebRtcDisconnectMessage{UserId: e.UserID}}}
	case core.SwitchStrategy:
		return &pb.PrivateSpaceEvent{Event: &pb.PrivateSpaceEvent_SwitchMessage{SwitchMessage: &pb.SwitchMessage{Strategy: e.Strategy}}}
	case core.RelayedEvent:
		var p pb.PrivateSpaceEvent
		_ = proto.Unmarshal(e.Payload, &p)
		return &p
	}
	panic("ws: unknown private space event")
}
