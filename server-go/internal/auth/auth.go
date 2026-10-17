// Package auth signs and checks the authentication token the front keeps in its local storage
// (JWTTokenManager of the pusher): HS256 with SECRET_KEY, valid 30 days.
package auth

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Token is the payload of an authentication token (AuthTokenData).
type Token struct {
	Identifier   string   `json:"identifier"` // the email when logged in, a uuid when anonymous
	AccessToken  string   `json:"accessToken,omitempty"`
	Username     string   `json:"username,omitempty"`
	Locale       string   `json:"locale,omitempty"`
	Tags         []string `json:"tags,omitempty"`
	MatrixUserID string   `json:"matrixUserId,omitempty"`
}

var ErrInvalid = errors.New("token is invalid")

type Manager struct{ secret []byte }

func New(secret string) *Manager { return &Manager{secret: []byte(secret)} }

type claims struct {
	Token
	jwt.RegisteredClaims
}

func (m *Manager) Create(t Token) (string, error) {
	c := claims{Token: t, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour))}}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, c).SignedString(m.secret)
}

// Verify checks the signature and the expiry. Any failure is ErrInvalid, like the pusher which turns every
// verification error into JWTInvalid.
func (m *Manager) Verify(raw string) (Token, error) { return m.verify(raw) }

// VerifyIgnoringExpiry checks the signature only (decodeJwtToken with ignoreExpiration: /map asks the admin about
// the user of a token that may have expired).
func (m *Manager) VerifyIgnoringExpiry(raw string) (Token, error) {
	return m.verify(raw, jwt.WithoutClaimsValidation())
}

func (m *Manager) verify(raw string, opts ...jwt.ParserOption) (Token, error) {
	var c struct {
		Identifier   string          `json:"identifier"`
		AccessToken  string          `json:"accessToken"`
		Username     string          `json:"username"`
		Locale       string          `json:"locale"`
		Tags         json.RawMessage `json:"tags"`
		MatrixUserID string          `json:"matrixUserId"`
		jwt.RegisteredClaims
	}
	_, err := jwt.ParseWithClaims(raw, &c, func(*jwt.Token) (any, error) { return m.secret, nil },
		append(opts, jwt.WithValidMethods([]string{"HS256"}))...)
	if err != nil || c.Identifier == "" {
		return Token{}, ErrInvalid
	}
	tags, err := parseTags(c.Tags)
	if err != nil {
		return Token{}, ErrInvalid
	}
	return Token{Identifier: c.Identifier, AccessToken: c.AccessToken, Username: c.Username, Locale: c.Locale, Tags: tags, MatrixUserID: c.MatrixUserID}, nil
}

// parseTags accepts an array of strings, or a string holding a JSON array, or a plain string (the zod
// preprocess of AuthTokenData.tags).
func parseTags(raw json.RawMessage) ([]string, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return nil, nil
	}
	var tags []string
	if json.Unmarshal(raw, &tags) == nil {
		return tags, nil
	}
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return nil, err
	}
	if json.Unmarshal([]byte(s), &tags) == nil {
		return tags, nil
	}
	return []string{s}, nil
}
