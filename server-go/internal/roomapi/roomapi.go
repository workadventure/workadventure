// Package roomapi serves the public Room API (messages/protos/room-api.proto, the npm @workadventure/room-api-client)
// with grpc-go. It is an adapter: the rooms do the work (core/roomapi.go).
package roomapi

import (
	"bytes"
	"context"
	"crypto/subtle"
	"encoding/json"
	"slices"
	"strings"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/structpb"

	"github.com/workadventure/workadventure/server-go/internal/core"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
	rpb "github.com/workadventure/workadventure/server-go/internal/pb/roomapi"
	"github.com/workadventure/workadventure/server-go/internal/registry"
)

// Server answers the Room API for the rooms of this process.
type Server struct {
	rpb.UnimplementedRoomApiServer
	key, frontURL string
	rooms         *registry.Refs[string, *core.Room]
	variables     func(roomURL string) core.RoomVariables // what a room starts with (map declarations, stored values)
	admin         *AdminAuthorizer                        // with an admin, it decides instead of key and frontURL
}

// WithAdmin lets the admin authorize the calls (A25).
func (s *Server) WithAdmin(a *AdminAuthorizer) *Server { s.admin = a; return s }

// New serves the Room API with key (ROOM_API_SECRET_KEY) for the rooms under frontURL (FRONT_URL).
func New(key, frontURL string, rooms *registry.Refs[string, *core.Room], variables func(string) core.RoomVariables) *Server {
	return &Server{key: key, frontURL: frontURL, rooms: rooms, variables: variables}
}

// GRPC is the gRPC server of the Room API (without TLS, as the pusher). An error that is not a gRPC status becomes
// the pusher's INTERNAL.
func (s *Server) GRPC() *grpc.Server {
	g := grpc.NewServer(
		grpc.UnaryInterceptor(func(ctx context.Context, req any, _ *grpc.UnaryServerInfo, h grpc.UnaryHandler) (any, error) {
			resp, err := h(ctx, req)
			return resp, internal(err)
		}),
		grpc.StreamInterceptor(func(srv any, ss grpc.ServerStream, _ *grpc.StreamServerInfo, h grpc.StreamHandler) error {
			return internal(h(srv, ss))
		}))
	rpb.RegisterRoomApiServer(g, s)
	return g
}

func internal(err error) error {
	if _, ok := status.FromError(err); err != nil && !ok {
		return status.Error(codes.Internal, "Internal error, please contact us!")
	}
	return err
}

// listenerBuffer bounds what a slow listener may have pending; past it, its stream ends (RESOURCE_EXHAUSTED).
const listenerBuffer = 256

// authorize checks the key of the call and its room (LocalAuthenticator of the pusher, or the admin).
func (s *Server) authorize(ctx context.Context, room string) error {
	md, _ := metadata.FromIncomingContext(ctx)
	key := ""
	if v := md.Get("x-api-key"); len(v) > 0 {
		key = v[0]
	}
	if key == "" {
		return status.Error(codes.Unauthenticated, "X-API-Key metadata not defined!")
	}
	if s.admin != nil {
		return s.admin.authorize(key, room)
	}
	if s.key == "" || subtle.ConstantTimeCompare([]byte(key), []byte(s.key)) != 1 {
		return status.Error(codes.Unauthenticated, "Wrong API key")
	}
	if s.frontURL != "/" && !strings.HasPrefix(room, s.frontURL) {
		return status.Error(codes.PermissionDenied, "You cannot interact with this room!")
	}
	return nil
}

// room holds a room, created if needed, with its variables loaded, until release.
func (s *Server) room(ctx context.Context, url string) (room *core.Room, release func()) {
	room = s.rooms.Acquire(url)
	room.InitVariables(ctx, func() core.RoomVariables { return s.variables(url) })
	return room, func() { s.rooms.Release(url) }
}

func (s *Server) ReadVariable(ctx context.Context, req *rpb.VariableRequest) (*structpb.Value, error) {
	if err := s.authorize(ctx, req.GetRoom()); err != nil {
		return nil, err
	}
	room, release := s.room(ctx, req.GetRoom())
	defer release()
	value, ok, err := room.ReadVariable(ctx, req.GetName())
	if err != nil || !ok {
		return &structpb.Value{}, err
	}
	return jsonValue(value), nil
}

func (s *Server) SaveVariable(ctx context.Context, req *rpb.SaveVariableRequest) (*emptypb.Empty, error) {
	if err := s.authorize(ctx, req.GetRoom()); err != nil {
		return nil, err
	}
	room, release := s.room(ctx, req.GetRoom())
	defer release()
	v := core.Variable{Name: req.GetName(), Value: jsonString(req.GetValue())}
	save := func(mayRedeclare bool) (stale bool, err error) {
		type result struct {
			stale bool
			err   error
		}
		ch := make(chan result, 1)
		if err := room.SaveVariable(ctx, v, mayRedeclare, func(stale bool, err error) { ch <- result{stale, err} }); err != nil {
			return false, err
		}
		got := <-ch
		return got.stale, got.err
	}
	stale, err := save(true)
	if stale { // the map may declare it since it was read: read it again, once
		if err = room.Redeclare(ctx, s.variables(req.GetRoom())); err == nil {
			_, err = save(false)
		}
	}
	if err != nil {
		return nil, status.Error(codes.Unknown, err.Error())
	}
	return &emptypb.Empty{}, nil
}

func (s *Server) BroadcastEvent(ctx context.Context, req *rpb.DispatchEventRequest) (*emptypb.Empty, error) {
	if err := s.authorize(ctx, req.GetRoom()); err != nil {
		return nil, err
	}
	// Nobody to tell in a room that does not run: events are not kept for later.
	if slices.Contains(s.rooms.Keys(), req.GetRoom()) {
		room := s.rooms.Acquire(req.GetRoom())
		event := &pb.SubMessage{Message: &pb.SubMessage_ReceivedEventMessage{ReceivedEventMessage: &pb.ReceivedEventMessage{
			Name: req.GetName(), Data: req.GetData()}}}
		err := room.SendEvent(ctx, core.NewMsg(event, true), req.GetTargetUserIds())
		s.rooms.Release(req.GetRoom())
		if err != nil {
			return nil, err
		}
	}
	return &emptypb.Empty{}, nil
}

func (s *Server) ListenVariable(req *rpb.VariableRequest, stream grpc.ServerStreamingServer[structpb.Value]) error {
	return listen(s, stream.Context(), req.GetRoom(), func(e any) *structpb.Value {
		if v, ok := e.(core.VariableChanged); ok && v.Name == req.GetName() {
			return jsonValue(v.Value)
		}
		return nil
	}, stream.Send)
}

func (s *Server) ListenToEvent(req *rpb.EventRequest, stream grpc.ServerStreamingServer[rpb.EventResponse]) error {
	return listen(s, stream.Context(), req.GetRoom(), func(e any) *rpb.EventResponse {
		if m, ok := e.(*pb.SubMessage); ok {
			if ev := m.GetReceivedEventMessage(); ev != nil && ev.GetName() == req.GetName() {
				return &rpb.EventResponse{Data: ev.GetData(), SenderId: ev.SenderId}
			}
		}
		return nil
	}, stream.Send)
}

// listen streams what pick takes from the room's changes and events, until the caller hangs up. The room stays
// alive meanwhile.
func listen[M any](s *Server, ctx context.Context, url string, pick func(any) *M, send func(*M) error) error {
	if err := s.authorize(ctx, url); err != nil {
		return err
	}
	room, release := s.room(ctx, url)
	defer release()
	out := make(chan *M, listenerBuffer)
	overflow := make(chan struct{})
	stop, err := room.Watch(ctx, func(e any) {
		m := pick(e)
		if m == nil {
			return
		}
		select {
		case out <- m:
		default: // the listener does not keep up: its stream ends, the room does not wait
			select {
			case <-overflow:
			default:
				close(overflow)
			}
		}
	})
	if err != nil {
		return err
	}
	defer stop()
	for {
		select {
		case <-ctx.Done():
			return nil
		case <-overflow:
			return status.Error(codes.ResourceExhausted, "The listener does not read fast enough")
		case m := <-out:
			if err := send(m); err != nil {
				return nil
			}
		}
	}
}

// jsonValue turns a stored JSON value into a protobuf Value.
func jsonValue(value string) *structpb.Value {
	v := &structpb.Value{}
	if err := protojson.Unmarshal([]byte(value), v); err != nil {
		return structpb.NewStringValue(value)
	}
	return v
}

// jsonString is a Value as the TS back stores it (JSON.stringify).
func jsonString(v *structpb.Value) string {
	var b bytes.Buffer
	enc := json.NewEncoder(&b)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(v.AsInterface())
	return strings.TrimSuffix(b.String(), "\n")
}
