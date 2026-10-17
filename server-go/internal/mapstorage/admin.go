package mapstorage

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

// What map-storage asks of the admin: whether a bearer may write a domain's maps (A26, AUTHENTICATION_VALIDATOR_URL),
// and the webhook told of each WAM file written or deleted (A27, WEB_HOOK_URL).

// Validator asks AUTHENTICATION_VALIDATOR_URL about a bearer other than AUTHENTICATION_TOKEN; any 2xx allows it. In
// production its yes is kept as long as its Cache-Control says (5 minutes without one).
type Validator struct {
	URL        string
	Production bool
	mu         sync.Mutex
	ok         map[string]time.Time
}

var hookClient = &http.Client{Timeout: 10 * time.Second}

func (v *Validator) allows(token, domain string) bool {
	if v == nil || v.URL == "" {
		return false
	}
	key := domain + "\x00" + token
	v.mu.Lock()
	until, cached := v.ok[key]
	v.mu.Unlock()
	if v.Production && cached && time.Now().Before(until) {
		return true
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	sep := "?"
	if strings.Contains(v.URL, "?") {
		sep = "&"
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.URL+sep+url.Values{"domain": {domain}}.Encode(), nil)
	if err != nil {
		return false
	}
	req.Header.Set("X-API-Key", token)
	resp, err := hookClient.Do(req)
	if err != nil {
		return false
	}
	resp.Body.Close()
	if resp.StatusCode/100 != 2 {
		return false
	}
	if v.Production {
		v.mu.Lock()
		if v.ok == nil {
			v.ok = map[string]time.Time{}
		}
		v.ok[key] = time.Now().Add(maxAge(resp.Header.Get("Cache-Control")))
		v.mu.Unlock()
	}
	return true
}

func maxAge(cacheControl string) time.Duration {
	for _, d := range strings.Split(cacheControl, ",") {
		if n, ok := strings.CutPrefix(strings.TrimSpace(d), "max-age="); ok {
			if s, err := strconv.Atoi(n); err == nil {
				return time.Duration(s) * time.Second
			}
		}
	}
	return 5 * time.Minute
}

// WebHook is WEB_HOOK_URL (with WEB_HOOK_API_TOKEN), off when its URL is empty or ENABLE_WEB_HOOK is false.
type WebHook struct{ URL, Token string }

// notify tells the webhook, off the caller, that the WAM file at key was written (updateWAMFileInCache). Without
// USE_DOMAIN_NAME_IN_PATH, the key has no domain: domain is then empty.
func (s *Store) notify(key, action string) {
	if !strings.HasSuffix(key, ".wam") {
		return
	}
	domain, mapPath := "", key
	if s.useDomain {
		domain, mapPath, _ = strings.Cut(key, "/")
	}
	s.hook(map[string]string{"domain": domain, "mapPath": mapPath, "action": action})
}

// notifyDomain tells the webhook that a domain's maps changed in bulk (generateCacheFile: an upload, a deletion, a
// move or a copy), without a map path. Like map-storage, a deletion is an update of the domain: "delete" is never
// sent (deleteWAMFileInCache has no caller).
func (s *Store) notifyDomain(r *http.Request) {
	s.hook(map[string]string{"domain": requestDomain(r), "action": "update"})
}

func (s *Store) hook(payload map[string]string) {
	h := s.webHook
	if h.URL == "" {
		return
	}
	domain, mapPath, action := payload["domain"], payload["mapPath"], payload["action"]
	body, _ := json.Marshal(payload)
	go func() {
		req, err := http.NewRequest(http.MethodPost, h.URL, bytes.NewReader(body))
		if err != nil {
			return
		}
		req.Header.Set("Content-Type", "application/json")
		if h.Token != "" {
			req.Header.Set("Authorization", h.Token)
		}
		resp, err := hookClient.Do(req)
		if err != nil {
			slog.Warn("map-storage webhook", "domain", domain, "map", mapPath, "action", action, "error", err)
			return
		}
		resp.Body.Close()
	}()
}
