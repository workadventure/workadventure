package ws

import (
	"context"
	"sync"
	"sync/atomic"
	"time"

	"github.com/coder/websocket"
	"google.golang.org/protobuf/proto"

	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

// transport is the WebSocket side of a Session: the current connection (nil while the client is away), the
// numbering and the copies of the frames sent (resumeStore) for a resume, the retention window and the keepalive.
// It knows nothing of rooms or spaces: it moves frames.
//
// Lock order: wmu, then mu. hmu is taken alone. None of them is held while a lock outside the transport is taken.
type transport struct {
	wmu   sync.Mutex // serializes writes to the connection: the writer goroutine, and a resume's replay
	nonce uint32     // guarded by wmu

	// hmu serializes the handling of client frames: after a resume, the reader of the replaced connection may still
	// be handling a frame while the new one starts.
	hmu          sync.Mutex
	lastReceived uint32 // guarded by hmu

	mu        sync.Mutex
	cur       *websocket.Conn // nil while the client is away
	store     resumeStore
	retention *time.Timer
	destroyed bool

	readers      sync.WaitGroup // readers post to the room: they must be done before the room is released
	lastActivity atomic.Int64   // unix ms of the last frame received: a socket that went away left then
}

// attach makes conn the current connection, with a reader to come.
func (t *transport) attach(conn *websocket.Conn) {
	t.mu.Lock()
	t.cur = conn
	t.readers.Add(1)
	t.mu.Unlock()
}

// emit numbers a frame, keeps it for a resume and writes it to the current connection, if any.
func (t *transport) emit(ctx context.Context, build func(nonce uint32) []byte) {
	t.wmu.Lock()
	defer t.wmu.Unlock()
	t.nonce++
	frame := build(t.nonce)
	t.mu.Lock()
	frame = t.store.add(t.nonce, frame, time.Now()) // write the stored copy: the built one is garbage at once
	conn := t.cur
	t.mu.Unlock()
	if conn != nil {
		_ = write(ctx, conn, frame)
	}
}

func write(ctx context.Context, conn *websocket.Conn, frame []byte) error {
	ctx, cancel := context.WithTimeout(ctx, writeTimeout)
	defer cancel()
	err := conn.Write(ctx, websocket.MessageBinary, frame)
	if err != nil {
		_ = conn.CloseNow() // the reader sees it and detaches the connection
	}
	return err
}

// read hands each new client message of conn to handle, in order, until conn ends; then it calls closed. A frame a
// resumed client sends again (its nonce was already seen) is skipped.
func (t *transport) read(ctx context.Context, conn *websocket.Conn, handle func(*pb.ClientToServerMessage), closed func(error)) {
	defer t.readers.Done()
	conn.SetReadLimit(maxMessageSize)
	for {
		_, data, err := conn.Read(ctx)
		if err != nil {
			closed(err)
			return
		}
		t.lastActivity.Store(time.Now().UnixMilli()) // even a malformed frame proves the tab was there
		var frame pb.FrontToPusherWebSocketMessage
		if err := proto.Unmarshal(data, &frame); err != nil || frame.Message == nil {
			go func() { _ = conn.Close(websocket.StatusUnsupportedData, "Invalid message format") }()
			continue
		}
		t.hmu.Lock()
		if frame.Nonce > t.lastReceived {
			t.lastReceived = frame.Nonce
			handle(frame.Message)
		}
		t.hmu.Unlock()
	}
}

// keepAlive pings conn every interval; a client that does not answer within idle is cut.
func keepAlive(ctx context.Context, conn *websocket.Conn, interval, idle time.Duration) {
	tick := time.NewTicker(interval)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
			pctx, cancel := context.WithTimeout(ctx, idle)
			err := conn.Ping(pctx)
			cancel()
			if err != nil {
				_ = conn.CloseNow()
				return
			}
		}
	}
}

// dropped is called when the reader of conn stopped on err. It says whether the session ends now; otherwise the
// connection is detached and expire runs once the retention window passes without a resume.
func (t *transport) dropped(conn *websocket.Conn, err error, resumable bool, window time.Duration, expire func()) (end bool) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.cur != conn || t.destroyed {
		return false // replaced by a resumed connection, or closed by the session's end
	}
	switch websocket.CloseStatus(err) {
	case websocket.StatusNormalClosure, websocket.StatusGoingAway, statusSessionDestroyed:
		return true
	}
	if !resumable {
		return true
	}
	t.cur = nil
	t.retention = time.AfterFunc(window, expire)
	return false
}

// resume makes conn the connection of a retained session and replays what the client missed after last
// (PusherWebSocket.replaceSocket). It returns false, conn closed, when the session cannot be resumed.
func (t *transport) resume(ctx context.Context, conn *websocket.Conn, last uint32) (replayed int, ok bool) {
	t.mu.Lock()
	old, destroyed := t.cur, t.destroyed
	t.mu.Unlock()
	if destroyed {
		_ = conn.Close(websocket.StatusPolicyViolation, "Cannot replace socket: previous connection not retained")
		return 0, false
	}
	if old != nil {
		_ = old.CloseNow() // also unblocks a writer stuck on the dead connection
	}

	t.wmu.Lock()
	defer t.wmu.Unlock()
	t.mu.Lock()
	// A retention timer that already fired means the session's end is on its way.
	expired := t.retention != nil && !t.retention.Stop()
	if t.destroyed || expired || !t.store.canResumeAfter(last, time.Now()) {
		t.mu.Unlock()
		go func() {
			_ = conn.Close(websocket.StatusPolicyViolation, "Cannot replace socket: server is missing messages to replay")
		}()
		return 0, false
	}
	t.retention = nil
	replay := t.store.after(last)
	if prev := t.cur; prev != nil && prev != old {
		go func() { _ = prev.CloseNow() }() // a concurrent resume won the race in between: this one replaces it
	}
	t.cur = conn
	t.readers.Add(1)
	t.mu.Unlock()
	for _, f := range replay {
		if write(ctx, conn, f) != nil {
			break
		}
	}
	return len(replay), true
}

// shutdown marks the transport closed; the first call returns the connection to close (nil while away).
func (t *transport) shutdown() (conn *websocket.Conn, first bool) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.destroyed {
		return nil, false
	}
	t.destroyed = true
	t.store.release()
	conn, t.cur = t.cur, nil
	if t.retention != nil {
		t.retention.Stop()
	}
	return conn, true
}
