package ws

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync"
	"testing"
	"time"

	"google.golang.org/protobuf/types/known/structpb"

	"github.com/workadventure/workadventure/server-go/internal/admin"
	"github.com/workadventure/workadventure/server-go/internal/analytics"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

// analyticsWorld is an admin whose world allows the analytics.
type analyticsWorld struct{ admin.Admin }

func (a analyticsWorld) MemberData(ctx context.Context, q admin.MemberQuery) (admin.MemberData, error) {
	m, err := a.Admin.MemberData(ctx, q)
	m.World, m.AnalyticsEventsEnabled, m.Tags = "org/world", true, []string{"member"}
	return m, err
}

func TestTheFrontsEventsReachTheAdminSignedByTheServer(t *testing.T) {
	h := newHarness(t)
	h.srv.admin = analyticsWorld{h.srv.admin}
	var mu sync.Mutex
	var got []analytics.Event
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var b struct{ Events []analytics.Event }
		_ = json.NewDecoder(r.Body).Decode(&b)
		mu.Lock()
		got = append(got, b.Events...)
		mu.Unlock()
		w.WriteHeader(http.StatusAccepted)
	}))
	defer fake.Close()
	q := analytics.New(analytics.Config{AdminURL: fake.URL, Token: "t", InstanceID: "pusher", Timeout: time.Second, MaxQueue: 100, MaxBatch: 100})
	q.SetEnabled(true)
	h.srv.SetAnalytics(q)

	alice := h.dial("alice", "c-alice", nil)
	alice.send(join(100, 100))
	alice.waitFor("roomJoined", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool { return d.GetRoomJoinedMessage() != nil })
	props := func(m map[string]any) *structpb.Value { v, _ := structpb.NewValue(m); return v }
	report := func(events ...*pb.AnalyticsEventMessage) {
		alice.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_AnalyticsEventReportMessage{
			AnalyticsEventReportMessage: &pb.AnalyticsEventReportMessage{Events: events}}})
	}
	report(
		&pb.AnalyticsEventMessage{EventName: "room.visited", Source: "front", ClientEventTimeMs: 1_700_000_000_000, EventId: "v1", Properties: props(map[string]any{"x": 1})},
		&pb.AnalyticsEventMessage{EventName: "user.connected", Source: "front", EventId: "forged"},
		&pb.AnalyticsEventMessage{EventName: "made.up", Source: "front", EventId: "unknown"},
		&pb.AnalyticsEventMessage{EventName: "timed_event.open", Source: "front", EventId: "o",
			Properties: props(map[string]any{"handle": "m", "eventName": "meeting.ended", "properties": map[string]any{"meetingId": "abc"}})},
		&pb.AnalyticsEventMessage{EventName: "timed_event.open", Source: "front", EventId: "o2",
			Properties: props(map[string]any{"handle": "s", "eventName": "user.disconnected"})}, // the server's own
	)
	alice.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_VideoQualityReportMessage{VideoQualityReportMessage: &pb.VideoQualityReportMessage{
		Samples: []*pb.VideoQualitySampleMessage{{StreamId: "s1", SpaceName: "not-joined", Fps: 30}}}}})
	report(&pb.AnalyticsEventMessage{EventName: "timed_event.close", Source: "front", EventId: "c", Properties: props(map[string]any{"handle": "m"})})
	// The reports are handled in order: once the close is in, the shutdown closes the session.
	deadline := time.Now().Add(5 * time.Second)
	names := func() []string {
		q.Flush(context.Background())
		mu.Lock()
		defer mu.Unlock()
		var n []string
		for _, e := range got {
			n = append(n, e.EventName)
		}
		return n
	}
	for len(names()) < 4 && time.Now().Before(deadline) {
		time.Sleep(20 * time.Millisecond)
	}
	h.srv.CloseAnalytics()
	q.Drain(time.Second)

	want := []string{"user.connected", "room.visited", "meeting.started", "meeting.ended", "user.disconnected"}
	if n := names(); len(n) != len(want) {
		t.Fatalf("got %v, want %v", n, want)
	} else {
		for i := range want {
			if n[i] != want[i] {
				t.Fatalf("got %v, want %v", n, want)
			}
		}
	}
	v := got[1]
	if v.Source != "front" || v.EventID != "v1" || v.ClientEventTime != "2023-11-14T22:13:20.000Z" || v.UserUUID != "alice" ||
		v.UserID == nil || *v.UserID != alice.userID || v.World != "org/world" || v.RoomID != roomURL || v.TabID == nil ||
		*v.TabID != "tab-alice" || v.SpaceUserID != roomURL+"_"+strconv.Itoa(int(alice.userID)) || len(v.Tags) != 1 || v.Properties["x"] != 1.0 {
		t.Fatalf("the server signs the event with who sent it: %+v", v)
	}
	if got[3].Source != "pusher" || got[3].Properties["meetingId"] != "abc" || got[3].Properties["endReason"] != "closed_by_client" {
		t.Fatalf("the interval is the server's: %+v", got[3])
	}
	if got[4].Properties["disconnectReason"] != "pusher_shutdown" || got[4].Properties["connectionId"] != "tab-alice" {
		t.Fatalf("a shutdown closes the session: %+v", got[4])
	}
}
