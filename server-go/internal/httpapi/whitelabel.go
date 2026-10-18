package httpapi

import (
	"log/slog"
	"net"
	"net/http"
	"strings"

	"github.com/cbroglie/mustache"
)

// The admin's routes in the browser's path (A4, A31): Cloudflare's challenge of a custom hostname, the autologin of
// ?access_key=, and /profile-callback.

// cfChallenge is GET /.well-known/cf-custom-hostname-challenge/*, never on a workadventu.re host (notWaHost).
func (api *API) cfChallenge(w http.ResponseWriter, r *http.Request) {
	host := r.Host
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	if strings.HasSuffix(host, "workadventu.re") {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	challenge, err := api.admin.Challenge(r.Context(), host)
	if err != nil {
		slog.Error("Cloudflare challenge", "host", host, "error", err)
		text(w, 526, "Fail on challenging hostname")
		return
	}
	text(w, http.StatusOK, challenge)
}

// redirectToAdmin is play/redirectToAdmin.html.
const redirectToAdmin = `<!DOCTYPE html>
<html lang="en">
<head>
    <script>
        function getUrlWithoutAccessKey() {
            const url = new URL(window.location.href);
            url.searchParams.delete("access_key");
            return url.href;
        }

        window.location.href = "{{{AUTOLOGIN_URL}}}?token={{accessKey}}&playUri=" + encodeURIComponent(getUrlWithoutAccessKey())
    </script>
</head>
<body>
</body>
</html>`

// accessKey answers a page asked with ?access_key=: the browser goes to the admin, which logs it in.
func (api *API) accessKey(w http.ResponseWriter, r *http.Request) bool {
	key := r.URL.Query().Get("access_key")
	if key == "" {
		return false
	}
	if api.cfg.AutologinURL == "" {
		text(w, http.StatusBadRequest, "AUTOLOGIN_URL is not configured.")
		return true
	}
	page, err := mustache.Render(redirectToAdmin, map[string]string{"accessKey": key, "AUTOLOGIN_URL": api.cfg.AutologinURL})
	if err != nil {
		text(w, http.StatusInternalServerError, "Internal Server Error")
		return true
	}
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(page))
	return true
}

// profileCallback is GET /profile-callback: a checked token goes on to the profile screen, as is (the TS does not
// encode the values either).
func (api *API) profileCallback(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	token, playURI := q.Get("token"), q.Get("playUri")
	if !q.Has("token") || !q.Has("playUri") {
		text(w, http.StatusBadRequest, "Invalid query")
		return
	}
	tok, err := api.auth.Verify(token)
	if err != nil || tok.AccessToken == "" || api.oidc == nil {
		text(w, http.StatusInternalServerError, "Token cannot be checked on OpenID connect provider")
		return
	}
	if _, err := api.oidc.userinfo(r.Context(), tok.AccessToken, nil); err != nil {
		text(w, http.StatusInternalServerError, "Internal Server Error")
		return
	}
	target := "/profile"
	if api.cfg.AdminAPIURL != "" {
		if api.cfg.ProfileScreenProvider == "" {
			text(w, http.StatusInternalServerError, "No admin backoffice set!")
			return
		}
		target = api.cfg.ProfileScreenProvider
	}
	w.Header().Set("Location", target+"?accessToken="+tok.AccessToken+"&playUri="+playURI)
	w.WriteHeader(http.StatusFound)
}
