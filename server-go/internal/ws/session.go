// Package ws is the WebSocket adapter: it authenticates clients, speaks the frozen front <-> server protocol
// (protobuf, nonce envelopes, transport resume) and turns client messages into calls on the core.
package ws

import (
	"context"
	"log/slog"
	"runtime/debug"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/coder/websocket"
	"google.golang.org/protobuf/proto"

	"github.com/workadventure/workadventure/server-go/internal/admin"
	"github.com/workadventure/workadventure/server-go/internal/analytics"
	"github.com/workadventure/workadventure/server-go/internal/core"
	"github.com/workadventure/workadventure/server-go/internal/metrics"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

const (
	// transportPingInterval keeps the connection alive across proxies (PusherWebSocket.KEEP_ALIVE_INTERVAL_MS);
	// Server.pingInterval, so that a test can shorten it.
	transportPingInterval = 25 * time.Second
	// outboxLimit bounds the messages waiting for one client (see outbox).
	outboxLimit = 1024
	// resumeMaxBytes bounds the frames kept per client for a transport resume (see resumeStore).
	resumeMaxBytes = 512 << 10
	// batchDelay is how long zone traffic waits to be sent together (emitInBatch).
	batchDelay = 100 * time.Millisecond
	// appPingInterval is the back's PING_INTERVAL: the front closes the connection after 100 s without a ping.
	appPingInterval = 80 * time.Second
	writeTimeout    = 10 * time.Second
	closeGrace      = time.Second
	maxMessageSize  = 16 << 20

	// statusSessionDestroyed tells the front the logical session is gone: no resume, reconnect from scratch
	// (WS_CLOSE_CODE_SESSION_DESTROYED).
	statusSessionDestroyed websocket.StatusCode = 4000
)

var pingMsg = core.NewMsg(ping{}, true)

// sessionInfo is what the upgrade learnt about the client. It never changes afterwards.
type sessionInfo struct {
	token, roomID, connectionID, tabID string
	userUUID, ipAddress                string
	isLogged                           bool
	member                             admin.MemberData
	chatID, roomName                   string // chatID: the one known at the upgrade; Session.chat holds the current one
	lastCommandID                      string // the last map edit the client's copy of the map has
}

// Session is a logical connection. It survives a transport drop for CLIENT_DISCONNECTION_RETENTION_MS: if the
// client reconnects with the same connectionId, the new transport takes over and missed frames are replayed.
//
// It is made of parts that each keep their own state behind their own lock:
//   - t: the WebSocket transport (connection, frame numbering, replay, retention, keepalive) — transport.go;
//   - presence: in the room or not, the name and status the player shows;
//   - memberships: the spaces joined — spaces.go;
//   - chat: the Matrix chat id and chat areas — matrix.go;
//   - stats: the analytics intervals — analytics.go.
//
// Locks: every lock of a part is a leaf: no other lock is taken while holding it, except inside the transport
// (wmu, then mu). So there is no order between the parts to respect.
//
// Goroutines: one writer for the whole session; one reader and one pinger per transport.
type Session struct {
	srv    *Server
	info   sessionInfo
	room   *core.Room
	ctx    context.Context
	cancel context.CancelFunc
	out    *outbox

	t           transport
	presence    presence
	memberships memberships
	chat        chat
	stats       stats

	userID atomic.Int32 // id in the room, once RoomJoined is on its way
}

// presence is the player in the room: joined or not yet, and what it shows to the others.
type presence struct {
	mu     sync.Mutex
	joined bool
	name   string                  // from JoinRoomFrontMessage
	status core.AvailabilityStatus // latest availability status
}

func (p *presence) get() (name string, status core.AvailabilityStatus) {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.name, p.status
}

func (p *presence) setStatus(status core.AvailabilityStatus) {
	p.mu.Lock()
	p.status = status
	p.mu.Unlock()
}

func newSession(srv *Server, info sessionInfo) *Session {
	s := &Session{srv: srv, info: info, memberships: memberships{spaces: map[string]*core.Space{}, joinedBy: map[int32]string{}}}
	s.chat.id = info.chatID
	s.ctx, s.cancel = context.WithCancel(context.Background())
	s.t.store = resumeStore{maxBytes: resumeMaxBytes, retention: srv.cfg.ClientDisconnectRetention}
	s.out = newOutbox(outboxLimit, func() { go s.destroy(statusSessionDestroyed, "Too slow to receive messages") })
	s.room = srv.rooms.Acquire(info.roomID)
	srv.sessions.Store(s, struct{}{})
	metrics.Sockets.Inc()
	return s
}

// start sends the first message and attaches the first transport.
func (s *Session) start(conn *websocket.Conn) {
	// The back answered ConnectToRoomMessage with RoomConnectedMessage; the front waits for it before joining.
	s.connectToRoom()
	s.t.attach(conn)
	go s.writeLoop()
	s.serve(conn)
}

// serve reads and keeps conn alive until it ends.
func (s *Session) serve(conn *websocket.Conn) {
	go func() {
		defer s.recoverPanic()
		s.t.read(s.ctx, conn, s.handle, func(err error) { s.transportClosed(conn, err) })
	}()
	go keepAlive(s.ctx, conn, s.srv.pingInterval, s.srv.cfg.SocketIdleTimer)
}

// Send and Kick implement core.Peer. They never block.
func (s *Session) Send(m *core.Msg) {
	if j, ok := m.Event.(core.RoomJoined); ok {
		s.userID.Store(j.UserID)
		s.timed().Open(analytics.ConnectionHandle, "user.disconnected", map[string]any{"connectionId": s.info.tabID}, time.Now())
	}
	s.out.push(m)
}

// Kick ends the session once what was queued before it is delivered: the message saying why (map deleted, kicked)
// must reach the front before the close, which the front does not recover from.
func (s *Session) Kick(reason string) { s.out.push(core.NewMsg(closeAfter{reason}, false)) }

// closeAfter is queued by Kick.
type closeAfter struct{ reason string }

func (s *Session) writeLoop() {
	defer s.recoverPanic()
	timer := time.NewTimer(batchDelay)
	timer.Stop()
	armed := false
	appPing := time.NewTicker(appPingInterval)
	defer appPing.Stop()
	var pending moveQueue // the batch being filled: positions are merged in it (moveQueue)
	var entries [][]byte
	var items []*core.Msg
	flush := func() {
		if armed {
			timer.Stop()
			armed = false
		}
		if len(pending.items) == 0 {
			return
		}
		for _, m := range pending.items {
			entries = append(entries, m.Bytes(encodeShared))
		}
		s.t.emit(s.ctx, func(n uint32) []byte { return batchFrame(n, entries) })
		clear(entries)
		entries = entries[:0]
		pending.reset()
	}
	for {
		select {
		case <-s.ctx.Done():
			return
		case <-timer.C:
			armed = false
			flush()
			continue
		case <-appPing.C:
			pending.push(pingMsg)
			flush()
			continue
		case <-s.out.wake:
		}
		items = s.out.take(items)
		for _, m := range items {
			if m.Batched {
				if pending.push(m) {
					metrics.CoalescedPositions.Inc()
				}
				if !armed {
					timer.Reset(batchDelay)
					armed = true
				}
				continue
			}
			// A direct message never overtakes what was batched before it.
			flush()
			if c, ok := m.Event.(closeAfter); ok {
				go s.destroy(statusSessionDestroyed, "Back lost: "+c.reason)
				return
			}
			payload := s.encodeDirect(m)
			s.t.emit(s.ctx, func(n uint32) []byte { return directFrame(n, payload) })
		}
		clear(items)
	}
}

func (s *Session) encodeDirect(m *core.Msg) []byte {
	if j, ok := m.Event.(core.RoomJoined); ok {
		b, err := proto.Marshal(s.roomJoined(j))
		if err != nil {
			panic(err)
		}
		return b
	}
	return m.Bytes(encodeShared)
}

func (s *Session) roomJoined(j core.RoomJoined) *pb.ServerToClientMessage {
	userID := j.UserID
	vars := make([]*pb.AreaPropertyVariableMessage, len(j.Variables))
	for i, v := range j.Variables {
		vars[i] = &pb.AreaPropertyVariableMessage{AreaId: v.AreaID, PropertyId: v.PropertyID, Key: v.Key, Value: v.Value}
	}
	variables := func(list []core.Variable) []*pb.VariableMessage {
		out := make([]*pb.VariableMessage, len(list))
		for i, v := range list {
			out[i] = &pb.VariableMessage{Name: v.Name, Value: v.Value}
		}
		return out
	}
	mb := s.info.member
	apps := make([]*pb.ApplicationMessage, len(mb.Applications))
	for i, a := range mb.Applications {
		apps[i] = &pb.ApplicationMessage{Name: a.Name, Doc: opt(a.Doc), Image: opt(a.Image), Description: opt(a.Description),
			Enabled: &a.Enabled, Default: &a.Default, ForceNewTab: &a.ForceNewTab, AllowAPI: &a.AllowAPI}
	}
	var companion *pb.CompanionTextureMessage
	if c := mb.CompanionTexture; c != nil {
		companion = &pb.CompanionTextureMessage{Id: c.ID, Url: c.URL}
	}
	return &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_RoomJoinedMessage{RoomJoinedMessage: &pb.RoomJoinedMessage{
		CurrentUserId: userID, UserRoomToken: mb.UserRoomToken, CharacterTextures: characterTextures(coreTextures(mb.CharacterTextures)),
		CompanionTexture: companion, CanEdit: mb.CanEdit, ActivatedInviteUser: mb.ActivatedInviteUser, Applications: apps,
		AreaPropertyVariable: vars, Variable: variables(j.RoomVariables), PlayerVariable: variables(j.PlayerVariables), Item: items(j.Items),
	}}}
}

func opt(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// recoverPanic ends the session instead of the whole process when handling one client goes wrong.
func (s *Session) recoverPanic() {
	if r := recover(); r != nil {
		slog.Error("panic in a session", "user", s.info.userUUID, "panic", r, "stack", string(debug.Stack()))
		go s.destroy(websocket.StatusInternalError, "Internal error")
	}
}

func (s *Session) transportClosed(conn *websocket.Conn, err error) {
	expire := func() { s.destroy(statusSessionDestroyed, "Reconnection window expired") }
	if s.t.dropped(conn, err, s.info.connectionID != "", s.srv.cfg.ClientDisconnectRetention, expire) {
		go s.destroy(websocket.StatusNormalClosure, "")
	}
}

// resume replaces the transport of a retained session (PusherWebSocket.replaceSocket).
func (s *Session) resume(conn *websocket.Conn, last uint32) {
	replayed, ok := s.t.resume(s.ctx, conn, last)
	if !ok {
		return
	}
	slog.Info("websocket transport resumed", "user", s.info.userUUID, "tab", s.info.tabID, "replayed", replayed)
	s.serve(conn)
}

// destroy ends the logical session: leaves the room and releases it. Never call it from a reader goroutine
// directly (it waits for the readers): use go s.destroy(...).
func (s *Session) destroy(code websocket.StatusCode, reason string) {
	conn, first := s.t.shutdown()
	if !first {
		return
	}
	s.out.close()
	if conn != nil {
		// Give the close frame a moment, not the whole handshake: until the readers stop, the player is still in
		// the room and its spaces, visible to everybody.
		closed := make(chan struct{})
		go func() { _ = conn.Close(code, reason); close(closed) }()
		select {
		case <-closed:
		case <-time.After(closeGrace):
		}
	}
	s.cancel()
	s.t.readers.Wait()

	s.closeTimed("socket_closed")
	s.leaveChatArea("")
	s.leaveAllSpaces()
	s.presence.mu.Lock()
	joined := s.presence.joined
	s.presence.mu.Unlock()
	if joined {
		_ = s.room.Leave(context.Background(), s)
		metrics.ClientLeft(s.info.roomID)
	}
	s.srv.rooms.Release(s.info.roomID)
	s.srv.sessions.Delete(s)
	if id := s.info.connectionID; id != "" {
		s.srv.retained.Compute(id, func(old *Session, ok bool) (*Session, bool) { return old, ok && old != s })
	}
	metrics.Sockets.Dec()
}

func (s *Session) handle(m *pb.ClientToServerMessage) {
	ctx := s.ctx
	switch msg := m.Message.(type) {
	case *pb.ClientToServerMessage_JoinRoomFrontMessage:
		j := msg.JoinRoomFrontMessage
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
		s.room.InitVariables(ctx, func() core.RoomVariables { return s.srv.roomVariables(s.info.roomID) })
		_ = s.room.Join(ctx, s, core.JoinRequest{
			UUID: s.info.userUUID, TabID: s.info.tabID, Name: j.GetName(), Textures: coreTextures(s.info.member.CharacterTextures),
			Companion: companion, VisitCardURL: visitCard, ChatID: chatID, Status: core.AvailabilityStatus(j.GetAvailabilityStatus()),
			Position: toPosition(j.GetPositionMessage()), Viewport: toViewport(j.GetViewportMessage()),
			Tags: s.info.member.Tags, IsLogged: s.info.isLogged, IPAddress: s.info.ipAddress, PlayerVariables: s.storedPlayerVariables(),
		})
	case *pb.ClientToServerMessage_VariableMessage:
		s.setVariable(ctx, core.Variable{Name: msg.VariableMessage.GetName(), Value: msg.VariableMessage.GetValue()})
	case *pb.ClientToServerMessage_UserMovesMessage:
		vp := toViewport(msg.UserMovesMessage.GetViewport())
		_ = s.room.Move(ctx, s, toPosition(msg.UserMovesMessage.GetPosition()), &vp)
	case *pb.ClientToServerMessage_ViewportMessage:
		_ = s.room.SetViewport(ctx, s, toViewport(msg.ViewportMessage))
	case *pb.ClientToServerMessage_SetPlayerDetailsMessage:
		d := toPlayerDetails(msg.SetPlayerDetailsMessage)
		if d.AvailabilityStatus != core.StatusUnchanged {
			s.presence.setStatus(d.AvailabilityStatus)
		}
		if d.SetVariable != nil {
			s.storePlayerVariable(d.SetVariable)
		}
		_ = s.room.SetPlayerDetails(ctx, s, d)
		s.updateSpacesWithPlayerDetails(d)
	case *pb.ClientToServerMessage_AskPositionMessage:
		a := msg.AskPositionMessage
		_ = s.room.AskPosition(ctx, s, a.GetUserIdentifier(), a.UserId, a.GetAskType() == pb.AskPositionMessage_LOCATE)
	case *pb.ClientToServerMessage_LockGroupPromptMessage:
		_ = s.room.LockGroup(ctx, s, msg.LockGroupPromptMessage.GetLock())
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
		_ = s.room.Emote(ctx, s, msg.EmotePromptMessage.GetEmote())
	case *pb.ClientToServerMessage_ItemEventMessage:
		e := msg.ItemEventMessage
		_ = s.room.ItemEvent(ctx, core.ItemState{ItemID: e.GetItemId(), StateJSON: e.GetStateJson()},
			core.NewMsg(&pb.SubMessage{Message: &pb.SubMessage_ItemEventMessage{ItemEventMessage: e}}, true))
	case *pb.ClientToServerMessage_EntityMessage:
		if e := msg.EntityMessage; e.GetEntityEvent() != nil { // to the whole room (dispatchEntityEvent)
			_ = s.room.SendEvent(ctx, core.NewMsg(&pb.SubMessage{Message: &pb.SubMessage_EntityMessage{EntityMessage: e}}, true), nil)
		}
	case *pb.ClientToServerMessage_AbortQueryMessage:
		// The reader answers in order, so an abort always comes after its answer. The front aborted a join it
		// had no answer for yet: it does not know it is in the space, so leave it (as the pusher's abort handler).
		if local, ok := s.memberships.joinedByQuery(msg.AbortQueryMessage.GetId()); ok {
			s.leaveSpace(0, local)
		}
	case *pb.ClientToServerMessage_BanPlayerMessage:
		b := msg.BanPlayerMessage
		if !s.isAdmin() {
			return // like the pusher, silently
		}
		reason := strings.TrimSpace(b.GetReason())
		kind := "kicked"
		if !b.GetKick() {
			message := reason
			if message == "" {
				message = "User banned by admin " + s.info.userUUID
			}
			ban := admin.Ban{UUID: b.GetBanUserUuid(), PlayURI: s.info.roomID, Name: b.GetBanUserName(), Message: message, ByUUID: s.info.userUUID}
			if b.GetByIp() { // the IP of the user in the world, unless it is the moderator's own
				if ip := s.srv.worldIP(s.info.member.World, b.GetBanUserUuid()); ip != "" && ip != s.info.ipAddress {
					ban.IPAddress = ip
				}
			}
			if s.srv.admin.Ban(ctx, ban) {
				kind = "banned"
			}
		}
		// Not recorded (no admin, or it refused): the user is ejected all the same, as a kick.
		_ = s.room.Eject(ctx, b.GetBanUserUuid(), kind, reason)
	case *pb.ClientToServerMessage_LeaveChatRoomAreaMessage:
		s.leaveChatArea(msg.LeaveChatRoomAreaMessage.GetRoomID())
	case *pb.ClientToServerMessage_UpdateChatIdMessage:
		s.updateChatID(msg.UpdateChatIdMessage.GetEmail(), msg.UpdateChatIdMessage.GetChatId())
	case *pb.ClientToServerMessage_AnalyticsEventReportMessage:
		s.analyticsReport(msg.AnalyticsEventReportMessage)
	case *pb.ClientToServerMessage_VideoQualityReportMessage:
		s.videoQuality(msg.VideoQualityReportMessage)
	case *pb.ClientToServerMessage_ReportPlayerMessage:
		rep := msg.ReportPlayerMessage
		go func() { // the answer is ignored, an error swallowed (handleReportMessage)
			if err := s.srv.admin.Report(context.Background(), admin.Report{ReportedUUID: rep.GetReportedUserUuid(), Comment: rep.GetReportComment(),
				ReporterUUID: s.info.userUUID, RoomURL: s.info.roomID}); err != nil {
				slog.Info("report not sent", "error", err)
			}
		}()
	case *pb.ClientToServerMessage_MeetingInvitationRequestMessage:
		_ = s.room.InviteToMeeting(ctx, s, msg.MeetingInvitationRequestMessage.GetReceiverUserUuid(), s.isAdmin())
	case *pb.ClientToServerMessage_MeetingInvitationResponseMessage:
		r := msg.MeetingInvitationResponseMessage
		_ = s.room.AnswerMeetingInvitation(ctx, s, r.GetAccept(), r.GetRequestSenderUserUuid())
	case *pb.ClientToServerMessage_FollowRequestMessage:
		_ = s.room.FollowRequest(ctx, s, msg.FollowRequestMessage.GetForceFollow())
	case *pb.ClientToServerMessage_FollowConfirmationMessage:
		_ = s.room.FollowConfirm(ctx, s, msg.FollowConfirmationMessage.GetLeader())
	case *pb.ClientToServerMessage_FollowAbortMessage:
		_ = s.room.FollowAbort(ctx, s, msg.FollowAbortMessage.GetLeader(), msg.FollowAbortMessage.GetFollower())
	case *pb.ClientToServerMessage_SetAreaPropertyVariableMessage:
		v := msg.SetAreaPropertyVariableMessage
		_ = s.room.SetAreaVariable(ctx, s, core.AreaVariable{AreaID: v.GetAreaId(), PropertyID: v.GetPropertyId(), Key: v.GetKey(), Value: v.GetValue()},
			s.info.member.Tags)
	default:
		if s.handleSpaceMessage(m) {
			return
		}
		if f := m.ProtoReflect().WhichOneof(m.ProtoReflect().Descriptor().Oneofs().Get(0)); f != nil {
			slog.Debug("message not handled yet", "type", f.Name())
		}
	}
}

func (s *Session) query(q *pb.QueryMessage) {
	switch query := q.Query.(type) {
	case *pb.QueryMessage_JoinSpaceQuery:
		s.joinSpace(q.GetId(), query.JoinSpaceQuery)
	case *pb.QueryMessage_LeaveSpaceQuery:
		s.leaveSpace(q.GetId(), query.LeaveSpaceQuery.GetSpaceName())
	case *pb.QueryMessage_SpaceStateQuery:
		s.spaceStateQuery(q.GetId(), query.SpaceStateQuery)
	case *pb.QueryMessage_ChatMembersQuery:
		go s.chatMembers(q.GetId(), query.ChatMembersQuery.GetSearchText())
	case *pb.QueryMessage_SearchMemberQuery:
		go s.searchMembers(q.GetId(), query.SearchMemberQuery.GetSearchText())
	case *pb.QueryMessage_SearchTagsQuery:
		go s.searchTags(q.GetId(), query.SearchTagsQuery.GetSearchText())
	case *pb.QueryMessage_GetMemberQuery:
		go s.getMember(q.GetId(), query.GetMemberQuery.GetUuid())
	case *pb.QueryMessage_JitsiJwtQuery:
		go s.jitsiJWT(q.GetId(), query.JitsiJwtQuery.GetJitsiRoom())
	case *pb.QueryMessage_JoinBBBMeetingQuery:
		go s.joinBBB(q.GetId(), query.JoinBBBMeetingQuery)
	case *pb.QueryMessage_OauthRefreshTokenQuery:
		go s.refreshOAuth(q.GetId(), query.OauthRefreshTokenQuery)
	case *pb.QueryMessage_EnterChatRoomAreaQuery:
		s.enterChatArea(q.GetId(), query.EnterChatRoomAreaQuery.GetRoomID())
	case *pb.QueryMessage_MapStorageJwtQuery:
		s.mapStorageJwt(q.GetId())
	case *pb.QueryMessage_EmbeddableWebsiteQuery:
		s.embeddableWebsite(q.GetId(), query.EmbeddableWebsiteQuery.GetUrl())
	case *pb.QueryMessage_SendEventQuery:
		s.sendEvent(q.GetId(), query.SendEventQuery)
	case *pb.QueryMessage_RoomsFromSameWorldQuery:
		s.roomsFromSameWorld(q.GetId())
	case *pb.QueryMessage_RoomTagsQuery:
		s.answer(q.GetId(), &pb.AnswerMessage{Answer: &pb.AnswerMessage_RoomTagsAnswer{RoomTagsAnswer: &pb.RoomTagsAnswer{
			Tags: s.srv.admin.RoomTags(s.ctx, s.info.roomID)}}})
	case *pb.QueryMessage_BanIpPreviewQuery:
		s.banIPPreview(q.GetId(), query.BanIpPreviewQuery.GetBanUserUuid())
	case *pb.QueryMessage_GetRecordingsQuery:
		go s.getRecordings(q.GetId())
	case *pb.QueryMessage_DeleteRecordingQuery:
		go s.deleteRecording(q.GetId(), query.DeleteRecordingQuery.GetRecordingId())
	case *pb.QueryMessage_GetRecordingThumbnailsQuery:
		go s.recordingThumbnails(q.GetId(), query.GetRecordingThumbnailsQuery.GetBaseFilename())
	case *pb.QueryMessage_GetSignedUrlQuery:
		go s.signedURL(q.GetId(), query.GetSignedUrlQuery.GetKey())
	case *pb.QueryMessage_IceServersQuery:
		var servers []*pb.IceServer
		list, err := s.srv.admin.IceServers(s.ctx, s.info.roomID, s.info.userUUID, s.userID.Load())
		if err != nil {
			s.answerError(q.GetId(), err.Error())
			return
		}
		for _, ice := range list {
			server := &pb.IceServer{Urls: ice.URLs}
			if ice.Username != "" || ice.Credential != "" {
				server.Username, server.Credential, server.CredentialType = &ice.Username, &ice.Credential, proto.String("password")
			}
			servers = append(servers, server)
		}
		s.answer(q.GetId(), &pb.AnswerMessage{Answer: &pb.AnswerMessage_IceServersAnswer{IceServersAnswer: &pb.IceServersAnswer{IceServers: servers}}})
	default:
		name := "unknown"
		if f := q.ProtoReflect().WhichOneof(q.ProtoReflect().Descriptor().Oneofs().ByName("query")); f != nil {
			name = string(f.Name())
		}
		slog.Info("query not supported yet", "query", name)
		s.answerError(q.GetId(), "Query not supported by this server yet: "+name)
	}
}

func (s *Session) answer(id int32, a *pb.AnswerMessage) {
	a.Id = id
	s.out.push(core.NewMsg(&pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_AnswerMessage{AnswerMessage: a}}, false))
}

func (s *Session) answerError(id int32, message string) {
	s.out.push(core.NewMsg(&pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_AnswerMessage{AnswerMessage: &pb.AnswerMessage{
		Id: id, Answer: &pb.AnswerMessage_Error{Error: &pb.ErrorMessage{Message: message}},
	}}}, false))
}

func items(list []core.ItemState) []*pb.ItemStateMessage {
	out := make([]*pb.ItemStateMessage, len(list))
	for i, it := range list {
		out[i] = &pb.ItemStateMessage{ItemId: it.ItemID, StateJson: it.StateJSON}
	}
	return out
}
