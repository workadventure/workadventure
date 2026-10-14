package mapstorage

import (
	"archive/zip"
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
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

func upload(h http.Handler, archive []byte, user, password string) *httptest.ResponseRecorder {
	var body bytes.Buffer
	form := multipart.NewWriter(&body)
	part, _ := form.CreateFormFile("file", "assets.zip")
	_, _ = part.Write(archive)
	_ = form.Close()
	r := httptest.NewRequest("POST", "/upload", &body)
	r.Header.Set("Content-Type", form.FormDataContentType())
	r.SetBasicAuth(user, password)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

func TestUploadThenServe(t *testing.T) {
	dir := t.TempDir()
	_ = os.WriteFile(filepath.Join(dir, "old.wam"), []byte("{}"), 0o644)
	s := New(dir)
	h := s.Handler(Auth{Basic: true, User: "john.doe", Password: "password"}, "public, s-max-age=10")
	archive := zipOf(t, map[string]string{"maps/empty.wam": `{"mapUrl":"./empty.tmj"}`, "maps/empty.tmj": `{}`, "assets/t.png": "png",
		"__MACOSX/.x": "junk", "maps/.hidden": "junk"})

	if w := upload(h, archive, "john.doe", "wrong"); w.Code != http.StatusUnauthorized {
		t.Fatalf("bad password: %d", w.Code)
	}
	if w := upload(h, archive, "john.doe", "password"); w.Code != http.StatusOK || w.Body.String() != "File successfully uploaded." {
		t.Fatalf("upload: %d %s", w.Code, w.Body)
	}
	if _, err := os.Stat(filepath.Join(dir, "old.wam")); err == nil {
		t.Fatal("an upload replaces the directory")
	}
	if _, err := os.Stat(filepath.Join(dir, "maps/.hidden")); err == nil {
		t.Fatal("hidden files are dropped")
	}

	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/maps/empty.wam", nil))
	if w.Code != http.StatusOK || w.Header().Get("Content-Type") != "application/json" || w.Header().Get("Access-Control-Allow-Origin") != "*" ||
		!strings.Contains(w.Body.String(), "empty.tmj") {
		t.Fatalf("GET wam: %d %v %s", w.Code, w.Header(), w.Body)
	}
	for _, p := range []string{"/maps/missing.wam", "/maps", "/../etc/passwd"} {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("GET", p, nil))
		if w.Code == http.StatusOK {
			t.Fatalf("%s must not be served", p)
		}
	}

	if err := s.Edit("maps/empty.wam", func(b []byte) ([]byte, error) { return bytes.Replace(b, []byte("empty"), []byte("full"), 1), nil }); err != nil {
		t.Fatal(err)
	}
	if b, _ := os.ReadFile(filepath.Join(dir, "maps/empty.wam")); !strings.Contains(string(b), "full.tmj") {
		t.Fatalf("edit: %s", b)
	}
	if s.Edit("../x.wam", func(b []byte) ([]byte, error) { return b, nil }) == nil {
		t.Fatal("an edit cannot leave the directory")
	}
}
