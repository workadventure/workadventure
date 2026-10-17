package ws

import (
	"crypto/subtle"
	"encoding/json"
	"net/http"
)

// The debug routes of the back (DebugController.ts), with its token: ADMIN_API_TOKEN in the query.
func (srv *Server) debugToken(w http.ResponseWriter, r *http.Request) bool {
	if srv.cfg.AdminAPIToken == "" {
		http.Error(w, "No token configured!", http.StatusUnauthorized)
		return false
	}
	if subtle.ConstantTimeCompare([]byte(r.URL.Query().Get("token")), []byte(srv.cfg.AdminAPIToken)) != 1 {
		http.Error(w, "Invalid token sent!", http.StatusUnauthorized)
		return false
	}
	return true
}

// Dump is GET /dump, of the back and of the pusher: the rooms alive, as a list of {roomUrl, users}. The back dumped
// its whole socketManager; the specs only look for a room's roomUrl (a room nobody is in must be gone).
func (srv *Server) Dump(w http.ResponseWriter, r *http.Request) {
	if !srv.debugToken(w, r) {
		return
	}
	type room struct {
		RoomURL string `json:"roomUrl"`
		Users   int    `json:"users"`
	}
	out := []room{}
	for _, url := range srv.rooms.Keys() {
		rm := srv.rooms.Acquire(url)
		if st, err := rm.Stats(r.Context()); err == nil {
			out = append(out, room{url, st.Users})
		}
		srv.rooms.Release(url)
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}

// CloseSpaceConnection is POST /debug/close-space-connection of the back. There the pushers lost their stream to
// the space and rejoined it, which simulated a back restart. A single server has no such link to cut: the route
// answers as the back did (400 without spaceName, 500 for an unknown space) and leaves the space as it is.
func (srv *Server) CloseSpaceConnection(w http.ResponseWriter, r *http.Request) {
	if !srv.debugToken(w, r) {
		return
	}
	name := r.URL.Query().Get("spaceName")
	if name == "" {
		http.Error(w, "Space name is required!", http.StatusBadRequest)
		return
	}
	for _, k := range srv.spaces.Keys() {
		if k.Local == name {
			_, _ = w.Write([]byte("Space connection closed"))
			return
		}
	}
	http.Error(w, "Error closing space connection", http.StatusInternalServerError)
}
