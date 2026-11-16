package httpapi

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"

	"github.com/workadventure/workadventure/server-go/internal/admin"
)

// POST /save-name, /save-textures and /save-companion-texture (UserController): a logged player's choices go to the
// admin (A9 to A11); an anonymous one gets a 204 all the same.
func (api *API) save(what admin.SaveWhat) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("Authorization")
		if token == "" {
			text(w, http.StatusUnauthorized, "Missing authorization header")
			return
		}
		tok, err := api.auth.Verify(token)
		if err != nil {
			text(w, http.StatusUnauthorized, "Invalid token sent")
			return
		}
		var body map[string]json.RawMessage
		if json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body) != nil {
			text(w, http.StatusBadRequest, "Invalid request body")
			return
		}
		var roomURL string
		var value any
		ok := json.Unmarshal(body["roomUrl"], &roomURL) == nil && body["roomUrl"] != nil
		switch what {
		case admin.SaveName:
			var name string
			ok = ok && body["name"] != nil && json.Unmarshal(body["name"], &name) == nil
			value = name
		case admin.SaveTextures:
			var textures []string
			ok = ok && body["textures"] != nil && json.Unmarshal(body["textures"], &textures) == nil && textures != nil
			value = textures
		case admin.SaveCompanion:
			var texture *string // a string or null
			_, present := body["texture"]
			ok = ok && present && json.Unmarshal(body["texture"], &texture) == nil
			value = texture
		}
		if !ok {
			text(w, http.StatusBadRequest, "Invalid request body")
			return
		}
		if tok.Identifier == "" {
			text(w, http.StatusUnauthorized, "Undefined userIdentifier")
			return
		}
		if tok.AccessToken != "" {
			if err := api.admin.SaveUser(r.Context(), what, tok.Identifier, roomURL, value); err != nil {
				slog.Error("the admin did not save the player's choice", "error", err)
				text(w, http.StatusInternalServerError, "Internal Server Error")
				return
			}
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
