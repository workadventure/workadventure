package httpapi

import (
	"context"
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

	"github.com/workadventure/workadventure/server-go/internal/auth"
	"github.com/workadventure/workadventure/server-go/internal/config"
)

// openID is the OpenID Connect client of the pusher (AuthenticateController, OpenIDClient): authorization code
// flow with PKCE. The identity comes from the userinfo endpoint, called with the access token the token endpoint
// gave us directly. ponytail: the id_token is not checked (no JWKS): we read no claim from it.
type openID struct {
	cfg         config.OpenID
	pusherURL   string
	matrixURI   string
	redirectURL string
	http        *http.Client

	mu   sync.Mutex
	meta *oidcMetadata // cached once discovery succeeds
}

type oidcMetadata struct {
	AuthorizationEndpoint string `json:"authorization_endpoint"`
	TokenEndpoint         string `json:"token_endpoint"`
	UserinfoEndpoint      string `json:"userinfo_endpoint"`
	RevocationEndpoint    string `json:"revocation_endpoint"`
}

func newOpenID(cfg *config.Config) *openID {
	if cfg.OpenID.ClientID == "" {
		return nil
	}
	pusher := strings.TrimRight(cfg.PusherURL, "/")
	return &openID{cfg: cfg.OpenID, pusherURL: pusher, matrixURI: cfg.MatrixPublicURI, redirectURL: pusher + "/openid-callback",
		http: &http.Client{Timeout: 50 * time.Second}}
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
	if m.AuthorizationEndpoint == "" || m.TokenEndpoint == "" || m.UserinfoEndpoint == "" {
		return nil, errors.New("OpenID discovery: missing endpoints")
	}
	o.meta = &m
	return o.meta, nil
}

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
		return fmt.Errorf("%s %s: %s %s", req.Method, req.URL.Redacted(), resp.Status, body)
	}
	if v == nil {
		return nil
	}
	return json.Unmarshal(body, v)
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
	http.SetCookie(w, &http.Cookie{Name: name, Value: url.QueryEscape(value), Path: "/", HttpOnly: true, Secure: isHTTPS(r)})
}

func clearCookie(w http.ResponseWriter, name string) {
	http.SetCookie(w, &http.Cookie{Name: name, Value: "", Path: "/", MaxAge: -1})
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
	meta, err := o.metadata(r.Context())
	if err != nil {
		slog.Error("OpenID", "error", err)
		http.Error(w, "An error occurred while connecting to OpenID Provider", http.StatusInternalServerError)
		return
	}
	// ponytail: the verifier sits in clear in an HttpOnly cookie (the pusher encrypts it with SECRET_KEY): the
	// browser that holds it is the one PKCE binds the code to anyway.
	verifier, state := randomToken(32), newUUID()
	challenge := sha256.Sum256([]byte(verifier))
	setCookie(w, r, "code_verifier", verifier)
	setCookie(w, r, "oidc_state", state)
	setCookie(w, r, "playUri", playURI)

	params := url.Values{
		"client_id": {o.cfg.ClientID}, "response_type": {"code"}, "redirect_uri": {o.redirectURL}, "scope": {o.cfg.Scope},
		"state": {state}, "playUri": {playURI}, "code_challenge": {base64.RawURLEncoding.EncodeToString(challenge[:])},
		"code_challenge_method": {"S256"},
	}
	if o.cfg.Prompt != "" {
		params.Set("prompt", o.cfg.Prompt)
	}
	for _, k := range []string{"manuallyTriggered", "chatRoomId", "providerId"} {
		if q.Has(k) {
			params.Set(k, q.Get(k))
		}
	}
	if scopes := q["providerScopes"]; len(scopes) > 0 {
		params.Set("providerScopes", strings.Join(scopes, ","))
	}
	sep := "?"
	if strings.Contains(meta.AuthorizationEndpoint, "?") {
		sep = "&"
	}
	http.Redirect(w, r, meta.AuthorizationEndpoint+sep+params.Encode(), http.StatusFound)
}

func (api *API) openIDCallback(w http.ResponseWriter, r *http.Request) {
	playURI := cookie(r, "playUri")
	if playURI == "" {
		http.Error(w, "Missing playUri in cookies", http.StatusInternalServerError)
		return
	}
	claims, accessToken, err := api.oidc.exchange(r)
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
	cfg := api.oidc.cfg
	token, err := api.auth.Create(auth.Token{
		Identifier: email, AccessToken: accessToken, Username: claimString(claims, cfg.UsernameClaim),
		Locale: claimString(claims, cfg.LocaleClaim), Tags: claimStrings(claims, cfg.TagsClaim),
		MatrixUserID: strings.Replace(email, "@", "_", 1),
	})
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
		http.Redirect(w, r, playURI+"?token="+url.QueryEscape(token), http.StatusFound)
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

// exchange trades the authorization code for an access token, then reads the user's claims.
func (o *openID) exchange(r *http.Request) (map[string]any, string, error) {
	q := r.URL.Query()
	if e := q.Get("error"); e != "" {
		return nil, "", fmt.Errorf("provider error %s: %s", e, q.Get("error_description"))
	}
	verifier := cookie(r, "code_verifier")
	if verifier == "" {
		return nil, "", errors.New("code verifier doesn't exist")
	}
	// The state only matters to providers without PKCE; openid-client refuses a state it has nothing to compare to.
	if state := q.Get("state"); state != "" {
		if expected := cookie(r, "oidc_state"); expected != "" && expected != state {
			return nil, "", errors.New("state mismatch")
		} else if expected == "" {
			return nil, "", errors.New("checks.state argument is missing")
		}
	}
	meta, err := o.metadata(r.Context())
	if err != nil {
		return nil, "", err
	}
	var tokens struct {
		AccessToken string `json:"access_token"`
	}
	err = o.postForm(r.Context(), meta.TokenEndpoint, url.Values{
		"grant_type": {"authorization_code"}, "code": {q.Get("code")}, "redirect_uri": {o.redirectURL}, "code_verifier": {verifier},
	}, &tokens)
	if err != nil {
		return nil, "", err
	}
	if tokens.AccessToken == "" {
		return nil, "", errors.New("no access token in the token response")
	}
	claims, err := o.userinfo(r.Context(), tokens.AccessToken, url.Values{"playUri": {cookie(r, "playUri")}})
	return claims, tokens.AccessToken, err
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

// logout revokes the access token, then goes back to the room, where the front logs in anonymously.
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
	}
	http.Redirect(w, r, playURI, http.StatusFound)
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
