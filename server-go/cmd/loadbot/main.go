// Command loadbot puts bots speaking the front's protocol into rooms and measures the server: moves sent,
// messages received, and the latency between a bot sending a move and another bot seeing it. It works against
// any implementation of the protocol (TS pusher, Go or Rust candidate).
//
//	loadbot -http http://server:3000 -rooms 50 -users 20 -rate 10 -duration 30s
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"math/rand/v2"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/coder/websocket"
	"google.golang.org/protobuf/proto"

	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

var (
	httpURL  = flag.String("http", "http://localhost:3000", "server base URL")
	rooms    = flag.Int("rooms", 10, "number of rooms")
	users    = flag.Int("users", 20, "bots per room")
	rate     = flag.Float64("rate", 10, "moves per second per bot")
	duration = flag.Duration("duration", 30*time.Second, "measurement window")
	warmup   = flag.Duration("warmup", 10*time.Second, "time to connect everybody before measuring")
	side     = flag.Int("side", 1600, "bots are spread on a side x side pixels square")
	version  = flag.String("version", "dev", "apiVersionHash of the server")
)

const histogramMax = 60_000

// A bot walks back and forth on a 256-pixel segment: its x tells which of its last 256 moves another bot sees.
// A move seen more than 256 moves late (25 s at 10 moves/s) cannot be told from a recent one: it is counted in the
// last bucket of the histogram.
const track = 256

type bot struct {
	room    int
	x0, y0  int32
	userID  atomic.Int32
	sentAt  [track]atomic.Int64 // unix nanoseconds of the last send of each position of the segment
	conn    *websocket.Conn
	nonce   uint32
	writeMu sync.Mutex
}

type stats struct {
	measuring atomic.Bool
	moves     atomic.Int64
	frames    atomic.Int64
	subs      atomic.Int64
	userMoves atomic.Int64
	errors    atomic.Int64
	joined    atomic.Int64
	// Latency histogram in milliseconds (the last bucket holds everything above). Fixed size: storing millions of
	// samples made the generator's own garbage collection show up in the latencies it measures.
	latency    [histogramMax + 1]atomic.Int64
	byRoomMu   sync.RWMutex
	byRoomUser map[[2]int32]*bot
}

func main() {
	flag.Parse()
	st := &stats{byRoomUser: map[[2]int32]*bot{}}
	ctx, cancel := context.WithCancel(context.Background())
	var wg sync.WaitGroup
	start := time.Now()
	for r := 0; r < *rooms; r++ {
		for u := 0; u < *users; u++ {
			b := &bot{room: r, x0: int32(rand.IntN(*side - track)), y0: int32(rand.IntN(*side))}
			wg.Add(1)
			go func() {
				defer wg.Done()
				if err := b.run(ctx, st); err != nil && ctx.Err() == nil {
					st.errors.Add(1)
					fmt.Fprintln(os.Stderr, "bot:", err)
				}
			}()
			time.Sleep(*warmup / time.Duration(2*(*rooms)*(*users))) // spread the connections over half the warmup
		}
	}
	time.Sleep(*warmup - time.Since(start))
	st.measuring.Store(true)
	t0 := time.Now()
	time.Sleep(*duration)
	st.measuring.Store(false)
	elapsed := time.Since(t0).Seconds()
	cancel()
	wg.Wait()

	var total int64
	for i := range st.latency {
		total += st.latency[i].Load()
	}
	q := func(p float64) float64 {
		rank, seen := int64(p*float64(total-1)), int64(0) // 0-based rank of the sample
		for ms := range st.latency {
			if seen += st.latency[ms].Load(); seen > rank {
				return float64(ms)
			}
		}
		return 0
	}
	out, _ := json.Marshal(map[string]any{
		"bots": *rooms * *users, "joined": st.joined.Load(), "rooms": *rooms, "errors": st.errors.Load(),
		"moves_per_s":       float64(st.moves.Load()) / elapsed,
		"frames_per_s":      float64(st.frames.Load()) / elapsed,
		"submessages_per_s": float64(st.subs.Load()) / elapsed,
		"seen_moves_per_s":  float64(st.userMoves.Load()) / elapsed,
		"latency_ms_p50":    q(0.50),
		"latency_ms_p99":    q(0.99),
		"latency_ms_max":    q(1),
		"latency_samples":   total,
	})
	fmt.Println(string(out))
}

func (b *bot) send(ctx context.Context, m *pb.ClientToServerMessage) error {
	b.writeMu.Lock()
	defer b.writeMu.Unlock()
	b.nonce++
	data, _ := proto.Marshal(&pb.FrontToPusherWebSocketMessage{Nonce: b.nonce, Message: m})
	return b.conn.Write(ctx, websocket.MessageBinary, data)
}

func (b *bot) viewport(x, y int32) *pb.ViewportMessage {
	return &pb.ViewportMessage{Left: x - 640, Top: y - 360, Right: x + 640, Bottom: y + 360}
}

func (b *bot) run(ctx context.Context, st *stats) error {
	resp, err := http.Post(*httpURL+"/anonymLogin", "application/json", nil)
	if err != nil {
		return err
	}
	var login struct{ AuthToken string }
	err = json.NewDecoder(resp.Body).Decode(&login)
	_ = resp.Body.Close()
	if err != nil {
		return err
	}
	roomURL := fmt.Sprintf("%s/_/global/maps.example/load/%d.json", *httpURL, b.room)
	q := url.Values{"roomId": {roomURL}, "version": {*version}, "chatID": {""}, "roomName": {"load"}, "cameraState": {"false"},
		"microphoneState": {"false"}, "tabId": {fmt.Sprintf("tab-%p", b)}, "characterTextureIds": {"male1"}}
	wsURL := strings.Replace(*httpURL, "http", "ws", 1) + "/ws/room?" + q.Encode()
	b.conn, _, err = websocket.Dial(ctx, wsURL, &websocket.DialOptions{Subprotocols: []string{login.AuthToken}}) //nolint:bodyclose // coder/websocket closes the handshake's body
	if err != nil {
		return err
	}
	defer func() { _ = b.conn.CloseNow() }()
	b.conn.SetReadLimit(16 << 20)

	joined := make(chan struct{})
	go func() {
		defer close(joined)
		err = b.read(ctx, st, joined)
	}()
	if err := b.send(ctx, &pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_JoinRoomFrontMessage{JoinRoomFrontMessage: &pb.JoinRoomFrontMessage{
		Name: "bot", AvailabilityStatus: pb.AvailabilityStatus_ONLINE,
		PositionMessage: &pb.PositionMessage{X: b.x0, Y: b.y0}, ViewportMessage: b.viewport(b.x0, b.y0),
	}}}); err != nil {
		return err
	}
	for b.userID.Load() == 0 {
		select {
		case <-ctx.Done():
			return nil
		case <-joined:
			return err
		case <-time.After(10 * time.Millisecond):
		}
	}
	st.joined.Add(1)

	tick := time.NewTicker(time.Duration(float64(time.Second) / *rate))
	defer tick.Stop()
	for seq := 0; ; seq++ {
		select {
		case <-ctx.Done():
			<-joined
			return nil
		case <-joined:
			return err
		case <-tick.C:
		}
		i := seq % track
		x := b.x0 + int32(i)
		b.sentAt[i].Store(time.Now().UnixNano())
		if err := b.send(ctx, &pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_UserMovesMessage{UserMovesMessage: &pb.UserMovesMessage{
			Position: &pb.PositionMessage{X: x, Y: b.y0, Direction: pb.PositionMessage_RIGHT, Moving: seq%50 != 49},
			Viewport: b.viewport(x, b.y0),
		}}}); err != nil {
			return err
		}
		if st.measuring.Load() {
			st.moves.Add(1)
		}
	}
}

func (b *bot) read(ctx context.Context, st *stats, joined chan struct{}) error {
	for {
		_, data, err := b.conn.Read(ctx)
		if err != nil {
			return err
		}
		now := time.Now()
		var env pb.PusherToFrontWebSocketMessage
		if err := proto.Unmarshal(data, &env); err != nil {
			return err
		}
		measuring := st.measuring.Load()
		if measuring {
			st.frames.Add(1)
		}
		if j := env.Message.GetRoomJoinedMessage(); j != nil {
			st.byRoomMu.Lock()
			st.byRoomUser[[2]int32{int32(b.room), j.CurrentUserId}] = b
			st.byRoomMu.Unlock()
			b.userID.Store(j.CurrentUserId)
		}
		batch := env.Message.GetBatchMessage()
		if batch == nil || !measuring {
			continue
		}
		st.subs.Add(int64(len(batch.Payload)))
		for _, s := range batch.Payload {
			mv := s.GetUserMovedMessage()
			if mv == nil {
				continue
			}
			st.userMoves.Add(1)
			st.byRoomMu.RLock()
			sender := st.byRoomUser[[2]int32{int32(b.room), mv.UserId}]
			st.byRoomMu.RUnlock()
			if sender == nil {
				continue
			}
			i := mv.Position.X - sender.x0
			if i < 0 || i >= track {
				continue
			}
			if sent := sender.sentAt[i].Load(); sent != 0 {
				ms := now.Sub(time.Unix(0, sent)).Milliseconds()
				if ms < 0 { // the slot was reused by a newer move: this one is at least one lap late
					ms = histogramMax
				}
				st.latency[min(ms, histogramMax)].Add(1)
			}
		}
	}
}
