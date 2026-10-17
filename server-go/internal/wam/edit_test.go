package wam

import (
	"encoding/json"
	"strings"
	"testing"
)

const emptyWAM = `{"version":"2.1.0","mapUrl":"./m.tmj","areas":[],"entities":{},"entityCollections":[]}`

// A file that does not follow the schema is refused, not repaired by the edit.
func TestAMalformedWAMIsRefusedNotOverwritten(t *testing.T) {
	for name, file := range map[string]string{
		"areas is an object": `{"version":"2.1.0","mapUrl":"./m.tmj","areas":{"a":1},"entities":{},"entityCollections":[]}`,
		"entities is a list": `{"version":"2.1.0","mapUrl":"./m.tmj","areas":[],"entities":[],"entityCollections":[]}`,
		"an area has no id":  `{"version":"2.1.0","mapUrl":"./m.tmj","areas":[{"name":"x"}],"entities":{},"entityCollections":[]}`,
		"no mapUrl":          `{"version":"2.1.0","areas":[],"entities":{},"entityCollections":[]}`,
		"not JSON":           `{"version":`,
		"not an object":      `[]`,
	} {
		if _, _, err := Edit([]byte(file), "c", CreateArea{ID: "a1", Width: 1, Height: 1}); err == nil {
			t.Errorf("%s: the edit went through", name)
		}
	}
}

// Entities: placed with their prefab, moved, refused twice or unknown, removed with the copies of a custom entity.
func TestEntitiesArePlacedMovedAndRemoved(t *testing.T) {
	file := []byte(emptyWAM)
	edit := func(cmd any) {
		t.Helper()
		var err error
		if file, _, err = Edit(file, "c", cmd); err != nil {
			t.Fatalf("%T: %v", cmd, err)
		}
	}
	entity := func(id string) map[string]any {
		var doc map[string]any
		_ = json.Unmarshal(file, &doc)
		e, _ := doc["entities"].(map[string]any)[id].(map[string]any)
		return e
	}
	name := "Chair"
	edit(CreateEntity{ID: "e1", PrefabID: "chair", CollectionName: "office", X: 10, Y: 20, Name: &name})
	edit(CreateEntity{ID: "e2", PrefabID: "custom-1", CollectionName: "custom", X: 0, Y: 0})
	edit(CreateEntity{ID: "e3", PrefabID: "custom-1", CollectionName: "custom", X: 5, Y: 5})
	if _, _, err := Edit(file, "c", CreateEntity{ID: "e1", PrefabID: "chair", CollectionName: "office"}); err == nil {
		t.Fatal("an entity id is unique")
	}
	if _, _, err := Edit(file, "c", ModifyEntity{ID: "nope"}); err == nil {
		t.Fatal("an unknown entity cannot be moved")
	}
	edit(ModifyEntity{ID: "e1", X: 11, Y: 21})
	if e := entity("e1"); e["x"] != 11.0 || e["y"] != 21.0 || e["name"] != "Chair" || e["prefabRef"].(map[string]any)["collectionName"] != "office" {
		t.Fatalf("moved, the rest kept: %v", e)
	}
	edit(DeleteEntitiesOf{PrefabID: "custom-1"})
	if entity("e2") != nil || entity("e3") != nil || entity("e1") == nil {
		t.Fatal("the copies of the deleted custom entity go, the others stay")
	}
	edit(DeleteEntity{ID: "e1"})
	edit(DeleteEntity{ID: "e1"}) // already gone: nothing to do
	if entity("e1") != nil {
		t.Fatal("deleted")
	}
}

// The private file of an openFile property is reported removed when the property goes, or its file is cleared.
func TestTheFileOfARemovedPropertyIsReportedForDeletion(t *testing.T) {
	file := []byte(emptyWAM)
	openFile := map[string]any{"id": "p1", "type": "openFile", "name": "report.pdf", "link": "https://x/report.pdf", "newTab": false,
		"hideButtonLabel": false, "forceApi": false}
	var err error
	if file, _, err = Edit(file, "c1", CreateArea{ID: "a1", Width: 1, Height: 1, Properties: []any{openFile}}); err != nil {
		t.Fatal(err)
	}
	_, res, err := Edit(file, "c2", DeleteArea{ID: "a1"})
	if err != nil || len(res.Removed) != 1 || res.Removed[0] != PrivateFile("report.pdf", "p1") {
		t.Fatalf("%v %v", res.Removed, err)
	}
	cleared := map[string]any{"id": "p1", "type": "openFile", "name": "", "link": "", "newTab": false, "hideButtonLabel": false, "forceApi": false}
	_, res, err = Edit(file, "c3", ModifyArea{ID: "a1", Properties: []any{cleared}, ModifyProperties: true})
	if err != nil || len(res.Removed) != 1 {
		t.Fatalf("a cleared file is removed too: %v %v", res.Removed, err)
	}
	renamed := map[string]any{"id": "p1", "type": "openFile", "name": "report.pdf", "link": "https://x/report.pdf", "newTab": true,
		"hideButtonLabel": false, "forceApi": false}
	if _, res, _ = Edit(file, "c4", ModifyArea{ID: "a1", Properties: []any{renamed}, ModifyProperties: true}); len(res.Removed) != 0 {
		t.Fatalf("a property still holding its file keeps it: %v", res.Removed)
	}
}

// The examples of RFC 6902, appendix A, as map-storage's PATCH applies them.
func TestJSONPatchFollowsRFC6902(t *testing.T) {
	for _, c := range []struct {
		name, doc, patch, want string
	}{
		{"add an object member", `{"foo":"bar"}`, `[{"op":"add","path":"/baz","value":"qux"}]`, `{"baz":"qux","foo":"bar"}`},
		{"add an array element", `{"foo":["bar","baz"]}`, `[{"op":"add","path":"/foo/1","value":"qux"}]`, `{"foo":["bar","qux","baz"]}`},
		{"remove an object member", `{"baz":"qux","foo":"bar"}`, `[{"op":"remove","path":"/baz"}]`, `{"foo":"bar"}`},
		{"remove an array element", `{"foo":["bar","qux","baz"]}`, `[{"op":"remove","path":"/foo/1"}]`, `{"foo":["bar","baz"]}`},
		{"replace a value", `{"baz":"qux","foo":"bar"}`, `[{"op":"replace","path":"/baz","value":"boo"}]`, `{"baz":"boo","foo":"bar"}`},
		{"move a value", `{"foo":{"bar":"baz","waldo":"fred"},"qux":{"corge":"grault"}}`, `[{"op":"move","from":"/foo/waldo","path":"/qux/thud"}]`,
			`{"foo":{"bar":"baz"},"qux":{"corge":"grault","thud":"fred"}}`},
		{"move an array element", `{"foo":["all","grass","cows","eat"]}`, `[{"op":"move","from":"/foo/1","path":"/foo/3"}]`, `{"foo":["all","cows","eat","grass"]}`},
		{"test then add", `{"baz":"qux","foo":["a",2,"c"]}`, `[{"op":"test","path":"/baz","value":"qux"},{"op":"test","path":"/foo/1","value":2}]`,
			`{"baz":"qux","foo":["a",2,"c"]}`},
		{"add to a nested object", `{"foo":"bar"}`, `[{"op":"add","path":"/child","value":{"grandchild":{}}}]`, `{"child":{"grandchild":{}},"foo":"bar"}`},
		{"append with -", `{"foo":["bar"]}`, `[{"op":"add","path":"/foo/-","value":["abc","def"]}]`, `{"foo":["bar",["abc","def"]]}`},
		{"escaped keys", `{"/":9,"~1":10}`, `[{"op":"test","path":"/~01","value":10},{"op":"copy","from":"/~1","path":"/a~1b"}]`, `{"/":9,"a/b":9,"~1":10}`},
	} {
		got, err := Patch(decodeAny(t, c.doc), decodeAny(t, c.patch).([]any))
		if err != nil {
			t.Errorf("%s: %v", c.name, err)
			continue
		}
		if b, _ := json.Marshal(got); string(b) != c.want {
			t.Errorf("%s: %s, want %s", c.name, b, c.want)
		}
	}
	for name, c := range map[string][2]string{
		"a failed test":        {`{"baz":"qux"}`, `[{"op":"test","path":"/baz","value":"bar"}]`},
		"a missing member":     {`{"foo":"bar"}`, `[{"op":"remove","path":"/baz"}]`},
		"an index too far":     {`{"foo":["bar"]}`, `[{"op":"add","path":"/foo/5","value":1}]`},
		"a pointer without /":  {`{"foo":"bar"}`, `[{"op":"add","path":"foo","value":1}]`},
		"an unknown operation": {`{"foo":"bar"}`, `[{"op":"merge","path":"/foo","value":1}]`},
		"no path":              {`{"foo":"bar"}`, `[{"op":"add","value":1}]`},
	} {
		if _, err := Patch(decodeAny(t, c[0]), decodeAny(t, c[1]).([]any)); err == nil {
			t.Errorf("%s is refused", name)
		}
	}
}

func decodeAny(t *testing.T, s string) any {
	t.Helper()
	var v any
	d := json.NewDecoder(strings.NewReader(s))
	if err := d.Decode(&v); err != nil {
		t.Fatal(err)
	}
	return v
}
