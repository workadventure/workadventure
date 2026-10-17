package roomapi

import (
	"context"
	"net"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/structpb"

	"github.com/workadventure/workadventure/server-go/internal/core"
	rpb "github.com/workadventure/workadventure/server-go/internal/pb/roomapi"
	"github.com/workadventure/workadventure/server-go/internal/registry"
)

// A client speaking gRPC to the Room API as @workadventure/room-api-client does: no TLS, the key in the X-API-Key
// metadata.

const room = "http://play.test/_/global/maps.test/m.json"

func newAPI(t *testing.T) (rpb.RoomApiClient, *registry.Refs[string, *core.Room]) {
	t.Helper()
	rooms := registry.NewRefs(func(url string) *core.Room {
		return core.NewRoom(url, core.Config{MinimumDistance: 64, GroupRadius: 48, MaxPerGroup: 4})
	}, func(r *core.Room) { r.Stop() })
	vars := func(string) core.RoomVariables {
		return core.RoomVariables{Defs: map[string]core.VarDef{"door": {}, "secret": {WritableBy: "admin"}}, Values: map[string]string{"door": `"closed"`}}
	}
	srv := New("MYKEY", "http://play.test", rooms, vars).GRPC()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	go func() { _ = srv.Serve(ln) }()
	t.Cleanup(srv.Stop)
	conn, err := grpc.NewClient(ln.Addr().String(), grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = conn.Close() })
	return rpb.NewRoomApiClient(conn), rooms
}

func withKey(ctx context.Context, key string) context.Context {
	if key == "" {
		return ctx
	}
	return metadata.AppendToOutgoingContext(ctx, "X-API-Key", key)
}

func TestTheRoomAPIWantsItsKeyAndARoomOfThisServer(t *testing.T) {
	api, _ := newAPI(t)
	for _, c := range []struct {
		key, room string
		code      codes.Code
		msg       string
	}{
		{"", room, codes.Unauthenticated, "X-API-Key metadata not defined!"},
		{"WRONG", room, codes.Unauthenticated, "Wrong API key"},
		{"MYKEY", "http://elsewhere.test/_/global/m.json", codes.PermissionDenied, "You cannot interact with this room!"},
	} {
		_, err := api.ReadVariable(withKey(context.Background(), c.key), &rpb.VariableRequest{Room: c.room, Name: "door"})
		if st := status.Convert(err); st.Code() != c.code || st.Message() != c.msg {
			t.Errorf("%+v: %v", c, err)
		}
	}
}

func TestTheRoomAPIReadsAndWritesTheVariablesOfARoomNobodyIsIn(t *testing.T) {
	api, _ := newAPI(t)
	ctx := withKey(context.Background(), "MYKEY")
	v, err := api.ReadVariable(ctx, &rpb.VariableRequest{Room: room, Name: "door"})
	if err != nil || v.GetStringValue() != "closed" {
		t.Fatalf("the map's default: %v %v", v, err)
	}
	open, _ := structpb.NewValue(map[string]any{"state": "open", "by": "<api>"})
	if _, err := api.SaveVariable(ctx, &rpb.SaveVariableRequest{Room: room, Name: "secret", Value: open}); err != nil {
		t.Fatalf("writableBy does not bind the Room API: %v", err)
	}
	if _, err := api.SaveVariable(ctx, &rpb.SaveVariableRequest{Room: room, Name: "invented", Value: open}); status.Code(err) != codes.Unknown {
		t.Fatalf("an undeclared variable is refused: %v", err)
	}
}

func TestARoomAPIListenerGetsTheNextChangesAndTheEventsOfTheRoom(t *testing.T) {
	api, rooms := newAPI(t)
	ctx, cancel := context.WithCancel(withKey(context.Background(), "MYKEY"))
	defer cancel()
	variables, err := api.ListenVariable(ctx, &rpb.VariableRequest{Room: room, Name: "door"})
	if err != nil {
		t.Fatal(err)
	}
	events, err := api.ListenToEvent(ctx, &rpb.EventRequest{Room: room, Name: "ring"})
	if err != nil {
		t.Fatal(err)
	}
	for deadline := time.Now().Add(2 * time.Second); len(rooms.Keys()) == 0 && time.Now().Before(deadline); time.Sleep(5 * time.Millisecond) {
	}
	time.Sleep(50 * time.Millisecond) // the listeners are registered
	if _, err := api.SaveVariable(ctx, &rpb.SaveVariableRequest{Room: room, Name: "door", Value: structpb.NewStringValue("open")}); err != nil {
		t.Fatal(err)
	}
	if v, err := variables.Recv(); err != nil || v.GetStringValue() != "open" {
		t.Fatalf("the change, not the current value first: %v %v", v, err)
	}
	for _, name := range []string{"knock", "ring"} {
		if _, err := api.BroadcastEvent(ctx, &rpb.DispatchEventRequest{Room: room, Name: name, Data: structpb.NewNumberValue(1)}); err != nil {
			t.Fatal(err)
		}
	}
	if e, err := events.Recv(); err != nil || e.GetData().GetNumberValue() != 1 || e.SenderId != nil {
		t.Fatalf("only the events of that name, without a sender when the Room API sent them: %v %v", e, err)
	}
}
