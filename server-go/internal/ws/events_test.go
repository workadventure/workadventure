package ws

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"google.golang.org/protobuf/types/known/structpb"

	"github.com/workadventure/workadventure/server-go/internal/auth"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

// A scripting event (WA.event.broadcast) reaches the room signed with the sender's id; one aimed at a player
// reaches that player alone.
func TestAScriptingEventReachesTheRoomOrItsTarget(t *testing.T) {
	h := newHarness(t)
	alice := h.dialAs(auth.Token{Identifier: "alice"}, "")
	bob := h.dialAs(auth.Token{Identifier: "bob"}, "")
	carol := h.dialAs(auth.Token{Identifier: "carol"}, "")
	send := func(c *client, id int32, name string, targets ...int32) {
		c.query(id, &pb.QueryMessage{Query: &pb.QueryMessage_SendEventQuery{SendEventQuery: &pb.SendEventQuery{
			Name: name, Data: structpb.NewStringValue("x"), TargetUserIds: targets}}})
	}
	send(alice, 1, "to-all")
	for _, c := range []*client{alice, bob, carol} {
		c.waitFor("the broadcast", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
			e := s.GetReceivedEventMessage()
			return e.GetName() == "to-all" && e.GetSenderId() == alice.userID
		})
	}
	send(alice, 2, "to-bob", bob.userID)
	send(alice, 3, "marker") // what carol gets next is this one: she never saw to-bob
	bob.waitFor("the targeted event", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		return s.GetReceivedEventMessage().GetName() == "to-bob"
	})
	carol.waitFor("the next broadcast", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		switch s.GetReceivedEventMessage().GetName() {
		case "to-bob":
			t.Fatal("an event for bob reached carol")
		case "marker":
			return true
		}
		return false
	})
}

// The administration routes want ADMIN_API_TOKEN: a global event then reaches every room, and /rooms counts players.
func TestTheAdminsGlobalEventAndRoomCount(t *testing.T) {
	h := newHarness(t)
	h.srv.cfg.AdminAPIToken = "admin-token"
	alice := h.dialAs(auth.Token{Identifier: "alice"}, "")
	post := func(token, body string) *httptest.ResponseRecorder {
		r := httptest.NewRequest("POST", "/global/event", strings.NewReader(body))
		r.Header.Set("Authorization", token)
		w := httptest.NewRecorder()
		h.srv.GlobalEvent(w, r)
		return w
	}
	if w := post("wrong", `{"name":"x"}`); w.Code != http.StatusUnauthorized {
		t.Fatal(w.Code)
	}
	if w := post("admin-token", `{"data":1}`); w.Code != http.StatusBadRequest {
		t.Fatal("a name is required", w.Code)
	}
	if w := post("admin-token", `{"name":"maintenance","data":{"in":5}}`); w.Code != http.StatusOK {
		t.Fatal(w.Code, w.Body)
	}
	alice.waitFor("the global event", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		e := s.GetReceivedEventMessage()
		return e.GetName() == "maintenance" && e.GetData().GetStructValue().GetFields()["in"].GetNumberValue() == 5
	})
	r := httptest.NewRequest("GET", "/rooms", nil)
	r.Header.Set("admin-token", "admin-token")
	w := httptest.NewRecorder()
	h.srv.Rooms(w, r)
	if w.Body.String() != `{"`+roomURL+`":1}`+"\n" {
		t.Fatalf("rooms: %s", w.Body)
	}
}

// A global message (the admin's announcement) is the admin's alone; broadcast to the world, it reaches the other
// rooms of the world that have players.
func TestOnlyAnAdminAnnouncesToTheWorld(t *testing.T) {
	h := editorHarness(t)
	admin := h.dialAs(auth.Token{Identifier: "admin", Tags: []string{"admin"}}, "")
	guest := h.dialAs(auth.Token{Identifier: "guest"}, "")
	elsewhere := h.dialWAM(auth.Token{Identifier: "far"}) // another room of the same world
	announce := func(c *client, text string) {
		c.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_PlayGlobalMessage{PlayGlobalMessage: &pb.PlayGlobalMessage{
			Type: "message", Content: text, BroadcastToWorld: true}}})
	}
	announce(guest, "fake")
	announce(admin, "closing")
	for _, c := range []*client{admin, guest, elsewhere} {
		c.waitFor("the announcement", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
			switch d.GetSendUserMessage().GetMessage() {
			case "fake":
				t.Fatal("a guest's announcement went out")
			case "closing":
				return true
			}
			return false
		})
	}
}
