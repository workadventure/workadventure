package ws

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/coder/websocket"

	"github.com/workadventure/workadventure/server-go/internal/auth"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
	"github.com/workadventure/workadventure/server-go/internal/store"
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

// downRedis refuses every write, as a Redis that is stopped.
type downRedis struct{ *store.Memory }

func (downRedis) HSet(context.Context, string, string, string) error {
	return errors.New("connection refused")
}

// The CI's "storage works": a variable set while Redis is down, then everybody leaves and the room stops. The next
// player still finds the value set during the outage, not the one stored before it.
func TestAVariableSetWhileRedisIsDownSurvivesTheRoom(t *testing.T) {
	h := editorHarness(t)
	if err := h.srv.maps.Put("maps/office.tmj", []byte(officeTiled)); err != nil {
		t.Fatal(err)
	}
	redis := downRedis{store.NewMemory()}
	_ = redis.Memory.HSet(context.Background(), wamRoom, "door", `"closed before"`)
	h.srv.vars, h.srv.varWriter = redis, store.NewWriter(redis)

	admin := h.dialWAM(auth.Token{Identifier: "admin", Tags: []string{"admin"}})
	admin.send(setVariable("door", `"set while Redis is down"`))
	admin.waitFor("the change", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		return s.GetVariableMessage().GetName() == "door"
	})
	_ = admin.conn.Close(websocket.StatusNormalClosure, "Page unloading")
	for deadline := time.Now().Add(3 * time.Second); len(h.rooms.Keys()) > 0; time.Sleep(20 * time.Millisecond) {
		if time.Now().After(deadline) {
			t.Fatal("the room did not stop")
		}
	}

	token, _ := h.auth.Create(auth.Token{Identifier: "next"})
	next := h.dialWithToken(token, "next", "", map[string][]string{"roomId": {wamRoom}})
	next.send(join(100, 100))
	next.waitFor("roomJoined", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		j := d.GetRoomJoinedMessage()
		if j == nil {
			return false
		}
		for _, v := range j.GetVariable() {
			if v.GetName() == "door" && v.GetValue() != `"set while Redis is down"` {
				t.Fatalf("the room started again with %s", v.GetValue())
			}
		}
		return true
	})
}

// 70d0a91b36: the back closed a joinRoom stream as soon as it ended, dropping the messages still queued behind a
// slow handler, such as the last variable write of a player navigating away. Here a connection's reader hands each
// message to the room before it reads the next frame, and the player leaves the room only once its readers have
// stopped (destroy waits for them): every write sent before the close reaches the room while the player is in it.
func TestTheWritesSentJustBeforeClosingAreApplied(t *testing.T) {
	h := editorHarness(t)
	if err := h.srv.maps.Put("maps/office.tmj", []byte(officeTiled)); err != nil {
		t.Fatal(err)
	}
	observer := h.dialWAM(auth.Token{Identifier: "observer"})
	leaving := h.dialWAM(auth.Token{Identifier: "leaving"})
	const last = 50
	for i := 1; i <= last; i++ {
		leaving.send(setVariable("note", fmt.Sprintf(`"%d"`, i)))
	}
	_ = leaving.conn.Close(websocket.StatusNormalClosure, "Page unloading")
	observer.waitFor("the last note", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		return s.GetVariableMessage().GetName() == "note" && s.GetVariableMessage().GetValue() == fmt.Sprintf(`"%d"`, last)
	})
}
