package httpapi

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"net/http/httptest"
	"net/url"
	"slices"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/workadventure/workadventure/server-go/internal/admin"
	"github.com/workadventure/workadventure/server-go/internal/auth"
	"github.com/workadventure/workadventure/server-go/internal/config"
)

// idTokenMode makes the fake provider answer a valid id_token ("") or a bad one.
var idTokenMode atomic.Value

// Of the fake provider: whether it now rejects the first access token, how many times it renewed one, and the last
// token revoked.
var (
	firstAccessExpired atomic.Bool
	renewals           atomic.Int32
	lastRevoked        atomic.Value
)

var providerKey, _ = rsa.GenerateKey(rand.Reader, 2048)

// fakeProvider accepts the code "the-code" once the PKCE verifier matches the challenge it was given, and signs an
// id_token for the nonce it was given.
func fakeProvider(t *testing.T, revoked *atomic.Int32) *httptest.Server {
	var challenge, nonce atomic.Value
	var srv *httptest.Server
	idTokenMode.Store("")
	firstAccessExpired.Store(false)
	renewals.Store(0)
	srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/.well-known/openid-configuration":
			_ = json.NewEncoder(w).Encode(map[string]any{"issuer": srv.URL, "authorization_endpoint": srv.URL + "/authorize",
				"token_endpoint": srv.URL + "/token", "userinfo_endpoint": srv.URL + "/userinfo", "revocation_endpoint": srv.URL + "/revoke",
				"jwks_uri": srv.URL + "/jwks", "id_token_signing_alg_values_supported": []string{"RS256"}})
		case "/jwks":
			b64 := base64.RawURLEncoding.EncodeToString
			_ = json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]string{{"kty": "RSA", "kid": "k1", "alg": "RS256", "use": "sig",
				"n": b64(providerKey.N.Bytes()), "e": b64(big.NewInt(int64(providerKey.E)).Bytes())}}})
		case "/authorize": // the test calls it to tell the challenge and the nonce
			challenge.Store(r.URL.Query().Get("code_challenge"))
			nonce.Store(r.URL.Query().Get("nonce"))
		case "/token":
			if r.PostFormValue("grant_type") == "refresh_token" {
				if r.PostFormValue("refresh_token") != "rt-1" {
					http.Error(w, `{"error":"invalid_grant"}`, http.StatusBadRequest)
					return
				}
				renewals.Add(1)
				_ = json.NewEncoder(w).Encode(map[string]string{"access_token": "at-2", "token_type": "Bearer", "refresh_token": "rt-2"})
				return
			}
			id, secret, _ := r.BasicAuth()
			sum := sha256.Sum256([]byte(r.PostFormValue("code_verifier")))
			if id != "client" || secret != "s3cret" || r.PostFormValue("code") != "the-code" ||
				base64.RawURLEncoding.EncodeToString(sum[:]) != challenge.Load() {
				http.Error(w, "invalid_grant", http.StatusBadRequest)
				return
			}
			mode := idTokenMode.Load().(string)
			claims := jwt.MapClaims{"iss": srv.URL, "aud": "client", "sub": "u1", "nonce": nonce.Load(), "iat": time.Now().Unix(),
				"exp": time.Now().Add(time.Minute).Unix()}
			switch mode {
			case "expired":
				claims["exp"] = time.Now().Add(-time.Hour).Unix()
			case "nonce":
				claims["nonce"] = "another"
			case "audience":
				claims["aud"] = "another-client"
			}
			tok := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
			tok.Header["kid"] = "k1"
			signed, _ := tok.SignedString(providerKey)
			if mode == "altered" { // the payload changed after signing
				parts := strings.Split(signed, ".")
				body, _ := base64.RawURLEncoding.DecodeString(parts[1])
				parts[1] = base64.RawURLEncoding.EncodeToString([]byte(strings.Replace(string(body), `"sub":"u1"`, `"sub":"u2"`, 1)))
				signed = strings.Join(parts, ".")
			}
			answer := map[string]string{"access_token": "at-1", "token_type": "Bearer", "id_token": signed, "refresh_token": "rt-1"}
			if mode == "none" {
				delete(answer, "id_token")
			}
			_ = json.NewEncoder(w).Encode(answer)
		case "/userinfo":
			switch r.Header.Get("Authorization") {
			case "Bearer at-1":
				if firstAccessExpired.Load() {
					http.Error(w, "invalid_token", http.StatusUnauthorized)
					return
				}
				_ = json.NewEncoder(w).Encode(map[string]any{"sub": "u1", "email": "john.doe@example.com", "name": "John", "tags": []string{"admin"}})
			case "Bearer at-2": // since the renewal, John is no longer an admin on the provider
				_ = json.NewEncoder(w).Encode(map[string]any{"sub": "u1", "email": "john.doe@example.com", "name": "John", "tags": []string{"member"}})
			case "Bearer at-down":
				http.Error(w, "down", http.StatusInternalServerError)
			default:
				http.Error(w, "invalid_token", http.StatusUnauthorized)
			}
		case "/revoke":
			revoked.Add(1)
			lastRevoked.Store(r.PostFormValue("token") + " " + r.PostFormValue("token_type_hint"))
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

func newOpenIDAPI(t *testing.T, issuer, matrix string) http.Handler {
	return newOpenIDAPIWith(t, issuer, matrix, "", nil)
}

// spyAdmin records what /me asks the admin.
type spyAdmin struct {
	admin.Admin
	asked atomic.Value // admin.MemberQuery
}

func (s *spyAdmin) MemberData(ctx context.Context, q admin.MemberQuery) (admin.MemberData, error) {
	s.asked.Store(q)
	return s.Admin.MemberData(ctx, q)
}

func newOpenIDAPIWith(t *testing.T, issuer, matrix, accessType string, spy *spyAdmin) http.Handler {
	cfg := &config.Config{PusherURL: "http://play.test/", MatrixPublicURI: matrix, OpidWokaNamePolicy: "user_input",
		StartRoomURL: "/_/global/start.json", FrontEnv: config.FrontEnv{},
		OpenID: config.OpenID{ClientID: "client", ClientSecret: "s3cret", Issuer: issuer, Scope: "openid email profile tags-scope",
			UsernameClaim: "username", LocaleClaim: "locale", TagsClaim: "tags", AccessType: accessType}}
	local, err := admin.NewLocal(cfg)
	if err != nil {
		t.Fatal(err)
	}
	var adm admin.Admin = local
	if spy != nil {
		spy.Admin, adm = local, spy
	}
	return New(cfg, auth.New("secret"), adm, NewFrontAssets("http://unused", "", "v1"), http.NotFoundHandler(), "1.0.0")
}

// login runs /login-screen then /openid-callback the way a browser would.
func login(t *testing.T, h http.Handler, provider string) *httptest.ResponseRecorder {
	return loginWith(t, h, provider, nil)
}

// loginWith may change the sealed cookie of the code verifier on its way back.
func loginWith(t *testing.T, h http.Handler, provider string, tamper func(string) string) *httptest.ResponseRecorder {
	const playURI = "http://play.test/_/global/maps.test/a.json"
	w := get(h, "GET", "/login-screen?playUri="+url.QueryEscape(playURI)+"&manuallyTriggered=true", nil, nil)
	loc, _ := url.Parse(w.Header().Get("Location"))
	if w.Code != http.StatusFound || !strings.HasPrefix(loc.String(), provider+"/authorize?") {
		t.Fatalf("login-screen: %d %s", w.Code, loc)
	}
	q := loc.Query()
	if q.Get("redirect_uri") != "http://play.test/openid-callback" || q.Get("playUri") != playURI || q.Get("code_challenge_method") != "S256" ||
		q.Get("nonce") == "" || q.Get("scope") != "openid email profile tags-scope" {
		t.Fatalf("authorization URL: %s", loc)
	}
	if resp, err := http.Get(loc.String()); err == nil {
		resp.Body.Close()
	}
	r := httptest.NewRequest("GET", "/openid-callback?code=the-code&state="+q.Get("state"), nil)
	for _, c := range w.Result().Cookies() {
		if c.Name == "code_verifier" && tamper != nil {
			c.Value = tamper(c.Value)
		}
		r.AddCookie(c)
	}
	cb := httptest.NewRecorder()
	h.ServeHTTP(cb, r)
	return cb
}

func TestOpenIDLoginMeAndLogout(t *testing.T) {
	var revoked atomic.Int32
	provider := fakeProvider(t, &revoked)
	h := newOpenIDAPI(t, provider.URL, "")

	cb := login(t, h, provider.URL)
	loc, _ := url.Parse(cb.Header().Get("Location"))
	if cb.Code != http.StatusFound || loc.Host != "play.test" {
		t.Fatalf("callback: %d %s %s", cb.Code, loc, cb.Body)
	}
	token := loc.Query().Get("token")
	tok, err := auth.New("secret").Verify(token)
	if err != nil || tok.Identifier != "john.doe@example.com" || tok.AccessToken != "at-1" || tok.MatrixUserID != "john.doe_example.com" ||
		len(tok.Tags) != 1 || tok.Tags[0] != "admin" {
		t.Fatalf("token: %+v %v", tok, err)
	}

	w := get(h, "GET", "/me?token="+token+"&playUri="+url.QueryEscape("http://play.test/_/global/maps.test/a.json"), nil, nil)
	var me map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &me)
	if w.Code != http.StatusOK || me["name"] != "John" || me["sub"] != "u1" || me["authToken"] != token {
		t.Fatalf("/me: %d %s", w.Code, w.Body)
	}

	forged, _ := auth.New("secret").Create(auth.Token{Identifier: "x@example.com", AccessToken: "revoked"})
	if w := get(h, "GET", "/me?token="+forged+"&playUri=http://play.test/", nil, nil); w.Code != http.StatusUnauthorized {
		t.Fatalf("/me with an access token the provider refuses: %d", w.Code)
	}

	w = get(h, "GET", "/logout?playUri="+url.QueryEscape("http://play.test/_/global/maps.test/a.json")+"&token="+token, nil, nil)
	if w.Code != http.StatusFound || revoked.Load() != 2 || lastRevoked.Load() != "rt-1 refresh_token" {
		t.Fatalf("logout revokes the access token and the refresh token: %d, %d revocations, last %v", w.Code, revoked.Load(), lastRevoked.Load())
	}
}

func TestOpenIDRenewsTheAccessTokenTheProviderRejects(t *testing.T) {
	var revoked atomic.Int32
	provider := fakeProvider(t, &revoked)
	spy := &spyAdmin{}
	h := newOpenIDAPIWith(t, provider.URL, "", "offline", spy)
	const playURI = "http://play.test/_/global/maps.test/a.json"
	w := get(h, "GET", "/login-screen?playUri="+url.QueryEscape(playURI)+"&manuallyTriggered=true", nil, nil)
	if loc, _ := url.Parse(w.Header().Get("Location")); loc.Query().Get("access_type") != "offline" {
		t.Fatalf("OPENID_ACCESS_TYPE goes on the authorization request: %s", loc)
	}
	cb := login(t, h, provider.URL)
	loc, _ := url.Parse(cb.Header().Get("Location"))
	token := loc.Query().Get("token")
	tok, err := auth.New("secret").Verify(token)
	if err != nil || tok.EncryptedRefreshToken == "" || strings.Contains(tok.EncryptedRefreshToken, "rt-1") {
		t.Fatalf("the refresh token is kept, encrypted: %+v %v", tok, err)
	}
	me := func(token string) (int, map[string]any) {
		w := get(h, "GET", "/me?token="+token+"&playUri="+url.QueryEscape(playURI), nil, nil)
		var body map[string]any
		_ = json.Unmarshal(w.Body.Bytes(), &body)
		return w.Code, body
	}
	if code, body := me(token); code != http.StatusOK || body["authToken"] != token || renewals.Load() != 0 {
		t.Fatalf("a good access token is not renewed: %d %v", code, body)
	}

	// A provider that fails for another reason than the token is not answered with a renewal.
	down, _ := auth.New("secret").Create(auth.Token{Identifier: tok.Identifier, AccessToken: "at-down", EncryptedRefreshToken: tok.EncryptedRefreshToken})
	if code, _ := me(down); code != http.StatusUnauthorized || renewals.Load() != 0 {
		t.Fatalf("provider down: %d, %d renewals", code, renewals.Load())
	}

	firstAccessExpired.Store(true)
	code, body := me(token)
	renewed, err := auth.New("secret").Verify(fmt.Sprint(body["authToken"]))
	if code != http.StatusOK || err != nil || renewals.Load() != 1 || renewed.AccessToken != "at-2" ||
		renewed.EncryptedRefreshToken == tok.EncryptedRefreshToken || !slices.Equal(renewed.Tags, []string{"member"}) {
		t.Fatalf("renewed, with the rotated refresh token and the claims of now: %d %+v %v", code, renewed, err)
	}
	if q := spy.asked.Load().(admin.MemberQuery); q.AccessToken != "at-2" || !slices.Equal(q.Tags, []string{"member"}) {
		t.Fatalf("the admin is asked with the renewed token and the current tags: %+v", q)
	}

	noRefresh, _ := auth.New("secret").Create(auth.Token{Identifier: tok.Identifier, AccessToken: "at-1"})
	if code, _ := me(noRefresh); code != http.StatusUnauthorized {
		t.Fatalf("without a refresh token, an expired access token is the end of the session: %d", code)
	}

	w = get(h, "GET", "/logout?playUri="+url.QueryEscape(playURI)+"&token="+fmt.Sprint(body["authToken"]), nil, nil)
	if w.Code != http.StatusFound || lastRevoked.Load() != "rt-2 refresh_token" {
		t.Fatalf("logout revokes the rotated refresh token: %d %v", w.Code, lastRevoked.Load())
	}
}

func TestOpenIDRefusesOtherHosts(t *testing.T) {
	var revoked atomic.Int32
	h := newOpenIDAPI(t, fakeProvider(t, &revoked).URL, "")
	if w := get(h, "GET", "/login-screen?playUri="+url.QueryEscape("http://evil.test/_/global/a.json"), nil, nil); w.Code != http.StatusForbidden {
		t.Fatalf("login-screen: %d", w.Code)
	}
}

func TestOpenIDGoesThroughMatrix(t *testing.T) {
	var revoked atomic.Int32
	provider := fakeProvider(t, &revoked)
	h := newOpenIDAPI(t, provider.URL, "http://matrix.test/")
	cb := login(t, h, provider.URL)
	body := cb.Body.String()
	if cb.Code != http.StatusOK || !strings.Contains(body, `window.localStorage.setItem("authToken", "ey`) ||
		!strings.Contains(body, `"http://matrix.test/_matrix/client/v3/login/sso/redirect?redirectUrl=http%3A%2F%2Fplay.test%2Fmatrix-callback"`) {
		t.Fatalf("callback: %d %s", cb.Code, body)
	}
	r := httptest.NewRequest("GET", "/matrix-callback?loginToken=lt", nil)
	r.AddCookie(&http.Cookie{Name: "playUri", Value: url.QueryEscape("http://play.test/_/global/a.json")})
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if !strings.Contains(w.Body.String(), `new URL("http://play.test/_/global/a.json?matrixLoginToken=lt")`) {
		t.Fatalf("matrix-callback: %s", w.Body)
	}
}

func TestOpenIDRefusesAnIDTokenItCannotTrust(t *testing.T) {
	var revoked atomic.Int32
	provider := fakeProvider(t, &revoked)
	h := newOpenIDAPI(t, provider.URL, "")
	for _, mode := range []string{"altered", "expired", "nonce", "audience", "none"} {
		idTokenMode.Store(mode)
		if cb := login(t, h, provider.URL); cb.Code != http.StatusInternalServerError {
			t.Errorf("%s id_token: %d %s", mode, cb.Code, cb.Header().Get("Location"))
		}
	}
	idTokenMode.Store("")
	flip := func(v string) string { // one bit of the sealed verifier changed
		b := []byte(v)
		b[len(b)/2] ^= 1
		return string(b)
	}
	if cb := loginWith(t, h, provider.URL, flip); cb.Code != http.StatusInternalServerError {
		t.Errorf("a changed verifier cookie: %d", cb.Code)
	}
	if cb := loginWith(t, h, provider.URL, func(v string) string { return v }); cb.Code != http.StatusFound {
		t.Fatalf("the untouched flow still works: %d %s", cb.Code, cb.Body)
	}
}
