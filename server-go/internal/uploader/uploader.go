// Package uploader is the uploader service: the audio messages the front records for a global message, and the
// files of the old chat. Files are kept in memory. ponytail: no S3 or Redis storage (the uploader's providers),
// so they are lost on restart and capped at maxBytes in all; the front only uses the audio messages today.
package uploader

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"path"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/workadventure/workadventure/server-go/internal/httpx"
	"github.com/workadventure/workadventure/server-go/internal/s3"
)

// Options are the uploader's settings.
type Options struct {
	PublicURL     string // UPLOADER_URL: where the fronts download the files
	AllowedOrigin string // ALLOWED_CORS_ORIGIN, or PLAY_URL, or *
	EnableUpload  bool   // ENABLE_CHAT_UPLOAD
	MaxFileSize   int64  // UPLOAD_MAX_FILESIZE (100 MiB by default)
	// AdminAPIURL, when set, decides instead of EnableUpload and MaxFileSize, file by file (A29).
	AdminAPIURL string
	// Where the files go, like StorageProviderService: S3 (AWS_*) first, else Redis (REDIS_HOST), else memory. The
	// audio messages go to Redis, else memory.
	S3       *s3.Client
	S3URLTTL time.Duration // UPLOADER_AWS_SIGNED_URL_EXPIRATION: the life of a download link
	Redis    KV
}

// KV is the Redis the files may live in.
type KV interface {
	Get(ctx context.Context, key string) (string, bool, error)
	Set(ctx context.Context, key, value string, ttl time.Duration) error
}

const (
	audioTTL = 60 * time.Second
	maxBytes = 256 << 20
)

type file struct {
	data    []byte
	expires time.Time // zero: kept until evicted
	added   time.Time
}

type Uploader struct {
	o     Options
	mu    sync.Mutex
	files map[string]file
	size  int64
}

func New(o Options) *Uploader {
	if o.MaxFileSize <= 0 {
		o.MaxFileSize = 100 << 20
	}
	if o.AllowedOrigin == "" {
		o.AllowedOrigin = "*"
	}
	return &Uploader{o: o, files: map[string]file{}}
}

func (u *Uploader) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /ping", func(w http.ResponseWriter, _ *http.Request) { _, _ = io.WriteString(w, "pong") })
	mux.HandleFunc("POST /upload-audio-message", u.uploadAudio)
	mux.HandleFunc("GET /download-audio-message/{id}", func(w http.ResponseWriter, r *http.Request) { u.download(w, r, false) })
	mux.HandleFunc("POST /upload-file", u.uploadFiles)
	mux.HandleFunc("GET /upload-file/{id}", func(w http.ResponseWriter, r *http.Request) { u.download(w, r, true) })
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", u.o.AllowedOrigin)
		if u.o.AllowedOrigin != "*" {
			w.Header().Add("Vary", "Origin")
		}
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE")
			if h := r.Header.Get("Access-Control-Request-Headers"); h != "" {
				w.Header().Set("Access-Control-Allow-Headers", h)
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, u.o.MaxFileSize+1<<20)
		mux.ServeHTTP(w, r)
	})
}

func newID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6], b[8] = b[6]&0x0f|0x40, b[8]&0x3f|0x80
	h := hex.EncodeToString(b)
	return h[:8] + "-" + h[8:12] + "-" + h[12:16] + "-" + h[16:20] + "-" + h[20:]
}

// store keeps a file, evicting expired ones, then the oldest, to stay under maxBytes.
func (u *Uploader) store(id string, data []byte, ttl time.Duration) {
	u.mu.Lock()
	defer u.mu.Unlock()
	now := time.Now()
	for k, f := range u.files {
		if !f.expires.IsZero() && now.After(f.expires) {
			u.size -= int64(len(f.data))
			delete(u.files, k)
		}
	}
	for u.size+int64(len(data)) > maxBytes && len(u.files) > 0 {
		oldest := ""
		for k, f := range u.files {
			if oldest == "" || f.added.Before(u.files[oldest].added) {
				oldest = k
			}
		}
		u.size -= int64(len(u.files[oldest].data))
		delete(u.files, oldest)
	}
	f := file{data: data, added: now}
	if ttl > 0 {
		f.expires = now.Add(ttl)
	}
	u.files[id] = f
	u.size += int64(len(data))
}

func (u *Uploader) get(id string) ([]byte, bool) {
	u.mu.Lock()
	defer u.mu.Unlock()
	f, ok := u.files[id]
	if !ok || (!f.expires.IsZero() && time.Now().After(f.expires)) {
		return nil, false
	}
	return f.data, true
}

func (u *Uploader) uploadAudio(w http.ResponseWriter, r *http.Request) {
	f, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "No files were uploaded.", http.StatusBadRequest)
		return
	}
	defer f.Close()
	data, err := io.ReadAll(f)
	if err != nil {
		http.Error(w, "No files were uploaded.", http.StatusBadRequest)
		return
	}
	id := newID()
	if u.o.Redis != nil {
		if err := u.o.Redis.Set(r.Context(), id, string(data), audioTTL); err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
	} else {
		u.store(id, data, audioTTL)
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"id": id, "path": "/download-audio-message/" + id})
}

func (u *Uploader) uploadFiles(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(32 << 20); err != nil || r.MultipartForm == nil || len(r.MultipartForm.File) == 0 { //nolint:gosec // the body is capped by MaxBytesReader in Handler
		http.Error(w, "No files were uploaded.", http.StatusBadRequest)
		return
	}
	defer r.MultipartForm.RemoveAll()
	if u.o.AdminAPIURL == "" && !u.o.EnableUpload {
		httpx.WriteJSON(w, http.StatusUnauthorized, map[string]string{"message": "disabled"})
		return
	}
	roomToken := r.FormValue("userRoomToken")
	if u.o.AdminAPIURL != "" && roomToken == "" {
		httpx.WriteJSON(w, http.StatusUnauthorized, map[string]string{"message": "not-logged"})
		return
	}
	type uploaded struct {
		Name         string    `json:"name"`
		ID           string    `json:"id"`
		Location     string    `json:"location"`
		Size         int       `json:"size"`
		LastModified time.Time `json:"lastModified"`
		Type         string    `json:"type,omitempty"`
	}
	var out []uploaded
	for _, headers := range r.MultipartForm.File {
		for _, h := range headers {
			if u.o.AdminAPIURL != "" {
				if code, body := u.adminLimit(r.Context(), roomToken, h.Size); code != 0 {
					httpx.WriteJSON(w, code, body)
					return
				}
			} else if h.Size > u.o.MaxFileSize {
				httpx.WriteJSON(w, http.StatusRequestEntityTooLarge, map[string]string{"message": "file-too-big", "maxFileSize": strconv.FormatInt(u.o.MaxFileSize, 10)})
				return
			}
			f, err := h.Open()
			if err != nil {
				http.Error(w, "Error upload file", http.StatusInternalServerError)
				return
			}
			data, _ := io.ReadAll(f)
			_ = f.Close()
			id := newID()
			if ext := strings.TrimPrefix(path.Ext(h.Filename), "."); ext != "" {
				id += "." + strings.ToLower(ext)
			}
			if err := u.keep(r.Context(), id, data); err != nil {
				slog.Error("upload not stored", "error", err)
				http.Error(w, "Error upload file", http.StatusInternalServerError)
				return
			}
			out = append(out, uploaded{Name: h.Filename, ID: id, Location: strings.TrimRight(u.o.PublicURL, "/") + "/upload-file/" + id,
				Size: len(data), LastModified: time.Now(), Type: h.Header.Get("Content-Type")})
		}
	}
	httpx.WriteJSON(w, http.StatusOK, out)
}

// download serves a file as a user uploaded it: never as active content on this origin.
// keep stores an uploaded file where the files go.
func (u *Uploader) keep(ctx context.Context, id string, data []byte) error {
	switch {
	case u.o.S3 != nil:
		return u.o.S3.Put(ctx, id, data, safeType(id), "attachment")
	case u.o.Redis != nil:
		return u.o.Redis.Set(ctx, id, string(data), 0)
	}
	u.store(id, data, 0)
	return nil
}

func (u *Uploader) download(w http.ResponseWriter, r *http.Request, attachment bool) {
	id := r.PathValue("id")
	if attachment && u.o.S3 != nil { // a file: a signed link to the bucket (copyFromLink)
		link, err := u.o.S3.PresignAs("", id, u.o.S3URLTTL, true, safeType(id))
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Content-Security-Policy", "default-src 'none'; sandbox")
		http.Redirect(w, r, link, http.StatusFound) //nolint:gosec // a link this server signed, to its own bucket
		return
	}
	var data []byte
	ok := false
	if u.o.Redis != nil {
		s, found, err := u.o.Redis.Get(r.Context(), id)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		data, ok = []byte(s), found
	} else {
		data, ok = u.get(id)
	}
	if !ok {
		http.Error(w, "Cannot find file", http.StatusNotFound)
		return
	}
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Content-Security-Policy", "default-src 'none'; sandbox")
	w.Header().Set("Content-Type", safeType(id))
	if attachment {
		w.Header().Set("Content-Disposition", "attachment")
	}
	_, _ = w.Write(data) //nolint:gosec // sandboxed: CSP default-src none, nosniff, a safe Content-Type
}

// safeType is the type of an image, an audio or a video file; anything else is a binary blob.
func safeType(name string) string {
	t := mime.TypeByExtension(path.Ext(name))
	if base, _, _ := strings.Cut(t, ";"); strings.HasPrefix(base, "image/") && base != "image/svg+xml" ||
		strings.HasPrefix(base, "audio/") || strings.HasPrefix(base, "video/") {
		return base
	}
	return "application/octet-stream"
}

// adminLimit asks the admin whether the player may send a file of size bytes (A29, /api/limit/fileSize): 0 when
// it may, else the status and body to answer (413 and 423 kept, anything else 401, with the admin's message).
func (u *Uploader) adminLimit(ctx context.Context, roomToken string, size int64) (int, map[string]any) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(u.o.AdminAPIURL, "/")+"/api/limit/fileSize?fileSize="+strconv.FormatInt(size, 10), nil)
	if err != nil {
		return http.StatusInternalServerError, map[string]any{"message": err.Error()}
	}
	req.Header.Set("userRoomToken", roomToken)
	resp, err := limitClient.Do(req)
	if err != nil {
		return http.StatusInternalServerError, map[string]any{"message": "Error upload file"}
	}
	defer resp.Body.Close()
	if resp.StatusCode/100 == 2 {
		return 0, nil
	}
	var answer struct {
		Message     any `json:"message"`
		MaxFileSize any `json:"maxFileSize"`
	}
	_ = json.NewDecoder(io.LimitReader(resp.Body, 1<<16)).Decode(&answer)
	code := http.StatusUnauthorized
	if resp.StatusCode == http.StatusRequestEntityTooLarge || resp.StatusCode == http.StatusLocked {
		code = resp.StatusCode
	}
	return code, map[string]any{"message": answer.Message, "maxFileSize": answer.MaxFileSize}
}

var limitClient = &http.Client{Timeout: 10 * time.Second}
