package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestRoundTrip(t *testing.T) {
	m := New("secret")
	raw, err := m.Create(Token{Identifier: "uuid-1", Tags: []string{"admin"}})
	if err != nil {
		t.Fatal(err)
	}
	tok, err := m.Verify(raw)
	if err != nil || tok.Identifier != "uuid-1" || len(tok.Tags) != 1 {
		t.Fatalf("got %+v %v", tok, err)
	}
	if _, err := New("other").Verify(raw); err == nil {
		t.Fatal("wrong secret accepted")
	}
}

func TestExpiredAndStringTags(t *testing.T) {
	expired, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"identifier": "x", "exp": time.Now().Add(-time.Hour).Unix()}).SignedString([]byte("s"))
	if _, err := New("s").Verify(expired); err == nil {
		t.Fatal("expired token accepted")
	}
	raw, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"identifier": "x", "tags": `["a","b"]`}).SignedString([]byte("s"))
	if tok, err := New("s").Verify(raw); err != nil || len(tok.Tags) != 2 {
		t.Fatalf("tags as a JSON string: %+v %v", tok, err)
	}
	raw, _ = jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"identifier": "x", "tags": "solo"}).SignedString([]byte("s"))
	if tok, err := New("s").Verify(raw); err != nil || len(tok.Tags) != 1 || tok.Tags[0] != "solo" {
		t.Fatalf("tags as a plain string: %+v %v", tok, err)
	}
	none, _ := jwt.NewWithClaims(jwt.SigningMethodNone, jwt.MapClaims{"identifier": "x"}).SignedString(jwt.UnsafeAllowNoneSignatureType)
	if _, err := New("s").Verify(none); err == nil {
		t.Fatal("alg=none accepted")
	}
}
