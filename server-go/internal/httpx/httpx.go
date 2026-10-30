// Package httpx holds the HTTP helpers several packages of the server share.
package httpx

import (
	"encoding/json"
	"net/http"
)

// WriteJSON answers v as JSON with the status. HTML characters are left as they are, as JSON.stringify writes them
// in the TS servers. An encoding error is lost: the status is already sent.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(v)
}
