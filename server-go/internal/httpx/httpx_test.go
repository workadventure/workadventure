package httpx

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWriteJSONSendsTheStatusAndKeepsHTMLCharacters(t *testing.T) {
	w := httptest.NewRecorder()
	WriteJSON(w, http.StatusCreated, map[string]string{"a": "<b>&"})
	if w.Code != http.StatusCreated || w.Header().Get("Content-Type") != "application/json; charset=utf-8" || w.Body.String() != "{\"a\":\"<b>&\"}\n" {
		t.Fatalf("got %d %q %q", w.Code, w.Header().Get("Content-Type"), w.Body.String())
	}
}
