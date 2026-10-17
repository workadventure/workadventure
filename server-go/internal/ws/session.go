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
	// outboxLimit bounds the messages waiting for one client (see outbox).
	outboxLimit = 1024
	// resumeMaxBytes bounds the frames kept per client for a transport resume (see resumeStore).
	resumeMaxBytes = 512 << 10
	// batchDelay is how long zone traffic waits to be sent together (emitInBatch).
	batchDelay = 100 * time.Millisecond
	// appPingInterval is the back's PING_INTERVAL: the front closes the connection after 100 s without a ping.
	appPingInterval = 80 * time.Second
	// transportPingInterval keeps the connection alive across proxies (PusherWebSocket.KEEP_ALIVE_INTERVAL_MS).
	transportPingInterval = 25 * time.Second
	writeTimeout          = 10 * time.Second
	closeGrace            = time.Second
	maxMessageSize        = 16 << 20

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
	chatID, roomName                   string
	lastCommandID                      string // the last map edit the client's copy of the map has
}

// Session is a logical connection. It survives a transport drop for CLIENT_DISCONNECTION_RETENTION_MS: if the
// client reconnects with the same connectionId, the new transport takes over and missed frames are replayed.
//
// Goroutines: one writer for the whole session; one reader and one pinger per transport.
type Session struct {
	srv    *Server
	info   sessionInfo
	room   *core.Room
	ctx    context.Context
	cancel context.CancelFunc
	out    *outbox

	wmu   sync.Mutex // serializes writes to the transport: the writer goroutine, and a resume's replay
	nonce uint32     // guarded by wmu

	// hmu serializes the handling of client messages: after a resume, the reader of the replaced transport may
	// still be handling a message while the new one starts.
	hmu          sync.Mutex
	lastReceived uint32 // guarded by hmu

	mu        sync.Mutex
	cur       *websocket.Conn // nil while the client is away
	store     resumeStore
	destroyed bool
	retention *time.Timer
	joined    bool

	userID       atomic.Int32       // id in the room, once RoomJoined is on its way
	lastActivity atomic.Int64       // unix ms of the last frame received: a socket that went away left then
	tracker      *analytics.Tracker // guarded by mu; the analytics intervals of this connection (analytics.go)

	// guarded by mu
	name     string                  // from JoinRoomFrontMessage
	status   core.AvailabilityStatus // latest availability status
	spaces   map[string]*core.Space  // by the name the front uses
	joinedBy map[int32]string        // the joinSpaceQuery that joined each space, for its abortQueryMessage

	readers sync.WaitGroup // readers post to the room: they must be done before the room is released
}

func newSession(srv *Server, info sessionInfo) *Session {
	s := &Session{srv: srv, info: info, spaces: map[string]*core.Space{}, joinedBy: map[int32]string{}}
	s.ctx, s.cancel = context.WithCancel(context.Background())
	s.store = resumeStore{maxBytes: resumeMaxBytes, retention: srv.cfg.ClientDisconnectRetention}
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
	s.mu.Lock()
	s.cur = conn
	s.readers.Add(1)
	s.mu.Unlock()
	go s.writeLoop()
	go s.read(conn)
	go s.keepAlive(conn)
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
		s.emit(func(n uint32) []byte { return batchFrame(n, entries) })
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
			s.emit(func(n uint32) []byte { return directFrame(n, payload) })
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

// emit numbers a frame, keeps it for a resume and writes it to the current transport, if any.
func (s *Session) emit(build func(nonce uint32) []byte) {
	s.wmu.Lock()
	defer s.wmu.Unlock()
	s.nonce++
	frame := build(s.nonce)
	s.mu.Lock()
	frame = s.store.add(s.nonce, frame, time.Now()) // write the stored copy: the built one is garbage at once
	conn := s.cur
	s.mu.Unlock()
	if conn != nil {
		_ = s.write(conn, frame)
	}
}

func (s *Session) write(conn *websocket.Conn, frame []byte) error {
	ctx, cancel := context.WithTimeout(s.ctx, writeTimeout)
	defer cancel()
	err := conn.Write(ctx, websocket.MessageBinary, frame)
	if err != nil {
		_ = conn.CloseNow() // the reader sees it and detaches the transport
	}
	return err
}

func (s *Session) read(conn *websocket.Conn) {
	defer s.readers.Done()
	defer s.recoverPanic()
	conn.SetReadLimit(maxMessageSize)
	for {
		_, data, err := conn.Read(s.ctx)
		if err != nil {
			s.transportClosed(conn, err)
			return
		}
		s.lastActivity.Store(time.Now().UnixMilli()) // even a malformed frame proves the tab was there
		var frame pb.FrontToPusherWebSocketMessage
		if err := proto.Unmarshal(data, &frame); err != nil || frame.Message == nil {
			go conn.Close(websocket.StatusUnsupportedData, "Invalid message format")
			continue
		}
		s.hmu.Lock()
		if frame.Nonce > s.lastReceived { // a resumed client sends again what it is not sure we got
			s.lastReceived = frame.Nonce
			s.handle(frame.Message)
		}
		s.hmu.Unlock()
	}
}

// recoverPanic ends the session instead of the whole process when handling one client goes wrong.
func (s *Session) recoverPanic() {
	if r := recover(); r != nil {
		slog.Error("panic in a session", "user", s.info.userUUID, "panic", r, "stack", string(debug.Stack()))
		go s.destroy(websocket.StatusInternalError, "Internal error")
	}
}

// keepAlive pings the transport; a client that does not answer within SOCKET_IDLE_TIMER is cut.
func (s *Session) keepAlive(conn *websocket.Conn) {
	t := time.NewTicker(transportPingInterval)
	defer t.Stop()
	for {
		select {
		case <-s.ctx.Done():
			return
		case <-t.C:
			ctx, cancel := context.WithTimeout(s.ctx, s.srv.cfg.SocketIdleTimer)
			err := conn.Ping(ctx)
			cancel()
			if err != nil {
				_ = conn.CloseNow()
				return
			}
		}
	}
}

func (s *Session) transportClosed(conn *websocket.Conn, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.cur != conn || s.destroyed {
		return // replaced by a resumed transport, or closed by destroy
	}
	switch websocket.CloseStatus(err) {
	case websocket.StatusNormalClosure, websocket.StatusGoingAway, statusSessionDestroyed:
		go s.destroy(websocket.StatusNormalClosure, "")
		return
	}
	if s.info.connectionID == "" {
		go s.destroy(websocket.StatusNormalClosure, "")
		return
	}
	// The transport dropped: keep the session for the client to come back.
	s.cur = nil
	s.retention = time.AfterFunc(s.srv.cfg.ClientDisconnectRetention, func() {
		s.destroy(statusSessionDestroyed, "Reconnection window expired")
	})
}

// resume replaces the transport of a retained session (PusherWebSocket.replaceSocket).
func (s *Session) resume(conn *websocket.Conn, last uint32) {
	s.mu.Lock()
	old, destroyed := s.cur, s.destroyed
	s.mu.Unlock()
	if destroyed {
		_ = conn.Close(websocket.StatusPolicyViolation, "Cannot replace socket: previous connection not retained")
		return
	}
	if old != nil {
		_ = old.CloseNow() // also unblocks a writer stuck on the dead transport
	}

	s.wmu.Lock()
	defer s.wmu.Unlock()
	s.mu.Lock()
	// A retention timer that already fired means destroy is on its way.
	expired := s.retention != nil && !s.retention.Stop()
	if s.destroyed || expired || !s.store.canResumeAfter(last, time.Now()) {
		s.mu.Unlock()
		go conn.Close(websocket.StatusPolicyViolation, "Cannot replace socket: server is missing messages to replay")
		return
	}
	s.retention = nil
	replay := s.store.after(last)
	if prev := s.cur; prev != nil && prev != old {
		go prev.CloseNow() // a concurrent resume won the race in between: this one replaces it
	}
	s.cur = conn
	s.readers.Add(1)
	s.mu.Unlock()
	slog.Info("websocket transport resumed", "user", s.info.userUUID, "tab", s.info.tabID, "replayed", len(replay))
	for _, f := range replay {
		if s.write(conn, f) != nil {
			break
		}
	}
	go s.read(conn)
	go s.keepAlive(conn)
}

// destroy ends the logical session: leaves the room and releases it. Never call it from a reader goroutine
// directly (it waits for the readers): use go s.destroy(...).
func (s *Session) destroy(code websocket.StatusCode, reason string) {
	s.mu.Lock()
	if s.destroyed {
		s.mu.Unlock()
		return
	}
	s.destroyed = true
	conn := s.cur
	s.cur = nil
	if s.retention != nil {
		s.retention.Stop()
	}
	s.mu.Unlock()

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
	s.readers.Wait()

	s.closeTimed("socket_closed")
	s.leaveAllSpaces()
	s.mu.Lock()
	joined := s.joined
	s.mu.Unlock()
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
		s.mu.Lock()
		first := !s.joined
		s.joined = true
		s.name, s.status = j.GetName(), core.AvailabilityStatus(j.GetAvailabilityStatus())
		s.mu.Unlock()
		if first {
			metrics.ClientJoined(s.info.roomID)
		}
		var chatID *string
		if s.info.chatID != "" {
			chatID = &s.info.chatID
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
			s.mu.Lock()
			s.status = d.AvailabilityStatus
			s.mu.Unlock()
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
		s.mu.Lock()
		local, ok := s.joinedBy[msg.AbortQueryMessage.GetId()]
		s.mu.Unlock()
		if ok {
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
		// No admin: nobody to list (LocalAdmin.getWorldChatMembers).
		s.answer(q.GetId(), &pb.AnswerMessage{Answer: &pb.AnswerMessage_ChatMembersAnswer{ChatMembersAnswer: &pb.ChatMembersAnswer{}}})
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
