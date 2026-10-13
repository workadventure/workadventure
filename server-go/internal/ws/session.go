// Package ws is the WebSocket adapter: it authenticates clients, speaks the frozen front <-> server protocol
// (protobuf, nonce envelopes, transport resume) and turns client messages into calls on the core.
package ws

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/coder/websocket"
	"google.golang.org/protobuf/proto"

	"github.com/workadventure/workadventure/server-go/internal/admin"
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
	maxMessageSize        = 16 << 20

	// statusSessionDestroyed tells the front the logical session is gone: no resume, reconnect from scratch
	// (WS_CLOSE_CODE_SESSION_DESTROYED).
	statusSessionDestroyed websocket.StatusCode = 4000
)

var pingEntry = core.NewMsg(ping{}, true).Bytes(encodeShared)

// sessionInfo is what the upgrade learnt about the client. It never changes afterwards.
type sessionInfo struct {
	token, roomID, connectionID, tabID string
	userUUID, ipAddress                string
	isLogged                           bool
	member                             admin.MemberData
	chatID                             string
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

	mu           sync.Mutex
	cur          *websocket.Conn // nil while the client is away
	store        resumeStore
	destroyed    bool
	lastReceived uint32
	retention    *time.Timer
	joined       bool

	readers sync.WaitGroup // readers post to the room: they must be done before the room is released
}

func newSession(srv *Server, info sessionInfo) *Session {
	s := &Session{srv: srv, info: info}
	s.ctx, s.cancel = context.WithCancel(context.Background())
	s.store = resumeStore{maxBytes: resumeMaxBytes, retention: srv.cfg.ClientDisconnectRetention}
	s.out = newOutbox(outboxLimit, func() { go s.destroy(statusSessionDestroyed, "Too slow to receive messages") })
	s.room = srv.rooms.Acquire(info.roomID)
	metrics.Sockets.Inc()
	return s
}

// start sends the first message and attaches the first transport.
func (s *Session) start(conn *websocket.Conn) {
	// The back answered ConnectToRoomMessage with this; the front waits for it before joining.
	s.out.push(core.NewMsg(&pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_RoomConnectedMessage{
		RoomConnectedMessage: &pb.RoomConnectedMessage{EditMapCommandsArrayMessage: &pb.EditMapCommandsArrayMessage{}, Tag: s.info.member.Tags},
	}}, false))
	s.mu.Lock()
	s.cur = conn
	s.readers.Add(1)
	s.mu.Unlock()
	go s.writeLoop()
	go s.read(conn)
	go s.keepAlive(conn)
}

// Send and Kick implement core.Peer. They never block.
func (s *Session) Send(m *core.Msg)   { s.out.push(m) }
func (s *Session) Kick(reason string) { go s.destroy(statusSessionDestroyed, "Back lost: "+reason) }

func (s *Session) writeLoop() {
	timer := time.NewTimer(batchDelay)
	timer.Stop()
	armed := false
	appPing := time.NewTicker(appPingInterval)
	defer appPing.Stop()
	var pending [][]byte
	var items []*core.Msg
	flush := func() {
		if armed {
			timer.Stop()
			armed = false
		}
		if len(pending) == 0 {
			return
		}
		s.emit(func(n uint32) []byte { return batchFrame(n, pending) })
		clear(pending)
		pending = pending[:0]
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
			pending = append(pending, pingEntry)
			flush()
			continue
		case <-s.out.wake:
		}
		items = s.out.take(items)
		for _, m := range items {
			if m.Batched {
				pending = append(pending, m.Bytes(encodeShared))
				if !armed {
					timer.Reset(batchDelay)
					armed = true
				}
				continue
			}
			// A direct message never overtakes what was batched before it.
			flush()
			payload := s.encodeDirect(m)
			s.emit(func(n uint32) []byte { return directFrame(n, payload) })
		}
		clear(items)
	}
}

func (s *Session) encodeDirect(m *core.Msg) []byte {
	if j, ok := m.Event.(core.RoomJoined); ok {
		b, err := proto.Marshal(s.roomJoined(j.UserID))
		if err != nil {
			panic(err)
		}
		return b
	}
	return m.Bytes(encodeShared)
}

func (s *Session) roomJoined(userID int32) *pb.ServerToClientMessage {
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
	s.store.add(s.nonce, frame, time.Now())
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
	conn.SetReadLimit(maxMessageSize)
	for {
		_, data, err := conn.Read(s.ctx)
		if err != nil {
			s.transportClosed(conn, err)
			return
		}
		var frame pb.FrontToPusherWebSocketMessage
		if err := proto.Unmarshal(data, &frame); err != nil || frame.Message == nil {
			go conn.Close(websocket.StatusUnsupportedData, "Invalid message format")
			continue
		}
		s.mu.Lock()
		duplicate := frame.Nonce <= s.lastReceived // a resumed client sends again what it is not sure we got
		if !duplicate {
			s.lastReceived = frame.Nonce
		}
		s.mu.Unlock()
		if !duplicate {
			s.handle(frame.Message)
		}
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
	if s.destroyed || !s.store.canResumeAfter(last, time.Now()) {
		s.mu.Unlock()
		_ = conn.Close(websocket.StatusPolicyViolation, "Cannot replace socket: server is missing messages to replay")
		return
	}
	replay := s.store.after(last)
	if s.retention != nil {
		s.retention.Stop()
		s.retention = nil
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
		_ = conn.Close(code, reason) // waits at most 5 s for the client's close frame
	}
	s.cancel()
	s.readers.Wait()

	s.mu.Lock()
	joined := s.joined
	s.mu.Unlock()
	if joined {
		_ = s.room.Leave(context.Background(), s)
		metrics.ClientLeft(s.info.roomID)
	}
	s.srv.rooms.Release(s.info.roomID)
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
		_ = s.room.Join(ctx, s, core.JoinRequest{
			UUID: s.info.userUUID, TabID: s.info.tabID, Name: j.GetName(), Textures: coreTextures(s.info.member.CharacterTextures),
			Companion: companion, VisitCardURL: visitCard, ChatID: chatID, Status: core.AvailabilityStatus(j.GetAvailabilityStatus()),
			Position: toPosition(j.GetPositionMessage()), Viewport: toViewport(j.GetViewportMessage()),
			Tags: s.info.member.Tags, IsLogged: s.info.isLogged, IPAddress: s.info.ipAddress,
		})
	case *pb.ClientToServerMessage_UserMovesMessage:
		vp := toViewport(msg.UserMovesMessage.GetViewport())
		_ = s.room.Move(ctx, s, toPosition(msg.UserMovesMessage.GetPosition()), &vp)
	case *pb.ClientToServerMessage_ViewportMessage:
		_ = s.room.SetViewport(ctx, s, toViewport(msg.ViewportMessage))
	case *pb.ClientToServerMessage_SetPlayerDetailsMessage:
		_ = s.room.SetPlayerDetails(ctx, s, toPlayerDetails(msg.SetPlayerDetailsMessage))
	case *pb.ClientToServerMessage_LockGroupPromptMessage:
		_ = s.room.LockGroup(ctx, s, msg.LockGroupPromptMessage.GetLock())
	case *pb.ClientToServerMessage_PingMessage:
		// The pong of the application-level ping: liveness is checked by the transport pings.
	case *pb.ClientToServerMessage_QueryMessage:
		s.answerError(msg.QueryMessage.GetId(), "Query not supported by this server yet")
	default:
		if f := m.ProtoReflect().WhichOneof(m.ProtoReflect().Descriptor().Oneofs().Get(0)); f != nil {
			slog.Debug("message not handled yet", "type", f.Name())
		}
	}
}

func (s *Session) answerError(id int32, message string) {
	s.out.push(core.NewMsg(&pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_AnswerMessage{AnswerMessage: &pb.AnswerMessage{
		Id: id, Answer: &pb.AnswerMessage_Error{Error: &pb.ErrorMessage{Message: message}},
	}}}, false))
}
