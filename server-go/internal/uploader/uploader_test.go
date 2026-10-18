package uploader

import (
	"bytes"
	"context"
	"encoding/json"
	"github.com/workadventure/workadventure/server-go/internal/s3"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
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

func TestTheAdminDecidesWhatSizeAPlayerMayUpload(t *testing.T) {
	admin := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/limit/fileSize" || r.Header.Get("userRoomToken") != "room-token" {
			w.WriteHeader(http.StatusForbidden)
			_, _ = w.Write([]byte(`{"message":"who are you"}`))
			return
		}
		if r.URL.Query().Get("fileSize") != "5" {
			w.WriteHeader(http.StatusRequestEntityTooLarge)
			_, _ = w.Write([]byte(`{"message":"file-too-big","maxFileSize":4}`))
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer admin.Close()
	h := New(Options{PublicURL: "http://up.test", AdminAPIURL: admin.URL}).Handler() // EnableUpload false: the admin decides
	send := func(token string, data []byte) *httptest.ResponseRecorder {
		var b bytes.Buffer
		m := multipart.NewWriter(&b)
		if token != "" {
			_ = m.WriteField("userRoomToken", token)
		}
		f, _ := m.CreateFormFile("file", "a.txt")
		_, _ = f.Write(data)
		_ = m.Close()
		return do(h, "POST", "/upload-file", &b, m.FormDataContentType())
	}
	if w := send("", []byte("hello")); w.Code != http.StatusUnauthorized || !strings.Contains(w.Body.String(), "not-logged") {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	if w := send("room-token", []byte("hello")); w.Code != http.StatusOK {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	if w := send("room-token", []byte("too long")); w.Code != http.StatusRequestEntityTooLarge || !strings.Contains(w.Body.String(), `"maxFileSize":4`) {
		t.Fatalf("the admin's limit and message are relayed: %d %s", w.Code, w.Body)
	}
	if w := send("other", []byte("hello")); w.Code != http.StatusUnauthorized {
		t.Fatalf("any other refusal is a 401: %d", w.Code)
	}
}

type memKV struct {
	mu sync.Mutex
	m  map[string]string
}

func (k *memKV) Get(_ context.Context, key string) (string, bool, error) {
	k.mu.Lock()
	defer k.mu.Unlock()
	v, ok := k.m[key]
	return v, ok, nil
}

func (k *memKV) Set(_ context.Context, key, value string, _ time.Duration) error {
	k.mu.Lock()
	defer k.mu.Unlock()
	k.m[key] = value
	return nil
}

func TestFilesGoToTheBucketOrToRedis(t *testing.T) {
	var put atomic.Value
	bucket := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut && strings.HasPrefix(r.Header.Get("Authorization"), "AWS4-HMAC-SHA256") {
			b, _ := io.ReadAll(r.Body)
			put.Store(r.URL.Path + " " + r.Header.Get("Content-Disposition") + " " + string(b))
		}
	}))
	defer bucket.Close()
	kv := &memKV{m: map[string]string{}}
	upload := func(h http.Handler) string {
		body, ct := form(t, "file", "photo.png", []byte("png!"))
		w := do(h, "POST", "/upload-file", body, ct)
		var out []struct{ ID string }
		_ = json.Unmarshal(w.Body.Bytes(), &out)
		if w.Code != http.StatusOK || len(out) != 1 {
			t.Fatalf("%d %s", w.Code, w.Body)
		}
		return out[0].ID
	}
	h := New(Options{EnableUpload: true, S3: s3.New(bucket.URL, "eu", "chat", "key", "secret"), S3URLTTL: time.Minute, Redis: kv}).Handler()
	id := upload(h)
	// Over plain HTTP the body is aws-chunked (signed chunks around the bytes), as S3 accepts it.
	if got, _ := put.Load().(string); !strings.HasPrefix(got, "/chat/"+id+" attachment ") || !strings.Contains(got, "\r\npng!\r\n") {
		t.Fatalf("the file goes to the bucket: %q", got)
	}
	w := do(h, "GET", "/upload-file/"+id, nil, "")
	if loc := w.Header().Get("Location"); w.Code != http.StatusFound || !strings.Contains(loc, "/chat/"+id+"?") ||
		!strings.Contains(loc, "response-content-type=image%2Fpng") || !strings.Contains(loc, "X-Amz-Signature=") {
		t.Fatalf("a download is a signed link to the bucket: %d %s", w.Code, loc)
	}
	audio, ct := form(t, "file", "a.mp3", []byte("mp3"))
	var a struct{ ID string }
	_ = json.Unmarshal(do(h, "POST", "/upload-audio-message", audio, ct).Body.Bytes(), &a)
	if v, _, _ := kv.Get(context.Background(), a.ID); v != "mp3" {
		t.Fatal("audio messages go to Redis, even with a bucket")
	}

	h = New(Options{EnableUpload: true, Redis: kv}).Handler()
	id = upload(h)
	if w := do(h, "GET", "/upload-file/"+id, nil, ""); w.Code != http.StatusOK || w.Body.String() != "png!" {
		t.Fatalf("without a bucket, Redis keeps the files: %d %s", w.Code, w.Body)
	}
}
