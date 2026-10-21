// Package mapstorage keeps the maps (WAM files, Tiled maps and their assets) in a directory and serves them over
// HTTP, like map-storage. It is an adapter: the map editor works on the documents it reads and writes.
package mapstorage

import (
	"bytes"
	"crypto/subtle"
	"errors"
	"fmt"
	"hash/maphash"
	"io"
	"mime"
	"net"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/workadventure/workadventure/server-go/internal/httpx"
)

var ErrBadPath = errors.New("invalid path")

// Options are map-storage's settings.
type Options struct {
	Auth              Auth
	CacheControl      string   // CACHE_CONTROL
	MaxUncompressed   int64    // MAX_UNCOMPRESSED_SIZE
	JSONLimit         int64    // BODY_PARSER_JSON_SIZE_LIMIT: the largest JSON body (a JSON Patch), 100 MiB by default
	DirectUploadURL   string   // DIRECT_UPLOAD_URL
	EntityCollections []string // ENTITY_COLLECTION_URLS, written into generated WAM files
	WAMTemplateURL    string   // WAM_TEMPLATE_URL: the WAM file a Tiled map uploaded alone starts from
	PathPrefix        string   // PATH_PREFIX: where the proxy serves map-storage (/map-storage on a single domain)
	// UseDomainNameInPath (USE_DOMAIN_NAME_IN_PATH, the SaaS): each domain has its own folder, so that two worlds
	// with the same paths never share a map.
	UseDomainNameInPath bool
	SecretKey           string  // signs the tokens of /private/files
	WebHook             WebHook // A27
}

type Store struct {
	dir string
	// tree is held for writing by the operations on whole directories (upload, move, copy, delete), and for reading
	// by those on one file, which also hold that file's lock: edits of different maps never wait for each other.
	tree       sync.RWMutex
	files      [64]sync.Mutex // the lock of a file is files[hash of its key]
	seed       maphash.Seed
	pathPrefix string  // Options.PathPrefix, set by Handler
	useDomain  bool    // Options.UseDomainNameInPath, set by Handler
	webHook    WebHook // Options.WebHook, set by Handler
	// recentMu guards recent.
	recentMu sync.Mutex
	// Changed is told when a WAM file is replaced (or deleted) from the outside, so that the players of that map
	// are told to reload (or leave). Nil: nobody to tell.
	Changed func(key string, deleted bool)
	recent  map[string][]recorded // recent edits per map (see Record)
}

type recorded struct {
	id   string
	at   time.Time
	edit any
}

func New(dir string) *Store {
	return &Store{dir: dir, seed: maphash.MakeSeed(), recent: map[string][]recorded{}}
}

// lockFile locks one file for writing it; the returned function unlocks it.
func (s *Store) lockFile(key string) (unlock func()) {
	s.tree.RLock()
	m := &s.files[maphash.String(s.seed, key)%uint64(len(s.files))]
	m.Lock()
	return func() { m.Unlock(); s.tree.RUnlock() }
}

// file maps a storage key ("maps/empty.wam") to its file, refusing anything that would leave the directory.
func (s *Store) file(key string) (string, error) {
	clean := path.Clean("/" + key)
	if strings.Contains(key, "..") || clean == "/" {
		return "", ErrBadPath
	}
	return filepath.Join(s.dir, filepath.FromSlash(clean)), nil
}

// folder is like file, but the root itself is allowed.
func (s *Store) folder(key string) (string, error) {
	if strings.Contains(key, "..") {
		return "", ErrBadPath
	}
	return filepath.Join(s.dir, filepath.FromSlash(path.Clean("/"+key))), nil
}

// editAttempts bounds how many times an edit is computed again because its document changed meanwhile.
const editAttempts = 5

// ErrBusy is returned by an edit whose document kept changing while it was computed.
var ErrBusy = errors.New("the map kept changing while it was being edited")

// Edit replaces the document at key with what change returns; change gets nil when there is no such document yet.
// change runs on a copy and without any lock, so that a slow edit holds nobody up. Its result is written only if the
// document is still the version change saw. If it was replaced meanwhile, change runs again on the new version: a
// write is never lost to an edit computed on an older one.
func (s *Store) Edit(key string, change func([]byte) ([]byte, error)) error {
	f, err := s.file(key)
	if err != nil {
		return err
	}
	for range editAttempts {
		before, err := readIfExists(f)
		if err != nil {
			return err
		}
		after, err := change(before)
		if err != nil {
			return err
		}
		unlock := s.lockFile(key)
		now, err := readIfExists(f)
		if err == nil && (now == nil) == (before == nil) && bytes.Equal(now, before) {
			err = writeFile(f, after)
			unlock()
			if err == nil {
				s.notify(key, "update")
			}
			return err
		}
		unlock()
		if err != nil {
			return err
		}
	}
	return ErrBusy
}

// readIfExists reads a file; a missing one is nil.
func readIfExists(f string) ([]byte, error) {
	data, err := os.ReadFile(f) //nolint:gosec // a key of the store: no "..", under its root
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	return data, err
}

// Put stores a file.
func (s *Store) Put(key string, data []byte) error {
	f, err := s.file(key)
	if err != nil {
		return err
	}
	defer s.lockFile(key)()
	return writeFile(f, data)
}

// Remove deletes a stored file; a missing one is not an error.
func (s *Store) Remove(key string) error {
	f, err := s.file(key)
	if err != nil {
		return err
	}
	defer s.lockFile(key)()
	if err := os.Remove(f); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

// Read returns a stored file.
func (s *Store) Read(key string) ([]byte, error) {
	f, err := s.file(key)
	if err != nil {
		return nil, err
	}
	return os.ReadFile(f) //nolint:gosec // a key of the store: no "..", under its root
}

// editsKept is how long an applied edit is kept for the clients that loaded the map just before it
// (COMMAND_TIME_IN_QUEUE_MS of map-storage).
const editsKept = 30 * time.Second

// Record keeps an applied edit of a map, for Since.
func (s *Store) Record(key, id string, edit any) {
	s.recentMu.Lock()
	defer s.recentMu.Unlock()
	s.recent[key] = append(s.prune(key), recorded{id: id, at: time.Now(), edit: edit})
}

// Since returns the edits a client missed, given the last edit its copy of the map has (lastCommandId): those
// after it, or all of them when the client does not know any (getCommandsNewerThan).
func (s *Store) Since(key, lastID string) []any {
	s.recentMu.Lock()
	defer s.recentMu.Unlock()
	kept := s.prune(key)
	from := 0
	for i, r := range kept {
		if r.id == lastID {
			from = i + 1
		}
	}
	out := make([]any, 0, len(kept)-from)
	for _, r := range kept[from:] {
		out = append(out, r.edit)
	}
	return out
}

func (s *Store) prune(key string) []recorded {
	kept := s.recent[key]
	for len(kept) > 0 && time.Since(kept[0].at) > editsKept {
		kept = kept[1:]
	}
	if len(kept) == 0 {
		delete(s.recent, key)
		return nil
	}
	s.recent[key] = kept
	return kept
}

// forget drops the recorded edits of the maps under a directory: a client of the new file must not replay them.
func (s *Store) forget(dir string) {
	s.recentMu.Lock()
	defer s.recentMu.Unlock()
	for key := range s.recent {
		if dir == "" || key == dir || strings.HasPrefix(key, dir+"/") {
			delete(s.recent, key)
		}
	}
}

func (s *Store) changed(key string, deleted bool) {
	if s.Changed != nil {
		s.Changed(key, deleted)
	}
}

// writeFile writes through a temporary file, so that a reader never sees half a document.
func writeFile(f string, data []byte) error {
	if err := os.MkdirAll(filepath.Dir(f), 0o755); err != nil { //nolint:gosec // the maps' folders are read by the TS map-storage too during a switch (shared volume)
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(f), ".tmp-*")
	if err != nil {
		return err
	}
	defer func() { _ = os.Remove(tmp.Name()) }() // gone after the rename; left by a failure otherwise
	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close() // the write's error is the one that matters
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmp.Name(), f)
}

// Auth is who may change the maps: map-storage's basic and bearer strategies.
type Auth struct {
	Basic          bool
	User, Password string
	Bearer         bool
	Token          string
	Validator      *Validator // AUTHENTICATION_VALIDATOR_URL: another bearer is asked to the admin (A26)
}

func (a Auth) allows(r *http.Request) bool {
	if token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer "); ok && a.Bearer && token != "" && token != a.Token &&
		a.Validator.allows(token, requestDomain(r)) {
		return true
	}
	same := func(x, y string) bool { return y != "" && subtle.ConstantTimeCompare([]byte(x), []byte(y)) == 1 }
	if user, password, ok := r.BasicAuth(); ok && a.Basic {
		return same(user, a.User) && same(password, a.Password)
	}
	token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	return ok && a.Bearer && same(token, a.Token)
}

func (a Auth) wrap(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !a.allows(r) {
			w.Header().Set("WWW-Authenticate", `Basic realm="Users"`)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		h(w, r)
	}
}

// Handler serves the map-storage host.
func (s *Store) Handler(o Options) http.Handler {
	s.pathPrefix, s.useDomain, s.webHook = o.PathPrefix, o.UseDomainNameInPath, o.WebHook
	if o.MaxUncompressed == 0 {
		o.MaxUncompressed = 1 << 30
	}
	auth := o.Auth.wrap
	mux := http.NewServeMux()
	mux.HandleFunc("GET /ping", func(w http.ResponseWriter, _ *http.Request) { _, _ = io.WriteString(w, "pong") })
	mux.HandleFunc("GET /health/live", func(w http.ResponseWriter, _ *http.Request) { _, _ = io.WriteString(w, "ok") })
	mux.HandleFunc("GET /upload-endpoint", func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]string{"url": uploadURL(o, r)})
	})
	mux.HandleFunc("GET /maps", s.list)
	mux.HandleFunc("POST /upload", auth(func(w http.ResponseWriter, r *http.Request) { s.upload(w, r, o) }))
	mux.HandleFunc("GET /download", auth(s.download))
	mux.HandleFunc("POST /move", auth(func(w http.ResponseWriter, r *http.Request) { s.moveOrCopy(w, r, true) }))
	mux.HandleFunc("POST /copy", auth(func(w http.ResponseWriter, r *http.Request) { s.moveOrCopy(w, r, false) }))
	mux.HandleFunc("PUT /", auth(func(w http.ResponseWriter, r *http.Request) { s.put(w, r, o) }))
	mux.HandleFunc("PATCH /", auth(func(w http.ResponseWriter, r *http.Request) { s.patch(w, r, o) }))
	mux.HandleFunc("DELETE /", auth(s.remove))
	mux.HandleFunc("GET /private/files/", func(w http.ResponseWriter, r *http.Request) { s.privateFile(w, r, o.SecretKey) })
	// Any other method reaches the plain file route of map-storage, without a token.
	mux.HandleFunc("POST /private/files/", func(w http.ResponseWriter, r *http.Request) { s.serve(w, r, o.CacheControl) })
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) { s.serve(w, r, o.CacheControl) })
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

func uploadURL(o Options, r *http.Request) string {
	if o.DirectUploadURL != "" {
		return o.DirectUploadURL
	}
	scheme := r.Header.Get("X-Forwarded-Proto")
	if scheme == "" {
		scheme = "http"
		if r.TLS != nil {
			scheme = "https"
		}
	}
	host := r.Header.Get("X-Forwarded-Host")
	if host == "" {
		host = r.Host
	}
	return scheme + "://" + host + r.Header.Get("X-Forwarded-Prefix") + "/upload"
}

// keyOf decodes a request path into a storage key one segment at a time, like decodeStoragePath: an encoded "/"
// cannot smuggle a separator. plusIsSpace is the static file route, which decodes "+" as a space.
// requestDomain is the world a request is about (getRequestDomain): X-Map-Storage-Host (the uploader sends a zip
// to a direct URL for another world), X-Forwarded-Host, then Host; without the port. They are trusted because
// map-storage's port is only reached through the proxy.
func requestDomain(r *http.Request) string {
	d := r.Header.Get("X-Map-Storage-Host")
	if d == "" {
		d, _, _ = strings.Cut(r.Header.Get("X-Forwarded-Host"), ",")
	}
	if d = strings.TrimSpace(d); d == "" {
		d = r.Host
	}
	if h, _, err := net.SplitHostPort(d); err == nil {
		d = h
	}
	return strings.ToLower(d)
}

// scoped puts a key in the folder of the request's domain, with USE_DOMAIN_NAME_IN_PATH.
func (s *Store) scoped(r *http.Request, key string) (string, error) {
	if !s.useDomain {
		return key, nil
	}
	d := requestDomain(r)
	if d == "" || strings.Contains(d, "..") || strings.ContainsAny(d, `/\`) {
		return "", ErrBadPath
	}
	if key == "" {
		return d, nil
	}
	return d + "/" + key, nil
}

// keyIn is keyOf, in the folder of the request's domain.
func (s *Store) keyIn(r *http.Request, plusIsSpace bool) (string, error) {
	key, err := keyOf(r, plusIsSpace)
	if err != nil {
		return "", err
	}
	return s.scoped(r, key)
}

func keyOf(r *http.Request, plusIsSpace bool) (string, error) {
	segs := strings.Split(strings.TrimPrefix(r.URL.EscapedPath(), "/"), "/")
	for i, seg := range segs {
		if plusIsSpace {
			seg = strings.ReplaceAll(seg, "+", " ")
		}
		if d, err := url.PathUnescape(seg); err == nil {
			seg = d
		}
		if seg == ".." || strings.ContainsAny(seg, `/\`) {
			return "", ErrBadPath
		}
		segs[i] = seg
	}
	return strings.Join(segs, "/"), nil
}

// immutable: a hashed or uuid file name, which never changes content (FileFetcher).
var (
	hashedName = regexp.MustCompile(`(?i)[.-]([a-f0-9]{8})\.([a-z]{2,4})$`)
	uuidName   = regexp.MustCompile(`(?i)([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}).*\.([a-z]{2,4})`)
	cacheable  = map[string]bool{".png": true, ".css": true, ".js": true, ".jpg": true, ".jpeg": true, ".ico": true, ".svg": true, ".html": true, ".htm": true}
)

func (s *Store) serve(w http.ResponseWriter, r *http.Request, cacheControl string) {
	wam := strings.HasSuffix(r.URL.Path, ".wam")
	key, err := s.keyIn(r, !wam)
	if err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	f, err := s.file(key)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	file, err := os.Open(f) //nolint:gosec // a key of the store: no "..", under its root
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer func() { _ = file.Close() }() // read only
	info, err := file.Stat()
	if err != nil || !info.Mode().IsRegular() {
		http.NotFound(w, r)
		return
	}
	ext := strings.ToLower(path.Ext(key))
	name := path.Base(key)
	switch {
	case wam:
		w.Header().Set("Cache-Control", "max-age=5")
	case cacheable[ext] && (hashedName.MatchString(name) || uuidName.MatchString(name)):
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	default:
		w.Header().Set("Cache-Control", cacheControl)
	}
	switch ext {
	case ".wam", ".json", ".tmj", ".tsj":
		w.Header().Set("Content-Type", "application/json")
	default:
		if t := mime.TypeByExtension(ext); t != "" {
			w.Header().Set("Content-Type", t)
		}
	}
	// The ETag of Express' send: size and modification time.
	w.Header().Set("ETag", fmt.Sprintf(`W/"%x-%x"`, info.Size(), info.ModTime().UnixMilli()))
	http.ServeContent(w, r, info.Name(), info.ModTime(), file)
}
