// Package mapstorage keeps the maps (WAM files, Tiled maps and their assets) in a directory and serves them over
// HTTP, like map-storage. It is an adapter: the map editor works on the documents it reads and writes.
package mapstorage

import (
	"archive/zip"
	"crypto/subtle"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"sync"
)

// maxUncompressedSize is MAX_UNCOMPRESSED_SIZE of map-storage: a zip may not expand to more.
const maxUncompressedSize = 1 << 30

var ErrBadPath = errors.New("invalid path")

type Store struct {
	dir string
	// ponytail: one lock for every upload and edit; one per map if edits ever get frequent.
	mu sync.Mutex
}

func New(dir string) *Store { return &Store{dir: dir} }

// file maps a storage key ("maps/empty.wam") to its file, refusing anything that would leave the directory.
func (s *Store) file(key string) (string, error) {
	clean := path.Clean("/" + key)
	if strings.Contains(key, "..") || clean == "/" {
		return "", ErrBadPath
	}
	return filepath.Join(s.dir, filepath.FromSlash(clean)), nil
}

// Edit replaces the document at key with what change returns, under the store's lock.
func (s *Store) Edit(key string, change func([]byte) ([]byte, error)) error {
	f, err := s.file(key)
	if err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	before, err := os.ReadFile(f)
	if err != nil {
		return err
	}
	after, err := change(before)
	if err != nil {
		return err
	}
	return writeFile(f, after)
}

// writeFile writes through a temporary file, so that a reader never sees half a document.
func writeFile(f string, data []byte) error {
	if err := os.MkdirAll(filepath.Dir(f), 0o755); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(f), ".tmp-*")
	if err != nil {
		return err
	}
	defer os.Remove(tmp.Name())
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmp.Name(), f)
}

// Auth is who may upload: map-storage's basic and bearer strategies.
type Auth struct {
	Basic          bool
	User, Password string
	Bearer         bool
	Token          string
}

func (a Auth) allows(r *http.Request) bool {
	same := func(x, y string) bool { return y != "" && subtle.ConstantTimeCompare([]byte(x), []byte(y)) == 1 }
	if user, password, ok := r.BasicAuth(); ok && a.Basic {
		return same(user, a.User) && same(password, a.Password)
	}
	token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	return ok && a.Bearer && same(token, a.Token)
}

// Handler serves the map-storage host: the files, /upload, /ping. cacheControl is CACHE_CONTROL.
func (s *Store) Handler(auth Auth, cacheControl string) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /ping", func(w http.ResponseWriter, _ *http.Request) { _, _ = io.WriteString(w, "pong") })
	mux.HandleFunc("GET /health/live", func(w http.ResponseWriter, _ *http.Request) { _, _ = io.WriteString(w, "ok") })
	mux.HandleFunc("POST /upload", func(w http.ResponseWriter, r *http.Request) {
		if !auth.allows(r) {
			w.Header().Set("WWW-Authenticate", `Basic realm="Users"`)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		s.upload(w, r)
	})
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) { s.serve(w, r, cacheControl) })
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// cors() of map-storage: every origin, any requested header.
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE")
			if h := r.Header.Get("Access-Control-Request-Headers"); h != "" {
				w.Header().Set("Access-Control-Allow-Headers", h)
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		mux.ServeHTTP(w, r)
	})
}

func (s *Store) serve(w http.ResponseWriter, r *http.Request, cacheControl string) {
	f, err := s.file(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	file, err := os.Open(f)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil || !info.Mode().IsRegular() {
		http.NotFound(w, r)
		return
	}
	switch ext := path.Ext(f); ext {
	case ".wam":
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "max-age=5")
	case ".json", ".tmj", ".tsj":
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", cacheControl)
	default:
		if t := mime.TypeByExtension(ext); t != "" {
			w.Header().Set("Content-Type", t)
		}
		w.Header().Set("Cache-Control", cacheControl)
	}
	http.ServeContent(w, r, info.Name(), info.ModTime(), file)
}

// upload replaces a directory with the content of a zip (POST /upload of map-storage). ponytail: no validation of
// the maps, and no .wam generated for a .tmj that comes without one.
func (s *Store) upload(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		http.Error(w, "No file was uploaded.", http.StatusBadRequest)
		return
	}
	defer r.MultipartForm.RemoveAll()
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "No file was uploaded.", http.StatusBadRequest)
		return
	}
	defer file.Close()
	directory := r.FormValue("directory")
	if strings.Contains(directory, "..") {
		http.Error(w, "Invalid directory", http.StatusBadRequest)
		return
	}
	archive, err := zip.NewReader(file, header.Size)
	if err != nil {
		http.Error(w, "Invalid zip file", http.StatusBadRequest)
		return
	}
	var entries []*zip.File
	var total uint64
	for _, e := range archive.File {
		if e.FileInfo().IsDir() || hidden(e.Name) {
			continue
		}
		if strings.Contains(e.Name, "..") {
			http.Error(w, "Invalid path in the zip file: "+e.Name, http.StatusBadRequest)
			return
		}
		total += e.UncompressedSize64
		entries = append(entries, e)
	}
	if total > maxUncompressedSize {
		http.Error(w, "The uncompressed size of the zip file is too big", http.StatusRequestEntityTooLarge)
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	root := filepath.Join(s.dir, filepath.FromSlash(path.Clean("/"+directory)))
	if err := emptyDir(root); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	for _, e := range entries {
		if err := extract(e, filepath.Join(root, filepath.FromSlash(path.Clean("/"+e.Name)))); err != nil {
			slog.Error("map upload", "file", e.Name, "error", err)
			http.Error(w, "Cannot store "+e.Name, http.StatusInternalServerError)
			return
		}
	}
	_, _ = io.WriteString(w, "File successfully uploaded.")
}

// emptyDir empties a directory but keeps it: the storage root is often a mount point.
func emptyDir(dir string) error {
	entries, err := os.ReadDir(dir)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	for _, e := range entries {
		if err := os.RemoveAll(filepath.Join(dir, e.Name())); err != nil {
			return err
		}
	}
	return nil
}

// hidden says whether a path has a segment starting with "." (macOS metadata, .git...): map-storage drops them.
func hidden(name string) bool {
	for _, seg := range strings.Split(name, "/") {
		if strings.HasPrefix(seg, ".") {
			return true
		}
	}
	return false
}

func extract(e *zip.File, dest string) error {
	in, err := e.Open()
	if err != nil {
		return err
	}
	defer in.Close()
	data, err := io.ReadAll(io.LimitReader(in, int64(e.UncompressedSize64)+1))
	if err != nil {
		return err
	}
	if uint64(len(data)) > e.UncompressedSize64 {
		return fmt.Errorf("%s is bigger than announced", e.Name)
	}
	return writeFile(dest, data)
}
