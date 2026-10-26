package mapedit

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/workadventure/workadventure/server-go/internal/core"
	"github.com/workadventure/workadventure/server-go/internal/wam"
)

// The scenarios of the map editor: who edits, what it sends, what the map and the room end up with. The maps are
// in memory; a "slow" map holds each write of it until the test lets it through, like a slow disk or a big upload.

const office, garden = "maps/office.wam", "maps/garden.wam"

var (
	ctx    = context.Background()
	admin  = Editor{UUID: "admin-uuid", Tags: []string{"admin"}, CanEdit: true}
	member = Editor{UUID: "member-uuid", Tags: []string{"member"}}
	other  = Editor{UUID: "other-uuid", Tags: []string{"member"}}
)

type memMaps struct {
	mu      sync.Mutex
	files   map[string][]byte
	slow    map[string]chan struct{} // the maps whose writes wait until the channel is closed
	writing chan string              // told the key of each write that waits
}

func newMaps(t *testing.T) *memMaps {
	t.Helper()
	empty := []byte(`{"version":"2.1.0","mapUrl":"./office.tmj","areas":[],"entities":{},"entityCollections":[]}`)
	return &memMaps{files: map[string][]byte{office: empty, garden: empty}, slow: map[string]chan struct{}{}, writing: make(chan string, 16)}
}

func (m *memMaps) Read(key string) ([]byte, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	f, ok := m.files[key]
	if !ok {
		return nil, os.ErrNotExist
	}
	return f, nil
}

func (m *memMaps) Edit(key string, change func([]byte) ([]byte, error)) error {
	m.mu.Lock()
	before, gate := m.files[key], m.slow[key]
	m.mu.Unlock()
	after, err := change(before)
	if err != nil {
		return err
	}
	if gate != nil {
		m.writing <- key
		<-gate
	}
	return m.Put(key, after)
}

func (m *memMaps) Put(key string, data []byte) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.files[key] = data
	return nil
}

func (m *memMaps) Remove(key string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.files, key)
	return nil
}

// waitWrite waits until a write of a slow map is held.
func (m *memMaps) waitWrite(t *testing.T, done <-chan error) {
	t.Helper()
	select {
	case <-m.writing:
	case err := <-done:
		t.Fatalf("the edit ended before reaching the disk: %v", err)
	case <-time.After(2 * time.Second):
		t.Fatal("the edit never reached the disk")
	}
}

func (m *memMaps) makeSlow(key string) chan struct{} {
	m.mu.Lock()
	defer m.mu.Unlock()
	gate := make(chan struct{})
	m.slow[key] = gate
	return gate
}

// doc decodes a stored JSON file.
func (m *memMaps) doc(t *testing.T, key string) map[string]any {
	t.Helper()
	f, err := m.Read(key)
	if err != nil {
		t.Fatal(err)
	}
	var d map[string]any
	if err := json.Unmarshal(f, &d); err != nil {
		t.Fatal(err)
	}
	return d
}

func (m *memMaps) area(t *testing.T, key, id string) map[string]any {
	t.Helper()
	areas, _ := m.doc(t, key)["areas"].([]any)
	for _, a := range areas {
		if a := a.(map[string]any); a["id"] == id {
			return a
		}
	}
	return nil
}

func (m *memMaps) entity(t *testing.T, key, id string) map[string]any {
	t.Helper()
	e, _ := m.doc(t, key)["entities"].(map[string]any)[id].(map[string]any)
	return e
}

func mustApply(t *testing.T, maps Maps, ed Editor, cmd any) Result {
	t.Helper()
	res, err := Apply(maps, office, ed, "cmd", cmd)
	if err != nil {
		t.Fatalf("%T by %s: %v", cmd, ed.UUID, err)
	}
	return res
}

func mustRefuse(t *testing.T, maps *memMaps, ed Editor, cmd any, why string) {
	t.Helper()
	before, _ := maps.Read(office)
	if _, err := Apply(maps, office, ed, "cmd", cmd); err == nil {
		t.Fatalf("%T by %s should be refused: %s", cmd, ed.UUID, why)
	}
	if after, _ := maps.Read(office); !bytes.Equal(before, after) {
		t.Fatalf("a refused %T must leave the map as it was", cmd)
	}
}

// An area where the given tags may write.
func rightsArea(id string, x int64, writeTags ...any) wam.CreateArea {
	if writeTags == nil {
		writeTags = []any{}
	}
	return wam.CreateArea{ID: id, Name: id, X: x, Y: 0, Width: 100, Height: 100, Properties: []any{
		map[string]any{"id": id + "-rights", "type": "restrictedRightsPropertyData", "readTags": []any{}, "writeTags": writeTags}}}
}

func personal(id string, owner any) map[string]any {
	return map[string]any{"id": id + "-desk", "type": "personalAreaPropertyData", "accessClaimMode": "dynamic", "allowedTags": []any{}, "ownerId": owner}
}

// A personal area nobody owns yet.
func desk(id string, x int64) wam.CreateArea {
	return wam.CreateArea{ID: id, Name: id, X: x, Y: 0, Width: 100, Height: 100, Properties: []any{personal(id, nil)}}
}

func claim(id string, owner any) wam.ModifyArea {
	return wam.ModifyArea{ID: id, Properties: []any{personal(id, owner)}, ModifyProperties: true}
}

// A 32×32 chair whose top left corner is (x, y).
func chair(id string, x, y int64) wam.CreateEntity {
	return wam.CreateEntity{ID: id, PrefabID: "chair", CollectionName: "basic", X: x, Y: y, Width: 32, Height: 32}
}

func ownerOf(t *testing.T, maps *memMaps, id string) any {
	t.Helper()
	props := maps.area(t, office, id)["properties"].([]any)
	return props[0].(map[string]any)["ownerId"]
}

// --- Rooms and maps: an edit is stored off the room, one map at a time.

type peer struct {
	mu  sync.Mutex
	got []any
}

func (p *peer) Send(m *core.Msg) { p.mu.Lock(); p.got = append(p.got, m.Event); p.mu.Unlock() }
func (p *peer) Kick(string)      {}

func (p *peer) waitFor(t *testing.T, what string, match func(any) bool) {
	t.Helper()
	for deadline := time.Now().Add(2 * time.Second); time.Now().Before(deadline); time.Sleep(5 * time.Millisecond) {
		p.mu.Lock()
		found := slices.ContainsFunc(p.got, match)
		p.mu.Unlock()
		if found {
			return
		}
	}
	t.Fatalf("never got %s", what)
}

func enter(t *testing.T, room *core.Room, name string, x, y int32) *peer {
	t.Helper()
	p := &peer{}
	_ = room.Connect(ctx, p, func() []core.Area { return nil }, func() core.Event { return core.External{Value: "connected"} })
	if err := room.Join(ctx, p, core.JoinRequest{UUID: name, TabID: "tab", Name: name, Position: core.Position{X: x, Y: y, Direction: core.DirectionDown},
		Viewport: core.Viewport{Right: 2000, Bottom: 2000}, Status: core.StatusOnline}); err != nil {
		t.Fatal(err)
	}
	return p
}

// edit is what the WebSocket layer does with a command: queue it behind the edits of its map, store it, then tell
// the room.
func edit(q *Queue, maps Maps, room *core.Room, key string, ed Editor, cmd any, done chan<- error) {
	_ = q.Run(key, func() {
		res, err := Apply(maps, key, ed, "cmd", cmd)
		if err == nil {
			err = room.MapEdited(ctx, core.MapEdit{Command: []byte(fmt.Sprintf("%#v", cmd))}, res.Areas, nil) // what the adapter would encode
		}
		done <- err
	})
}

func TestARoomKeepsDeliveringMovesWhileItsMapIsBeingWritten(t *testing.T) {
	maps := newMaps(t)
	gate := maps.makeSlow(office)
	room := core.NewRoom("http://play/~/"+office, core.Config{MinimumDistance: 64, GroupRadius: 48, MaxPerGroup: 4})
	defer room.Stop()
	alice, bob := enter(t, room, "alice", 100, 100), enter(t, room, "bob", 900, 900)
	done := make(chan error, 1)
	edit(NewQueue(), maps, room, office, admin, rightsArea("stage", 0), done)
	maps.waitWrite(t, done) // the edit is stuck on the disk

	_ = room.Move(ctx, bob, core.Position{X: 800, Y: 800, Direction: core.DirectionUp}, nil)
	alice.waitFor(t, "bob's move while the map is being written", func(e any) bool {
		m, ok := e.(core.UserMoved)
		return ok && m.Position.X == 800
	})
	select {
	case err := <-done:
		t.Fatal("the edit should still be waiting for the disk", err)
	default:
	}

	close(gate)
	if err := <-done; err != nil {
		t.Fatal(err)
	}
	bob.waitFor(t, "the edit, once stored", func(e any) bool {
		m, ok := e.(core.MapEdit)
		return ok && strings.Contains(string(m.Command), `ID:"stage"`)
	})
	if maps.area(t, office, "stage") == nil {
		t.Fatal("the area is stored")
	}
}

func TestTheEditsOfAMapApplyInTheOrderTheyArrived(t *testing.T) {
	maps, q := newMaps(t), NewQueue()
	var mu sync.Mutex
	var order []string
	var wg sync.WaitGroup
	for _, id := range []string{"a", "b", "c", "d", "e"} {
		wg.Add(1)
		_ = q.Run(office, func() {
			defer wg.Done()
			if _, err := Apply(maps, office, admin, "cmd", rightsArea(id, 0)); err != nil {
				id += " failed: " + err.Error()
			}
			mu.Lock()
			order = append(order, id)
			mu.Unlock()
		})
	}
	wg.Wait()
	if !slices.Equal(order, []string{"a", "b", "c", "d", "e"}) {
		t.Fatalf("one map, one edit at a time, first come first served: %v", order)
	}
	if areas := maps.doc(t, office)["areas"].([]any); len(areas) != 5 {
		t.Fatalf("no edit lost: %d areas", len(areas))
	}
}

func TestASlowMapHoldsUpNoOtherMap(t *testing.T) {
	maps, q := newMaps(t), NewQueue()
	gate := maps.makeSlow(office)
	room := core.NewRoom("http://play/~/"+office, core.Config{MinimumDistance: 64, GroupRadius: 48, MaxPerGroup: 4})
	defer room.Stop()
	slow, fast := make(chan error, 1), make(chan error, 1)
	edit(q, maps, room, office, admin, rightsArea("stage", 0), slow)
	maps.waitWrite(t, slow)
	_ = q.Run(garden, func() { _, err := Apply(maps, garden, admin, "cmd", rightsArea("pond", 0)); fast <- err })
	select {
	case err := <-fast:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("the garden waited for the office")
	}
	close(gate)
	if err := <-slow; err != nil {
		t.Fatal(err)
	}
}

// --- Who may change what.

func TestOnlyMapEditorsCreateAndDeleteAreas(t *testing.T) {
	maps := newMaps(t)
	mustRefuse(t, maps, member, rightsArea("stage", 0, "member"), "a member may not draw areas")
	res := mustApply(t, maps, admin, rightsArea("stage", 0, "member"))
	if len(res.Areas) != 1 || res.Areas[0].ID != "stage" || res.Areas[0].Width != 100 {
		t.Fatalf("the room gets the map's new areas: %+v", res.Areas)
	}
	mustRefuse(t, maps, member, wam.DeleteArea{ID: "stage"}, "a member may not delete areas, even one it may write in")
	if res := mustApply(t, maps, admin, wam.DeleteArea{ID: "stage"}); len(res.Areas) != 0 {
		t.Fatalf("the room no longer has the area: %+v", res.Areas)
	}
}

func TestAMemberPlacesFurnitureOnlyWhereItsTagsMayWrite(t *testing.T) {
	maps := newMaps(t)
	mustApply(t, maps, admin, rightsArea("workshop", 0, "member"))
	mustApply(t, maps, admin, rightsArea("boardroom", 200, "board"))

	mustApply(t, maps, member, chair("c1", 10, 10))
	mustRefuse(t, maps, member, chair("c2", 210, 10), "the boardroom is for the board")
	mustRefuse(t, maps, member, chair("c3", 500, 500), "nowhere it may write")
	mustApply(t, maps, member, chair("c4", 90, 10)) // what counts is the top-left corner, in the workshop
	fake := chair("c5", 120, 10)
	fake.Width = -200
	mustRefuse(t, maps, member, fake, "a made-up size does not bring the chair at (120, 10) into the workshop")
	mustRefuse(t, maps, member, wam.ModifyEntity{ID: "c1", X: 210, Y: 10, Width: 32, Height: 32}, "a member may not move furniture out")
	mustApply(t, maps, admin, chair("throne", 210, 10))
	mustRefuse(t, maps, member, wam.ModifyEntity{ID: "throne", X: 10, Y: 10, Width: 32, Height: 32}, "nor bring in furniture from a zone it may not write in")
	mustApply(t, maps, member, wam.ModifyEntity{ID: "c1", X: 40, Y: 40, Width: 32, Height: 32})
	if e := maps.entity(t, office, "c1"); e["x"] != float64(40) {
		t.Fatalf("moved within the workshop: %v", e)
	}
	mustApply(t, maps, admin, chair("c6", 500, 500)) // a map editor places anything anywhere
}

func TestTheOwnerOfAPersonalAreaFurnishesItAndNobodyElse(t *testing.T) {
	maps := newMaps(t)
	mustApply(t, maps, admin, desk("desk", 0))
	mustRefuse(t, maps, member, chair("c1", 10, 10), "a desk nobody owns is not furnished")
	mustApply(t, maps, member, claim("desk", member.UUID))
	mustApply(t, maps, member, chair("c1", 10, 10))
	mustRefuse(t, maps, other, chair("c2", 20, 20), "the desk is someone else's")
}

func TestOnlyMapEditorsChangeTheMapSettingsAndDetails(t *testing.T) {
	maps := newMaps(t)
	megaphone := map[string]any{"enabled": true, "title": "Town hall", "scope": "ROOM", "rights": []any{}}
	mustRefuse(t, maps, member, wam.SetMegaphone{Settings: megaphone}, "the megaphone is the editors'")
	mustRefuse(t, maps, member, wam.SetMetadata{Name: "My map"}, "the map's name is the editors'")
	mustApply(t, maps, admin, wam.SetMegaphone{Settings: megaphone})
	mustApply(t, maps, admin, wam.SetMetadata{Name: "Our office"})
	if d := maps.doc(t, office); d["metadata"].(map[string]any)["name"] != "Our office" {
		t.Fatalf("metadata: %v", d["metadata"])
	}
}

func TestAMemberDeletesOnlyTheEntitiesWhereItMayWrite(t *testing.T) {
	maps := newMaps(t)
	mustApply(t, maps, admin, rightsArea("workshop", 0, "member"))
	mustApply(t, maps, admin, chair("c1", 500, 500))
	mustApply(t, maps, admin, chair("c2", 10, 10))
	mustRefuse(t, maps, member, wam.DeleteEntity{ID: "c1"}, "the chair is out of the workshop")
	mustApply(t, maps, member, wam.DeleteEntity{ID: "c2"})
	if maps.entity(t, office, "c2") != nil {
		t.Fatal("deleted")
	}
	// An entity someone else deleted meanwhile: the delete is a no-op every client still gets.
	mustApply(t, maps, member, wam.DeleteEntity{ID: "c2"})
}

func TestUploadingTakesWriteAccessSomewhereOnTheMap(t *testing.T) {
	maps := newMaps(t)
	mustRefuse(t, maps, member, upload("plant"), "a member who may write nowhere uploads nothing")
	mustRefuse(t, maps, member, UploadFile{Name: "plan.pdf", PropertyID: "doc", File: []byte("%PDF")}, "nor files")
	mustApply(t, maps, admin, rightsArea("workshop", 0, "member"))
	mustApply(t, maps, member, upload("plant"))
	mustApply(t, maps, member, UploadFile{Name: "plan.pdf", PropertyID: "doc", File: []byte("%PDF")})
}

// --- Personal areas.

func TestAMemberClaimsAFreePersonalAreaAndGivesItBack(t *testing.T) {
	maps := newMaps(t)
	mustApply(t, maps, admin, desk("desk", 0))
	res := mustApply(t, maps, member, claim("desk", member.UUID))
	if ownerOf(t, maps, "desk") != member.UUID || res.Area == nil {
		t.Fatalf("claimed, and the room is told the whole area: %v", res.Area)
	}
	mustRefuse(t, maps, member, claim("desk", other.UUID), "a desk is given back, not handed over")
	mustApply(t, maps, member, claim("desk", nil))
	if ownerOf(t, maps, "desk") != nil {
		t.Fatal("given back")
	}
}

func TestNobodyClaimsAPersonalAreaSomeoneOwns(t *testing.T) {
	maps := newMaps(t)
	mustApply(t, maps, admin, desk("desk", 0))
	mustApply(t, maps, member, claim("desk", member.UUID))
	mustRefuse(t, maps, other, claim("desk", other.UUID), "taken")
	mustRefuse(t, maps, other, claim("desk", nil), "only its owner gives it back")
}

func TestAClaimTakesOnlyTheOwnerAndTheName(t *testing.T) {
	maps := newMaps(t)
	mustApply(t, maps, admin, desk("desk", 0))
	x, wide := int64(400), int64(1000)
	name := "Alice's desk"
	sneaky := claim("desk", member.UUID)
	sneaky.Name, sneaky.X, sneaky.Width = &name, &x, &wide
	sneaky.Properties = append(sneaky.Properties, map[string]any{"id": "exit", "type": "exit", "url": "/elsewhere.wam", "areaName": ""})
	mustApply(t, maps, member, sneaky)
	a := maps.area(t, office, "desk")
	if a["name"] != name || a["x"] != float64(0) || a["width"] != float64(100) || len(a["properties"].([]any)) != 1 {
		t.Fatalf("only the owner and the name come from a member's claim: %v", a)
	}
}

// --- Areas, entities and their files.

func TestAnAreaIsResizedAndTheRoomIsToldTheWholeArea(t *testing.T) {
	maps := newMaps(t)
	mustApply(t, maps, admin, rightsArea("stage", 0, "member"))
	wide := int64(300)
	res := mustApply(t, maps, admin, wam.ModifyArea{ID: "stage", Width: &wide})
	if res.Area["width"] != int64(300) || res.Area["properties"] == nil || res.Areas[0].Width != 300 {
		t.Fatalf("whole area, properties included, and the room's areas follow: %v %+v", res.Area, res.Areas)
	}
}

func TestTwoAreasNeverShareAnID(t *testing.T) {
	maps := newMaps(t)
	mustApply(t, maps, admin, rightsArea("stage", 0))
	mustRefuse(t, maps, admin, rightsArea("stage", 500), "the id is taken")
}

func TestAnAreaTheFrontCouldNotLoadIsRefused(t *testing.T) {
	maps := newMaps(t)
	mustApply(t, maps, admin, rightsArea("stage", 0))
	broken := wam.ModifyArea{ID: "stage", Properties: []any{map[string]any{"id": "m", "type": "speakerMegaphone"}}, ModifyProperties: true}
	mustRefuse(t, maps, admin, broken, "a megaphone without a name breaks the front's schema")
}

func TestDroppingAnOpenFilePropertyDeletesItsFile(t *testing.T) {
	maps := newMaps(t)
	mustApply(t, maps, admin, UploadFile{Name: "plan.pdf", PropertyID: "doc", File: []byte("%PDF")})
	file, _ := wam.UploadedFile("plan.pdf", "doc")
	if _, err := maps.Read(file); err != nil {
		t.Fatal("the file is stored for the property")
	}
	openFile := map[string]any{"id": "doc", "type": "openFile", "name": "plan.pdf", "link": "plan.pdf", "newTab": false, "closable": true}
	area := rightsArea("library", 0)
	area.Properties = append(area.Properties, openFile)
	mustApply(t, maps, admin, area)
	mustApply(t, maps, admin, wam.ModifyArea{ID: "library", Properties: area.Properties[:1], ModifyProperties: true})
	if _, err := maps.Read(file); err == nil {
		t.Fatal("no property links to the file any more: it goes")
	}
}

func TestOnlyDocumentsImagesAndSoundsAreUploaded(t *testing.T) {
	maps := newMaps(t)
	if _, err := Apply(maps, office, admin, "cmd", UploadFile{Name: "run.sh", PropertyID: "p", File: []byte("rm -rf /")}); err == nil {
		t.Fatal("a script is not a document")
	}
}

// A sound of a "play audio" property is a public map asset, next to the tilesets, not a private file.
func TestAnUploadedSoundIsAPublicMapAsset(t *testing.T) {
	maps := newMaps(t)
	mustApply(t, maps, admin, UploadFile{Name: "gong.mp3", PropertyID: "p", File: []byte("ID3")})
	if _, err := maps.Read("assets/sounds/gong-p.mp3"); err != nil {
		t.Fatal("stored in the map's public assets")
	}
}

// The property id comes from the client: one with a separator would put the file in another folder, maybe in another
// world's.
func TestAnUploadedFileStaysInTheFilesFolder(t *testing.T) {
	maps := newMaps(t)
	for _, id := range []string{"../../other.test/x", "a/b", `a\b`} {
		mustRefuse(t, maps, admin, UploadFile{Name: "plan.pdf", PropertyID: id, File: []byte("%PDF")}, id)
	}
}

// --- Custom entities.

func upload(id string) UploadEntity {
	return UploadEntity{ID: id, Name: "Plant", ImagePath: "plant-" + id + ".png", Direction: "Down", Color: "", File: []byte("png")}
}

func collection(t *testing.T, maps *memMaps) []any {
	t.Helper()
	return maps.doc(t, "assets/entities/entities.json")["collection"].([]any)
}

func TestAnUploadedCustomEntityBelongsToItsUploader(t *testing.T) {
	maps := newMaps(t)
	mustApply(t, maps, admin, rightsArea("workshop", 0, "member"))
	if res := mustApply(t, maps, member, upload("plant")); res.Areas != nil {
		t.Fatal("a custom entity does not change the map's areas")
	}
	e := collection(t, maps)[0].(map[string]any)
	if e["ownerId"] != member.UUID || e["imagePath"] != "plant-plant.png" {
		t.Fatalf("listed with its owner: %v", e)
	}
	if _, err := maps.Read("assets/entities/plant-plant.png"); err != nil {
		t.Fatal("its image is stored")
	}
	bad := upload("x")
	bad.ImagePath = "plant.svg"
	if _, err := Apply(maps, office, member, "cmd", bad); err == nil {
		t.Fatal("only bitmaps become custom entities")
	}
}

func TestOnlyItsUploaderOrAMapEditorChangesOrDeletesACustomEntity(t *testing.T) {
	maps := newMaps(t)
	mustApply(t, maps, admin, rightsArea("workshop", 0, "member"))
	mustApply(t, maps, member, upload("plant"))
	if _, err := Apply(maps, office, other, "cmd", ModifyCustomEntity{ID: "plant", Name: "Mine now"}); err == nil {
		t.Fatal("someone else's entity")
	}
	if _, err := Apply(maps, office, other, "cmd", DeleteCustomEntity{ID: "plant"}); err == nil || len(collection(t, maps)) != 1 {
		t.Fatal("someone else's entity stays")
	}
	mustApply(t, maps, member, ModifyCustomEntity{ID: "plant", Name: "Fern", Tags: []string{"green"}})
	if e := collection(t, maps)[0].(map[string]any); e["name"] != "Fern" {
		t.Fatalf("renamed by its uploader: %v", e)
	}
	mustApply(t, maps, admin, ModifyCustomEntity{ID: "plant", Name: "Big fern"}) // and by a map editor
	if _, err := Apply(maps, office, admin, "cmd", ModifyCustomEntity{ID: "tree", Name: "Oak"}); err == nil {
		t.Fatal("changing an entity that does not exist is an error, not a success")
	}
}

func TestDeletingACustomEntityTakesItsCopiesOffTheMap(t *testing.T) {
	maps := newMaps(t)
	mustApply(t, maps, admin, rightsArea("garden", 0, "member"))
	mustApply(t, maps, member, upload("plant"))
	copy1, copy2 := chair("p1", 10, 10), chair("p2", 40, 40)
	copy1.PrefabID, copy2.PrefabID = "plant", "plant"
	mustApply(t, maps, member, copy1)
	mustApply(t, maps, member, copy2)
	mustApply(t, maps, member, chair("c1", 60, 10))
	mustApply(t, maps, member, DeleteCustomEntity{ID: "plant"})
	if maps.entity(t, office, "p1") != nil || maps.entity(t, office, "p2") != nil || maps.entity(t, office, "c1") == nil {
		t.Fatal("the plants go, the chair stays")
	}
	if _, err := maps.Read("assets/entities/plant-plant.png"); err == nil || len(collection(t, maps)) != 0 {
		t.Fatal("the entity and its image go")
	}
}
