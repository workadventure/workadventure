package ws

import (
	"context"
	"testing"

	"github.com/workadventure/workadventure/server-go/internal/auth"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

// office.tmj declares "door" (persisted, written by admins only) and "note" (anybody, not persisted), and
// "secret" (read by admins only).
const officeTiled = `{"layers":[{"type":"objectgroup","objects":[
 {"name":"door","class":"variable","properties":[{"name":"default","value":"closed"},{"name":"persist","value":true},{"name":"writableBy","value":"admin"}]},
 {"name":"note","class":"variable","properties":[{"name":"default","value":""}]},
 {"name":"secret","class":"variable","properties":[{"name":"default","value":"42"},{"name":"readableBy","value":"admin"}]}]}]}`

func setVariable(name, value string) *pb.ClientToServerMessage {
	return &pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_VariableMessage{VariableMessage: &pb.VariableMessage{Name: name, Value: value}}}
}

// The map's rules on its variables hold for the players: who may write, who may read, what survives the room.
func TestTheMapDecidesWhoWritesAndReadsItsVariables(t *testing.T) {
	h := editorHarness(t)
	if err := h.srv.maps.Put("maps/office.tmj", []byte(officeTiled)); err != nil {
		t.Fatal(err)
	}
	admin := h.dialWAM(auth.Token{Identifier: "admin", Tags: []string{"admin"}})
	guest := h.dialWAM(auth.Token{Identifier: "guest"})

	guest.send(setVariable("door", `"open"`))  // refused: admins only
	guest.send(setVariable("note", `"hello"`)) // anybody
	admin.waitFor("the guest's note", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		v := s.GetVariableMessage()
		if v.GetName() == "door" {
			t.Fatal("a guest opened the door")
		}
		return v.GetName() == "note" && v.GetValue() == `"hello"`
	})
	admin.send(setVariable("door", `"open"`))
	guest.waitFor("the admin's door", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		return s.GetVariableMessage().GetName() == "door" && s.GetVariableMessage().GetValue() == `"open"`
	})

	// Only the persisted variable is stored.
	if err := h.srv.FlushVariables(context.Background()); err != nil {
		t.Fatal(err)
	}
	stored, _ := h.srv.vars.HGetAll(context.Background(), wamRoom)
	if stored["door"] != `"open"` || stored["note"] != "" {
		t.Fatalf("stored: %v", stored)
	}

	// A newcomer starts with the current values, without what it may not read.
	token, _ := h.auth.Create(auth.Token{Identifier: "newcomer"})
	late := h.dialWithToken(token, "newcomer", "", map[string][]string{"roomId": {wamRoom}})
	late.send(join(100, 100))
	late.waitFor("roomJoined", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		j := d.GetRoomJoinedMessage()
		if j == nil {
			return false
		}
		got := map[string]string{}
		for _, v := range j.GetVariable() {
			got[v.GetName()] = v.GetValue()
		}
		if got["door"] != `"open"` || got["note"] != `"hello"` {
			t.Fatalf("variables at join: %v", got)
		}
		if _, seen := got["secret"]; seen {
			t.Fatal("a guest reads an admin-only variable")
		}
		return true
	})
}
