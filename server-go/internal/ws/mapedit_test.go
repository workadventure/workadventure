package ws

import (
	"encoding/json"
	"net/url"
	"slices"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/workadventure/workadventure/server-go/internal/auth"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

const wamRoom = "http://play.test/~/maps/office.wam"

func editorHarness(t *testing.T) *harness {
	h := newHarness(t)
	h.srv.cfg.EnableMapEditor, h.srv.cfg.PublicMapStorageURL = true, "http://map-storage.test"
	if err := h.srv.maps.Put("maps/office.wam", []byte(`{"version":"2.0.0","mapUrl":"./office.tmj","areas":[],"entities":{},"entityCollections":[]}`)); err != nil {
		t.Fatal(err)
	}
	return h
}

func (h *harness) dialWAM(tok auth.Token) *client {
	h.t.Helper()
	token, _ := h.auth.Create(tok)
	c := h.dialWithToken(token, tok.Identifier, "", url.Values{"roomId": {wamRoom}})
	c.send(join(100, 100))
	c.waitFor("roomJoined", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool { return d.GetRoomJoinedMessage() != nil })
	return c
}

func createArea(id, cmd string) *pb.ClientToServerMessage {
	return &pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_EditMapCommandMessage{EditMapCommandMessage: &pb.EditMapCommandMessage{
		Id: cmd, EditMapMessage: &pb.EditMapMessage{Message: &pb.EditMapMessage_CreateAreaMessage{CreateAreaMessage: &pb.CreateAreaMessage{
			Id: id, Name: "Hall", X: 10, Y: 10, Width: 32, Height: 32}}}}}}
}

// An edit of the map editor is stored, then reaches every player of the room; a player who may not edit gets the
// refusal alone, with the id of its command, and the map is unchanged. A late client gets the edits it missed.
func TestAMapEditIsStoredAndSharedARefusalStaysWithTheEditor(t *testing.T) {
	h := editorHarness(t)
	editor := h.dialWAM(auth.Token{Identifier: "ed", Tags: []string{"editor"}})
	visitor := h.dialWAM(auth.Token{Identifier: "visitor"})

	editor.send(createArea("a1", "cmd-1"))
	for _, c := range []*client{editor, visitor} {
		c.waitFor("the edit", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
			e := s.GetEditMapCommandMessage()
			return e.GetId() == "cmd-1" && e.GetEditMapMessage().GetCreateAreaMessage().GetId() == "a1"
		})
	}
	if b, _ := h.srv.maps.Read("maps/office.wam"); !strings.Contains(string(b), `"id":"a1"`) {
		t.Fatalf("the area is not stored: %s", b)
	}

	visitor.send(createArea("a2", "cmd-2"))
	visitor.waitFor("the refusal", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		e := s.GetEditMapCommandMessage()
		return e.GetId() == "cmd-2" && e.GetEditMapMessage().GetErrorCommandMessage() != nil
	})
	if b, _ := h.srv.maps.Read("maps/office.wam"); strings.Contains(string(b), `"id":"a2"`) {
		t.Fatal("a refused edit is stored")
	}

	// A client whose copy of the map stops before cmd-1 gets it on connection.
	token, _ := h.auth.Create(auth.Token{Identifier: "late"})
	late := h.dialWithToken(token, "late", "", url.Values{"roomId": {wamRoom}, "lastCommandId": {"none"}})
	late.waitFor("the missed edits", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		for _, e := range d.GetRoomConnectedMessage().GetEditMapCommandsArrayMessage().GetEditMapCommands() {
			if e.GetId() == "cmd-1" {
				return true
			}
		}
		return false
	})
}

// A map replaced through map-storage's HTTP API makes its players reload it; a deleted one sends them away.
func TestAMapReplacedOrDeletedOnMapStorageReachesItsRoom(t *testing.T) {
	h := editorHarness(t)
	player := h.dialWAM(auth.Token{Identifier: "p"})
	h.srv.MapChanged("maps/other.wam", true) // another map: nothing for this room
	h.srv.MapChanged("maps/office.wam", false)
	player.waitFor("the refresh", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		return d.GetRefreshRoomMessage().GetRoomId() == wamRoom
	})
	h.srv.MapChanged("maps/office.wam", true)
	player.waitFor("the map deleted", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool { return d.GetDeleteMapMessage() != nil })
}

// The token for the map's private files names the WAM file and the player's tags, signed with SECRET_KEY for an
// hour: map-storage decides from it which files the player may read. A room without a WAM map has none.
func TestThePrivateFilesTokenNamesTheMapAndTheTags(t *testing.T) {
	h := editorHarness(t)
	h.srv.cfg.SecretKey = "secret-key"
	player := h.dialWAM(auth.Token{Identifier: "p", Tags: []string{"member"}})
	player.query(1, &pb.QueryMessage{Query: &pb.QueryMessage_MapStorageJwtQuery{MapStorageJwtQuery: &pb.MapStorageJwtQuery{}}})
	var raw string
	player.waitFor("the token", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		raw = d.GetAnswerMessage().GetMapStorageJwtAnswer().GetJwt()
		return raw != ""
	})
	var claims struct {
		WamURL string   `json:"wamUrl"`
		Tags   []string `json:"tags"`
		jwt.RegisteredClaims
	}
	if _, err := jwt.ParseWithClaims(raw, &claims, func(*jwt.Token) (any, error) { return []byte("secret-key"), nil }); err != nil {
		t.Fatal(err)
	}
	if claims.WamURL != "http://map-storage.test/maps/office.wam" || len(claims.Tags) != 1 || claims.Tags[0] != "member" ||
		time.Until(claims.ExpiresAt.Time) > time.Hour || time.Until(claims.ExpiresAt.Time) < 59*time.Minute {
		t.Fatalf("%+v", claims)
	}

	tiled := h.dialAs(auth.Token{Identifier: "q"}, "") // a /_/ room: a Tiled map served elsewhere
	tiled.query(1, &pb.QueryMessage{Query: &pb.QueryMessage_MapStorageJwtQuery{MapStorageJwtQuery: &pb.MapStorageJwtQuery{}}})
	tiled.waitFor("the refusal", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		return d.GetAnswerMessage().GetError().GetMessage() == "This room has no map"
	})
}

// Each command of the map editor lands in the WAM file with its fields where they belong: an area moved and resized,
// an entity placed, moved, then removed, the map's name changed.
func TestTheMapEditorsCommandsLandInTheFile(t *testing.T) {
	h := editorHarness(t)
	editor := h.dialWAM(auth.Token{Identifier: "ed", Tags: []string{"editor"}})
	n := 0
	run := func(e *pb.EditMapMessage) {
		t.Helper()
		n++
		id := "cmd-" + strconv.Itoa(n)
		editor.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_EditMapCommandMessage{EditMapCommandMessage: &pb.EditMapCommandMessage{Id: id, EditMapMessage: e}}})
		editor.waitFor(id, func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
			if err := s.GetEditMapCommandMessage().GetEditMapMessage().GetErrorCommandMessage(); err != nil {
				t.Fatalf("%s refused: %s", id, err.GetReason())
			}
			return s.GetEditMapCommandMessage().GetId() == id
		})
	}
	file := func() map[string]any {
		b, _ := h.srv.maps.Read("maps/office.wam")
		var doc map[string]any
		_ = json.Unmarshal(b, &doc)
		return doc
	}
	x, w := int32(64), uint32(96)
	run(&pb.EditMapMessage{Message: &pb.EditMapMessage_CreateAreaMessage{CreateAreaMessage: &pb.CreateAreaMessage{Id: "a1", Name: "Hall", X: 1, Y: 2, Width: 3, Height: 4}}})
	run(&pb.EditMapMessage{Message: &pb.EditMapMessage_ModifyAreaMessage{ModifyAreaMessage: &pb.ModifyAreaMessage{Id: "a1", X: &x, Width: &w}}})
	area := file()["areas"].([]any)[0].(map[string]any)
	if area["x"] != 64.0 || area["y"] != 2.0 || area["width"] != 96.0 || area["height"] != 4.0 || area["name"] != "Hall" {
		t.Fatalf("area: %v", area)
	}
	run(&pb.EditMapMessage{Message: &pb.EditMapMessage_CreateEntityMessage{CreateEntityMessage: &pb.CreateEntityMessage{
		Id: "e1", X: 10, Y: 20, CollectionName: "basic office", PrefabId: "chair", Width: 32, Height: 48}}})
	run(&pb.EditMapMessage{Message: &pb.EditMapMessage_ModifyEntityMessage{ModifyEntityMessage: &pb.ModifyEntityMessage{Id: "e1", X: 11, Y: 21, Width: 32, Height: 48}}})
	entity, _ := file()["entities"].(map[string]any)["e1"].(map[string]any)
	if entity["x"] != 11.0 || entity["y"] != 21.0 || entity["prefabRef"].(map[string]any)["id"] != "chair" {
		t.Fatalf("entity: %v", entity)
	}
	run(&pb.EditMapMessage{Message: &pb.EditMapMessage_DeleteEntityMessage{DeleteEntityMessage: &pb.DeleteEntityMessage{Id: "e1"}}})
	run(&pb.EditMapMessage{Message: &pb.EditMapMessage_DeleteAreaMessage{DeleteAreaMessage: &pb.DeleteAreaMessage{Id: "a1"}}})
	name := "Office"
	run(&pb.EditMapMessage{Message: &pb.EditMapMessage_ModifiyWAMMetadataMessage{ModifiyWAMMetadataMessage: &pb.ModifiyWAMMetadataMessage{Name: name}}})
	doc := file()
	if len(doc["entities"].(map[string]any)) != 0 || len(doc["areas"].([]any)) != 0 || doc["metadata"].(map[string]any)["name"] != "Office" {
		t.Fatalf("after the deletions: %v", doc)
	}
}

// Without an admin, the exit editor lists the maps of the room's world only: with USE_DOMAIN_NAME_IN_PATH, the
// folder of its domain, never another world's.
func TestRoomsFromSameWorldStayInTheWorld(t *testing.T) {
	h := newHarness(t)
	h.srv.cfg.PublicMapStorageURL = "http://map-storage.test"
	h.srv.cfg.MapStorage.UseDomainNameInPath = true
	wam := []byte(`{"version":"2.0.0","mapUrl":"./m.tmj","areas":[],"entities":{},"entityCollections":[]}`)
	for _, k := range []string{"map-storage.test/maps/office.wam", "map-storage.test/hall.wam", "other-world.test/secret.wam"} {
		if err := h.srv.maps.Put(k, wam); err != nil {
			t.Fatal(err)
		}
	}
	token, _ := h.auth.Create(auth.Token{Identifier: "alice"})
	c := h.dialWithToken(token, "alice", "", url.Values{"roomId": {wamRoom}})
	c.send(join(100, 100))
	c.query(1, &pb.QueryMessage{Query: &pb.QueryMessage_RoomsFromSameWorldQuery{RoomsFromSameWorldQuery: &pb.RoomsFromSameWorldQuery{}}})
	var urls []string
	c.waitFor("the rooms", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		a := d.GetAnswerMessage().GetRoomsFromSameWorldAnswer()
		for _, r := range a.GetRoomDescriptions() {
			urls = append(urls, r.GetRoomUrl()+" "+r.GetWamUrl())
		}
		return a != nil
	})
	slices.Sort(urls)
	if want := []string{"/~/hall.wam http://map-storage.test/hall.wam", "/~/maps/office.wam http://map-storage.test/maps/office.wam"}; !slices.Equal(urls, want) {
		t.Fatalf("rooms %v, want %v", urls, want)
	}
}

// The connection tells the front whether this player edits the map: an editor may stand in an area the others may
// not enter, so the front only keeps the others out of it (93fe50b5d7).
func TestTheConnectionSaysWhoEditsTheMap(t *testing.T) {
	h := editorHarness(t)
	for _, tc := range []struct {
		tok  auth.Token
		want bool
	}{{auth.Token{Identifier: "ed", Tags: []string{"editor"}}, true}, {auth.Token{Identifier: "visitor"}, false}} {
		token, _ := h.auth.Create(tc.tok)
		c := h.dialWithToken(token, tc.tok.Identifier, "", url.Values{"roomId": {wamRoom}})
		got := expect(c, 3*time.Second, "roomConnected", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) (*pb.RoomConnectedMessage, bool) {
			return d.GetRoomConnectedMessage(), d.GetRoomConnectedMessage() != nil
		})
		if got.GetCanEdit() != tc.want {
			t.Fatalf("%s: canEdit = %v, want %v", tc.tok.Identifier, !tc.want, tc.want)
		}
	}
}
