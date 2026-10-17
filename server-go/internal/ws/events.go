package ws

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"io"
	"net/http"
	"slices"

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

// liveRoom runs f on a room that has players; a room nobody is in is not created for it.
func (srv *Server) liveRoom(url string, f func(*core.Room) error) error {
	if !slices.Contains(srv.rooms.Keys(), url) {
		return nil
	}
	room := srv.rooms.Acquire(url)
	defer srv.rooms.Release(url)
	return f(room)
}

// RoomRefresh is POST /room/refresh of the pusher: the admin changed a room; read its map again, tell its players.
func (srv *Server) RoomRefresh(w http.ResponseWriter, r *http.Request) {
	if !srv.adminToken(w, r) {
		return
	}
	var body struct {
		RoomID *string `json:"roomId"`
	}
	if json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body) != nil || body.RoomID == nil {
		http.Error(w, "Incorrect roomId parameter", http.StatusInternalServerError)
		return
	}
	srv.roomMaps.Delete(*body.RoomID)
	_ = srv.liveRoom(*body.RoomID, func(room *core.Room) error { return room.MapChanged(context.Background(), false) })
	_, _ = io.WriteString(w, "ok")
}

// AdminMessage is POST /message of the pusher: a text of the admin to rooms, or the warning that the world is full.
func (srv *Server) AdminMessage(w http.ResponseWriter, r *http.Request) {
	if !srv.adminToken(w, r) {
		return
	}
	var body struct {
		Text    *string  `json:"text"`
		Type    string   `json:"type"`
		Targets []string `json:"targets"`
	}
	if json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body) != nil || body.Text == nil || (body.Type != "message" && body.Type != "capacity") || body.Targets == nil {
		http.Error(w, "Incorrect text, type or targets parameter", http.StatusInternalServerError)
		return
	}
	var m *core.Msg
	if body.Type == "message" {
		m = core.NewMsg(core.UserMessage{Type: "", Message: *body.Text}, false)
	} else {
		m = core.NewMsg(&pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_WorldFullWarningMessage{WorldFullWarningMessage: &pb.WorldFullWarningMessage{}}}, false)
	}
	for _, url := range body.Targets {
		_ = srv.liveRoom(url, func(room *core.Room) error { return room.ToUsers(context.Background(), m) })
	}
	_, _ = io.WriteString(w, "ok")
}

// ExternalModuleEvent is POST /external-module/event of the pusher: a module's message to one user of a room.
func (srv *Server) ExternalModuleEvent(w http.ResponseWriter, r *http.Request) {
	if !srv.adminToken(w, r) {
		return
	}
	var body struct {
		Data struct {
			RoomID        string          `json:"roomId"`
			ModuleID      *string         `json:"moduleId"`
			RecipientUUID *string         `json:"recipientUuid"`
			Message       json.RawMessage `json:"message"`
		} `json:"data"`
	}
	raw, _ := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if json.Unmarshal(raw, &body) != nil || body.Data.ModuleID == nil || body.Data.RecipientUUID == nil || len(body.Data.Message) == 0 || body.Data.Message[0] != '{' {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = io.WriteString(w, `{"cause":"Incorrect moduleId, recipientUuid or message parameter"}`)
		return
	}
	message := &structpb.Value{}
	_ = protojson.Unmarshal(body.Data.Message, message)
	d := body.Data
	m := core.NewMsg(&pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_ExternalModuleMessage{ExternalModuleMessage: &pb.ExternalModuleMessage{
		ModuleId: *d.ModuleID, RecipientUuid: d.RecipientUUID, RoomId: &d.RoomID, Message: message}}}, false)
	_ = srv.liveRoom(d.RoomID, func(room *core.Room) error { return room.ToUUID(context.Background(), *d.RecipientUUID, m) })
	_, _ = io.WriteString(w, "ok")
}
