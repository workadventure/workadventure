package ws

import (
	"fmt"

	"google.golang.org/protobuf/encoding/protowire"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/wrapperspb"

	"github.com/workadventure/workadventure/server-go/internal/admin"
	"github.com/workadventure/workadventure/server-go/internal/core"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

// Wire layout (messages.proto):
//
//	PusherToFrontWebSocketMessage { uint32 nonce = 1; ServerToClientMessage message = 2; }
//	ServerToClientMessage         { oneof { BatchMessage batchMessage = 1; ... } }
//	BatchMessage                  { string event = 1; repeated SubMessage payload = 2; }
//
// A batched core.Msg is encoded once as a complete "payload" entry (tag 2 + length + SubMessage). A batch is then
// the concatenation of shared entries behind a few bytes of per-connection header: the SubMessages, which hold
// all the data, are never marshalled twice.

// encodeShared encodes a message the same way for every recipient. Direct messages are a whole
// ServerToClientMessage; batched ones a BatchMessage.payload entry.
func encodeShared(m *core.Msg) []byte {
	if m.Batched {
		sub, err := proto.Marshal(subMessage(m.Event))
		if err != nil {
			panic(err) // only reachable with a programming error
		}
		entry := protowire.AppendTag(make([]byte, 0, len(sub)+6), 2, protowire.BytesType)
		return protowire.AppendBytes(entry, sub)
	}
	b, err := proto.Marshal(serverMessage(m.Event))
	if err != nil {
		panic(err)
	}
	return b
}

func subMessage(ev any) *pb.SubMessage {
	switch e := ev.(type) {
	case core.MapEdit:
		return e.Event.(*pb.SubMessage)
	case *pb.SubMessage: // built by the adapter itself (scripting events)
		return e
	case core.VariableChanged:
		return &pb.SubMessage{Message: &pb.SubMessage_VariableMessage{VariableMessage: &pb.VariableMessage{Name: e.Name, Value: e.Value}}}
	case core.AreaVariableChanged:
		v := e.Variable
		return &pb.SubMessage{Message: &pb.SubMessage_AreaPropertyVariableMessage{AreaPropertyVariableMessage: &pb.AreaPropertyVariableMessage{
			AreaId: v.AreaID, PropertyId: v.PropertyID, Key: v.Key, Value: v.Value}}}
	case core.UserJoined:
		return &pb.SubMessage{Message: &pb.SubMessage_UserJoinedMessage{UserJoinedMessage: userJoined(e.User)}}
	case core.EmoteEvent:
		return &pb.SubMessage{Message: &pb.SubMessage_EmoteEventMessage{EmoteEventMessage: &pb.EmoteEventMessage{ActorUserId: e.ActorUserID, Emote: e.Emote}}}
	case core.UserMoved:
		return &pb.SubMessage{Message: &pb.SubMessage_UserMovedMessage{UserMovedMessage: &pb.UserMovedMessage{UserId: e.UserID, Position: position(e.Position)}}}
	case core.UserLeft:
		return &pb.SubMessage{Message: &pb.SubMessage_UserLeftMessage{UserLeftMessage: &pb.UserLeftMessage{UserId: e.UserID}}}
	case core.GroupUpdated:
		return &pb.SubMessage{Message: &pb.SubMessage_GroupUpdateMessage{GroupUpdateMessage: &pb.GroupUpdateMessage{
			GroupId:   e.GroupID,
			Position:  &pb.PointMessage{X: e.X, Y: e.Y},
			GroupSize: wrapperspb.UInt32(uint32(e.Size)),
			Locked:    wrapperspb.Bool(e.Locked),
			UserIds:   e.UserIDs,
		}}}
	case core.GroupDeleted:
		return &pb.SubMessage{Message: &pb.SubMessage_GroupDeleteMessage{GroupDeleteMessage: &pb.GroupDeleteMessage{GroupId: e.GroupID}}}
	case core.GroupUsersUpdated:
		return &pb.SubMessage{Message: &pb.SubMessage_GroupUsersUpdateMessage{GroupUsersUpdateMessage: &pb.GroupUsersUpdateMessage{GroupId: e.GroupID, UserIds: e.UserIDs}}}
	case core.PlayerDetailsUpdated:
		return &pb.SubMessage{Message: &pb.SubMessage_PlayerDetailsUpdatedMessage{PlayerDetailsUpdatedMessage: &pb.PlayerDetailsUpdatedMessage{UserId: e.UserID, Details: playerDetails(e.Details)}}}
	case ping:
		return &pb.SubMessage{Message: &pb.SubMessage_PingMessage{PingMessage: &pb.PingMessage{}}}
	}
	if sub := spaceSubMessage(ev); sub != nil {
		return sub
	}
	panic(fmt.Sprintf("ws: no SubMessage for %T", ev))
}

func serverMessage(ev any) *pb.ServerToClientMessage {
	switch e := ev.(type) {
	case core.JoinSpaceRequest:
		return &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_JoinSpaceRequestMessage{JoinSpaceRequestMessage: &pb.JoinSpaceRequestMessage{SpaceName: e.SpaceName, PropertiesToSync: e.PropertiesToSync}}}
	case core.LeaveSpaceRequest:
		return &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_LeaveSpaceRequestMessage{LeaveSpaceRequestMessage: &pb.LeaveSpaceRequestMessage{SpaceName: e.SpaceName}}}
	case core.DuplicateUserConnected:
		return &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_DuplicateUserConnectedMessage{DuplicateUserConnectedMessage: &pb.DuplicateUserConnectedMessage{}}}
	case core.MoveToPosition:
		return &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_MoveToPositionMessage{MoveToPositionMessage: &pb.MoveToPositionMessage{Position: position(e.Position)}}}
	case core.LocatePosition:
		return &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_LocatePositionMessage{LocatePositionMessage: &pb.LocatePositionMessage{
			Position: position(e.Position), UserId: e.UserID, UserUuid: e.UUID}}}
	case core.MapReplaced:
		return &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_RefreshRoomMessage{RefreshRoomMessage: &pb.RefreshRoomMessage{
			RoomId: e.RoomURL, TimeToRefresh: proto.Int32(30)}}}
	case core.RoomError:
		return &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_ErrorMessage{ErrorMessage: &pb.ErrorMessage{Message: e.Message}}}
	case core.InvitationReceived:
		id := e.SenderID
		return &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_MeetingInvitationRequestReceivedMessage{MeetingInvitationRequestReceivedMessage: &pb.MeetingInvitationRequestReceivedMessage{
			SenderUserUuid: e.SenderUUID, SenderPlayUri: e.PlayURI, SenderName: e.SenderName, SenderUserId: &id}}}
	case core.InvitationAnswered:
		return &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_MeetingInvitationResponseReceivedMessage{MeetingInvitationResponseReceivedMessage: &pb.MeetingInvitationResponseReceivedMessage{
			Accepted: e.Accepted, ResponderName: e.ResponderName}}}
	case core.InvitationTooHigh:
		return &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_MeetingInvitationRequestTooHighMessage{MeetingInvitationRequestTooHighMessage: &pb.MeetingInvitationRequestTooHighMessage{}}}
	case core.InvitationClosed:
		return &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_MeetingInvitationRequestClosedMessage{MeetingInvitationRequestClosedMessage: &pb.MeetingInvitationRequestClosedMessage{}}}
	case core.Ejected:
		return &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_BanUserMessage{BanUserMessage: &pb.BanUserMessage{Type: e.Type, Message: e.Message}}}
	case core.FollowRequested:
		return &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_FollowRequestMessage{FollowRequestMessage: &pb.FollowRequestMessage{Leader: e.Leader, ForceFollow: e.Force}}}
	case core.FollowConfirmed:
		return &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_FollowConfirmationMessage{FollowConfirmationMessage: &pb.FollowConfirmationMessage{Leader: e.Leader, Follower: e.Follower}}}
	case core.FollowAborted:
		return &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_FollowAbortMessage{FollowAbortMessage: &pb.FollowAbortMessage{Leader: e.Leader, Follower: e.Follower}}}
	case core.UserMessage:
		return &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_SendUserMessage{SendUserMessage: &pb.SendUserMessage{Type: e.Type, Message: e.Message}}}
	case core.MapDeleted:
		return &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_DeleteMapMessage{DeleteMapMessage: &pb.DeleteMapMessage{}}}
	case *pb.ServerToClientMessage: // built by the adapter itself (connection, answers, errors)
		return e
	}
	panic(fmt.Sprintf("ws: no ServerToClientMessage for %T", ev))
}

// ping is the application-level ping of the back: the front closes the connection after 100 s without one.
type ping struct{}

func position(p core.Position) *pb.PositionMessage {
	return &pb.PositionMessage{X: p.X, Y: p.Y, Direction: pb.PositionMessage_Direction(p.Direction), Moving: p.Moving}
}

func characterTextures(ts []core.Texture) []*pb.CharacterTextureMessage {
	out := make([]*pb.CharacterTextureMessage, len(ts))
	for i, t := range ts {
		out[i] = &pb.CharacterTextureMessage{Id: t.ID, Url: t.URL}
	}
	return out
}

func companionTexture(t *core.Texture) *pb.CompanionTextureMessage {
	if t == nil {
		return nil
	}
	return &pb.CompanionTextureMessage{Id: t.ID, Url: t.URL}
}

func userJoined(u core.UserView) *pb.UserJoinedMessage {
	m := &pb.UserJoinedMessage{
		UserId: u.ID, Name: u.Name, CharacterTextures: characterTextures(u.Textures), Position: position(u.Position),
		CompanionTexture: companionTexture(u.Companion), VisitCardUrl: u.VisitCardURL, UserUuid: u.UUID,
		AvailabilityStatus: pb.AvailabilityStatus(u.Status), Variables: u.Variables, ChatID: u.ChatID,
	}
	if u.OutlineColor != nil {
		m.OutlineColor, m.HasOutline = *u.OutlineColor, true
	}
	if u.Say != nil {
		m.SayMessage = &pb.SayMessage{Message: u.Say.Message, Type: pb.SayMessageType(u.Say.Type)}
	}
	return m
}

func playerDetails(d core.PlayerDetails) *pb.SetPlayerDetailsMessage {
	m := &pb.SetPlayerDetailsMessage{AvailabilityStatus: pb.AvailabilityStatus(d.AvailabilityStatus)}
	if d.OutlineColor != nil {
		m.OutlineColor = wrapperspb.UInt32(*d.OutlineColor)
	}
	if d.RemoveOutlineColor != nil {
		m.RemoveOutlineColor = wrapperspb.Bool(*d.RemoveOutlineColor)
	}
	if d.ShowVoiceIndicator != nil {
		m.ShowVoiceIndicator = wrapperspb.Bool(*d.ShowVoiceIndicator)
	}
	if v := d.SetVariable; v != nil {
		m.SetVariable = &pb.SetPlayerVariableMessage{Name: v.Name, Value: v.Value, Public: v.Public, Persist: v.Persist, Scope: pb.SetPlayerVariableMessage_Scope(v.Scope)}
		if v.TTL != nil {
			m.SetVariable.Ttl = wrapperspb.Int32(*v.TTL)
		}
	}
	if d.ChatID != nil {
		m.ChatID = wrapperspb.String(*d.ChatID)
	}
	if d.Say != nil {
		m.SayMessage = &pb.SayMessage{Message: d.Say.Message, Type: pb.SayMessageType(d.Say.Type)}
	}
	return m
}

// From the client.

func toPosition(p *pb.PositionMessage) core.Position {
	return core.Position{X: p.GetX(), Y: p.GetY(), Direction: core.Direction(p.GetDirection()), Moving: p.GetMoving()}
}

func toViewport(v *pb.ViewportMessage) core.Viewport {
	return core.Viewport{Left: v.GetLeft(), Top: v.GetTop(), Right: v.GetRight(), Bottom: v.GetBottom()}
}

func toPlayerDetails(m *pb.SetPlayerDetailsMessage) core.PlayerDetails {
	d := core.PlayerDetails{AvailabilityStatus: core.AvailabilityStatus(m.GetAvailabilityStatus())}
	if m.OutlineColor != nil {
		v := m.OutlineColor.Value
		d.OutlineColor = &v
	}
	if m.RemoveOutlineColor != nil {
		v := m.RemoveOutlineColor.Value
		d.RemoveOutlineColor = &v
	}
	if m.ShowVoiceIndicator != nil {
		v := m.ShowVoiceIndicator.Value
		d.ShowVoiceIndicator = &v
	}
	if v := m.SetVariable; v != nil {
		pv := &core.PlayerVariable{Name: v.Name, Value: v.Value, Public: v.Public, Persist: v.Persist, Scope: core.VariableScope(v.Scope)}
		if v.Ttl != nil {
			ttl := v.Ttl.Value
			pv.TTL = &ttl
		}
		d.SetVariable = pv
	}
	if m.ChatID != nil {
		v := m.ChatID.Value
		d.ChatID = &v
	}
	if m.SayMessage != nil {
		d.Say = &core.Say{Message: m.SayMessage.Message, Type: core.SayType(m.SayMessage.Type)}
	}
	return d
}

func coreTextures(ts []admin.Texture) []core.Texture {
	out := make([]core.Texture, len(ts))
	for i, t := range ts {
		out[i] = core.Texture{ID: t.ID, URL: t.URL}
	}
	return out
}

// Frames.

func appendEnvelope(dst []byte, nonce uint32, messageLen int) []byte {
	dst = protowire.AppendTag(dst, 1, protowire.VarintType)
	dst = protowire.AppendVarint(dst, uint64(nonce))
	dst = protowire.AppendTag(dst, 2, protowire.BytesType)
	return protowire.AppendVarint(dst, uint64(messageLen))
}

const maxEnvelopeLen = 1 + 5 + 1 + 10

// directFrame wraps an encoded ServerToClientMessage.
func directFrame(nonce uint32, message []byte) []byte {
	f := appendEnvelope(make([]byte, 0, maxEnvelopeLen+len(message)), nonce, len(message))
	return append(f, message...)
}

// batchFrame builds a batchMessage out of shared payload entries.
func batchFrame(nonce uint32, entries [][]byte) []byte {
	n := 0
	for _, e := range entries {
		n += len(e)
	}
	messageLen := protowire.SizeTag(1) + protowire.SizeVarint(uint64(n)) + n
	f := appendEnvelope(make([]byte, 0, maxEnvelopeLen+messageLen), nonce, messageLen)
	f = protowire.AppendTag(f, 1, protowire.BytesType)
	f = protowire.AppendVarint(f, uint64(n))
	for _, e := range entries {
		f = append(f, e...)
	}
	return f
}

func errorScreen(e errorScreenData) *pb.ServerToClientMessage {
	s := &pb.ErrorScreenMessage{
		Type: e.Type, Code: wrapperspb.String(e.Code), Title: wrapperspb.String(e.Title),
		Subtitle: wrapperspb.String(e.Subtitle), Details: wrapperspb.String(e.Details),
		Image: wrapperspb.String(e.Image), ImageLogo: wrapperspb.String(e.ImageLogo),
		ButtonTitle: wrapperspb.String(e.ButtonTitle), CanRetryManual: wrapperspb.Bool(e.CanRetryManual),
		TimeToRetry: wrapperspb.Int32(e.TimeToRetry), UrlToRedirect: wrapperspb.String(""),
	}
	return &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_ErrorScreenMessage{ErrorScreenMessage: s}}
}

type errorScreenData struct {
	Type, Code, Title, Subtitle, Details, Image, ImageLogo, ButtonTitle string
	CanRetryManual                                                      bool
	TimeToRetry                                                         int32
}

// errorScreenOf shows an ErrorApiData of the admin as the pusher does (toErrorScreenMessage).
func errorScreenOf(e map[string]any) *pb.ServerToClientMessage {
	str := func(k string) string { v, _ := e[k].(string); return v }
	d := errorScreenData{Type: str("type")}
	switch d.Type {
	case "error", "retry", "unauthorized":
		d.Code, d.Title, d.Subtitle, d.Details, d.Image, d.ImageLogo = str("code"), str("title"), str("subtitle"), str("details"), str("image"), str("imageLogo")
		if d.Type != "error" {
			d.ButtonTitle = str("buttonTitle")
		}
	}
	if d.Type == "retry" {
		d.CanRetryManual, _ = e["canRetryManual"].(bool)
		if n, ok := e["timeToRetry"].(float64); ok {
			d.TimeToRetry = int32(n)
		}
	}
	m := errorScreen(d)
	if d.Type == "redirect" {
		m.GetErrorScreenMessage().UrlToRedirect = wrapperspb.String(str("urlToRedirect"))
	}
	return m
}
