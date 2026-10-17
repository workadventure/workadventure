// Package roomapi serves the public Room API (messages/protos/room-api.proto, the npm @workadventure/room-api-client):
// gRPC, written by hand over HTTP/2 without TLS, for the five calls of the RoomApi service. It is an adapter: the
// rooms do the work (core/roomapi.go).
package roomapi

import (
	"bytes"
	"context"
	"crypto/subtle"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"slices"
	"strconv"
	"strings"

	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/structpb"

	"github.com/workadventure/workadventure/server-go/internal/core"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
	"github.com/workadventure/workadventure/server-go/internal/registry"
)

// gRPC status codes.
const (
	codeOK               = 0
	codeUnknown          = 2
	codeInvalidArgument  = 3
	codeNotFound         = 5
	codePermissionDenied = 7
	codeResourceExhaust  = 8
	codeUnimplemented    = 12
	codeInternal         = 13
	codeUnauthenticated  = 16
)

type status struct {
	code int
	msg  string
}

func (s *status) Error() string { return s.msg }

func fail(code int, format string, args ...any) error {
	return &status{code, fmt.Sprintf(format, args...)}
}

// Server answers the Room API for the rooms of this process.
type Server struct {
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

// listenerBuffer bounds what a slow listener may have pending; past it, its stream ends (RESOURCE_EXHAUSTED).
const listenerBuffer = 256

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Trailer", "Grpc-Status, Grpc-Message")
	if r.Method != http.MethodPost || !strings.HasPrefix(r.Header.Get("Content-Type"), "application/grpc") {
		http.Error(w, "gRPC only", http.StatusUnsupportedMediaType)
		return
	}
	w.Header().Set("Content-Type", "application/grpc")
	w.WriteHeader(http.StatusOK)
	if f, ok := w.(http.Flusher); ok {
		f.Flush() // a listener's client waits for the headers before the first change
	}
	err := s.call(r, w)
	var st *status
	if err != nil && !errors.As(err, &st) {
		st = &status{codeInternal, "Internal error, please contact us!"}
	}
	if st == nil {
		st = &status{codeOK, ""}
	}
	w.Header().Set("Grpc-Status", strconv.Itoa(st.code))
	w.Header().Set("Grpc-Message", percentEncode(st.msg))
}

func (s *Server) call(r *http.Request, w http.ResponseWriter) error {
	method := strings.TrimPrefix(r.URL.Path, "/roomApi.RoomApi/")
	body, err := readMessage(r.Body)
	if err != nil {
		return fail(codeInvalidArgument, "%v", err)
	}
	send := func(m proto.Message) error { return writeMessage(w, m) }
	key := r.Header.Get("X-Api-Key")
	switch method {
	case "readVariable":
		var req pb.VariableRequest
		if err := s.decode(body, &req, key, func() string { return req.GetRoom() }); err != nil {
			return err
		}
		return s.readVariable(r.Context(), &req, send)
	case "listenVariable":
		var req pb.VariableRequest
		if err := s.decode(body, &req, key, func() string { return req.GetRoom() }); err != nil {
			return err
		}
		return s.listenVariable(r.Context(), &req, send)
	case "saveVariable":
		var req pb.SaveVariableRequest
		if err := s.decode(body, &req, key, func() string { return req.GetRoom() }); err != nil {
			return err
		}
		return s.saveVariable(r.Context(), &req, send)
	case "broadcastEvent":
		var req pb.DispatchEventRequest
		if err := s.decode(body, &req, key, func() string { return req.GetRoom() }); err != nil {
			return err
		}
		return s.broadcastEvent(r.Context(), &req, send)
	case "listenToEvent":
		var req pb.EventRequest
		if err := s.decode(body, &req, key, func() string { return req.GetRoom() }); err != nil {
			return err
		}
		return s.listenToEvent(r.Context(), &req, send)
	}
	return fail(codeUnimplemented, "Method %s not found", method)
}

// decode reads the request, then checks the key and the room (LocalAuthenticator of the pusher).
func (s *Server) decode(body []byte, m proto.Message, key string, room func() string) error {
	if err := proto.Unmarshal(body, m); err != nil {
		return fail(codeInvalidArgument, "%v", err)
	}
	if key == "" {
		return fail(codeUnauthenticated, "X-API-Key metadata not defined!")
	}
	if s.admin != nil {
		return s.admin.authorize(key, room())
	}
	if s.key == "" || subtle.ConstantTimeCompare([]byte(key), []byte(s.key)) != 1 {
		return fail(codeUnauthenticated, "Wrong API key")
	}
	if s.frontURL != "/" && !strings.HasPrefix(room(), s.frontURL) {
		return fail(codePermissionDenied, "You cannot interact with this room!")
	}
	return nil
}

// room holds a room, created if needed, with its variables loaded, until release.
func (s *Server) room(ctx context.Context, url string) (room *core.Room, release func()) {
	room = s.rooms.Acquire(url)
	room.InitVariables(ctx, func() core.RoomVariables { return s.variables(url) })
	return room, func() { s.rooms.Release(url) }
}

func (s *Server) readVariable(ctx context.Context, req *pb.VariableRequest, send func(proto.Message) error) error {
	room, release := s.room(ctx, req.GetRoom())
	defer release()
	value, ok, err := room.ReadVariable(ctx, req.GetName())
	if err != nil {
		return err
	}
	if !ok {
		return send(&structpb.Value{})
	}
	return send(jsonValue(value))
}

func (s *Server) saveVariable(ctx context.Context, req *pb.SaveVariableRequest, send func(proto.Message) error) error {
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
		return fail(codeUnknown, "%v", err)
	}
	return send(&emptypb.Empty{})
}

func (s *Server) broadcastEvent(ctx context.Context, req *pb.DispatchEventRequest, send func(proto.Message) error) error {
	// Nobody to tell in a room that does not run: events are not kept for later.
	if slices.Contains(s.rooms.Keys(), req.GetRoom()) {
		room := s.rooms.Acquire(req.GetRoom())
		event := &pb.SubMessage{Message: &pb.SubMessage_ReceivedEventMessage{ReceivedEventMessage: &pb.ReceivedEventMessage{
			Name: req.GetName(), Data: req.GetData()}}}
		err := room.SendEvent(ctx, core.NewMsg(event, true), req.GetTargetUserIds())
		s.rooms.Release(req.GetRoom())
		if err != nil {
			return err
		}
	}
	return send(&emptypb.Empty{})
}

func (s *Server) listenVariable(ctx context.Context, req *pb.VariableRequest, send func(proto.Message) error) error {
	return s.listen(ctx, req.GetRoom(), func(e any) proto.Message {
		if v, ok := e.(core.VariableChanged); ok && v.Name == req.GetName() {
			return jsonValue(v.Value)
		}
		return nil
	}, send)
}

func (s *Server) listenToEvent(ctx context.Context, req *pb.EventRequest, send func(proto.Message) error) error {
	return s.listen(ctx, req.GetRoom(), func(e any) proto.Message {
		if m, ok := e.(*pb.SubMessage); ok {
			if ev := m.GetReceivedEventMessage(); ev != nil && ev.GetName() == req.GetName() {
				return &pb.EventResponse{Data: ev.GetData(), SenderId: ev.SenderId}
			}
		}
		return nil
	}, send)
}

// listen streams what pick takes from the room's changes and events, until the caller hangs up. The room stays
// alive meanwhile.
func (s *Server) listen(ctx context.Context, url string, pick func(any) proto.Message, send func(proto.Message) error) error {
	room, release := s.room(ctx, url)
	defer release()
	out := make(chan proto.Message, listenerBuffer)
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
			return fail(codeResourceExhaust, "The listener does not read fast enough")
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

// readMessage reads the one message of a gRPC request: a compression flag, a big-endian length, the bytes.
func readMessage(body io.Reader) ([]byte, error) {
	var head [5]byte
	if _, err := io.ReadFull(body, head[:]); err != nil {
		return nil, errors.New("no request message")
	}
	if head[0] != 0 {
		return nil, errors.New("compressed messages are not supported")
	}
	n := binary.BigEndian.Uint32(head[1:])
	if n > 4<<20 {
		return nil, errors.New("request message too large")
	}
	msg := make([]byte, n)
	_, err := io.ReadFull(body, msg)
	return msg, err
}

func writeMessage(w http.ResponseWriter, m proto.Message) error {
	b, err := proto.Marshal(m)
	if err != nil {
		return err
	}
	frame := make([]byte, 5, 5+len(b))
	binary.BigEndian.PutUint32(frame[1:], uint32(len(b)))
	if _, err := w.Write(append(frame, b...)); err != nil {
		return err
	}
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}
	return nil
}

// percentEncode is how grpc-message is written: bytes outside printable ASCII, and %, as %XX.
func percentEncode(s string) string {
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c < 0x20 || c > 0x7e || c == '%' {
			fmt.Fprintf(&b, "%%%02X", c)
		} else {
			b.WriteByte(c)
		}
	}
	return b.String()
}
