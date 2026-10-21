package ws

import (
	"log/slog"

	"google.golang.org/protobuf/proto"

	"github.com/workadventure/workadventure/server-go/internal/core"
	"github.com/workadventure/workadventure/server-go/internal/metrics"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

// handle routes a client message to its handler, one per message. Space messages are in spaces.go, queries in
// query (session.go), moderation in moderation.go.
func (s *Session) handle(m *pb.ClientToServerMessage) {
	ctx := s.ctx
	switch msg := m.Message.(type) {
	case *pb.ClientToServerMessage_JoinRoomFrontMessage:
		s.onJoinRoom(msg.JoinRoomFrontMessage)
	case *pb.ClientToServerMessage_VariableMessage:
		s.setVariable(ctx, core.Variable{Name: msg.VariableMessage.GetName(), Value: msg.VariableMessage.GetValue()})
	case *pb.ClientToServerMessage_UserMovesMessage:
		vp := toViewport(msg.UserMovesMessage.GetViewport())
		metrics.Ignore("room.Move", s.room.Move(ctx, s, toPosition(msg.UserMovesMessage.GetPosition()), &vp))
	case *pb.ClientToServerMessage_ViewportMessage:
		metrics.Ignore("room.SetViewport", s.room.SetViewport(ctx, s, toViewport(msg.ViewportMessage)))
	case *pb.ClientToServerMessage_SetPlayerDetailsMessage:
		s.onSetPlayerDetails(msg.SetPlayerDetailsMessage)
	case *pb.ClientToServerMessage_AskPositionMessage:
		a := msg.AskPositionMessage
		metrics.Ignore("room.AskPosition", s.room.AskPosition(ctx, s, a.GetUserIdentifier(), a.UserId, a.GetAskType() == pb.AskPositionMessage_LOCATE))
	case *pb.ClientToServerMessage_LockGroupPromptMessage:
		metrics.Ignore("room.LockGroup", s.room.LockGroup(ctx, s, msg.LockGroupPromptMessage.GetLock()))
	case *pb.ClientToServerMessage_PingMessage:
		// The pong of the application-level ping: liveness is checked by the transport pings.
	case *pb.ClientToServerMessage_QueryMessage:
		s.query(msg.QueryMessage)
	case *pb.ClientToServerMessage_EditMapCommandMessage:
		s.editMap(msg.EditMapCommandMessage)
	case *pb.ClientToServerMessage_PlayGlobalMessage:
		if s.isAdmin() {
			go s.playGlobalMessage(msg.PlayGlobalMessage)
		}
	case *pb.ClientToServerMessage_EmotePromptMessage:
		metrics.Ignore("room.Emote", s.room.Emote(ctx, s, msg.EmotePromptMessage.GetEmote()))
	case *pb.ClientToServerMessage_ItemEventMessage:
		s.onItemEvent(msg.ItemEventMessage)
	case *pb.ClientToServerMessage_EntityMessage:
		s.onEntity(msg.EntityMessage)
	case *pb.ClientToServerMessage_AbortQueryMessage:
		s.onAbortQuery(msg.AbortQueryMessage.GetId())
	case *pb.ClientToServerMessage_BanPlayerMessage:
		s.onBan(msg.BanPlayerMessage)
	case *pb.ClientToServerMessage_ReportPlayerMessage:
		s.onReport(msg.ReportPlayerMessage)
	case *pb.ClientToServerMessage_LeaveChatRoomAreaMessage:
		s.leaveChatArea(msg.LeaveChatRoomAreaMessage.GetRoomID())
	case *pb.ClientToServerMessage_UpdateChatIdMessage:
		s.updateChatID(msg.UpdateChatIdMessage.GetEmail(), msg.UpdateChatIdMessage.GetChatId())
	case *pb.ClientToServerMessage_AnalyticsEventReportMessage:
		s.analyticsReport(msg.AnalyticsEventReportMessage)
	case *pb.ClientToServerMessage_VideoQualityReportMessage:
		s.videoQuality(msg.VideoQualityReportMessage)
	case *pb.ClientToServerMessage_MeetingInvitationRequestMessage:
		metrics.Ignore("room.InviteToMeeting", s.room.InviteToMeeting(ctx, s, msg.MeetingInvitationRequestMessage.GetReceiverUserUuid(), s.isAdmin()))
	case *pb.ClientToServerMessage_MeetingInvitationResponseMessage:
		r := msg.MeetingInvitationResponseMessage
		metrics.Ignore("room.AnswerMeetingInvitation", s.room.AnswerMeetingInvitation(ctx, s, r.GetAccept(), r.GetRequestSenderUserUuid()))
	case *pb.ClientToServerMessage_FollowRequestMessage:
		metrics.Ignore("room.FollowRequest", s.room.FollowRequest(ctx, s, msg.FollowRequestMessage.GetForceFollow()))
	case *pb.ClientToServerMessage_FollowConfirmationMessage:
		metrics.Ignore("room.FollowConfirm", s.room.FollowConfirm(ctx, s, msg.FollowConfirmationMessage.GetLeader()))
	case *pb.ClientToServerMessage_FollowAbortMessage:
		metrics.Ignore("room.FollowAbort", s.room.FollowAbort(ctx, s, msg.FollowAbortMessage.GetLeader(), msg.FollowAbortMessage.GetFollower()))
	case *pb.ClientToServerMessage_SetAreaPropertyVariableMessage:
		v := msg.SetAreaPropertyVariableMessage
		metrics.Ignore("room.SetAreaVariable", s.room.SetAreaVariable(ctx, s, core.AreaVariable{AreaID: v.GetAreaId(), PropertyID: v.GetPropertyId(), Key: v.GetKey(), Value: v.GetValue()},
			s.info.member.Tags))
	default:
		if s.handleSpaceMessage(m) {
			return
		}
		if f := m.ProtoReflect().WhichOneof(m.ProtoReflect().Descriptor().Oneofs().Get(0)); f != nil {
			slog.Debug("message not handled yet", "type", f.Name())
		}
	}
}

// onJoinRoom enters the room: the player shows itself with its name, textures, position and stored variables.
func (s *Session) onJoinRoom(j *pb.JoinRoomFrontMessage) {
	s.presence.mu.Lock()
	first := !s.presence.joined
	s.presence.joined = true
	s.presence.name, s.presence.status = j.GetName(), core.AvailabilityStatus(j.GetAvailabilityStatus())
	s.presence.mu.Unlock()
	if first {
		metrics.ClientJoined(s.info.roomID)
	}
	var chatID *string
	if id := s.chat.get(); id != "" {
		chatID = &id
	}
	var companion *core.Texture
	if c := s.info.member.CompanionTexture; c != nil {
		companion = &core.Texture{ID: c.ID, URL: c.URL}
	}
	visitCard := ""
	if s.info.member.VisitCardURL != nil {
		visitCard = *s.info.member.VisitCardURL
	}
	// The variables are read here, on this reader, before the join is posted: the join sees them.
	s.room.InitVariables(s.ctx, func() core.RoomVariables { return s.srv.roomVariables(s.info.roomID) })
	metrics.Ignore("room.Join", s.room.Join(s.ctx, s, core.JoinRequest{
		UUID: s.info.userUUID, TabID: s.info.tabID, Name: j.GetName(), Textures: coreTextures(s.info.member.CharacterTextures),
		Companion: companion, VisitCardURL: visitCard, ChatID: chatID, Status: core.AvailabilityStatus(j.GetAvailabilityStatus()),
		Position: toPosition(j.GetPositionMessage()), Viewport: toViewport(j.GetViewportMessage()),
		Tags: s.info.member.Tags, IsLogged: s.info.isLogged, IPAddress: s.info.ipAddress, PlayerVariables: s.storedPlayerVariables(),
	}))
}

// onSetPlayerDetails changes what the player shows (status, a player variable), in the room and in its spaces.
func (s *Session) onSetPlayerDetails(m *pb.SetPlayerDetailsMessage) {
	d := toPlayerDetails(m)
	if d.AvailabilityStatus != core.StatusUnchanged {
		s.presence.setStatus(d.AvailabilityStatus)
	}
	if d.SetVariable != nil {
		s.storePlayerVariable(d.SetVariable)
	}
	metrics.Ignore("room.SetPlayerDetails", s.room.SetPlayerDetails(s.ctx, s, d))
	s.updateSpacesWithPlayerDetails(d)
}

// onItemEvent keeps the state of an item and relays the event to the room.
func (s *Session) onItemEvent(e *pb.ItemEventMessage) {
	metrics.Ignore("room.ItemEvent", s.room.ItemEvent(s.ctx, core.ItemState{ItemID: e.GetItemId(), StateJSON: e.GetStateJson()},
		core.NewMsg(core.ItemEvent{ItemID: e.GetItemId(), Event: e.GetEvent(), StateJSON: e.GetStateJson(), ParametersJSON: e.GetParametersJson()}, true)))
}

// onEntity relays an entity event to the whole room (dispatchEntityEvent).
func (s *Session) onEntity(e *pb.EntityMessage) {
	if e.GetEntityEvent() == nil {
		return
	}
	event, err := proto.Marshal(e.GetEntityEvent())
	if err == nil {
		metrics.Ignore("room.SendEvent", s.room.SendEvent(s.ctx, core.NewMsg(core.EntityEvent{EntityID: e.GetEntityId(), Event: event}, true), nil))
	}
}

// onAbortQuery: the reader answers in order, so an abort always comes after its answer. The front aborted a join it
// had no answer for yet: it does not know it is in the space, so leave it (as the pusher's abort handler).
func (s *Session) onAbortQuery(id int32) {
	if local, ok := s.memberships.joinedByQuery(id); ok {
		s.leaveSpace(0, local)
	}
}
