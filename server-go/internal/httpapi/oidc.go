package httpapi

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"

	"github.com/workadventure/workadventure/server-go/internal/auth"
	"github.com/workadventure/workadventure/server-go/internal/config"
)

// openID is the OpenID Connect client of the pusher (AuthenticateController, OpenIDClient): authorization code
// flow with PKCE (x/oauth2), the id_token checked by go-oidc (signature against the issuer's JWKS, iss, aud, exp)
// and its nonce. The identity's claims then come from the userinfo endpoint, as in the pusher.
type openID struct {
	cfg         config.OpenID
	pusherURL   string
	matrixURI   string
	redirectURL string
	cookieKey   [32]byte // seals the PKCE verifier, the nonce and the refresh token (SHA-256 of SECRET_KEY)
	http        *http.Client

	mu       sync.Mutex
	meta     *oidcMetadata // cached once discovery succeeds, with:
	oauth    *oauth2.Config
	idTokens *oidc.IDTokenVerifier
}

type oidcMetadata struct {
	Issuer                string   `json:"issuer"`
	AuthorizationEndpoint string   `json:"authorization_endpoint"`
	TokenEndpoint         string   `json:"token_endpoint"`
	UserinfoEndpoint      string   `json:"userinfo_endpoint"`
	RevocationEndpoint    string   `json:"revocation_endpoint"`
	JWKSURI               string   `json:"jwks_uri"`
	Algorithms            []string `json:"id_token_signing_alg_values_supported"`
}

func newOpenID(cfg *config.Config) *openID {
	if cfg.OpenID.ClientID == "" {
		return nil
	}
	pusher := strings.TrimRight(cfg.PusherURL, "/")
	return &openID{cfg: cfg.OpenID, pusherURL: pusher, matrixURI: cfg.MatrixPublicURI, redirectURL: pusher + "/openid-callback",
		cookieKey: sha256.Sum256([]byte(cfg.SecretKey)), http: &http.Client{Timeout: 50 * time.Second}}
}

func (o *openID) metadata(ctx context.Context) (*oidcMetadata, error) {
	o.mu.Lock()
	defer o.mu.Unlock()
	if o.meta != nil {
		return o.meta, nil
	}
	u := o.cfg.Issuer
	if !strings.Contains(u, "/.well-known/") {
		u = strings.TrimRight(u, "/") + "/.well-known/openid-configuration"
	}
	var m oidcMetadata
	if err := o.getJSON(ctx, u, "", &m); err != nil {
		return nil, fmt.Errorf("OpenID discovery: %w", err)
	}
	if m.Issuer == "" || m.AuthorizationEndpoint == "" || m.TokenEndpoint == "" || m.UserinfoEndpoint == "" || m.JWKSURI == "" {
		return nil, errors.New("OpenID discovery: missing issuer, endpoints or jwks_uri")
	}
	// The key set outlives the request: it is fetched (and refreshed) with a context of its own.
	provider := (&oidc.ProviderConfig{IssuerURL: m.Issuer, AuthURL: m.AuthorizationEndpoint, TokenURL: m.TokenEndpoint,
		UserInfoURL: m.UserinfoEndpoint, JWKSURL: m.JWKSURI, Algorithms: m.Algorithms}).NewProvider(oidc.ClientContext(context.Background(), o.http))
	o.idTokens = provider.Verifier(&oidc.Config{ClientID: o.cfg.ClientID})
	o.oauth = &oauth2.Config{ClientID: o.cfg.ClientID, ClientSecret: o.cfg.ClientSecret, RedirectURL: o.redirectURL,
		Scopes: strings.Fields(o.cfg.Scope), Endpoint: oauth2.Endpoint{AuthURL: m.AuthorizationEndpoint, TokenURL: m.TokenEndpoint,
			AuthStyle: oauth2.AuthStyleInHeader}} // client_secret_basic, the default of openid-client
	o.meta = &m
	return o.meta, nil
}

// pkce is what the login flow keeps in its sealed cookie between /login-screen and /openid-callback.
type pkce struct {
	Verifier string `json:"v"`
	Nonce    string `json:"n"`
}

// encrypt encrypts and authenticates plain (AES-256-GCM): the browser can neither read nor change it.
func (o *openID) encrypt(plain []byte) string {
	block, _ := aes.NewCipher(o.cookieKey[:])
	gcm, _ := cipher.NewGCM(block)
	nonce := make([]byte, gcm.NonceSize())
	_, _ = rand.Read(nonce)
	return base64.RawURLEncoding.EncodeToString(gcm.Seal(nonce, nonce, plain, nil))
}

func (o *openID) decrypt(sealed string) ([]byte, error) {
	b, err := base64.RawURLEncoding.DecodeString(sealed)
	block, _ := aes.NewCipher(o.cookieKey[:])
	gcm, _ := cipher.NewGCM(block)
	if err != nil || len(b) < gcm.NonceSize() {
		return nil, errors.New("not sealed by this server")
	}
	return gcm.Open(nil, b[:gcm.NonceSize()], b[gcm.NonceSize():], nil)
}

func (o *openID) seal(p pkce) string {
	plain, _ := json.Marshal(p)
	return o.encrypt(plain)
}

func (o *openID) open(sealed string) (pkce, error) {
	var p pkce
	plain, err := o.decrypt(sealed)
	if err != nil || json.Unmarshal(plain, &p) != nil || p.Verifier == "" || p.Nonce == "" {
		return p, errors.New("invalid code verifier cookie")
	}
	return p, nil
}

// client is ctx carrying the HTTP client of x/oauth2 and go-oidc.
func (o *openID) client(ctx context.Context) context.Context { return oidc.ClientContext(ctx, o.http) }

func (o *openID) getJSON(ctx context.Context, u, bearer string, v any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}
	return o.do(req, v)
}

func (o *openID) postForm(ctx context.Context, u string, form url.Values, v any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	// client_secret_basic, the default of openid-client
	req.SetBasicAuth(url.QueryEscape(o.cfg.ClientID), url.QueryEscape(o.cfg.ClientSecret))
	return o.do(req, v)
}

func (o *openID) do(req *http.Request, v any) error {
	req.Header.Set("Accept", "application/json")
	resp, err := o.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode/100 != 2 {
		return &providerError{status: resp.StatusCode, msg: fmt.Sprintf("%s %s: %s %s", req.Method, req.URL.Redacted(), resp.Status, body)}
	}
	if v == nil {
		return nil
	}
	return json.Unmarshal(body, v)
}

// providerError is an answer of the provider other than a success.
type providerError struct {
	status int
	msg    string
}

func (e *providerError) Error() string { return e.msg }

// rejected says whether the provider refused the access token itself (401, invalid_token in RFC 6750), as opposed
// to failing for another reason.
func rejected(err error) bool {
	var pe *providerError
	return errors.As(err, &pe) && pe.status == http.StatusUnauthorized
}

// session is what the provider says of a logged user when the front asks /me.
type session struct {
	claims       map[string]any
	accessToken  string
	refreshToken string // encrypted
	renewed      bool
}

// check asks the provider whether tok's access token is still good, and renews it with the refresh token when, and
// only when, the provider rejects it: a network or configuration failure is reported, not papered over. Access
// tokens live an hour on Google while the auth token lives 30 days: without the renewal, the next reload after the
// hour sends a playing user back to the login screen.
func (o *openID) check(ctx context.Context, tok auth.Token) (session, error) {
	claims, err := o.userinfo(ctx, tok.AccessToken, nil)
	if err == nil || tok.EncryptedRefreshToken == "" || !rejected(err) {
		return session{claims: claims, accessToken: tok.AccessToken, refreshToken: tok.EncryptedRefreshToken}, err
	}
	refresh, err := o.decrypt(tok.EncryptedRefreshToken)
	if err != nil {
		return session{}, fmt.Errorf("refresh token: %w", err)
	}
	// x/oauth2 keeps the current refresh token when the provider does not rotate it, and fails without an access
	// token in the answer.
	fresh, err := o.oauth.TokenSource(o.client(ctx), &oauth2.Token{RefreshToken: string(refresh)}).Token()
	if err != nil {
		return session{}, fmt.Errorf("refresh: %w", err)
	}
	claims, err = o.userinfo(ctx, fresh.AccessToken, nil)
	if err != nil {
		return session{}, err
	}
	return session{claims: claims, accessToken: fresh.AccessToken, refreshToken: o.encrypt([]byte(fresh.RefreshToken)), renewed: true}, nil
}

// userinfo returns the claims of the user the access token belongs to.
func (o *openID) userinfo(ctx context.Context, accessToken string, params url.Values) (map[string]any, error) {
	meta, err := o.metadata(ctx)
	if err != nil {
		return nil, err
	}
	u := meta.UserinfoEndpoint
	if len(params) > 0 {
		u += "?" + params.Encode()
	}
	var claims map[string]any
	if err := o.getJSON(ctx, u, accessToken, &claims); err != nil {
		return nil, err
	}
	return claims, nil
}

func (api *API) registerOpenID(mux *http.ServeMux) {
	if api.oidc == nil {
		return
	}
	mux.HandleFunc("GET /login-screen", api.loginScreen)
	mux.HandleFunc("GET /openid-callback", api.openIDCallback)
	mux.HandleFunc("GET /matrix-callback", api.matrixCallback)
	mux.HandleFunc("GET /logout", api.logout)
}

// Cookies of the login flow. Values are query-escaped: a play URI may hold characters a cookie cannot.
func setCookie(w http.ResponseWriter, r *http.Request, name, value string) {
	http.SetCookie(w, &http.Cookie{Name: name, Value: url.QueryEscape(value), Path: "/", HttpOnly: true, Secure: isHTTPS(r), //nolint:gosec // Secure on HTTPS only: a local HTTP setup must get the cookie back
		SameSite: http.SameSiteLaxMode}) // Lax: sent back on the provider's redirect, a top-level navigation
}

func clearCookie(w http.ResponseWriter, name string) {
	http.SetCookie(w, &http.Cookie{Name: name, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, SameSite: http.SameSiteLaxMode}) //nolint:gosec // Secure on HTTPS only, as the cookie it clears
}

func cookie(r *http.Request, name string) string {
	c, err := r.Cookie(name)
	if err != nil {
		return ""
	}
	v, err := url.QueryUnescape(c.Value)
	if err != nil {
		return ""
	}
	return v
}

func isHTTPS(r *http.Request) bool {
	return r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"
}

func randomToken(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

func (api *API) loginScreen(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	playURI := q.Get("playUri")
	if playURI == "" || (q.Has("manuallyTriggered") && q.Get("manuallyTriggered") != "true") {
		http.Error(w, "Parameter playUri is required, manuallyTriggered can only be true", http.StatusBadRequest)
		return
	}
	o := api.oidc
	if !api.admin.VerifyDomain(r.Context(), playURI) {
		http.Error(w, "Unauthorized domain in playUri", http.StatusForbidden)
		return
	}
	if !strings.Contains(o.cfg.Scope, "email") || !strings.Contains(o.cfg.Scope, "openid") {
		http.Error(w, "Invalid scope, 'email' and 'openid' are required in OPID_SCOPE.", http.StatusInternalServerError)
		return
	}
	if _, err := o.metadata(r.Context()); err != nil {
		slog.Error("OpenID", "error", err)
		http.Error(w, "An error occurred while connecting to OpenID Provider", http.StatusInternalServerError)
		return
	}
	login := pkce{Verifier: oauth2.GenerateVerifier(), Nonce: randomToken(16)}
	state := newUUID()
	setCookie(w, r, "code_verifier", o.seal(login))
	setCookie(w, r, "oidc_state", state)
	setCookie(w, r, "playUri", playURI)

	opts := []oauth2.AuthCodeOption{oauth2.S256ChallengeOption(login.Verifier), oidc.Nonce(login.Nonce),
		oauth2.SetAuthURLParam("playUri", playURI)}
	if o.cfg.Prompt != "" {
		opts = append(opts, oauth2.SetAuthURLParam("prompt", o.cfg.Prompt))
	}
	if o.cfg.AccessType != "" {
		opts = append(opts, oauth2.SetAuthURLParam("access_type", o.cfg.AccessType))
	}
	for _, k := range []string{"manuallyTriggered", "chatRoomId", "providerId"} {
		if q.Has(k) {
			opts = append(opts, oauth2.SetAuthURLParam(k, q.Get(k)))
		}
	}
	if scopes := q["providerScopes"]; len(scopes) > 0 {
		opts = append(opts, oauth2.SetAuthURLParam("providerScopes", strings.Join(scopes, ",")))
	}
	http.Redirect(w, r, o.oauth.AuthCodeURL(state, opts...), http.StatusFound) //nolint:gosec // the provider's authorization endpoint, from its discovery
}

func (api *API) openIDCallback(w http.ResponseWriter, r *http.Request) {
	playURI := cookie(r, "playUri")
	if playURI == "" {
		http.Error(w, "Missing playUri in cookies", http.StatusInternalServerError)
		return
	}
	claims, tokens, err := api.oidc.exchange(r)
	if err != nil {
		slog.Error("An error occurred while connecting to OpenID Provider", "error", err)
		http.Error(w, "An error occurred while connecting to OpenID Provider", http.StatusInternalServerError)
		return
	}
	clearCookie(w, "code_verifier")
	clearCookie(w, "oidc_state")
	email := claimString(claims, "email")
	if email == "" {
		email = claimString(claims, "sub")
	}
	if email == "" {
		http.Error(w, "No email in the response", http.StatusInternalServerError)
		return
	}
	tok := api.oidc.withClaims(auth.Token{Identifier: email, MatrixUserID: strings.Replace(email, "@", "_", 1)}, claims)
	tok.AccessToken = tokens.AccessToken
	if tokens.RefreshToken != "" {
		tok.EncryptedRefreshToken = api.oidc.encrypt([]byte(tokens.RefreshToken))
	}
	token, err := api.auth.Create(tok)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	matrixURI := claimString(claims, "matrix_url")
	if matrixURI == "" {
		matrixURI = api.oidc.matrixURI
	}
	if matrixURI == "" {
		clearCookie(w, "playUri")
		http.Redirect(w, r, playURI+"?token="+url.QueryEscape(token), http.StatusFound) //nolint:gosec // playUri passed VerifyDomain at /login-screen before it went in the cookie
		return
	}
	// Synapse logs the user in through the same provider, then comes back to /matrix-callback (playUri stays in
	// its cookie). The token can exceed the size of a cookie: the page keeps it in the local storage meanwhile.
	m, err := url.Parse(matrixURI)
	if err != nil {
		http.Error(w, "Invalid Matrix URL", http.StatusInternalServerError)
		return
	}
	m.Path, m.RawQuery = "/_matrix/client/v3/login/sso/redirect", url.Values{"redirectUrl": {api.oidc.pusherURL + "/matrix-callback"}}.Encode()
	if idp := claimString(claims, "matrix_identity_provider"); idp != "" {
		m.Path += "/" + idp
	}
	redirectPage(w, `window.localStorage.setItem("authToken", %s);
        window.location.href = %s;`, token, m.String())
}

// withClaims is tok with what the provider's claims say of the user: its name, locale and tags.
func (o *openID) withClaims(tok auth.Token, claims map[string]any) auth.Token {
	tok.Username, tok.Locale, tok.Tags = claimString(claims, o.cfg.UsernameClaim), claimString(claims, o.cfg.LocaleClaim), claimStrings(claims, o.cfg.TagsClaim)
	return tok
}

// exchange trades the authorization code for the provider's tokens, then reads the user's claims.
func (o *openID) exchange(r *http.Request) (map[string]any, *oauth2.Token, error) {
	q := r.URL.Query()
	if e := q.Get("error"); e != "" {
		return nil, nil, fmt.Errorf("provider error %s: %s", e, q.Get("error_description"))
	}
	sealed := cookie(r, "code_verifier")
	if sealed == "" {
		return nil, nil, errors.New("code verifier doesn't exist")
	}
	login, err := o.open(sealed)
	if err != nil {
		return nil, nil, err
	}
	// The state only matters to providers without PKCE; openid-client refuses a state it has nothing to compare to.
	if state := q.Get("state"); state != "" {
		if expected := cookie(r, "oidc_state"); expected != "" && expected != state {
			return nil, nil, errors.New("state mismatch")
		} else if expected == "" {
			return nil, nil, errors.New("checks.state argument is missing")
		}
	}
	if _, err := o.metadata(r.Context()); err != nil {
		return nil, nil, err
	}
	ctx := o.client(r.Context())
	tokens, err := o.oauth.Exchange(ctx, q.Get("code"), oauth2.VerifierOption(login.Verifier))
	if err != nil {
		return nil, nil, err
	}
	raw, _ := tokens.Extra("id_token").(string)
	if raw == "" {
		return nil, nil, errors.New("no id_token in the token response")
	}
	idToken, err := o.idTokens.Verify(ctx, raw)
	if err != nil {
		return nil, nil, fmt.Errorf("id_token: %w", err)
	}
	if idToken.Nonce != login.Nonce {
		return nil, nil, errors.New("id_token: nonce mismatch")
	}
	claims, err := o.userinfo(r.Context(), tokens.AccessToken, url.Values{"playUri": {cookie(r, "playUri")}})
	return claims, tokens, err
}

func (api *API) matrixCallback(w http.ResponseWriter, r *http.Request) {
	playURI := cookie(r, "playUri")
	if playURI == "" {
		http.Error(w, "Missing playUri in cookies", http.StatusInternalServerError)
		return
	}
	q := r.URL.Query()
	if !q.Has("loginToken") {
		http.Error(w, "Parameter loginToken is required", http.StatusBadRequest)
		return
	}
	u, err := url.Parse(playURI)
	if err != nil {
		http.Error(w, "Invalid playUri", http.StatusBadRequest)
		return
	}
	clearCookie(w, "playUri")
	clearCookie(w, "authToken")
	params := u.Query()
	params.Add("matrixLoginToken", q.Get("loginToken"))
	if q.Get("chatRoomId") != "" {
		params.Add("chatRoomId", q.Get("chatRoomId"))
	}
	u.RawQuery = params.Encode()
	redirectPage(w, `const playUrl = new URL(%s);
        playUrl.searchParams.append("token", window.localStorage.getItem("authToken"));
        window.location.href = playUrl.toString();`, u.String())
}

// redirectPage answers the pages of play/redirectToMatrix.html and redirectToPlay.html. Values are written as
// JSON string literals, which also escapes <, > and &.
func redirectPage(w http.ResponseWriter, script string, values ...string) {
	args := make([]any, len(values))
	for i, v := range values {
		b, _ := json.Marshal(v)
		args[i] = string(b)
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = fmt.Fprintf(w, "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <script>\n        "+script+"\n    </script>\n</head>\n<body>\n</body>\n</html>", args...)
}

// logout revokes the access token and the refresh token, then goes back to the room, where the front logs in anonymously.
// ponytail: the "redirect" parameter of the pusher (an open redirect, and /logout-callback behind it) is left out:
// the front never sends it.
func (api *API) logout(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	playURI := q.Get("playUri")
	if playURI == "" || !q.Has("token") {
		http.Error(w, "Parameters playUri and token are required", http.StatusBadRequest)
		return
	}
	if !api.admin.VerifyDomain(r.Context(), playURI) {
		http.Error(w, "Unauthorized domain in playUri", http.StatusForbidden)
		return
	}
	tok, err := api.auth.Verify(q.Get("token"))
	if err != nil {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}
	if tok.AccessToken == "" {
		http.Error(w, "Cannot log out, no access token found.", http.StatusInternalServerError)
		return
	}
	if meta, err := api.oidc.metadata(r.Context()); err == nil && meta.RevocationEndpoint != "" {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()
		if err := api.oidc.postForm(ctx, meta.RevocationEndpoint, url.Values{"token": {tok.AccessToken}}, nil); err != nil {
			slog.Warn("cannot revoke the OpenID access token", "error", err)
		}
		// Revoking the access token leaves the refresh token alive on a provider that follows RFC 7009.
		if refresh, err := api.oidc.decrypt(tok.EncryptedRefreshToken); err == nil && len(refresh) > 0 {
			err := api.oidc.postForm(ctx, meta.RevocationEndpoint, url.Values{"token": {string(refresh)}, "token_type_hint": {"refresh_token"}}, nil)
			if err != nil {
				slog.Warn("cannot revoke the OpenID refresh token", "error", err)
			}
		}
	}
	http.Redirect(w, r, playURI, http.StatusFound) //nolint:gosec // playUri passed VerifyDomain above
}

func claimString(claims map[string]any, name string) string {
	s, _ := claims[name].(string)
	return s
}

// claimStrings reads a list of strings; a single string is a list of one.
func claimStrings(claims map[string]any, name string) []string {
	switch v := claims[name].(type) {
	case string:
		return []string{v}
	case []any:
		out := make([]string, 0, len(v))
		for _, e := range v {
			if s, ok := e.(string); ok {
				out = append(out, s)
			}
		}
		return out
	}
	return nil
}
