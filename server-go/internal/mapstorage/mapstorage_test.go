package mapstorage

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	tiled = `{"type":"map","tiledversion":"1.10","orientation":"orthogonal","layers":[{"name":"floorLayer","type":"objectgroup"}],` +
		`"tilesets":[{"name":"t","image":"../assets/t.png"}],"properties":[{"name":"mapName","value":"Office"}]}`
	wamFile = `{"version":"2.0.0","mapUrl":"./map.tmj","areas":[],"entities":{},"entityCollections":[]}`
)

func zipOf(t *testing.T, files map[string]string) []byte {
	var buf bytes.Buffer
	z := zip.NewWriter(&buf)
	for name, content := range files {
		w, err := z.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		_, _ = w.Write([]byte(content))
	}
	_ = z.Close()
	return buf.Bytes()
}

type harness struct {
	t       *testing.T
	dir     string
	s       *Store
	h       http.Handler
	changed []string
}

func newHarness(t *testing.T) *harness {
	hs := &harness{t: t, dir: t.TempDir()}
	hs.s = New(hs.dir)
	hs.s.Changed = func(key string, deleted bool) {
		if deleted {
			key = "-" + key
		}
		hs.changed = append(hs.changed, key)
	}
	hs.h = hs.s.Handler(Options{Auth: Auth{Basic: true, User: "john.doe", Password: "password"}, CacheControl: "public, s-max-age=10",
		SecretKey: "secret", MaxUncompressed: 1 << 20})
	return hs
}

func (hs *harness) do(method, target string, body []byte, contentType string, fields ...string) *httptest.ResponseRecorder {
	if contentType == "zip" {
		var buf bytes.Buffer
		form := multipart.NewWriter(&buf)
		part, _ := form.CreateFormFile("file", "assets.zip")
		_, _ = part.Write(body)
		for i := 0; i+1 < len(fields); i += 2 {
			_ = form.WriteField(fields[i], fields[i+1])
		}
		_ = form.Close()
		body, contentType = buf.Bytes(), form.FormDataContentType()
	}
	r := httptest.NewRequest(method, target, bytes.NewReader(body))
	if contentType != "" {
		r.Header.Set("Content-Type", contentType)
	}
	r.SetBasicAuth("john.doe", "password")
	w := httptest.NewRecorder()
	hs.h.ServeHTTP(w, r)
	return w
}

func (hs *harness) maps() map[string]any {
	var m struct{ Maps map[string]any }
	_ = json.Unmarshal(hs.do("GET", "/maps", nil, "").Body.Bytes(), &m)
	return m.Maps
}

func TestUploadKeepsEditedWAMAndGeneratesMissingOnes(t *testing.T) {
	hs := newHarness(t)
	if w := hs.do("POST", "/upload", zipOf(t, map[string]string{"dir/map.tmj": tiled, "dir/map.wam": wamFile, "assets/t.png": "png", "__MACOSX/.x": "junk"}), "zip"); w.Code != 200 {
		t.Fatalf("upload: %d %s", w.Code, w.Body)
	}
	// The same Tiled map without its WAM: the WAM, with its edits, stays.
	hs.do("POST", "/upload", zipOf(t, map[string]string{"dir/map.tmj": tiled, "assets/t.png": "png"}), "zip")
	if w := hs.do("GET", "/dir/map.wam", nil, ""); !strings.Contains(w.Body.String(), `"version":"2.0.0"`) || w.Header().Get("Cache-Control") != "max-age=5" {
		t.Fatalf("kept wam: %d %s", w.Code, w.Body)
	}
	// Another Tiled map: the old WAM goes with its map, the new one gets a generated WAM.
	hs.do("POST", "/upload", zipOf(t, map[string]string{"dir/map2.tmj": tiled, "assets/t.png": "png"}), "zip")
	if hs.do("GET", "/dir/map.wam", nil, "").Code != 404 {
		t.Fatal("the old WAM goes")
	}
	if w := hs.do("GET", "/dir/map2.wam", nil, ""); !strings.Contains(w.Body.String(), `"mapUrl": "./map2.tmj"`) || !strings.Contains(w.Body.String(), `"name": "Office"`) {
		t.Fatalf("generated: %s", w.Body)
	}
	if _, ok := hs.maps()["dir/map2.wam"]; !ok {
		t.Fatalf("listed: %v", hs.maps())
	}
}

func TestUploadRefusesInvalidMaps(t *testing.T) {
	hs := newHarness(t)
	w := hs.do("POST", "/upload", zipOf(t, map[string]string{"m.tmj": tiled, "map.json": tiled}), "zip")
	var errs map[string]map[string][]issue
	_ = json.Unmarshal(w.Body.Bytes(), &errs)
	if w.Code != 400 || errs["m.tmj"]["tilesets"][0].Type != "error" || !strings.Contains(errs["map.json"]["map"][0].Message, `".tmj" extension`) {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	if len(walk(hs.dir)) != 0 {
		t.Fatal("nothing is written")
	}
	r := httptest.NewRequest("POST", "/upload", nil)
	r.SetBasicAuth("bad", "credentials")
	rec := httptest.NewRecorder()
	hs.h.ServeHTTP(rec, r)
	if rec.Code != 401 {
		t.Fatalf("auth: %d", rec.Code)
	}
}

func TestPutPatchDeleteAndFolders(t *testing.T) {
	hs := newHarness(t)
	if w := hs.do("PUT", "/plus+dir/🍕.wam", []byte(wamFile), "application/json"); w.Code != 200 {
		t.Fatalf("put: %d %s", w.Code, w.Body)
	}
	if _, ok := hs.maps()["plus+dir/🍕.wam"]; !ok {
		t.Fatalf("a literal key: %v", hs.maps())
	}
	w := hs.do("PATCH", "/plus+dir/%F0%9F%8D%95.wam", []byte(`[{"op":"replace","path":"/mapUrl","value":"https://example.com/new.tmj"}]`), "application/json-patch+json")
	if w.Code != 200 || !strings.Contains(hs.do("GET", "/plus+dir/🍕.wam", nil, "").Body.String(), "new.tmj") {
		t.Fatalf("patch: %d %s", w.Code, w.Body)
	}
	if w := hs.do("PATCH", "/plus+dir/🍕.wam", []byte(`{"op":"replace"}`), "application/json"); w.Code != 400 {
		t.Fatal("a patch is an array")
	}
	if w := hs.do("PATCH", "/plus+dir/🍕.wam", []byte(`[{"op":"remove","path":"/areas"}]`), "application/json"); w.Code != 400 {
		t.Fatal("a patched file still follows the schema")
	}
	if w := hs.do("POST", "/upload", zipOf(t, map[string]string{"map.tmj": strings.Replace(tiled, "../assets", "assets", 1), "assets/t.png": "png"}), "zip", "directory", "/toMove"); w.Code != 200 {
		t.Fatalf("upload in a directory: %d %s", w.Code, w.Body)
	}
	if w := hs.do("POST", "/copy", []byte(`{"source":"/toMove","destination":"/copied"}`), "application/json"); w.Code != 201 {
		t.Fatalf("copy: %d %s", w.Code, w.Body)
	}
	if w := hs.do("POST", "/move", []byte(`{"source":"/toMove","destination":"/copied"}`), "application/json"); w.Code != 409 {
		t.Fatalf("move onto an existing folder: %d", w.Code)
	}
	hs.do("POST", "/move", []byte(`{"source":"/toMove","destination":"/moved"}`), "application/json")
	m := hs.maps()
	if _, ok := m["moved/map.wam"]; !ok || m["toMove/map.wam"] != nil || m["copied/map.wam"] == nil {
		t.Fatalf("move and copy: %v", m)
	}
	if w := hs.do("GET", "/download?directory=moved", nil, ""); w.Header().Get("Content-Type") != "application/zip" || w.Body.Len() == 0 {
		t.Fatal("download")
	}
	if w := hs.do("DELETE", "/plus+dir/🍕.wam", nil, ""); w.Code != 204 {
		t.Fatalf("delete: %d", w.Code)
	}
	if w := hs.do("DELETE", "/", nil, ""); w.Code != 204 || len(hs.maps()) != 0 {
		t.Fatal("delete the root")
	}
	if strings.Join(hs.changed, " ") != "plus+dir/🍕.wam plus+dir/🍕.wam -plus+dir/🍕.wam" {
		t.Fatalf("players are told: %v", hs.changed)
	}
}

func TestStaticFiles(t *testing.T) {
	hs := newHarness(t)
	hs.do("POST", "/upload", zipOf(t, map[string]string{"file with space.txt": "ok", "app.a45b7e8f.js": "", "normal.js": ""}), "zip")
	if w := hs.do("GET", "/file+with%20space.txt", nil, ""); w.Body.String() != "ok" {
		t.Fatalf("plus is a space: %d", w.Code)
	}
	if w := hs.do("GET", "/app.a45b7e8f.js", nil, ""); !strings.Contains(w.Header().Get("Cache-Control"), "immutable") || w.Header().Get("ETag") == "" {
		t.Fatalf("immutable: %v", w.Header())
	}
	if w := hs.do("GET", "/normal.js", nil, ""); w.Header().Get("Cache-Control") != "public, s-max-age=10" {
		t.Fatal("cache control")
	}
}

// A sound uploaded for a "play audio" property is a public map asset: served without a token or credentials, with
// the type of the TS map-storage, and in ranges, which Firefox asks for to play it.
func TestUploadedSoundsArePublicAndServedInRanges(t *testing.T) {
	hs := newHarness(t)
	_ = os.MkdirAll(filepath.Join(hs.dir, "assets/sounds"), 0o755)
	_ = os.WriteFile(filepath.Join(hs.dir, "assets/sounds/gong-p.mp3"), []byte("ID3sound"), 0o644)
	r := httptest.NewRequest("GET", "/assets/sounds/gong-p.mp3", nil)
	r.Header.Set("Range", "bytes=3-")
	w := httptest.NewRecorder()
	hs.h.ServeHTTP(w, r)
	if w.Code != http.StatusPartialContent || w.Body.String() != "sound" || w.Header().Get("Content-Type") != "audio/mpeg" ||
		w.Header().Get("Accept-Ranges") != "bytes" || w.Header().Get("Content-Range") != "bytes 3-7/8" {
		t.Fatalf("%d %q %v", w.Code, w.Body, w.Header())
	}
}

func TestPrivateFilesNeedAToken(t *testing.T) {
	hs := newHarness(t)
	doc := `{"version":"2.1.0","mapUrl":"./m.tmj","entityCollections":[],"entities":{},"areas":[{"id":"a","name":"","x":0,"y":0,"width":1,"height":1,` +
		`"visible":true,"properties":[{"id":"p","type":"openFile","link":"http://ms/private/files/doc-p.pdf"},` +
		`{"id":"r","type":"restrictedRightsPropertyData","readTags":["member"],"writeTags":[]}]}]}`
	_ = os.MkdirAll(filepath.Join(hs.dir, "maps"), 0o755)
	_ = os.WriteFile(filepath.Join(hs.dir, "maps/m.wam"), []byte(doc), 0o644)
	_ = os.MkdirAll(filepath.Join(hs.dir, "private/files"), 0o755)
	_ = os.WriteFile(filepath.Join(hs.dir, "private/files/doc-p.pdf"), []byte("pdf"), 0o644)
	token := func(tags ...string) string {
		s, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"wamUrl": "http://ms/maps/m.wam", "tags": tags,
			"exp": time.Now().Add(time.Hour).Unix()}).SignedString([]byte("secret"))
		return s
	}
	for target, want := range map[string]int{
		"/private/files/doc-p.pdf":                          403,
		"/private/files/doc-p.pdf?token=" + token():         404,
		"/private/files/doc-p.pdf?token=" + token("member"): 200,
		"/private/files/other.pdf?token=" + token("member"): 404,
	} {
		if w := hs.do("GET", target, nil, ""); w.Code != want {
			t.Errorf("%s: %d, want %d", target, w.Code, want)
		}
	}
}

func TestAMapUploadedAloneStartsFromTheWAMTemplate(t *testing.T) {
	template := `{"version":"2.0.0","mapUrl":"x","areas":[{"id":"hall","name":"Hall","x":0,"y":0,"width":10,"height":10,"visible":true,"properties":[]}],` +
		`"entities":{},"entityCollections":[{"url":"https://collections.test/a.json","type":"file"}],"metadata":{"name":"Template","copyright":"Ours"}}`
	tpl := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte(template)) }))
	defer tpl.Close()
	hs := newHarness(t)
	hs.h = hs.s.Handler(Options{Auth: Auth{Basic: true, User: "john.doe", Password: "password"}, MaxUncompressed: 1 << 20, WAMTemplateURL: tpl.URL,
		EntityCollections: []string{"https://ignored.test/c.json"}})
	if w := hs.do("POST", "/upload", zipOf(t, map[string]string{"dir/map.tmj": tiled, "assets/t.png": "png"}), "zip"); w.Code != 200 {
		t.Fatalf("upload: %d %s", w.Code, w.Body)
	}
	var doc struct {
		MapURL   string            `json:"mapUrl"`
		Areas    []map[string]any  `json:"areas"`
		Metadata map[string]string `json:"metadata"`
		Coll     []map[string]any  `json:"entityCollections"`
	}
	_ = json.Unmarshal(hs.do("GET", "/dir/map.wam", nil, "").Body.Bytes(), &doc)
	if doc.MapURL != "./map.tmj" || len(doc.Areas) != 1 || doc.Metadata["name"] != "Office" || doc.Metadata["copyright"] != "" ||
		len(doc.Coll) != 1 || doc.Coll[0]["url"] != "https://collections.test/a.json" {
		t.Fatalf("the template, with the map's URL and its own name; its copyright goes with the template's: %+v", doc)
	}
}

func TestPrivateFilesBehindAPathPrefix(t *testing.T) {
	hs := newHarness(t)
	hs.h = hs.s.Handler(Options{Auth: Auth{Basic: true, User: "john.doe", Password: "password"}, SecretKey: "secret", PathPrefix: "/map-storage/"})
	doc := `{"version":"2.1.0","mapUrl":"./m.tmj","entityCollections":[],"entities":{},"areas":[{"id":"a","name":"","x":0,"y":0,"width":1,"height":1,` +
		`"visible":true,"properties":[{"id":"p","type":"openFile","link":"http://play/map-storage/private/files/doc-p.pdf"}]}]}`
	_ = os.MkdirAll(filepath.Join(hs.dir, "maps"), 0o755)
	_ = os.WriteFile(filepath.Join(hs.dir, "maps/m.wam"), []byte(doc), 0o644)
	_ = os.MkdirAll(filepath.Join(hs.dir, "private/files"), 0o755)
	_ = os.WriteFile(filepath.Join(hs.dir, "private/files/doc-p.pdf"), []byte("pdf"), 0o644)
	token, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"wamUrl": "http://play/map-storage/maps/m.wam",
		"exp": time.Now().Add(time.Hour).Unix()}).SignedString([]byte("secret"))
	// The proxy stripped /map-storage; the map's URL and the file's link keep it.
	if w := hs.do("GET", "/private/files/doc-p.pdf?token="+token, nil, ""); w.Code != 200 {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
}

func TestTwoWorldsWithTheSamePathsNeverShareAMap(t *testing.T) {
	hs := newHarness(t)
	hs.h = hs.s.Handler(Options{Auth: Auth{Basic: true, User: "john.doe", Password: "password"}, UseDomainNameInPath: true, MaxUncompressed: 1 << 20})
	put := func(host, body string) {
		r := httptest.NewRequest("PUT", "/maps/office.wam", strings.NewReader(body))
		r.Host = host
		r.SetBasicAuth("john.doe", "password")
		w := httptest.NewRecorder()
		hs.h.ServeHTTP(w, r)
		if w.Code != 200 && w.Code != 201 {
			t.Fatalf("PUT on %s: %d %s", host, w.Code, w.Body)
		}
	}
	get := func(path string, header map[string]string) *httptest.ResponseRecorder {
		r := httptest.NewRequest("GET", path, nil)
		for k, v := range header {
			r.Header.Set(k, v)
		}
		w := httptest.NewRecorder()
		hs.h.ServeHTTP(w, r)
		return w
	}
	put("acme.ms.test", strings.Replace(wamFile, `"areas":[]`, `"areas":[],"vendor":{"by":"acme"}`, 1))
	put("globex.ms.test:443", wamFile)
	if w := get("/maps/office.wam", map[string]string{"X-Forwarded-Host": "acme.ms.test"}); !strings.Contains(w.Body.String(), "acme") {
		t.Fatalf("acme's map: %s", w.Body)
	}
	if w := get("/maps/office.wam", map[string]string{"X-Forwarded-Host": "globex.ms.test"}); strings.Contains(w.Body.String(), "acme") || w.Code != 200 {
		t.Fatalf("globex has its own map at the same path: %d %s", w.Code, w.Body)
	}
	if w := get("/maps", map[string]string{"X-Forwarded-Host": "initech.ms.test"}); strings.Contains(w.Body.String(), "office") {
		t.Fatalf("a third world lists none of them: %s", w.Body)
	}
	if _, err := os.Stat(filepath.Join(hs.dir, "acme.ms.test", "maps", "office.wam")); err != nil {
		t.Fatal("each world in its folder, as map-storage stores them:", err)
	}
}

// A PATCH body is read as body-parser's json() of map-storage reads it.
func TestAPatchBodyIsReadAsTheBodyParserDoes(t *testing.T) {
	hs := newHarness(t)
	hs.h = hs.s.Handler(Options{Auth: Auth{Basic: true, User: "john.doe", Password: "password"}, JSONLimit: 64})
	if w := hs.do("PUT", "/m.wam", []byte(wamFile), "application/json"); w.Code != 200 {
		t.Fatalf("put: %d %s", w.Code, w.Body)
	}
	ops := []byte(`[{"op":"replace","path":"/mapUrl","value":"x.tmj"}]`)
	for _, c := range []struct {
		body        []byte
		contentType string
		code        int
	}{
		{ops, "text/plain", 400}, // another type leaves the body empty: not a patch
		{append(ops[:len(ops)-1:len(ops)-1], []byte(`,{"op":"test","path":"/mapUrl","value":"x.tmj"}]`)...), "application/json", 413},
		{[]byte(`[{"op":`), "application/json", 400}, // not JSON
		{[]byte(`"text"`), "application/json", 400},  // strict: an object or an array
		{ops, "application/json; charset=utf-8", 200},
	} {
		if w := hs.do("PATCH", "/m.wam", c.body, c.contentType); w.Code != c.code {
			t.Errorf("%s %q: %d %s", c.contentType, c.body, w.Code, w.Body)
		}
	}
}
