package roomapi

import (
	"bytes"
	"context"
	"encoding/binary"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/structpb"

	"github.com/workadventure/workadventure/server-go/internal/core"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
	"github.com/workadventure/workadventure/server-go/internal/registry"
)

// A client speaking gRPC to the Room API as @workadventure/room-api-client does: HTTP/2 without TLS, the key in
// the X-API-Key metadata.

const room = "http://play.test/_/global/maps.test/m.json"

func newAPI(t *testing.T) (*httptest.Server, *registry.Refs[string, *core.Room]) {
	t.Helper()
	rooms := registry.NewRefs(func(url string) *core.Room {
		return core.NewRoom(url, core.Config{MinimumDistance: 64, GroupRadius: 48, MaxPerGroup: 4})
	}, func(r *core.Room) { r.Stop() })
	vars := func(string) core.RoomVariables {
		return core.RoomVariables{Defs: map[string]core.VarDef{"door": {}, "secret": {WritableBy: "admin"}}, Values: map[string]string{"door": `"closed"`}}
	}
	srv := httptest.NewUnstartedServer(New("MYKEY", "http://play.test", rooms, vars))
	srv.Config.Protocols = new(http.Protocols)
	srv.Config.Protocols.SetUnencryptedHTTP2(true)
	srv.Start()
	t.Cleanup(srv.Close)
	return srv, rooms
}

type stream struct {
	body    io.ReadCloser
	resp    *http.Response
	trailer http.Header
}

func call(t *testing.T, ctx context.Context, srv *httptest.Server, key, method string, req proto.Message) *stream {
	t.Helper()
	b, _ := proto.Marshal(req)
	frame := make([]byte, 5, 5+len(b))
	binary.BigEndian.PutUint32(frame[1:], uint32(len(b)))
	r, _ := http.NewRequestWithContext(ctx, "POST", srv.URL+"/roomApi.RoomApi/"+method, bytes.NewReader(append(frame, b...)))
	r.Header.Set("Content-Type", "application/grpc")
	r.Header.Set("Te", "trailers")
	if key != "" {
		r.Header.Set("X-Api-Key", key)
	}
	tr := &http.Transport{Protocols: new(http.Protocols)}
	tr.Protocols.SetUnencryptedHTTP2(true)
	resp, err := (&http.Client{Transport: tr}).Do(r)
	if err != nil {
		t.Fatal(err)
	}
	if resp.ProtoMajor != 2 {
		t.Fatalf("gRPC needs HTTP/2, got %s", resp.Proto)
	}
	return &stream{body: resp.Body, resp: resp}
}

// next reads the next message, or nil at the end of the stream.
func (s *stream) next(t *testing.T, m proto.Message) bool {
	t.Helper()
	var head [5]byte
	if _, err := io.ReadFull(s.body, head[:]); err != nil {
		return false
	}
	b := make([]byte, binary.BigEndian.Uint32(head[1:]))
	if _, err := io.ReadFull(s.body, b); err != nil {
		t.Fatal(err)
	}
	if err := proto.Unmarshal(b, m); err != nil {
		t.Fatal(err)
	}
	return true
}

// end reads the rest and returns grpc-status and grpc-message.
func (s *stream) end() (string, string) {
	_, _ = io.Copy(io.Discard, s.body)
	s.body.Close()
	return s.resp.Trailer.Get("Grpc-Status"), s.resp.Trailer.Get("Grpc-Message")
}

func TestTheRoomAPIWantsItsKeyAndARoomOfThisServer(t *testing.T) {
	srv, _ := newAPI(t)
	for _, c := range []struct{ key, room, status, msg string }{
		{"", room, "16", "X-API-Key metadata not defined!"},
		{"WRONG", room, "16", "Wrong API key"},
		{"MYKEY", "http://elsewhere.test/_/global/m.json", "7", "You cannot interact with this room!"},
	} {
		s := call(t, context.Background(), srv, c.key, "readVariable", &pb.VariableRequest{Room: c.room, Name: "door"})
		if st, msg := s.end(); st != c.status || msg != c.msg {
			t.Errorf("%+v: %s %q", c, st, msg)
		}
	}
}

func TestTheRoomAPIReadsAndWritesTheVariablesOfARoomNobodyIsIn(t *testing.T) {
	srv, _ := newAPI(t)
	s := call(t, context.Background(), srv, "MYKEY", "readVariable", &pb.VariableRequest{Room: room, Name: "door"})
	var v structpb.Value
	if !s.next(t, &v) || v.GetStringValue() != "closed" {
		t.Fatalf("the map's default: %v", &v)
	}
	if st, _ := s.end(); st != "0" {
		t.Fatal(st)
	}
	open, _ := structpb.NewValue(map[string]any{"state": "open", "by": "<api>"})
	s = call(t, context.Background(), srv, "MYKEY", "saveVariable", &pb.SaveVariableRequest{Room: room, Name: "secret", Value: open})
	if st, msg := s.end(); st != "0" {
		t.Fatalf("writableBy does not bind the Room API: %s %s", st, msg)
	}
	s = call(t, context.Background(), srv, "MYKEY", "saveVariable", &pb.SaveVariableRequest{Room: room, Name: "invented", Value: open})
	if st, _ := s.end(); st != "2" {
		t.Fatalf("an undeclared variable is refused: %s", st)
	}
}

func TestARoomAPIListenerGetsTheNextChangesAndTheEventsOfTheRoom(t *testing.T) {
	srv, rooms := newAPI(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	variables := call(t, ctx, srv, "MYKEY", "listenVariable", &pb.VariableRequest{Room: room, Name: "door"})
	events := call(t, ctx, srv, "MYKEY", "listenToEvent", &pb.EventRequest{Room: room, Name: "ring"})
	for deadline := time.Now().Add(2 * time.Second); len(rooms.Keys()) == 0 && time.Now().Before(deadline); time.Sleep(5 * time.Millisecond) {
	}
	time.Sleep(50 * time.Millisecond) // the listeners are registered
	open := structpb.NewStringValue("open")
	call(t, context.Background(), srv, "MYKEY", "saveVariable", &pb.SaveVariableRequest{Room: room, Name: "door", Value: open}).end()
	var v structpb.Value
	if !variables.next(t, &v) || v.GetStringValue() != "open" {
		t.Fatalf("the change, not the current value first: %v", &v)
	}
	for _, name := range []string{"knock", "ring"} {
		call(t, context.Background(), srv, "MYKEY", "broadcastEvent", &pb.DispatchEventRequest{Room: room, Name: name, Data: structpb.NewNumberValue(1)}).end()
	}
	var e pb.EventResponse
	if !events.next(t, &e) || e.GetData().GetNumberValue() != 1 || e.SenderId != nil {
		t.Fatalf("only the events of that name, without a sender when the Room API sent them: %v", &e)
	}
}
