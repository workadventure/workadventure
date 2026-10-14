package ws

import (
	"context"
	"github.com/workadventure/workadventure/server-go/internal/mapstorage"
	"github.com/workadventure/workadventure/server-go/internal/store"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"google.golang.org/protobuf/proto"

	"github.com/workadventure/workadventure/server-go/internal/admin"
	"github.com/workadventure/workadventure/server-go/internal/auth"
	"github.com/workadventure/workadventure/server-go/internal/config"
	"github.com/workadventure/workadventure/server-go/internal/core"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
	"github.com/workadventure/workadventure/server-go/internal/registry"
)

const roomURL = "http://play.test/_/global/maps.test/tests/E2E/empty.json"

type harness struct {
	t     *testing.T
	srv   *Server
	http  *httptest.Server
	auth  *auth.Manager
	rooms *registry.Refs[string, *core.Room]
}

func newHarness(t *testing.T) *harness {
	cfg := &config.Config{ClientDisconnectRetention: 5 * time.Second, SocketIdleTimer: 120 * time.Second, FrontEnv: map[string]any{}}
	adm, err := admin.NewLocal(cfg)
	if err != nil {
		t.Fatal(err)
	}
	h := &harness{t: t, auth: auth.New("secret")}
	h.rooms = registry.NewRefs(func(url string) *core.Room {
		return core.NewRoom(url, core.Config{MinimumDistance: 64, GroupRadius: 48, MaxPerGroup: 4})
	},
		func(r *core.Room) { r.Stop() })
	spaces := registry.NewRefs(core.NewSpace, func(sp *core.Space) { sp.Stop() })
	h.srv = NewServer(cfg, h.auth, adm, h.rooms, spaces, mapstorage.New(t.TempDir()), store.NewMemory(), "test-version")
	h.http = httptest.NewServer(h.srv)
	t.Cleanup(h.http.Close)
	return h
}

// client is a bot speaking the front's protocol, nonces included.
type client struct {
	t            *testing.T
	conn         *websocket.Conn
	nonce        uint32
	lastReceived uint32
	connectionID string
	token        string
	userID       int32
}

func (h *harness) dial(name, connectionID string, extra url.Values) *client {
	h.t.Helper()
	token, _ := h.auth.Create(auth.Token{Identifier: name})
	return h.dialWithToken(token, name, connectionID, extra)
}

// dialWithToken is dial with a given token: a resume must present the token of the session it resumes.
func (h *harness) dialWithToken(token, name, connectionID string, extra url.Values) *client {
	h.t.Helper()
	q := url.Values{"roomId": {roomURL}, "version": {"test-version"}, "chatID": {""}, "roomName": {"r"}, "cameraState": {"false"},
		"microphoneState": {"false"}, "tabId": {"tab-" + name}, "characterTextureIds": {"male1"}, "connectionId": {connectionID}}
	for k, v := range extra {
		q[k] = v
	}
	u := strings.Replace(h.http.URL, "http", "ws", 1) + "/ws/room?" + q.Encode()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	conn, resp, err := websocket.Dial(ctx, u, &websocket.DialOptions{Subprotocols: []string{token}})
	if err != nil {
		h.t.Fatal(err)
	}
	if resp.Header.Get("Sec-WebSocket-Protocol") != token {
		h.t.Fatal("the token must be echoed as the subprotocol, or browsers drop the connection")
	}
	return &client{t: h.t, conn: conn, connectionID: connectionID, token: token}
}

func (c *client) send(m *pb.ClientToServerMessage) {
	c.t.Helper()
	c.nonce++
	b, _ := proto.Marshal(&pb.FrontToPusherWebSocketMessage{Nonce: c.nonce, Message: m})
	if err := c.conn.Write(context.Background(), websocket.MessageBinary, b); err != nil {
		c.t.Fatal(err)
	}
}

// next returns the next server message, flattening batches.
func (c *client) recv(timeout time.Duration) ([]*pb.ServerToClientMessage, []*pb.SubMessage, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	_, data, err := c.conn.Read(ctx)
	if err != nil {
		return nil, nil, err
	}
	var env pb.PusherToFrontWebSocketMessage
	if err := proto.Unmarshal(data, &env); err != nil {
		c.t.Fatal(err)
	}
	if env.Nonce != c.lastReceived+1 {
		c.t.Fatalf("nonce %d after %d: frames must arrive in order, without gap or duplicate", env.Nonce, c.lastReceived)
	}
	c.lastReceived = env.Nonce
	if b := env.Message.GetBatchMessage(); b != nil {
		return nil, b.Payload, nil
	}
	if j := env.Message.GetRoomJoinedMessage(); j != nil {
		c.userID = j.CurrentUserId
	}
	return []*pb.ServerToClientMessage{env.Message}, nil, nil
}

// waitFor reads until match accepts a message.
func (c *client) waitFor(what string, match func(*pb.ServerToClientMessage, *pb.SubMessage) bool) {
	c.t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		direct, subs, err := c.recv(time.Until(deadline))
		if err != nil {
			c.t.Fatalf("waiting for %s: %v", what, err)
		}
		for _, d := range direct {
			if match(d, nil) {
				return
			}
		}
		for _, s := range subs {
			if match(nil, s) {
				return
			}
		}
	}
	c.t.Fatalf("timeout waiting for %s", what)
}

func join(x, y int32) *pb.ClientToServerMessage {
	return &pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_JoinRoomFrontMessage{JoinRoomFrontMessage: &pb.JoinRoomFrontMessage{
		Name: "bot", AvailabilityStatus: pb.AvailabilityStatus_ONLINE,
		PositionMessage: &pb.PositionMessage{X: x, Y: y, Direction: pb.PositionMessage_DOWN},
		ViewportMessage: &pb.ViewportMessage{Left: 0, Top: 0, Right: 1000, Bottom: 1000},
	}}}
}

func moveTo(x, y int32) *pb.ClientToServerMessage {
	return &pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_UserMovesMessage{UserMovesMessage: &pb.UserMovesMessage{
		Position: &pb.PositionMessage{X: x, Y: y}, Viewport: &pb.ViewportMessage{Left: 0, Top: 0, Right: 1000, Bottom: 1000},
	}}}
}

func TestTwoBotsSeeEachOtherMoveAndFormABubble(t *testing.T) {
	h := newHarness(t)
	alice := h.dial("alice", "c-alice", nil)
	alice.waitFor("roomConnected", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool { return d.GetRoomConnectedMessage() != nil })
	alice.send(join(100, 100))
	alice.waitFor("roomJoined", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool { return d.GetRoomJoinedMessage() != nil })

	bob := h.dial("bob", "c-bob", nil)
	bob.waitFor("roomConnected", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool { return d.GetRoomConnectedMessage() != nil })
	bob.send(join(500, 500))
	bob.waitFor("alice", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		return s.GetUserJoinedMessage().GetUserUuid() == "alice"
	})
	alice.waitFor("bob", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		return s.GetUserJoinedMessage().GetUserUuid() == "bob"
	})

	bob.send(moveTo(110, 100))
	alice.waitFor("bob moving", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		return s.GetUserMovedMessage().GetPosition().GetX() == 110
	})
	alice.waitFor("the bubble space", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool { return d.GetJoinSpaceRequestMessage() != nil })
	bob.waitFor("the bubble", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		return len(s.GetGroupUpdateMessage().GetUserIds()) == 2
	})
}

func TestResumeReplaysMissedFramesAndDropsDuplicates(t *testing.T) {
	h := newHarness(t)
	alice := h.dial("alice", "c-alice", nil)
	alice.send(join(100, 100))
	alice.waitFor("roomJoined", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool { return d.GetRoomJoinedMessage() != nil })

	// Alice's network drops; meanwhile Bob arrives.
	_ = alice.conn.CloseNow()
	time.Sleep(100 * time.Millisecond)
	bob := h.dial("bob", "c-bob", nil)
	bob.send(join(900, 900))
	bob.waitFor("roomJoined", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool { return d.GetRoomJoinedMessage() != nil })
	time.Sleep(3 * batchDelay) // let the batch announcing Bob to Alice be sent into the void

	resumed := h.dialWithToken(alice.token, "alice", "c-alice", url.Values{"lastReceivedNonce": {strconv.Itoa(int(alice.lastReceived))}})
	resumed.lastReceived = alice.lastReceived
	resumed.nonce = alice.nonce
	// The front resends what it is not sure we received: the server must drop it (nonce already seen).
	resumed.nonce--
	resumed.send(join(100, 100))
	resumed.waitFor("bob, missed while away", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		return s.GetUserJoinedMessage().GetUserUuid() == "bob"
	})
	st, _ := mustRoom(t, h).Stats(context.Background())
	if st.Users != 2 {
		t.Fatalf("the resent join must have been ignored: %+v", st)
	}
}

func TestResumeOfAnUnknownConnectionIsRefused(t *testing.T) {
	h := newHarness(t)
	c := h.dial("alice", "never-seen", url.Values{"lastReceivedNonce": {"3"}})
	_, _, err := c.recv(2 * time.Second)
	if websocket.CloseStatus(err) != websocket.StatusPolicyViolation {
		t.Fatalf("expected 1008, got %v", err)
	}
}

func TestWrongVersionGetsTheRefreshScreen(t *testing.T) {
	h := newHarness(t)
	c := h.dial("alice", "c", url.Values{"version": {"old"}})
	direct, _, err := c.recv(2 * time.Second)
	if err != nil || direct[0].GetErrorScreenMessage().GetCode().GetValue() != "NEW_VERSION" {
		t.Fatalf("got %v %v", direct, err)
	}
	if _, _, err := c.recv(2 * time.Second); websocket.CloseStatus(err) != websocket.StatusNormalClosure {
		t.Fatalf("expected a normal close after the error, got %v", err)
	}
}

func TestClosingTheTabFreesTheRoom(t *testing.T) {
	h := newHarness(t)
	alice := h.dial("alice", "c-alice", nil)
	alice.send(join(100, 100))
	alice.waitFor("roomJoined", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool { return d.GetRoomJoinedMessage() != nil })
	_ = alice.conn.Close(websocket.StatusNormalClosure, "Page unloading")
	deadline := time.Now().Add(3 * time.Second)
	for h.rooms.Len() != 0 || h.srv.RetainedSessions() != 0 {
		if time.Now().After(deadline) {
			t.Fatalf("room or session still alive: rooms=%d sessions=%d", h.rooms.Len(), h.srv.RetainedSessions())
		}
		time.Sleep(10 * time.Millisecond)
	}
}

func mustRoom(t *testing.T, h *harness) *core.Room {
	r, ok := h.rooms.Get(roomURL)
	if !ok {
		t.Fatal("no room")
	}
	return r
}

func (c *client) query(id int32, q *pb.QueryMessage) {
	q.Id = id
	c.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_QueryMessage{QueryMessage: q}})
}

func TestBubbleSpaceAnswersThenStartsWebRTC(t *testing.T) {
	h := newHarness(t)
	alice := h.dial("alice", "c-alice", nil)
	alice.send(join(100, 100))
	var bubble string
	alice.waitFor("roomJoined", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool { return d.GetRoomJoinedMessage() != nil })
	bob := h.dial("bob", "c-bob", nil)
	bob.send(join(110, 100))
	bob.waitFor("the bubble space", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		bubble = d.GetJoinSpaceRequestMessage().GetSpaceName()
		return bubble != ""
	})
	alice.waitFor("the bubble space", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool { return d.GetJoinSpaceRequestMessage() != nil })

	props := []string{"cameraState", "microphoneState", "screenSharingState"}
	for i, c := range []*client{alice, bob} {
		c.query(int32(10+i), &pb.QueryMessage{Query: &pb.QueryMessage_JoinSpaceQuery{JoinSpaceQuery: &pb.JoinSpaceQuery{SpaceName: bubble, PropertiesToSync: props}}})
		c.waitFor("the join answer", func(d *pb.ServerToClientMessage, s *pb.SubMessage) bool {
			if s.GetPrivateEvent() != nil {
				t.Fatal("a space message arrived before the join answer")
			}
			return strings.HasSuffix(d.GetAnswerMessage().GetJoinSpaceAnswer().GetSpaceUserId(), "_"+strconv.Itoa(int(c.userID)))
		})
		c.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_AddSpaceFilterMessage{AddSpaceFilterMessage: &pb.AddSpaceFilterMessage{
			SpaceFilterMessage: &pb.SpaceFilterMessage{SpaceName: bubble}}}})
	}
	bob.waitFor("both members", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		return len(s.GetInitSpaceUsersMessage().GetUsers()) == 2
	})
	// Who initiates depends on which of the two filters the space processed last: either is fine.
	alice.waitFor("the WebRTC start", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		start := s.GetPrivateEvent().GetSpaceEvent().GetWebRtcStartMessage()
		return start != nil && start.GetUserId() == strings.Replace(start.GetUserId(), "_"+strconv.Itoa(int(alice.userID)), "", 1) &&
			s.GetPrivateEvent().GetSpaceName() == bubble
	})
}

func TestOneClientCannotCreateSpacesWithoutLimit(t *testing.T) {
	h := newHarness(t)
	alice := h.dial("alice", "c-alice", nil)
	alice.send(join(100, 100))
	alice.waitFor("roomJoined", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool { return d.GetRoomJoinedMessage() != nil })
	for i := 0; i <= maxSpacesPerSession; i++ {
		alice.query(int32(i+1), &pb.QueryMessage{Query: &pb.QueryMessage_JoinSpaceQuery{JoinSpaceQuery: &pb.JoinSpaceQuery{SpaceName: "s" + strconv.Itoa(i)}}})
	}
	alice.waitFor("the refusal", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		a := d.GetAnswerMessage()
		return a.GetId() == maxSpacesPerSession+1 && a.GetError().GetMessage() == "Too many spaces joined"
	})
	if n := h.srv.spaces.Len(); n != maxSpacesPerSession {
		t.Fatalf("%d spaces alive", n)
	}
}

// Within one batch window, a client receives only the last position of each player.
func TestABatchCarriesOnlyTheLastPositionOfEachPlayer(t *testing.T) {
	h := newHarness(t)
	alice := h.dial("alice", "c-alice", nil)
	alice.send(join(100, 100))
	alice.waitFor("roomJoined", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool { return d.GetRoomJoinedMessage() != nil })
	bob := h.dial("bob", "c-bob", nil)
	bob.send(join(500, 500))
	alice.waitFor("bob", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		return s.GetUserJoinedMessage().GetUserUuid() == "bob"
	})
	time.Sleep(2 * batchDelay) // start from an empty batch

	for _, x := range []int32{510, 520, 530} {
		bob.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_UserMovesMessage{UserMovesMessage: &pb.UserMovesMessage{
			Position: &pb.PositionMessage{X: x, Y: 500, Moving: true}, Viewport: &pb.ViewportMessage{Left: 0, Top: 0, Right: 1000, Bottom: 1000},
		}}})
	}
	var seen []int32
	alice.waitFor("bob's last position", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		if mv := s.GetUserMovedMessage(); mv != nil {
			seen = append(seen, mv.GetPosition().GetX())
			return mv.GetPosition().GetX() == 530
		}
		return false
	})
	if len(seen) != 1 {
		t.Fatalf("the three moves fell in one batch window, alice should see only the last one: %v", seen)
	}
}
