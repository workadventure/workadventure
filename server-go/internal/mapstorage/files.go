package mapstorage

import (
	"archive/zip"
	"bytes"
	"cmp"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log/slog"
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"github.com/workadventure/workadventure/server-go/internal/wam"
)

func jsonEncode(w io.Writer, v any) error {
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	return enc.Encode(v)
}

// hidden says whether a path has a segment starting with "." (macOS metadata, .git...): map-storage drops them.
func hidden(name string) bool {
	return slices.ContainsFunc(strings.FieldsFunc(name, func(r rune) bool { return r == '/' || r == '\\' }), func(seg string) bool {
		return strings.HasPrefix(seg, ".")
	})
}

// walk lists the regular files under dir, as slash-separated paths relative to it.
func walk(dir string) []string {
	var files []string
	_ = filepath.WalkDir(dir, func(p string, d fs.DirEntry, err error) error {
		if err == nil && d.Type().IsRegular() {
			rel, _ := filepath.Rel(dir, p)
			files = append(files, filepath.ToSlash(rel))
		}
		return nil
	})
	return files
}

// upload replaces a directory with the content of a zip (POST /upload of map-storage).
func (s *Store) upload(w http.ResponseWriter, r *http.Request, o Options) {
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
	directory, err := s.scoped(r, strings.Trim(r.FormValue("directory"), "/"))
	if err != nil || strings.Contains(directory, "..") {
		http.Error(w, "Invalid directory", http.StatusBadRequest)
		return
	}
	archive, err := zip.NewReader(file, header.Size)
	if err != nil {
		http.Error(w, "Invalid zip file", http.StatusBadRequest)
		return
	}
	contents := map[string][]byte{}
	var names []string
	var total uint64
	for _, e := range archive.File {
		if e.FileInfo().IsDir() || hidden(e.Name) {
			continue
		}
		if strings.Contains(e.Name, "..") {
			http.Error(w, "Invalid path in the zip file: "+e.Name, http.StatusBadRequest)
			return
		}
		if total += e.UncompressedSize64; total > uint64(o.MaxUncompressed) { //nolint:gosec // MaxUncompressed is a positive size
			http.Error(w, fmt.Sprintf("File too large. Unzipped files should be less than %d bytes.", o.MaxUncompressed), http.StatusRequestEntityTooLarge)
			return
		}
		data, err := unzip(e)
		if err != nil {
			http.Error(w, "Invalid zip file: "+err.Error(), http.StatusBadRequest)
			return
		}
		contents[e.Name] = data
		names = append(names, e.Name)
	}
	errs := map[string]report{}
	for _, name := range names {
		exists := func(p string) bool { _, ok := contents[path.Join(path.Dir(name), p)]; return ok }
		if rep := validateFile(name, contents[name], exists); rep != nil {
			errs[name] = rep
		}
	}
	if len(errs) > 0 {
		writeJSON(w, http.StatusBadRequest, errs)
		return
	}

	var template []byte
	if o.WAMTemplateURL != "" && slices.ContainsFunc(names, func(n string) bool { return path.Ext(n) == ".tmj" }) {
		if template, err = fetch(r.Context(), o.WAMTemplateURL); err != nil {
			slog.Error("map upload: WAM_TEMPLATE_URL", "error", err)
			http.Error(w, "Cannot read the WAM template", http.StatusInternalServerError)
			return
		}
	}
	s.tree.Lock()
	defer s.tree.Unlock()
	root, err := s.folder(directory)
	if err != nil {
		http.Error(w, "Invalid directory", http.StatusBadRequest)
		return
	}
	maps := slices.DeleteFunc(slices.Clone(names), func(n string) bool { return !strings.Contains(n, ".wam") && !strings.Contains(n, ".tmj") })
	// deleteFilesExceptWAM: a .wam stays when the zip brings its .tmj without it (the map is replaced, its edits
	// are kept).
	for _, f := range walk(root) {
		if strings.Contains(f, ".wam") && slices.Contains(maps, strings.Replace(f, ".wam", ".tmj", 1)) && !slices.Contains(maps, f) {
			continue
		}
		_ = os.Remove(filepath.Join(root, filepath.FromSlash(f)))
	}
	for _, name := range names {
		if err := writeFile(filepath.Join(root, filepath.FromSlash(path.Clean("/"+name))), contents[name]); err != nil {
			slog.Error("map upload", "file", name, "error", err)
			http.Error(w, "Cannot store "+name, http.StatusInternalServerError)
			return
		}
	}
	for _, name := range names {
		if path.Ext(name) != ".tmj" || slices.ContainsFunc(names, func(n string) bool { return path.Ext(n) == ".wam" && baseName(n) == baseName(name) }) {
			continue
		}
		wamFile := filepath.Join(root, filepath.FromSlash(path.Clean("/"+strings.Replace(name, ".tmj", ".wam", 1))))
		if _, err := os.Stat(wamFile); err == nil {
			continue
		}
		generated, err := wam.Generated(name, contents[name], o.EntityCollections, template)
		if err == nil {
			err = writeFile(wamFile, generated)
		}
		if err != nil {
			slog.Error("map upload", "file", wamFile, "error", err)
		}
	}
	s.forget(directory)
	for _, name := range names {
		if path.Ext(name) == ".wam" {
			s.changed(path.Join(directory, name), false)
		}
	}
	s.notifyDomain(r)
	_, _ = io.WriteString(w, "File successfully uploaded.")
}

// baseName is path.parse(p).name: the file name without its extension (directories are ignored, like map-storage).
func baseName(p string) string { return strings.TrimSuffix(path.Base(p), path.Ext(p)) }

func unzip(e *zip.File) ([]byte, error) {
	in, err := e.Open()
	if err != nil {
		return nil, err
	}
	defer in.Close()
	data, err := io.ReadAll(io.LimitReader(in, int64(e.UncompressedSize64)+1)) //nolint:gosec // the total, checked first, is at most MaxUncompressed
	if err != nil {
		return nil, err
	}
	if uint64(len(data)) > e.UncompressedSize64 {
		return nil, fmt.Errorf("%s is bigger than announced", e.Name)
	}
	return data, nil
}

// put stores one file (PUT /<path>).
func (s *Store) put(w http.ResponseWriter, r *http.Request, o Options) {
	key, err := s.keyIn(r, false)
	if err != nil || key == "" || strings.HasSuffix(key, "/") {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	var data []byte
	if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/") {
		file, _, ferr := r.FormFile("file")
		if ferr != nil {
			writeJSON(w, http.StatusBadRequest, report{"request": {{Type: "error", Message: "No file was uploaded"}}})
			return
		}
		defer file.Close()
		data, err = io.ReadAll(io.LimitReader(file, o.MaxUncompressed+1))
	} else {
		data, err = io.ReadAll(io.LimitReader(r.Body, o.MaxUncompressed+1))
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if int64(len(data)) > o.MaxUncompressed {
		http.Error(w, fmt.Sprintf("File too large. Files should be less than %d bytes.", o.MaxUncompressed), http.StatusRequestEntityTooLarge)
		return
	}
	// ponytail: a .tmj is checked without its images (map-storage cannot load them from a relative URL either).
	if rep := validateFile(key, data, nil); rep != nil {
		writeJSON(w, http.StatusBadRequest, rep)
		return
	}
	f, err := s.file(key)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	unlock := s.lockFile(key)
	err = writeFile(f, data)
	unlock()
	if path.Ext(key) == ".wam" {
		s.forget(key)
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if path.Ext(key) == ".wam" {
		s.changed(key, false)
		s.notify(key, "update")
	}
	_, _ = io.WriteString(w, "File successfully uploaded.")
}

// patch applies a JSON Patch to a WAM file (PATCH /<path>.wam).
func (s *Store) patch(w http.ResponseWriter, r *http.Request, o Options) {
	key, err := s.keyIn(r, false)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	if path.Ext(key) != ".wam" {
		http.NotFound(w, r)
		return
	}
	// As body-parser's json() of map-storage: only these types are read (another leaves the body empty), past
	// BODY_PARSER_JSON_SIZE_LIMIT it is 413, and anything but a JSON object or array is 400.
	var ops any
	if mt, _, _ := mime.ParseMediaType(r.Header.Get("Content-Type")); mt == "application/json" || mt == "application/json-patch+json" {
		body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, cmp.Or(o.JSONLimit, 100<<20)))
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			http.Error(w, "request entity too large", http.StatusRequestEntityTooLarge)
			return
		}
		dec := json.NewDecoder(bytes.NewReader(body))
		dec.UseNumber()
		if t := bytes.TrimLeft(body, " \t\r\n"); err != nil || len(t) == 0 || (t[0] != '[' && t[0] != '{') || dec.Decode(&ops) != nil {
			http.Error(w, "Bad Request", http.StatusBadRequest)
			return
		}
	}
	list, isList := ops.([]any)
	if !isList {
		writeJSON(w, http.StatusBadRequest, map[string]string{"patch": "Invalid patch: expected a JSON-Patch document (an array of operations)"})
		return
	}
	var invalid report
	err = s.Edit(key, func(file []byte) ([]byte, error) {
		doc, err := wam.Parse(file)
		if err != nil {
			return nil, err
		}
		wam.Migrate(doc)
		for _, k := range []string{"vendor", "metadata"} {
			if _, ok := doc[k]; !ok {
				doc[k] = map[string]any{}
			}
		}
		patched, err := wam.Patch(doc, list)
		if err != nil {
			return nil, patchError{err}
		}
		out, isDoc := patched.(map[string]any)
		if !isDoc {
			return nil, patchError{errors.New("the patched document is not an object")}
		}
		if err := wam.Validate(out); err != nil {
			invalid = report{"map": {{Type: "error", Message: "Invalid WAM file format.", Details: err.Error()}}}
			return nil, err
		}
		return json.Marshal(out)
	})
	var pe patchError
	switch {
	case errors.Is(err, os.ErrNotExist):
		http.NotFound(w, r)
	case errors.As(err, &pe):
		writeJSON(w, http.StatusBadRequest, map[string]string{"patch": pe.Error()})
	case invalid != nil:
		writeJSON(w, http.StatusBadRequest, invalid)
	case err != nil:
		http.Error(w, err.Error(), http.StatusInternalServerError)
	default:
		s.forget(key)
		s.changed(key, false)
		s.notify(key, "update")
		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
	}
}

type patchError struct{ error }

// remove deletes a file or a directory (DELETE /<path>); the root is emptied.
func (s *Store) remove(w http.ResponseWriter, r *http.Request) {
	key, err := s.keyIn(r, false)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	key = strings.Trim(key, "/")
	target, err := s.folder(key)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	s.tree.Lock()
	if key == "" || key == "." {
		err = emptyDir(target)
	} else {
		err = os.RemoveAll(target)
	}
	s.tree.Unlock()
	s.forget(key)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if path.Ext(key) == ".wam" {
		s.changed(key, true)
	}
	s.notifyDomain(r)
	w.WriteHeader(http.StatusNoContent)
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

// list answers GET /maps: every valid WAM file, by path.
func (s *Store) list(w http.ResponseWriter, r *http.Request) {
	maps := s.Maps()
	if s.useDomain { // only this domain's, by their path in it
		prefix := requestDomain(r) + "/"
		mine := map[string]map[string]any{}
		for k, v := range maps {
			if rest, ok := strings.CutPrefix(k, prefix); ok {
				mine[rest] = v
			}
		}
		maps = mine
	}
	writeJSON(w, http.StatusOK, map[string]any{"version": "go-1", "maps": maps})
}

// Maps lists the valid WAM files by path, with their mapUrl, metadata and vendor.
func (s *Store) Maps() map[string]map[string]any {
	maps := map[string]map[string]any{}
	for _, f := range walk(s.dir) {
		if path.Ext(f) != ".wam" {
			continue
		}
		data, err := os.ReadFile(filepath.Join(s.dir, filepath.FromSlash(f)))
		if err != nil {
			continue
		}
		doc, err := wam.Parse(data)
		if err != nil {
			continue
		}
		wam.Migrate(doc)
		if wam.Validate(doc) != nil {
			continue
		}
		entry := map[string]any{"mapUrl": doc["mapUrl"]}
		for _, k := range []string{"metadata", "vendor"} {
			if v, ok := doc[k]; ok {
				entry[k] = v
			}
		}
		maps[f] = entry
	}
	return maps
}

// download zips a directory (GET /download?directory=).
func (s *Store) download(w http.ResponseWriter, r *http.Request) {
	directory, err := s.scoped(r, strings.Trim(r.URL.Query().Get("directory"), "/"))
	if err != nil || strings.Contains(directory, "..") {
		http.Error(w, "Invalid directory", http.StatusBadRequest)
		return
	}
	root, err := s.folder(directory)
	if err != nil {
		http.Error(w, "Invalid directory", http.StatusBadRequest)
		return
	}
	name := path.Base(path.Clean("/" + directory))
	if name == "/" || name == "." {
		name = "map"
	}
	var buf bytes.Buffer
	z := zip.NewWriter(&buf)
	s.tree.RLock()
	for _, f := range walk(root) {
		if f == "__cache.json" || hidden(f) {
			continue
		}
		data, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(f))) //nolint:gosec // a key of the store: no "..", under its root (keyIn)
		if err != nil {
			continue
		}
		if out, err := z.Create(f); err == nil {
			_, _ = out.Write(data)
		}
	}
	s.tree.RUnlock()
	if err := z.Close(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", `attachment; filename="`+name+`.zip"`)
	_, _ = w.Write(buf.Bytes())
}

// moveOrCopy moves or copies a directory (POST /move, POST /copy).
func (s *Store) moveOrCopy(w http.ResponseWriter, r *http.Request, move bool) {
	var req struct {
		Source      *string `json:"source"`
		Destination *string `json:"destination"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Source == nil || req.Destination == nil {
		http.Error(w, "Invalid request : source and destination are required", http.StatusBadRequest)
		return
	}
	if strings.Contains(*req.Source, "..") || strings.Contains(*req.Destination, "..") {
		http.Error(w, "Invalid directory", http.StatusBadRequest)
		return
	}
	source, err1 := s.scoped(r, strings.Trim(*req.Source, "/"))
	destination, err2 := s.scoped(r, strings.Trim(*req.Destination, "/"))
	from, err3 := s.folder(source)
	to, err4 := s.folder(destination)
	if err1 != nil || err2 != nil || err3 != nil || err4 != nil {
		http.Error(w, "Invalid directory", http.StatusBadRequest)
		return
	}
	s.tree.Lock()
	defer s.tree.Unlock()
	if _, err := os.Stat(to); err == nil {
		http.Error(w, "Destination already exist!", http.StatusConflict)
		return
	}
	if err := os.MkdirAll(filepath.Dir(to), 0o755); err != nil { //nolint:gosec // the maps' folders are read by the TS map-storage too during a switch (shared volume)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if move {
		if err := os.Rename(from, to); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		s.forget(strings.Trim(*req.Source, "/"))
		s.notifyDomain(r)
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, "OK")
		return
	}
	// fs.copy of map-storage: a file or a whole directory.
	var err error
	if info, statErr := os.Stat(from); statErr != nil {
		err = statErr
	} else if info.IsDir() {
		err = os.CopyFS(to, os.DirFS(from))
	} else if data, readErr := os.ReadFile(from); readErr != nil { //nolint:gosec // a key of the store: no "..", under its root (keyIn)
		err = readErr
	} else {
		err = writeFile(to, data)
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	s.notifyDomain(r)
	w.WriteHeader(http.StatusCreated)
	_, _ = io.WriteString(w, "Created")
}

// fetch reads a small document over HTTP (the WAM template), within 10 s.
func fetch(ctx context.Context, url string) ([]byte, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode/100 != 2 {
		return nil, fmt.Errorf("GET %s: %s", url, resp.Status)
	}
	return io.ReadAll(io.LimitReader(resp.Body, 10<<20))
}
