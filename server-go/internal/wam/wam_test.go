package wam

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

func decode(t *testing.T, b []byte) map[string]any {
	t.Helper()
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatal(err)
	}
	return m
}

func i64(v int64) *int64 { return &v }

func TestEditsOfTheMapEditor(t *testing.T) {
	file, err := os.ReadFile("../../../map-storage/tests/assets/maps/empty.wam")
	if err != nil {
		t.Fatal(err)
	}
	file, _, err = Edit(file, "c1", CreateArea{ID: "a1", X: 32, Y: 64, Width: 96, Height: 128, Properties: []any{}})
	if err != nil {
		t.Fatal(err)
	}
	if doc := decode(t, file); doc["version"] != "2.1.0" || doc["lastCommandId"] != "c1" || !strings.Contains(string(file), `"entityCollections"`) {
		t.Fatalf("migrated, stamped, the rest kept: %s", file)
	}
	if _, _, err := Edit(file, "c2", CreateArea{ID: "a1"}); err == nil {
		t.Fatal("an area id is unique")
	}

	livekit := map[string]any{"id": "p1", "type": "livekitRoomProperty", "roomName": "", "livekitRoomAdminTag": "",
		"livekitRoomConfig": map[string]any{"startWithAudioMuted": false, "startWithVideoMuted": false, "disableChat": false, "raiseHandEnabled": false}}
	file, res, err := Edit(file, "c3", ModifyArea{ID: "a1", X: i64(0), Properties: []any{livekit, map[string]any{"id": "s1", "type": "start"},
		map[string]any{"id": "s2", "type": "start"}}, ModifyProperties: true})
	if err != nil {
		t.Fatal(err)
	}
	area := res.Area
	if props := area["properties"].([]any); len(props) != 2 || area["x"] != int64(0) || area["width"] == nil {
		t.Fatalf("modify merges the fields and keeps one start: %v", area)
	}
	if _, _, err := Edit(file, "c4", ModifyArea{ID: "a1", Properties: []any{map[string]any{"id": "x", "type": "speakerMegaphone"}}, ModifyProperties: true}); err == nil {
		t.Fatal("a property the front would refuse (no name) is refused")
	}

	megaphone := map[string]any{"enabled": true, "title": "Town hall", "scope": "ROOM", "rights": []any{}}
	file, _, err = Edit(file, "c5", SetMegaphone{Settings: megaphone})
	if err != nil || !strings.Contains(string(file), `"megaphone":{"enabled":true`) {
		t.Fatalf("megaphone: %v %s", err, file)
	}
	if _, _, err := Edit(file, "c6", SetMegaphone{Settings: map[string]any{"title": "no enabled"}}); err == nil {
		t.Fatal("megaphone settings follow the schema")
	}
	file, _, _ = Edit(file, "c7", SetMegaphone{})
	file, _, _ = Edit(file, "c8", DeleteArea{ID: "a1"})
	if doc := decode(t, file); len(doc["areas"].([]any)) != 0 || strings.Contains(string(file), "megaphone") {
		t.Fatalf("delete and clear: %s", file)
	}
}

func TestMigrationAddsTheLock(t *testing.T) {
	doc := map[string]any{"version": "2.0.0", "areas": []any{map[string]any{"properties": []any{map[string]any{"id": "sp", "type": "speakerMegaphone"}}}}}
	Migrate(doc)
	b, _ := json.Marshal(doc)
	if !strings.Contains(string(b), `{"id":"sp-lock","type":"lockableAreaPropertyData"}`) || doc["version"] != "2.1.0" {
		t.Fatalf("%s", b)
	}
}

func TestEntitiesClaimsAndFiles(t *testing.T) {
	file, _ := os.ReadFile("../../../map-storage/tests/assets/maps/empty.wam")
	personal := map[string]any{"id": "pp", "type": "personalAreaPropertyData", "accessClaimMode": "dynamic", "allowedTags": []any{}, "ownerId": nil}
	rights := map[string]any{"id": "rr", "type": "restrictedRightsPropertyData", "writeTags": []any{"member"}, "readTags": []any{}}
	file, _, _ = Edit(file, "1", CreateArea{ID: "desk", X: 0, Y: 0, Width: 100, Height: 100, Properties: []any{personal}})
	file, _, _ = Edit(file, "2", CreateArea{ID: "room", X: 200, Y: 0, Width: 100, Height: 100, Properties: []any{rights}})

	claimed := map[string]any{"id": "pp", "type": "personalAreaPropertyData", "accessClaimMode": "dynamic", "allowedTags": []any{}, "ownerId": "me"}
	m, ok := Claim(file, ModifyArea{ID: "desk", Properties: []any{claimed}, ModifyProperties: true}, "me")
	if !ok {
		t.Fatal("a free personal area can be claimed")
	}
	file, _, _ = Edit(file, "3", m)
	if _, ok := Claim(file, ModifyArea{ID: "desk", Properties: []any{claimed}, ModifyProperties: true}, "other"); ok {
		t.Fatal("not someone else's")
	}
	if _, ok := Claim(file, ModifyArea{ID: "room", Properties: []any{rights}, ModifyProperties: true}, "me"); ok {
		t.Fatal("not an ordinary area")
	}
	if !CanEditAt(file, 50, 50, nil, "me") || !CanEditAt(file, 250, 50, []string{"member"}, "x") || CanEditAt(file, 250, 50, nil, "x") || CanEditAt(file, 500, 500, []string{"member"}, "me") {
		t.Fatal("entity rights: own desk, write tags, nothing outside")
	}

	pdf := map[string]any{"id": "f1", "type": "openFile", "name": "doc.pdf", "link": "http://ms/private/files/doc-f1.pdf"}
	file, _, err := Edit(file, "4", CreateEntity{ID: "e1", PrefabID: "p", CollectionName: "custom entities", X: 10, Y: 10, Properties: []any{pdf}})
	if err != nil {
		t.Fatal(err)
	}
	if _, _, err := Edit(file, "5", CreateEntity{ID: "e1", PrefabID: "p"}); err == nil {
		t.Fatal("entity ids are unique")
	}
	file, res, _ := Edit(file, "6", ModifyEntity{ID: "e1", X: 20, Y: 20})
	if len(res.Removed) != 0 {
		t.Fatal("moving keeps the file")
	}
	_, res, _ = Edit(file, "7", DeleteEntitiesOf{PrefabID: "p"})
	if len(res.Removed) != 1 || res.Removed[0] != "private/files/doc-f1.pdf" || len(res.Doc["entities"].(map[string]any)) != 0 {
		t.Fatalf("deleting a custom entity removes its copies and their files: %+v", res.Removed)
	}
}
