package mapedit

import (
	"encoding/json"
	"testing"

	"github.com/workadventure/workadventure/server-go/internal/wam"
)

func TestTheResourceOfAPropertyHearsOfItAndNamesIt(t *testing.T) {
	maps := newMaps(t)
	var calls []string
	call := func(method, url string, p map[string]any) (map[string]any, error) {
		calls = append(calls, method+" "+url)
		if method == "POST" {
			if p["serverData"] != nil {
				t.Fatal("a new property comes without serverData")
			}
			out := map[string]any{}
			for k, v := range p {
				out[k] = v
			}
			out["serverData"] = map[string]any{"matrixRoomId": "!room:matrix"}
			return out, nil
		}
		return nil, nil
	}
	edit := func(ed Editor, cmd any) {
		t.Helper()
		cmd, after := Resources(maps, office, ed, cmd, call)
		if _, err := Apply(maps, office, ed, "c", cmd); err != nil {
			t.Fatal(err)
		}
		after()
	}
	chat := func(name string) map[string]any {
		return map[string]any{"id": "p1", "type": "matrixRoomPropertyData", "displayName": name, "shouldOpenAutomatically": true,
			"resourceUrl": "http://play/roomArea", "serverData": map[string]any{"matrixRoomId": "forged"}}
	}
	edit(admin, wam.CreateArea{ID: "a1", Name: "hall", Width: 10, Height: 10})
	edit(admin, wam.ModifyArea{ID: "a1", ModifyProperties: true, Properties: []any{chat("Hall")}})
	stored := areaProperties(maps, office, "a1")["p1"]
	if sd, _ := stored["serverData"].(map[string]any); sd["matrixRoomId"] != "!room:matrix" {
		t.Fatalf("the service's answer is what the map keeps: %v", stored)
	}
	renamed := chat("Lobby")
	renamed["serverData"] = stored["serverData"]
	edit(admin, wam.ModifyArea{ID: "a1", ModifyProperties: true, Properties: []any{renamed}})
	edit(admin, wam.ModifyArea{ID: "a1", ModifyProperties: true, Properties: []any{}})
	edit(admin, wam.ModifyArea{ID: "a1", ModifyProperties: true, Properties: []any{chat("Again")}})
	edit(admin, wam.DeleteArea{ID: "a1"})
	want := []string{"POST http://play/roomArea", "PATCH http://play/roomArea", "DELETE http://play/roomArea", "POST http://play/roomArea", "DELETE http://play/roomArea"}
	if b, _ := json.Marshal(calls); string(b) != func() string { w, _ := json.Marshal(want); return string(w) }() {
		t.Fatalf("got %v, want %v", calls, want)
	}
	if _, after := Resources(maps, office, member, wam.DeleteArea{ID: "a1"}, func(string, string, map[string]any) (map[string]any, error) {
		t.Fatal("only a map editor's edits reach a resource")
		return nil, nil
	}); after != nil {
		after()
	}
}

// A copied area gets its own Matrix room (the hooks run at creation too) and its own copy of the uploaded file, which
// is named after the property id; a property that already owns its file is left alone (CreateAreaMapStorageCommand).
func TestACopiedAreaGetsItsOwnRoomAndFile(t *testing.T) {
	maps := newMaps(t)
	if err := maps.Put("private/files/report-orig.pdf", []byte("pdf")); err != nil {
		t.Fatal(err)
	}
	call := func(method, _ string, p map[string]any) (map[string]any, error) {
		out := map[string]any{"serverData": map[string]any{"matrixRoomId": "!new:matrix"}}
		for k, v := range p {
			out[k] = v
		}
		return out, nil
	}
	cmd, _ := Resources(maps, office, admin, wam.CreateArea{ID: "copy", Properties: []any{
		map[string]any{"id": "chat", "type": "matrixRoomPropertyData", "resourceUrl": "http://play/roomArea",
			"serverData": map[string]any{"matrixRoomId": "!original:matrix"}},
		map[string]any{"id": "copied", "type": "openFile", "name": "report.pdf", "link": "http://ms.test/files/report-orig.pdf"},
		map[string]any{"id": "orig", "type": "openFile", "name": "report.pdf", "link": "http://ms.test/files/report-orig.pdf"},
	}}, call)
	props := cmd.(wam.CreateArea).Properties
	if sd := props[0].(map[string]any)["serverData"].(map[string]any); sd["matrixRoomId"] != "!new:matrix" {
		t.Fatalf("the copy keeps the original's room: %v", sd)
	}
	if link := props[1].(map[string]any)["link"]; link != "http://ms.test/files/report-copied.pdf" {
		t.Fatalf("link of the copy: %v", link)
	}
	if b, err := maps.Read("private/files/report-copied.pdf"); err != nil || string(b) != "pdf" {
		t.Fatalf("the file was not copied: %q %v", b, err)
	}
	if link := props[2].(map[string]any)["link"]; link != "http://ms.test/files/report-orig.pdf" {
		t.Fatalf("the original's link changed: %v", link)
	}
}
