package uploader

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
)

func form(t *testing.T, field, name string, data []byte) (*bytes.Buffer, string) {
	t.Helper()
	var b bytes.Buffer
	m := multipart.NewWriter(&b)
	w, _ := m.CreateFormFile(field, name)
	_, _ = w.Write(data)
	_ = m.Close()
	return &b, m.FormDataContentType()
}

func do(h http.Handler, method, target string, body *bytes.Buffer, ct string) *httptest.ResponseRecorder {
	if body == nil {
		body = &bytes.Buffer{}
	}
	r := httptest.NewRequest(method, target, body)
	if ct != "" {
		r.Header.Set("Content-Type", ct)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

func TestAnAudioMessageIsUploadedThenPlayed(t *testing.T) {
	h := New(Options{PublicURL: "http://uploader.test", AllowedOrigin: "http://play.test", EnableUpload: true}).Handler()
	body, ct := form(t, "file", "blob", []byte("ogg"))
	w := do(h, "POST", "/upload-audio-message", body, ct)
	var got struct{ ID, Path string }
	_ = json.Unmarshal(w.Body.Bytes(), &got)
	if w.Code != 200 || got.Path != "/download-audio-message/"+got.ID || w.Header().Get("Access-Control-Allow-Origin") != "http://play.test" {
		t.Fatalf("%d %s %v", w.Code, w.Body, w.Header())
	}
	if w := do(h, "GET", got.Path, nil, ""); w.Code != 200 || w.Body.String() != "ogg" || w.Header().Get("Content-Disposition") != "" {
		t.Fatalf("played inline: %d %s", w.Code, w.Body)
	}
}

func TestUploadedFilesAreServedAsDownloadsAndRespectTheRules(t *testing.T) {
	h := New(Options{PublicURL: "http://uploader.test", EnableUpload: true, MaxFileSize: 10}).Handler()
	body, ct := form(t, "file", "page.html", []byte("<script>"))
	w := do(h, "POST", "/upload-file", body, ct)
	var files []struct{ ID, Location string }
	_ = json.Unmarshal(w.Body.Bytes(), &files)
	if w.Code != 200 || len(files) != 1 || files[0].Location != "http://uploader.test/upload-file/"+files[0].ID {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	got := do(h, "GET", "/upload-file/"+files[0].ID, nil, "")
	if got.Header().Get("Content-Type") != "application/octet-stream" || got.Header().Get("Content-Disposition") != "attachment" {
		t.Fatalf("an HTML file is never served as a page: %v", got.Header())
	}
	body, ct = form(t, "file", "big.png", []byte("more than ten bytes"))
	if w := do(h, "POST", "/upload-file", body, ct); w.Code != 413 {
		t.Fatalf("too big: %d", w.Code)
	}
	off := New(Options{EnableUpload: false}).Handler()
	body, ct = form(t, "file", "a.png", []byte("png"))
	if w := do(off, "POST", "/upload-file", body, ct); w.Code != 401 {
		t.Fatalf("ENABLE_CHAT_UPLOAD=false: %d", w.Code)
	}
}
