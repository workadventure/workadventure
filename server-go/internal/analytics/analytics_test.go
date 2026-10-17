package analytics

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"regexp"
	"sort"
	"sync"
	"testing"
	"time"
)

// admin is a fake /api/analytics/events-batch: it answers what reply says, and keeps every batch it accepted.
type admin struct {
	mu       sync.Mutex
	accepted [][]Event
	calls    int
	reply    func(call int, b batch) int
}

type batch struct {
	SchemaVersion    int     `json:"schemaVersion"`
	SentAt           string  `json:"sentAt"`
	PusherInstanceID string  `json:"pusherInstanceId"`
	Events           []Event `json:"events"`
}

func (a *admin) start(t *testing.T) *Queue {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/analytics/events-batch" || r.Header.Get("Authorization") != "Bearer tok" || r.Header.Get("Content-Type") != "application/json" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		var b batch
		_ = json.NewDecoder(r.Body).Decode(&b)
		a.mu.Lock()
		defer a.mu.Unlock()
		a.calls++
		code := a.reply(a.calls, b)
		if code == http.StatusAccepted {
			a.accepted = append(a.accepted, b.Events)
		}
		w.WriteHeader(code)
	}))
	t.Cleanup(srv.Close)
	q := New(Config{AdminURL: srv.URL + "/", Token: "tok", InstanceID: "pod-1", Timeout: time.Second, MaxQueue: 3, MaxBatch: 10})
	q.SetEnabled(true)
	return q
}

func ev(id string) Event {
	return Event{EventName: "room.visited", Source: "front", EventID: id, Properties: map[string]any{}}
}

func ids(batches [][]Event) []string {
	var out []string
	for _, b := range batches {
		for _, e := range b {
			out = append(out, e.EventID)
		}
	}
	return out
}

func TestTheQueueSendsBatchesAndKeepsTheValidEventsOfARefusedOne(t *testing.T) {
	a := &admin{reply: func(call int, b batch) int {
		switch {
		case b.SchemaVersion != 1 || b.PusherInstanceID != "pod-1" || b.SentAt == "":
			return http.StatusBadRequest
		case call == 1:
			return http.StatusServiceUnavailable // tried again
		case len(b.Events) > 1:
			return http.StatusUnprocessableEntity // the batch holds an invalid event: one by one
		case b.Events[0].EventID == "bad":
			return http.StatusUnprocessableEntity
		}
		return http.StatusAccepted
	}}
	q := a.start(t)
	for _, id := range []string{"lost", "a", "bad", "b"} { // a queue of 3 drops its oldest
		q.Enqueue(ev(id))
	}
	q.Flush(context.Background())
	if got := ids(a.accepted); len(got) != 2 || got[0] != "a" || got[1] != "b" {
		t.Fatalf("the valid events get through, the invalid and the overflow are dropped: %v", got)
	}
	if q.dropped != 2 {
		t.Fatalf("dropped %d", q.dropped)
	}
}

func TestARejectedBatchIsNotTriedAgainAndNothingLeavesWhenDisabled(t *testing.T) {
	a := &admin{reply: func(int, batch) int { return http.StatusRequestEntityTooLarge }}
	q := a.start(t)
	q.Enqueue(ev("x"))
	q.Drain(5 * time.Second)
	if a.calls != 1 || q.pending() != 0 {
		t.Fatalf("a 413 is final: %d calls", a.calls)
	}
	q.SetEnabled(false)
	q.Enqueue(ev("y"))
	q.Drain(time.Second)
	if a.calls != 1 {
		t.Fatal("disabled: nothing is sent")
	}
}

func TestATimedEventIsMeasuredByTheServer(t *testing.T) {
	type row struct {
		name, id string
		at       time.Time
		p        map[string]any
	}
	var rows []row
	tr := NewTracker("tab", func(name, id string, at time.Time, p map[string]any) { rows = append(rows, row{name, id, at, p}) })
	t0 := time.UnixMilli(1_700_000_000_000)
	tr.Open(ConnectionHandle, "user.disconnected", map[string]any{"connectionId": "tab"}, t0)
	if len(rows) != 1 || rows[0].name != "user.connected" || rows[0].id != "tab:connection:opened:1700000000000" ||
		rows[0].p["connectedAt"] != "2023-11-14T22:13:20.000Z" {
		t.Fatalf("a session announces itself when it opens: %+v", rows)
	}
	tr.Open("m", "meeting.ended", map[string]any{"meetingId": "x"}, t0)
	if tr.Open("m", "meeting.ended", nil, t0) {
		t.Fatal("a handle opens once")
	}
	tr.Open("a", "area.dwell", map[string]any{"areaName": "hall"}, t0)
	tr.Close("a", "closed_by_client", t0.Add(500*time.Millisecond))
	if len(rows) != 2 || rows[1].name != "meeting.started" {
		t.Fatalf("an area left after half a second is churn: %+v", rows)
	}
	tr.CloseAll("socket_closed", t0.Add(time.Hour), t0.Add(90*time.Second+400*time.Millisecond))
	if len(rows) != 4 || rows[2].name != "meeting.ended" || rows[3].name != "user.disconnected" {
		t.Fatalf("the session closes last: %+v", rows)
	}
	m, s := rows[2].p, rows[3].p
	if m["durationSeconds"] != 90.4 || m["endReason"] != "socket_closed" || m["endedAt"] != "2023-11-14T22:14:50.400Z" || m["meetingId"] != "x" {
		t.Fatalf("a socket gone ends its intervals at its last message: %v", m)
	}
	if s["durationSeconds"] != int64(90) || s["disconnectReason"] != "socket_closed" || s["disconnectedAt"] == nil {
		t.Fatalf("a session counts whole seconds, with its own field names: %v", s)
	}
	for i := 0; i < MaxOpenTimed+1; i++ {
		tr.Open(string(rune('A'+i)), "status.dwell", nil, t0)
	}
	if len(tr.open) != MaxOpenTimed {
		t.Fatal("a connection keeps at most 32 intervals open")
	}
}

func TestTheClientMayReportOnlyItsOwnEvents(t *testing.T) {
	if !FromClient("room.visited", "front", "e1", 1) {
		t.Fatal("a front event")
	}
	for _, bad := range [][2]string{{"user.connected", "front"}, {"room.visited", "pusher"}, {"made.up", "front"}} {
		if FromClient(bad[0], bad[1], "e1", 1) {
			t.Fatalf("%v is refused", bad)
		}
	}
	if FromClient("room.visited", "front", "", 1) || FromClient("room.visited", "front", "e", 9e15) {
		t.Fatal("an event id and a plausible time are required")
	}
	if EndReason("left_area") != "closed_by_client" || EndReason("pusher_crashed") != "pusher_crashed" {
		t.Fatal("end reasons")
	}
}

// TestTheCatalogMatchesTheTSOne reads AnalyticsEventCatalog.ts when the repository is there.
func TestTheCatalogMatchesTheTSOne(t *testing.T) {
	src, err := os.ReadFile("../../../libs/messages/src/JsonMessages/AnalyticsEventCatalog.ts")
	if err != nil {
		t.Skip("no TS catalog next to this checkout")
	}
	var ts, ours []string
	for _, m := range regexp.MustCompile(`(?m)^  "([a-z0-9_.]+)": (\w+)\(`).FindAllSubmatch(src, -1) {
		ts = append(ts, string(m[1]))
		if _, isTimed := timed[string(m[1])]; isTimed != (string(m[2]) == "timedEvent") {
			t.Errorf("%s: timed is %v here", m[1], isTimed)
		}
	}
	for k := range catalog {
		ours = append(ours, k)
	}
	sort.Strings(ts)
	sort.Strings(ours)
	if len(ts) == 0 || len(ts) != len(ours) {
		t.Fatalf("%d events in TS, %d here", len(ts), len(ours))
	}
	for i := range ts {
		if ts[i] != ours[i] {
			t.Fatalf("%s vs %s", ts[i], ours[i])
		}
	}
}

func TestThePropertiesAreTheCatalogs(t *testing.T) {
	if ValidProperties("room.visited", map[string]any{"roomId": "r", "roomGroup": nil, "extra": true}) != nil {
		t.Fatal("the catalog's properties, and more (passthrough)")
	}
	if ValidProperties("room.visited", map[string]any{"roomId": 3, "roomGroup": nil}) == nil || ValidProperties("room.visited", map[string]any{}) == nil {
		t.Fatal("a wrong type or a missing property is refused")
	}
	if ValidOpenProperties("meeting.ended", map[string]any{"meetingKind": "stadium"}) == nil || ValidOpenProperties("area.dwell", map[string]any{}) == nil {
		t.Fatal("the open properties of a timed event are checked too")
	}
	for name := range catalog {
		if _, ok := schemas[name]; !ok {
			t.Errorf("%s has no schema: run gen.sh", name)
		}
	}
}

// TestTheSchemasMatchTheTSCatalog regenerates catalog.json when the repository and node are there.
func TestTheSchemasMatchTheTSCatalog(t *testing.T) {
	if _, err := os.Stat("../../../node_modules/zod-to-json-schema"); err != nil {
		t.Skip("no node_modules next to this checkout")
	}
	if _, err := exec.LookPath("npx"); err != nil {
		t.Skip("no npx")
	}
	cmd := exec.Command("npx", "--no-install", "tsx", "server-go/internal/analytics/gen/catalog.ts")
	cmd.Dir = "../../.."
	out, err := cmd.Output()
	if err != nil {
		t.Skipf("cannot run the generator here: %v", err)
	}
	if !bytes.Equal(bytes.TrimSpace(out), bytes.TrimSpace(catalogJSON)) {
		t.Fatal("catalog.json is stale: run server-go/internal/analytics/gen.sh")
	}
}
