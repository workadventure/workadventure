package ws

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"io"
	"net/http"

	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/types/known/structpb"

	"github.com/workadventure/workadventure/server-go/internal/core"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

// sendEvent answers SendEventQuery (WA.event.broadcast, player.sendEvent): the event goes to the whole room, the
// sender included, or to the players it names.
func (s *Session) sendEvent(id int32, q *pb.SendEventQuery) {
	uid := s.userID.Load()
	if uid == 0 {
		s.answerError(id, "Cannot send an event before joining the room")
		return
	}
	event := &pb.SubMessage{Message: &pb.SubMessage_ReceivedEventMessage{ReceivedEventMessage: &pb.ReceivedEventMessage{
		Name: q.GetName(), Data: q.GetData(), SenderId: &uid}}}
	_ = s.room.SendEvent(s.ctx, core.NewMsg(event, true), q.GetTargetUserIds())
	s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_SendEventAnswer{SendEventAnswer: &pb.SendEventAnswer{}}})
}

// adminToken checks the token of the administration routes (ADMIN_API_TOKEN, adminToken middleware of the pusher).
func (srv *Server) adminToken(w http.ResponseWriter, r *http.Request) bool {
	token := srv.cfg.AdminAPIToken
	if token == "" {
		http.Error(w, "No token configured!", http.StatusUnauthorized)
		return false
	}
	given := r.Header.Get("admin-token")
	if given == "" {
		given = r.Header.Get("Authorization")
	}
	if subtle.ConstantTimeCompare([]byte(given), []byte(token)) != 1 {
		http.Error(w, "Incorrect token", http.StatusUnauthorized)
		return false
	}
	return true
}

// Rooms is GET /rooms of the pusher: the live rooms and their number of players.
func (srv *Server) Rooms(w http.ResponseWriter, r *http.Request) {
	if !srv.adminToken(w, r) {
		return
	}
	out := map[string]int{}
	for _, roomURL := range srv.rooms.Keys() {
		room := srv.rooms.Acquire(roomURL)
		if st, err := room.Stats(r.Context()); err == nil {
			out[roomURL] = st.Users
		}
		srv.rooms.Release(roomURL)
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}

// GlobalEvent is POST /global/event of the pusher: an administration tool sends a scripting event to every room.
func (srv *Server) GlobalEvent(w http.ResponseWriter, r *http.Request) {
	if !srv.adminToken(w, r) {
		return
	}
	var body struct {
		Name *string         `json:"name"`
		Data json.RawMessage `json:"data"`
	}
	raw, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil || json.Unmarshal(raw, &body) != nil || body.Name == nil {
		http.Error(w, "Invalid body: name is required", http.StatusBadRequest)
		return
	}
	data := structpb.NewNullValue()
	if len(body.Data) > 0 {
		if err := protojson.Unmarshal(body.Data, data); err != nil {
			http.Error(w, "Invalid data", http.StatusBadRequest)
			return
		}
	}
	event := core.NewMsg(&pb.SubMessage{Message: &pb.SubMessage_ReceivedEventMessage{ReceivedEventMessage: &pb.ReceivedEventMessage{
		Name: *body.Name, Data: data}}}, true)
	for _, roomURL := range srv.rooms.Keys() {
		room := srv.rooms.Acquire(roomURL)
		_ = room.SendEvent(context.Background(), event, nil)
		srv.rooms.Release(roomURL)
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = io.WriteString(w, "ok")
}
